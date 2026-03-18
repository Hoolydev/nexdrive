import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function generateVoice(text: string, apiKey: string, voiceId: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) return null;

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    return `data:audio/mpeg;base64,${base64Audio}`;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    const phone = body.phone || body.from || body.sender;
    const messageText = body.message?.text || body.text || body.body || "";
    const instanceId = body.instance_id || body.instanceId;

    if (!phone || !messageText) {
      return new Response(JSON.stringify({ error: "No message content" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find customer service settings by instance URL or iterate through active ones
    const { data: allSettings } = await supabase
      .from("ai_settings")
      .select("*")
      .eq("agent_type", "customer_service")
      .eq("enabled", true)
      .eq("whatsapp_connected", true);

    if (!allSettings || allSettings.length === 0) {
      return new Response(JSON.stringify({ error: "No active customer service agents" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use the first matching settings (or match by instance)
    const settingsData = allSettings[0];
    const userId = settingsData.user_id;
    const openaiApiKey = settingsData.openai_api_key;

    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        .insert({
          user_id: userId,
          agent_type: "customer_service",
          phone_number: phone,
        })
        .select()
        .single();
      conversation = newConv;
    }

    // Save user message
    await supabase.from("ai_messages").insert({
      conversation_id: conversation.id,
      role: "user",
      content: messageText,
    });

    // Get available vehicles for context
    const { data: vehicles } = await supabase
      .from("products")
      .select("brand, model, manufacturing_year, model_year, price, fipe_price, current_km, vehicle_images")
      .eq("user_id", userId)
      .eq("sold", false);

    const vehicleContext = vehicles?.map((v: any) =>
      `- ${v.brand} ${v.model} ${v.model_year || ""}, ${v.current_km ? v.current_km.toLocaleString("pt-BR") + " km" : ""}, Preço: R$ ${v.price?.toLocaleString("pt-BR") || "Consultar"}`
    ).join("\n") || "Nenhum veículo disponível no momento.";

    // Get recent conversation history
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

    // Build system prompt with custom prompt + vehicle catalog
    const customPrompt = settingsData.system_prompt || "Você é um assistente de vendas de veículos. Seja cordial e profissional.";
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

    // Call OpenAI
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatHistory,
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const openaiData = await openaiRes.json();
    const assistantResponse = openaiData.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua mensagem. Tente novamente.";

    // Generate voice if ElevenLabs is configured
    let audioUrl: string | null = null;
    if (settingsData.elevenlabs_api_key && settingsData.elevenlabs_voice_id) {
      audioUrl = await generateVoice(
        assistantResponse,
        settingsData.elevenlabs_api_key,
        settingsData.elevenlabs_voice_id
      );
    }

    // Save assistant response
    await supabase.from("ai_messages").insert({
      conversation_id: conversation.id,
      role: "assistant",
      content: assistantResponse,
      audio_url: audioUrl,
    });

    // Update conversation timestamp
    await supabase
      .from("ai_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation.id);

    // Send response via UAZAPI
    if (settingsData.uazapi_instance_url && settingsData.uazapi_token) {
      // Send text message
      await fetch(`${settingsData.uazapi_instance_url}/message/text`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settingsData.uazapi_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, message: assistantResponse }),
      });

      // Send audio if available
      if (audioUrl) {
        await fetch(`${settingsData.uazapi_instance_url}/message/audio`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${settingsData.uazapi_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ phone, audio: audioUrl }),
        });
      }
    }

    return new Response(JSON.stringify({ success: true, response: assistantResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
