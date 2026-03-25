import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { WhatsAppQRCode } from "@/components/ai/WhatsAppQRCode";
import { ConversationList } from "@/components/ai/ConversationList";
import { ChatViewer } from "@/components/ai/ChatViewer";
import { PromptEditor } from "@/components/ai/PromptEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BrainCircuit, Save, Settings, MessageSquare, TestTube, Eye, EyeOff,
  Volume2, Send, Mic, MicOff, Loader2, Trash2, Bot, Square, Plus, X,
  Clock, Zap, Phone, Facebook, AlarmClock,
} from "lucide-react";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────
interface FollowUpStep {
  id?: string;
  step_number: number;
  delay_hours: number;
  message_template: string;
  channel: "whatsapp" | "email" | "sms";
}

interface FollowUpConfig {
  id?: string;
  name: string;
  trigger_stage: string;
  enabled: boolean;
  steps: FollowUpStep[];
}

let cachedProducts: any[] = [];

const DELAY_OPTIONS = [
  { value: 1, label: "1 hora" },
  { value: 2, label: "2 horas" },
  { value: 4, label: "4 horas" },
  { value: 6, label: "6 horas" },
  { value: 12, label: "12 horas" },
  { value: 24, label: "1 dia" },
  { value: 48, label: "2 dias" },
  { value: 72, label: "3 dias" },
  { value: 96, label: "4 dias" },
  { value: 120, label: "5 dias" },
  { value: 168, label: "7 dias (1 semana)" },
];

const STAGE_OPTIONS = [
  { value: "new", label: "Novo lead" },
  { value: "contacted", label: "Contatado" },
  { value: "qualified", label: "Qualificado" },
  { value: "negotiation", label: "Em negociação" },
  { value: "proposal", label: "Proposta enviada" },
];

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────
const AIAgents = () => {
  // ── Settings state ──────────────────────────────────────────────────────
  const [settings, setSettings] = useState({
    id: "",
    channel_type: "uazapi",
    // UAZAPI
    uazapi_instance_url: "",
    uazapi_token: "",
    // Z-API
    zapi_instance_id: "",
    zapi_instance_token: "",
    zapi_client_token: "",
    // Meta API
    meta_access_token: "",
    meta_phone_number_id: "",
    meta_waba_id: "",
    meta_verify_token: "",
    // AI
    openai_api_key: "",
    // Voice
    elevenlabs_api_key: "",
    elevenlabs_voice_id: "",
    voice_always_on: false,
    // Misc
    system_prompt: "",
    enabled: true,
    whatsapp_connected: false,
  });

  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showElevenLabsKey, setShowElevenLabsKey] = useState(false);
  const [showMetaToken, setShowMetaToken] = useState(false);
  const [enableVoice, setEnableVoice] = useState(false);

  // ── Follow-up state ─────────────────────────────────────────────────────
  const [followUps, setFollowUps] = useState<FollowUpConfig[]>([]);
  const [savingFollowUps, setSavingFollowUps] = useState(false);

  // ── Test chat state ─────────────────────────────────────────────────────
  const [testMessages, setTestMessages] = useState<any[]>([]);
  const [testInput, setTestInput] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  // ── Mic recording ───────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadSettings();
    loadConversations();
    loadFollowUps();
  }, []);

  useEffect(() => {
    if (selectedConversation) loadMessages(selectedConversation);
  }, [selectedConversation]);

  // ── Loaders ─────────────────────────────────────────────────────────────
  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("ai_settings")
      .select("*")
      .eq("user_id", user.id)
      .eq("agent_type", "customer_service")
      .maybeSingle();

    if (data) {
      const channelType = (data as any).channel_type || "uazapi";
      setSettings({
        id: data.id,
        channel_type: channelType,
        uazapi_instance_url: channelType === "uazapi" ? (data.uazapi_instance_url || "") : "",
        uazapi_token: channelType === "uazapi" ? (data.uazapi_token || "") : "",
        zapi_instance_id: (data as any).zapi_instance_id || "",
        zapi_instance_token: (data as any).zapi_instance_token || "",
        zapi_client_token: (data as any).zapi_client_token || "",
        meta_access_token: (data as any).meta_access_token || "",
        meta_phone_number_id: (data as any).meta_phone_number_id || "",
        meta_waba_id: (data as any).meta_waba_id || "",
        meta_verify_token: (data as any).meta_verify_token || "",
        openai_api_key: data.openai_api_key || "",
        elevenlabs_api_key: data.elevenlabs_api_key || "",
        elevenlabs_voice_id: data.elevenlabs_voice_id || "",
        voice_always_on: !!(data as any).voice_always_on,
        system_prompt: data.system_prompt || "",
        enabled: data.enabled ?? true,
        whatsapp_connected: data.whatsapp_connected ?? false,
      });
      setEnableVoice(!!(data.elevenlabs_api_key && data.elevenlabs_voice_id));
    }
  };

  const loadConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", user.id)
      .eq("agent_type", "customer_service")
      .order("last_message_at", { ascending: false });
    if (data) setConversations(data);
  };

  const loadMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from("ai_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  const loadFollowUps = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: configs } = await supabase
      .from("crm_follow_up_configs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (!configs) return;

    const enriched = await Promise.all(
      configs.map(async (cfg: any) => {
        const { data: steps } = await supabase
          .from("crm_follow_up_steps")
          .select("*")
          .eq("config_id", cfg.id)
          .order("step_number", { ascending: true });
        return { ...cfg, steps: steps || [] };
      })
    );
    setFollowUps(enriched);
  };

  // ── Save main settings ──────────────────────────────────────────────────
  const saveSettings = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Usuário não autenticado"); setLoading(false); return; }

    // For Z-API, build the full base URL and store client token in uazapi_token
    // so the edge function (which reads uazapi_instance_url + uazapi_token) works transparently
    const zapiBaseUrl = settings.zapi_instance_id && settings.zapi_instance_token
      ? `https://api.z-api.io/instances/${settings.zapi_instance_id}/token/${settings.zapi_instance_token}`
      : "";

    const payload = {
      user_id: user.id,
      agent_type: "customer_service" as const,
      channel_type: settings.channel_type,
      // UAZAPI: use its own fields; Z-API: store computed URL + client token; otherwise null
      uazapi_instance_url: settings.channel_type === "uazapi" ? settings.uazapi_instance_url
        : settings.channel_type === "zapi" ? zapiBaseUrl : null,
      uazapi_token: settings.channel_type === "uazapi" ? settings.uazapi_token
        : settings.channel_type === "zapi" ? settings.zapi_client_token : null,
      // Z-API individual fields (for display when loading back)
      zapi_instance_id: settings.channel_type === "zapi" ? settings.zapi_instance_id : null,
      zapi_instance_token: settings.channel_type === "zapi" ? settings.zapi_instance_token : null,
      zapi_client_token: settings.channel_type === "zapi" ? settings.zapi_client_token : null,
      // Meta
      meta_access_token: settings.channel_type === "meta" ? settings.meta_access_token : null,
      meta_phone_number_id: settings.channel_type === "meta" ? settings.meta_phone_number_id : null,
      meta_waba_id: settings.channel_type === "meta" ? settings.meta_waba_id : null,
      meta_verify_token: settings.channel_type === "meta" ? settings.meta_verify_token : null,
      openai_api_key: settings.openai_api_key,
      elevenlabs_api_key: enableVoice ? settings.elevenlabs_api_key : null,
      elevenlabs_voice_id: enableVoice ? settings.elevenlabs_voice_id : null,
      voice_always_on: enableVoice ? settings.voice_always_on : false,
      system_prompt: settings.system_prompt,
      enabled: settings.enabled,
    } as any;

    let error;
    if (settings.id) {
      ({ error } = await supabase.from("ai_settings").update(payload).eq("id", settings.id));
    } else {
      const { data, error: insertError } = await supabase
        .from("ai_settings").insert(payload).select().single();
      error = insertError;
      if (data) setSettings((prev) => ({ ...prev, id: data.id }));
    }

    if (error) toast.error("Erro ao salvar configurações");
    else toast.success("Configurações salvas com sucesso!");
    setLoading(false);
  };

  const handleStatusChange = async (connected: boolean) => {
    setSettings((prev) => ({ ...prev, whatsapp_connected: connected }));
    if (settings.id) {
      await supabase.from("ai_settings").update({ whatsapp_connected: connected }).eq("id", settings.id);
    }
  };

  // ── Follow-up helpers ───────────────────────────────────────────────────
  const addFollowUpConfig = () => {
    setFollowUps((prev) => [
      ...prev,
      {
        name: `Sequência ${prev.length + 1}`,
        trigger_stage: "contacted",
        enabled: true,
        steps: [{ step_number: 1, delay_hours: 24, message_template: "", channel: "whatsapp" }],
      },
    ]);
  };

  const removeFollowUpConfig = (index: number) => {
    setFollowUps((prev) => prev.filter((_, i) => i !== index));
  };

  const updateConfig = (index: number, field: keyof FollowUpConfig, value: any) => {
    setFollowUps((prev) =>
      prev.map((cfg, i) => (i === index ? { ...cfg, [field]: value } : cfg))
    );
  };

  const addStep = (configIndex: number) => {
    setFollowUps((prev) =>
      prev.map((cfg, i) => {
        if (i !== configIndex) return cfg;
        const nextNumber = cfg.steps.length + 1;
        const lastDelay = cfg.steps[cfg.steps.length - 1]?.delay_hours ?? 24;
        return {
          ...cfg,
          steps: [
            ...cfg.steps,
            { step_number: nextNumber, delay_hours: lastDelay, message_template: "", channel: "whatsapp" },
          ],
        };
      })
    );
  };

  const removeStep = (configIndex: number, stepIndex: number) => {
    setFollowUps((prev) =>
      prev.map((cfg, i) => {
        if (i !== configIndex) return cfg;
        const steps = cfg.steps
          .filter((_, si) => si !== stepIndex)
          .map((s, si) => ({ ...s, step_number: si + 1 }));
        return { ...cfg, steps };
      })
    );
  };

  const updateStep = (configIndex: number, stepIndex: number, field: keyof FollowUpStep, value: any) => {
    setFollowUps((prev) =>
      prev.map((cfg, i) => {
        if (i !== configIndex) return cfg;
        return {
          ...cfg,
          steps: cfg.steps.map((s, si) => (si === stepIndex ? { ...s, [field]: value } : s)),
        };
      })
    );
  };

  const saveFollowUps = async () => {
    setSavingFollowUps(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Não autenticado"); setSavingFollowUps(false); return; }

    try {
      for (const cfg of followUps) {
        let configId = cfg.id;

        if (configId) {
          await supabase.from("crm_follow_up_configs").update({
            name: cfg.name,
            trigger_stage: cfg.trigger_stage,
            enabled: cfg.enabled,
          }).eq("id", configId);
        } else {
          const { data: newCfg } = await supabase.from("crm_follow_up_configs").insert({
            user_id: user.id,
            name: cfg.name,
            trigger_stage: cfg.trigger_stage,
            enabled: cfg.enabled,
          }).select().single();
          configId = newCfg?.id;
        }

        if (!configId) continue;

        // Delete existing steps and re-insert
        await supabase.from("crm_follow_up_steps").delete().eq("config_id", configId);
        if (cfg.steps.length > 0) {
          await supabase.from("crm_follow_up_steps").insert(
            cfg.steps.map((s) => ({
              config_id: configId,
              step_number: s.step_number,
              delay_hours: s.delay_hours,
              message_template: s.message_template,
              channel: s.channel,
            }))
          );
        }
      }

      toast.success("Follow-ups salvos!");
      loadFollowUps();
    } catch {
      toast.error("Erro ao salvar follow-ups");
    }
    setSavingFollowUps(false);
  };

  // ── Voice helpers ───────────────────────────────────────────────────────
  const generateTTS = async (text: string): Promise<string | null> => {
    if (!enableVoice || !settings.elevenlabs_api_key || !settings.elevenlabs_voice_id) return null;
    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${settings.elevenlabs_voice_id}`,
        {
          method: "POST",
          headers: { "xi-api-key": settings.elevenlabs_api_key, "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        }
      );
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch {
      console.warn("TTS generation failed");
      return null;
    }
  };

  // ── Mic recording ───────────────────────────────────────────────────────
  const startRecording = async () => {
    if (!settings.openai_api_key) { toast.error("Configure a chave da OpenAI primeiro"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setRecordingTime(0);

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size < 1000) { toast.error("Áudio muito curto"); return; }

        setTestLoading(true);
        try {
          const formData = new FormData();
          formData.append("file", audioBlob, "audio.webm");
          formData.append("model", "whisper-1");
          formData.append("language", "pt");
          const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${settings.openai_api_key}` },
            body: formData,
          });
          const whisperData = await whisperRes.json();
          const transcription = whisperData.text;
          if (!transcription?.trim()) { toast.error("Não foi possível transcrever o áudio"); setTestLoading(false); return; }

          const audioUrl = URL.createObjectURL(audioBlob);
          setTestMessages((prev) => [...prev, {
            id: crypto.randomUUID(), role: "user", content: transcription,
            media_url: null, audio_url: audioUrl, created_at: new Date().toISOString(),
          }]);
          await processAIResponse(transcription, true);
        } catch { toast.error("Erro ao processar áudio"); setTestLoading(false); }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch { toast.error("Permissão de microfone negada"); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ── Core AI response processor ──────────────────────────────────────────
  const processAIResponse = async (inputText: string, fromAudio = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let stockContext = "";
      let photoInstructions = "";

      if (user) {
        const { data: products } = await supabase
          .from("products")
          .select("id, brand, model, manufacturing_year, model_year, current_km, plate, price, fipe_price, purchase_price, image_url, vehicle_images")
          .eq("user_id", user.id)
          .eq("sold", false);

        if (products && products.length > 0) {
          cachedProducts = products;
          const formatPrice = (v: number | null) => v ? `R$ ${Number(v).toLocaleString("pt-BR")}` : "Sob consulta";
          const lines = products.map((p, i) => {
            const year = p.model_year ? `${p.manufacturing_year || p.model_year}/${p.model_year}` : (p.manufacturing_year || "");
            const hasPhotos = !!(p.image_url || (p.vehicle_images && (p.vehicle_images as any[]).length > 0));
            return `${i + 1}. [ID:${p.id}] ${p.brand || ""} ${p.model || ""} ${year} — Km: ${p.current_km ?? "N/I"} — Placa: ${p.plate || "N/I"} — Preço: ${formatPrice(p.price || p.fipe_price)} — Fotos: ${hasPhotos ? "SIM" : "NÃO"}`;
          });
          stockContext = `\n\n--- ESTOQUE ATUAL DA LOJA (${products.length} veículos) ---\n${lines.join("\n")}\n\nIMPORTANTE: Apresente SOMENTE os veículos listados acima. Nunca invente veículos.`;
          photoInstructions = `\n\n--- REGRA DE FOTOS ---\nQuando o cliente pedir fotos de um veículo, inclua usando a tag especial: [FOTO:URL_DA_IMAGEM]`;
        } else {
          stockContext = "\n\n--- ESTOQUE ATUAL DA LOJA ---\nNenhum veículo cadastrado no estoque no momento.";
        }
      }

      const systemPrompt = (settings.system_prompt || "Você é um assistente de vendas de veículos. Seja cordial e profissional.") + stockContext + photoInstructions;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${settings.openai_api_key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...testMessages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: inputText },
          ],
          max_tokens: 800,
        }),
      });

      const data = await response.json();
      let assistantContent = data.choices?.[0]?.message?.content || "Sem resposta";

      const photoTagRegex = /\[FOTO:([^\]]+)\]/g;
      const mediaUrls: string[] = [];

      for (const prod of cachedProducts) {
        const prodName = `${prod.brand || ""} ${prod.model || ""}`.trim().toLowerCase();
        if (assistantContent.toLowerCase().includes(prodName) || assistantContent.includes(prod.id)) {
          if (inputText.toLowerCase().match(/foto|imagem|picture|ver|mostrar|enviar/i)) {
            if (prod.image_url) mediaUrls.push(prod.image_url);
            if (prod.vehicle_images && Array.isArray(prod.vehicle_images)) {
              for (const img of prod.vehicle_images as string[]) {
                if (typeof img === "string" && img.startsWith("http")) mediaUrls.push(img);
              }
            }
          }
        }
      }

      let match;
      while ((match = photoTagRegex.exec(assistantContent)) !== null) {
        const url = match[1].trim();
        if (url.startsWith("http")) mediaUrls.push(url);
      }
      assistantContent = assistantContent.replace(photoTagRegex, "").trim();

      // Respond with audio when: voice enabled AND (incoming was audio OR voice_always_on)
      const shouldRespondWithAudio = enableVoice && (fromAudio || settings.voice_always_on);
      const audioUrl = shouldRespondWithAudio ? await generateTTS(assistantContent) : null;

      setTestMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: assistantContent,
          media_url: mediaUrls.length > 0 ? mediaUrls.join(",") : null,
          audio_url: audioUrl,
          created_at: new Date().toISOString(),
        },
      ]);

      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play().catch(() => {});
      }
    } catch {
      toast.error("Erro ao testar agente. Verifique a chave da OpenAI.");
    } finally {
      setTestLoading(false);
    }
  };

  const sendTestMessage = async () => {
    if (!testInput.trim()) return;
    if (!settings.openai_api_key) { toast.error("Configure a chave da OpenAI primeiro"); return; }
    const userMsg = {
      id: crypto.randomUUID(), role: "user", content: testInput,
      media_url: null, audio_url: null, created_at: new Date().toISOString(),
    };
    setTestMessages((prev) => [...prev, userMsg]);
    const input = testInput;
    setTestInput("");
    setTestLoading(true);
    await processAIResponse(input, false);
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BrainCircuit className="h-8 w-8" />
            Agentes IA — Atendimento ao Cliente
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure seu agente de IA humanizado para atendimento via WhatsApp
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="agent-enabled">Agente Ativo</Label>
          <Switch
            id="agent-enabled"
            checked={settings.enabled}
            onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, enabled: checked }))}
          />
        </div>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="followup" className="flex items-center gap-2">
            <AlarmClock className="h-4 w-4" />
            Follow-up
          </TabsTrigger>
          <TabsTrigger value="conversations" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversas
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Teste
          </TabsTrigger>
        </TabsList>

        {/* ═══ TAB: Configuração ═══════════════════════════════════════════ */}
        <TabsContent value="config" className="space-y-6 mt-6">
          <PromptEditor
            value={settings.system_prompt}
            onChange={(value) => setSettings((prev) => ({ ...prev, system_prompt: value }))}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* APIs de IA */}
            <Card>
              <CardHeader>
                <CardTitle>APIs de Inteligência Artificial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="openai-key">Chave API OpenAI</Label>
                  <div className="flex gap-2">
                    <Input
                      id="openai-key"
                      type={showApiKey ? "text" : "password"}
                      placeholder="sk-..."
                      value={settings.openai_api_key}
                      onChange={(e) => setSettings((prev) => ({ ...prev, openai_api_key: e.target.value }))}
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowApiKey(!showApiKey)}>
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* ElevenLabs Voice */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5" />
                    <Label>ElevenLabs (Voz)</Label>
                  </div>
                  <Switch checked={enableVoice} onCheckedChange={setEnableVoice} />
                </div>

                {enableVoice && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="space-y-2">
                      <Label htmlFor="elevenlabs-key">Chave API ElevenLabs</Label>
                      <div className="flex gap-2">
                        <Input
                          id="elevenlabs-key"
                          type={showElevenLabsKey ? "text" : "password"}
                          placeholder="Sua chave ElevenLabs"
                          value={settings.elevenlabs_api_key}
                          onChange={(e) => setSettings((prev) => ({ ...prev, elevenlabs_api_key: e.target.value }))}
                        />
                        <Button variant="outline" size="icon" onClick={() => setShowElevenLabsKey(!showElevenLabsKey)}>
                          {showElevenLabsKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="voice-id">Voice ID</Label>
                      <Input
                        id="voice-id"
                        placeholder="ID da voz no ElevenLabs"
                        value={settings.elevenlabs_voice_id}
                        onChange={(e) => setSettings((prev) => ({ ...prev, elevenlabs_voice_id: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Encontre o Voice ID no painel da ElevenLabs na seção de vozes.
                      </p>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                      <div>
                        <p className="text-sm font-medium">Responder em áudio sempre</p>
                        <p className="text-xs text-muted-foreground">
                          Quando ativo, o agente responde em áudio para TODAS as mensagens.<br />
                          Quando inativo, responde em áudio apenas quando o cliente enviar um áudio.
                        </p>
                      </div>
                      <Switch
                        checked={settings.voice_always_on}
                        onCheckedChange={(v) => setSettings((prev) => ({ ...prev, voice_always_on: v }))}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Canal de Envio */}
            <div className="space-y-4">
              {/* Provider selector — 3 cards */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Canal de Envio WhatsApp</Label>
                <p className="text-xs text-muted-foreground">Escolha o provedor. Cada um tem uma forma diferente de conexão.</p>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {[
                    { value: "uazapi", label: "UAZAPI", desc: "API não-oficial", icon: <Zap className="h-5 w-5 text-green-500" /> },
                    { value: "zapi",   label: "Z-API",  desc: "API não-oficial", icon: <Zap className="h-5 w-5 text-yellow-500" /> },
                    { value: "meta",   label: "Meta",   desc: "Business Oficial", icon: <Facebook className="h-5 w-5 text-blue-500" /> },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, channel_type: opt.value }))}
                      className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all ${
                        settings.channel_type === opt.value
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {opt.icon}
                      <span className="text-sm font-semibold">{opt.label}</span>
                      <span className="text-xs text-muted-foreground leading-tight">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── UAZAPI form ──────────────────────────────────────────── */}
              {settings.channel_type === "uazapi" && (
                <Card className="border-green-200 animate-in fade-in">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Zap className="h-4 w-4 text-green-500" />
                      Configuração UAZAPI
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>URL da Instância</Label>
                      <Input
                        placeholder="https://sua-instancia.uazapi.com"
                        value={settings.uazapi_instance_url}
                        onChange={(e) => setSettings((prev) => ({ ...prev, uazapi_instance_url: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Token (Bearer)</Label>
                      <div className="flex gap-2">
                        <Input
                          type={showToken ? "text" : "password"}
                          placeholder="Seu token UAZAPI"
                          value={settings.uazapi_token}
                          onChange={(e) => setSettings((prev) => ({ ...prev, uazapi_token: e.target.value }))}
                        />
                        <Button variant="outline" size="icon" onClick={() => setShowToken(!showToken)}>
                          {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <WhatsAppQRCode
                      provider="uazapi"
                      instanceUrl={settings.uazapi_instance_url}
                      token={settings.uazapi_token}
                      connected={settings.whatsapp_connected}
                      onStatusChange={handleStatusChange}
                    />
                  </CardContent>
                </Card>
              )}

              {/* ── Z-API form ───────────────────────────────────────────── */}
              {settings.channel_type === "zapi" && (
                <Card className="border-yellow-200 animate-in fade-in">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      Configuração Z-API
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-3 text-xs text-yellow-800 dark:text-yellow-200">
                      Acesse <strong>app.z-api.io</strong> → sua instância para obter o Instance ID, Instance Token e o Security Token (Client-Token).
                    </div>
                    <div className="space-y-2">
                      <Label>Instance ID</Label>
                      <Input
                        placeholder="Ex: 3D9B8...A1C"
                        value={settings.zapi_instance_id}
                        onChange={(e) => setSettings((prev) => ({ ...prev, zapi_instance_id: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Instance Token</Label>
                      <div className="flex gap-2">
                        <Input
                          type={showToken ? "text" : "password"}
                          placeholder="Token da instância"
                          value={settings.zapi_instance_token}
                          onChange={(e) => setSettings((prev) => ({ ...prev, zapi_instance_token: e.target.value }))}
                        />
                        <Button variant="outline" size="icon" onClick={() => setShowToken(!showToken)}>
                          {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Security Token (Client-Token)</Label>
                      <Input
                        type="password"
                        placeholder="Token de segurança"
                        value={settings.zapi_client_token}
                        onChange={(e) => setSettings((prev) => ({ ...prev, zapi_client_token: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">Encontrado em "Security" na página da instância no Z-API.</p>
                    </div>
                    {settings.zapi_instance_id && settings.zapi_instance_token && (
                      <div className="rounded-lg bg-muted p-2 text-xs text-muted-foreground break-all">
                        <strong>URL gerada:</strong> https://api.z-api.io/instances/{settings.zapi_instance_id}/token/{settings.zapi_instance_token}
                      </div>
                    )}
                    <WhatsAppQRCode
                      provider="zapi"
                      instanceUrl={
                        settings.zapi_instance_id && settings.zapi_instance_token
                          ? `https://api.z-api.io/instances/${settings.zapi_instance_id}/token/${settings.zapi_instance_token}`
                          : ""
                      }
                      token={settings.zapi_client_token}
                      connected={settings.whatsapp_connected}
                      onStatusChange={handleStatusChange}
                    />
                  </CardContent>
                </Card>
              )}

              {/* ── Meta Cloud API form ──────────────────────────────────── */}
              {settings.channel_type === "meta" && (
                <Card className="border-blue-200 animate-in fade-in">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Facebook className="h-4 w-4 text-blue-500" />
                      Configuração Meta Cloud API
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-800 dark:text-blue-200">
                      <p className="font-semibold mb-1">WhatsApp Business Cloud API (Oficial)</p>
                      <p>Configure no <strong>Meta Business Manager → WhatsApp → API Setup</strong>. Não usa QR Code — o número é verificado pelo Meta.</p>
                      <p className="mt-1">Webhook: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">…/functions/v1/ai-customer-service</code></p>
                    </div>
                    <div className="space-y-2">
                      <Label>Token de Acesso Permanente</Label>
                      <div className="flex gap-2">
                        <Input
                          type={showMetaToken ? "text" : "password"}
                          placeholder="EAAxxxxxxxxxx..."
                          value={settings.meta_access_token}
                          onChange={(e) => setSettings((prev) => ({ ...prev, meta_access_token: e.target.value }))}
                        />
                        <Button variant="outline" size="icon" onClick={() => setShowMetaToken(!showMetaToken)}>
                          {showMetaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number ID</Label>
                      <Input
                        placeholder="123456789012345"
                        value={settings.meta_phone_number_id}
                        onChange={(e) => setSettings((prev) => ({ ...prev, meta_phone_number_id: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>WABA ID (WhatsApp Business Account)</Label>
                      <Input
                        placeholder="123456789012345"
                        value={settings.meta_waba_id}
                        onChange={(e) => setSettings((prev) => ({ ...prev, meta_waba_id: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Verify Token (Webhook)</Label>
                      <Input
                        placeholder="token-secreto-do-webhook"
                        value={settings.meta_verify_token}
                        onChange={(e) => setSettings((prev) => ({ ...prev, meta_verify_token: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">Mesmo token configurado no Meta Business Manager para verificar o webhook.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <Button onClick={saveSettings} disabled={loading} size="lg" className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Salvar Todas as Configurações
          </Button>
        </TabsContent>

        {/* ═══ TAB: Follow-up ══════════════════════════════════════════════ */}
        <TabsContent value="followup" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <AlarmClock className="h-5 w-5" />
                Sequências de Follow-up
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configure mensagens automáticas enviadas após um lead entrar em um estágio do funil.
              </p>
            </div>
            <Button onClick={addFollowUpConfig} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Nova Sequência
            </Button>
          </div>

          {followUps.length === 0 && (
            <div className="text-center py-12 border rounded-xl border-dashed">
              <AlarmClock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">Nenhuma sequência criada ainda</p>
              <p className="text-sm text-muted-foreground mt-1">Crie uma sequência para enviar follow-ups automáticos aos leads</p>
              <Button onClick={addFollowUpConfig} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira sequência
              </Button>
            </div>
          )}

          {followUps.map((cfg, cfgIdx) => (
            <Card key={cfgIdx} className="border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Input
                      value={cfg.name}
                      onChange={(e) => updateConfig(cfgIdx, "name", e.target.value)}
                      className="font-semibold max-w-xs"
                      placeholder="Nome da sequência"
                    />
                    <Badge variant={cfg.enabled ? "default" : "secondary"}>
                      {cfg.enabled ? "Ativa" : "Pausada"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">Ativa</Label>
                    <Switch
                      checked={cfg.enabled}
                      onCheckedChange={(v) => updateConfig(cfgIdx, "enabled", v)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeFollowUpConfig(cfgIdx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <Label className="text-sm whitespace-nowrap">Disparar quando lead entrar em:</Label>
                  <Select
                    value={cfg.trigger_stage}
                    onValueChange={(v) => updateConfig(cfgIdx, "trigger_stage", v)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {cfg.steps.map((step, stepIdx) => (
                  <div key={stepIdx} className="relative flex gap-3">
                    {/* Timeline connector */}
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                        {step.step_number}
                      </div>
                      {stepIdx < cfg.steps.length - 1 && (
                        <div className="w-0.5 flex-1 bg-border mt-1" style={{ minHeight: 24 }} />
                      )}
                    </div>

                    <div className="flex-1 space-y-3 pb-4">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Label className="text-sm whitespace-nowrap">Enviar após:</Label>
                        <Select
                          value={String(step.delay_hours)}
                          onValueChange={(v) => updateStep(cfgIdx, stepIdx, "delay_hours", Number(v))}
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DELAY_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={step.channel}
                          onValueChange={(v) => updateStep(cfgIdx, stepIdx, "channel", v as any)}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="email">E-mail</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive ml-auto"
                          onClick={() => removeStep(cfgIdx, stepIdx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <Textarea
                        value={step.message_template}
                        onChange={(e) => updateStep(cfgIdx, stepIdx, "message_template", e.target.value)}
                        placeholder="Mensagem do follow-up... Use {{nome}} para o nome do lead, {{veiculo}} para o veículo de interesse."
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addStep(cfgIdx)}
                  className="w-full border-dashed"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar passo
                </Button>
              </CardContent>
            </Card>
          ))}

          {followUps.length > 0 && (
            <Button onClick={saveFollowUps} disabled={savingFollowUps} size="lg" className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {savingFollowUps ? "Salvando..." : "Salvar Sequências de Follow-up"}
            </Button>
          )}
        </TabsContent>

        {/* ═══ TAB: Conversas ═══════════════════════════════════════════════ */}
        <TabsContent value="conversations" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversation}
              onSelect={setSelectedConversation}
            />
            <div className="lg:col-span-2">
              <ChatViewer
                messages={messages}
                title={selectedConversation ? "Histórico da Conversa" : "Selecione uma conversa"}
              />
            </div>
          </div>
        </TabsContent>

        {/* ═══ TAB: Teste ═══════════════════════════════════════════════════ */}
        <TabsContent value="test" className="mt-6">
          <div className="rounded-2xl border border-slate-200 shadow-lg overflow-hidden flex flex-col" style={{ height: "calc(100vh - 240px)", minHeight: "500px" }}>
            {/* Header */}
            <div className="shrink-0 bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md">
                  <Bot className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Agente IA</h3>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                    Online — Teste
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {enableVoice && (
                  <div className="flex items-center gap-1.5 bg-emerald-600/20 border border-emerald-500/30 rounded-full px-3 py-1">
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                      {settings.voice_always_on ? "Voz Sempre" : "Voz p/ Áudio"}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => setTestMessages([])}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                  title="Limpar conversa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <ChatViewer messages={testMessages} embedded />

            {/* Typing Indicator */}
            {testLoading && (
              <div className="shrink-0 bg-slate-900/95 px-5 py-2.5 border-t border-slate-700/50">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                  <span className="text-xs text-slate-400">Agente está digitando...</span>
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="shrink-0 bg-slate-900 border-t border-slate-700/50 p-3 flex items-end gap-2">
              {isRecording ? (
                <div className="flex-1 flex items-center gap-3 min-h-[44px] rounded-xl bg-red-950/40 border border-red-500/30 px-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-mono text-red-400 flex-1">{formatRecordingTime(recordingTime)}</span>
                  <span className="text-xs text-red-400/70">Gravando…</span>
                </div>
              ) : (
                <Textarea
                  placeholder="Digite uma mensagem para testar o agente..."
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendTestMessage(); }
                  }}
                  className="flex-1 min-h-[44px] max-h-[120px] resize-none rounded-xl border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 text-sm focus:border-blue-500 focus:ring-blue-500/30"
                  rows={1}
                />
              )}

              {isRecording ? (
                <Button onClick={stopRecording} size="icon" className="h-11 w-11 rounded-xl bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/25">
                  <Square className="h-4 w-4 fill-white" />
                </Button>
              ) : testInput.trim() ? (
                <Button onClick={sendTestMessage} disabled={testLoading} size="icon" className="h-11 w-11 rounded-xl bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/25 disabled:opacity-40">
                  {testLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              ) : (
                <Button onClick={startRecording} disabled={testLoading} size="icon" className="h-11 w-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/25 disabled:opacity-40">
                  {testLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
                </Button>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIAgents;
