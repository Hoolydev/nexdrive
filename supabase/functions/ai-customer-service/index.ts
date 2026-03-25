import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Generate audio via ElevenLabs.
 *  Returns base64 data URI — both UAZAPI (/send/media) and Z-API (/send-audio) accept it. */
async function generateVoice(
  text: string,
  apiKey: string,
  voiceId: string
): Promise<string | null> {
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!res.ok) {
      console.error("ElevenLabs error:", res.status, await res.text());
      return null;
    }

    const audioBuffer = await res.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    return `data:audio/mpeg;base64,${base64}`;
  } catch (e) {
    console.error("generateVoice error:", e);
    return null;
  }
}

/** Transcribe an audio URL using OpenAI Whisper. */
async function transcribeAudio(audioUrl: string, openaiKey: string): Promise<string | null> {
  try {
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) return null;
    const audioBlob = await audioRes.blob();

    const formData = new FormData();
    formData.append("file", audioBlob, "audio.ogg");
    formData.append("model", "whisper-1");
    formData.append("language", "pt");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: formData,
    });

    if (!whisperRes.ok) {
      console.error("Whisper error:", whisperRes.status, await whisperRes.text());
      return null;
    }

    const data = await whisperRes.json();
    return data.text?.trim() || null;
  } catch (e) {
    console.error("transcribeAudio error:", e);
    return null;
  }
}

/** Extract audio URL from UAZAPI / Z-API webhook payload. */
function extractIncomingAudioUrl(body: any): string | null {
  return (
    body.message?.audioUrl ||
    body.message?.audio?.url ||
    body.audio?.audioUrl ||
    body.audioUrl ||
    null
  );
}

/** Detect if incoming message is audio/voice type. */
function isAudioMessage(body: any): boolean {
  const type = body.type || body.message?.type || body.messageType;
  if (type === "audio" || type === "ptt" || type === "voice") return true;
  if (extractIncomingAudioUrl(body)) return true;
  return false;
}

/** Detect provider from instance URL:
 *  - Z-API: base URL ends in the instance path, send-audio at /send-audio
 *  - UAZAPI (default): send media at /send/media
 */
function detectProvider(instanceUrl: string): "zapi" | "uazapi" {
  if (instanceUrl.includes("z-api.io")) return "zapi";
  return "uazapi";
}

/** Send text + optional audio via UAZAPI.
 *  Text: POST /send/text  (or /message/text for older builds)
 *  Audio: POST /send/media  with mimeType audio/mpeg
 */
async function sendViaUazapi(
  instanceUrl: string,
  token: string,
  phone: string,
  text: string,
  audioBase64: string | null
) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Send text
  await fetch(`${instanceUrl}/send/text`, {
    method: "POST",
    headers,
    body: JSON.stringify({ phone, message: text }),
  }).catch(() =>
    // fallback to older endpoint path some UAZAPI builds still use
    fetch(`${instanceUrl}/message/text`, {
      method: "POST",
      headers,
      body: JSON.stringify({ phone, message: text }),
    })
  );

  // Send audio
  if (audioBase64) {
    await fetch(`${instanceUrl}/send/media`, {
      method: "POST",
      headers,
      body: JSON.stringify({ phone, audio: audioBase64, mimeType: "audio/mpeg" }),
    });
  }
}

/** Send text + optional audio via Z-API.
 *  The instanceUrl here is already the full base path
 *  e.g. https://api.z-api.io/instances/{id}/token/{token}
 *  Z-API uses Client-Token header, NOT Bearer.
 */
async function sendViaZapi(
  instanceUrl: string,
  clientToken: string,
  phone: string,
  text: string,
  audioBase64: string | null
) {
  const headers = {
    "Client-Token": clientToken,
    "Content-Type": "application/json",
  };

  // Send text
  await fetch(`${instanceUrl}/send-text`, {
    method: "POST",
    headers,
    body: JSON.stringify({ phone, message: text }),
  });

  // Send audio
  if (audioBase64) {
    await fetch(`${instanceUrl}/send-audio`, {
      method: "POST",
      headers,
      body: JSON.stringify({ phone, audio: audioBase64, waveform: true }),
    });
  }
}

/** Send via Meta WhatsApp Cloud API. */
async function sendViaMeta(
  accessToken: string,
  phoneNumberId: string,
  to: string,
  text: string,
  audioBase64: string | null
) {
  const baseUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  await fetch(baseUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  // Meta requires a publicly hosted URL for audio (no base64 support via Cloud API)
  // audioBase64 is skipped here — use Supabase Storage if Meta audio is needed in the future
}

// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
    const url = new URL(req.url);
    const secretParam = url.searchParams.get("secret");
    const authHeader = req.headers.get("Authorization");

    if (webhookSecret && secretParam !== webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    // Meta webhook verification (GET)
    if (req.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      if (mode === "subscribe" && token === webhookSecret) {
        return new Response(challenge, { status: 200 });
      }
      return new Response("Forbidden", { status: 403 });
    }

    const phone =
      body.phone ||
      body.from ||
      body.sender ||
      body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;

    const incomingIsAudio = isAudioMessage(body);
    const incomingAudioUrl = extractIncomingAudioUrl(body);

    let messageText =
      body.message?.text ||
      body.message?.conversation ||
      body.text ||
      body.body ||
      body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body ||
      "";

    if (!phone || (!messageText && !incomingIsAudio)) {
      return new Response(JSON.stringify({ error: "No message content" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find active agent settings
    const { data: allSettings } = await supabase
      .from("ai_settings")
      .select("*")
      .eq("agent_type", "customer_service")
      .eq("enabled", true)
      .eq("whatsapp_connected", true);

    if (!allSettings || allSettings.length === 0) {
      return new Response(JSON.stringify({ error: "No active agents" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const s = allSettings[0];
    const userId = s.user_id;
    const openaiApiKey = s.openai_api_key;

    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: "OpenAI key not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transcribe incoming audio
    if (incomingIsAudio && incomingAudioUrl && !messageText) {
      const transcribed = await transcribeAudio(incomingAudioUrl, openaiApiKey);
      if (!transcribed) {
        const fallbackText = "Desculpe, não consegui entender o áudio. Poderia enviar sua mensagem por texto?";
        if (s.uazapi_instance_url && s.uazapi_token) {
          const provider = detectProvider(s.uazapi_instance_url);
          if (provider === "zapi") {
            await sendViaZapi(s.uazapi_instance_url, s.uazapi_token, phone, fallbackText, null);
          } else {
            await sendViaUazapi(s.uazapi_instance_url, s.uazapi_token, phone, fallbackText, null);
          }
        }
        return new Response(JSON.stringify({ error: "Audio transcription failed" }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      messageText = transcribed;
    }

    // Get or create conversation
    let { data: conversation } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", userId)
      .eq("agent_type", "customer_service")
      .eq("phone_number", phone)
      .single();

    if (!conversation) {
      const { data: newConv } = await supabase
        .from("ai_conversations")
        .insert({ user_id: userId, agent_type: "customer_service", phone_number: phone })
        .select()
        .single();
      conversation = newConv;
    }

    await supabase.from("ai_messages").insert({
      conversation_id: conversation.id,
      role: "user",
      content: messageText,
    });

    // Vehicle context
    const { data: vehicles } = await supabase
      .from("products")
      .select("brand, model, manufacturing_year, model_year, price, fipe_price, current_km")
      .eq("user_id", userId)
      .eq("sold", false);

    const vehicleContext =
      vehicles?.map((v: any) =>
        `- ${v.brand} ${v.model} ${v.model_year || ""}, ${v.current_km ? v.current_km.toLocaleString("pt-BR") + " km" : ""}, Preço: R$ ${v.price?.toLocaleString("pt-BR") || "Consultar"}`
      ).join("\n") || "Nenhum veículo disponível no momento.";

    // Conversation history
    const { data: recentMessages } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(15);

    const chatHistory = (recentMessages || []).reverse().map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    // System prompt
    const customPrompt =
      s.system_prompt || "Você é um assistente de vendas de veículos. Seja cordial e profissional.";
    const systemPrompt = `${customPrompt}

CATÁLOGO DE VEÍCULOS DISPONÍVEIS:
${vehicleContext}

INSTRUÇÕES:
- Responda de forma humanizada e natural, como um vendedor experiente.
- Use formatação simples compatível com WhatsApp (*negrito*, _itálico_).
- Quando o cliente perguntar sobre veículos, use as informações do catálogo acima.
- Se não souber algo específico, convide o cliente a visitar a loja ou falar com o vendedor.
- Nunca invente informações que não estão no catálogo.
- Seja proativo em oferecer opções e sugerir test drives.`;

    // OpenAI
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, ...chatHistory],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const openaiData = await openaiRes.json();
    const assistantResponse =
      openaiData.choices?.[0]?.message?.content ||
      "Desculpe, não consegui processar sua mensagem. Tente novamente.";

    // Generate voice: respond in audio when incoming was audio OR voice_always_on is set
    const voiceEnabled = !!(s.elevenlabs_api_key && s.elevenlabs_voice_id);
    const shouldRespondWithAudio = voiceEnabled && (incomingIsAudio || !!(s as any).voice_always_on);

    let audioBase64: string | null = null;
    if (shouldRespondWithAudio) {
      audioBase64 = await generateVoice(assistantResponse, s.elevenlabs_api_key, s.elevenlabs_voice_id);
    }

    // Save assistant message
    await supabase.from("ai_messages").insert({
      conversation_id: conversation.id,
      role: "assistant",
      content: assistantResponse,
      audio_url: audioBase64 ? "[audio gerado]" : null,
    });

    await supabase
      .from("ai_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation.id);

    // Send via configured channel
    const channelType = (s as any).channel_type || "uazapi";

    if (channelType === "meta" && (s as any).meta_access_token && (s as any).meta_phone_number_id) {
      await sendViaMeta(
        (s as any).meta_access_token,
        (s as any).meta_phone_number_id,
        phone,
        assistantResponse,
        audioBase64
      );
    } else if (s.uazapi_instance_url && s.uazapi_token) {
      const provider = detectProvider(s.uazapi_instance_url);
      if (provider === "zapi") {
        await sendViaZapi(s.uazapi_instance_url, s.uazapi_token, phone, assistantResponse, audioBase64);
      } else {
        await sendViaUazapi(s.uazapi_instance_url, s.uazapi_token, phone, assistantResponse, audioBase64);
      }
    }

    return new Response(
      JSON.stringify({ success: true, response: assistantResponse, audio: !!audioBase64 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
