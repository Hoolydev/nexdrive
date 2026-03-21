import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppQRCode } from "@/components/ai/WhatsAppQRCode";
import { ConversationList } from "@/components/ai/ConversationList";
import { ChatViewer } from "@/components/ai/ChatViewer";
import { PromptEditor } from "@/components/ai/PromptEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BrainCircuit, Save, Settings, MessageSquare, TestTube, Eye, EyeOff, Volume2, Send, Mic, MicOff, Loader2, Trash2, Bot, Square } from "lucide-react";

// Cached products with images for photo lookup
let cachedProducts: any[] = [];

const AIAgents = () => {
  const [settings, setSettings] = useState({
    id: "",
    uazapi_instance_url: "",
    uazapi_token: "",
    openai_api_key: "",
    elevenlabs_api_key: "",
    elevenlabs_voice_id: "",
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
  const [enableVoice, setEnableVoice] = useState(false);

  // Chat de teste
  const [testMessages, setTestMessages] = useState<any[]>([]);
  const [testInput, setTestInput] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  // Mic recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadSettings();
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) loadMessages(selectedConversation);
  }, [selectedConversation]);

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
      setSettings({
        id: data.id,
        uazapi_instance_url: data.uazapi_instance_url || "",
        uazapi_token: data.uazapi_token || "",
        openai_api_key: data.openai_api_key || "",
        elevenlabs_api_key: data.elevenlabs_api_key || "",
        elevenlabs_voice_id: data.elevenlabs_voice_id || "",
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

  const saveSettings = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Usuário não autenticado");
      setLoading(false);
      return;
    }

    const payload = {
      user_id: user.id,
      agent_type: "customer_service" as const,
      uazapi_instance_url: settings.uazapi_instance_url,
      uazapi_token: settings.uazapi_token,
      openai_api_key: settings.openai_api_key,
      elevenlabs_api_key: enableVoice ? settings.elevenlabs_api_key : null,
      elevenlabs_voice_id: enableVoice ? settings.elevenlabs_voice_id : null,
      system_prompt: settings.system_prompt,
      enabled: settings.enabled,
    };

    let error;
    if (settings.id) {
      ({ error } = await supabase.from("ai_settings").update(payload).eq("id", settings.id));
    } else {
      const { data, error: insertError } = await supabase.from("ai_settings").insert(payload).select().single();
      error = insertError;
      if (data) setSettings((prev) => ({ ...prev, id: data.id }));
    }

    if (error) {
      toast.error("Erro ao salvar configurações");
    } else {
      toast.success("Configurações salvas com sucesso!");
    }
    setLoading(false);
  };

  const handleStatusChange = async (connected: boolean) => {
    setSettings((prev) => ({ ...prev, whatsapp_connected: connected }));
    if (settings.id) {
      await supabase.from("ai_settings").update({ whatsapp_connected: connected }).eq("id", settings.id);
    }
  };

  // ── Voice (TTS) helpers ──────────────────────────────────────────────
  const generateTTS = async (text: string): Promise<string | null> => {
    if (!enableVoice || !settings.elevenlabs_api_key || !settings.elevenlabs_voice_id) return null;
    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${settings.elevenlabs_voice_id}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": settings.elevenlabs_api_key,
            "Content-Type": "application/json",
          },
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

  // ── Mic Recording (MediaRecorder + Whisper) ───────────────────────
  const startRecording = async () => {
    if (!settings.openai_api_key) {
      toast.error("Configure a chave da OpenAI primeiro");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setRecordingTime(0);

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size < 1000) { toast.error("Áudio muito curto"); return; }

        setTestLoading(true);
        try {
          // Transcribe with Whisper
          const formData = new FormData();
          formData.append("file", audioBlob, "audio.webm");
          formData.append("model", "whisper-1");
          formData.append("language", "pt");

          const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${settings.openai_api_key}` },
            body: formData,
          });
          const whisperData = await whisperRes.json();
          const transcription = whisperData.text;

          if (!transcription?.trim()) {
            toast.error("Não foi possível transcrever o áudio");
            setTestLoading(false);
            return;
          }

          // Create user audio message with transcription
          const audioUrl = URL.createObjectURL(audioBlob);
          const userMsg = {
            id: crypto.randomUUID(),
            role: "user",
            content: transcription,
            media_url: null,
            audio_url: audioUrl,
            created_at: new Date().toISOString(),
          };
          setTestMessages((prev) => [...prev, userMsg]);

          // Now send the transcription as text to the AI
          await processAIResponse(transcription);
        } catch {
          toast.error("Erro ao processar áudio");
          setTestLoading(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      toast.error("Permissão de microfone negada");
    }
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

  // ── Core AI response processor (shared by text + voice) ───────────
  const processAIResponse = async (inputText: string) => {
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
          const formatPrice = (v: number | null) =>
            v ? `R$ ${Number(v).toLocaleString("pt-BR")}` : "Sob consulta";

          const lines = products.map((p, i) => {
            const year = p.model_year
              ? `${p.manufacturing_year || p.model_year}/${p.model_year}`
              : (p.manufacturing_year || "");
            const hasPhotos = !!(p.image_url || (p.vehicle_images && (p.vehicle_images as any[]).length > 0));
            return `${i + 1}. [ID:${p.id}] ${p.brand || ""} ${p.model || ""} ${year} — Km: ${p.current_km ?? "N/I"} — Placa: ${p.plate || "N/I"} — Preço: ${formatPrice(p.price || p.fipe_price)} — Fotos: ${hasPhotos ? "SIM" : "NÃO"}`;
          });

          stockContext = `\n\n--- ESTOQUE ATUAL DA LOJA (${products.length} veículos) ---\n${lines.join("\n")}\n\nIMPORTANTE: Apresente SOMENTE os veículos listados acima. Nunca invente veículos.`;
          photoInstructions = `\n\n--- REGRA DE FOTOS ---\nQuando o cliente pedir fotos de um veículo, você deve incluir as imagens usando a tag especial: [FOTO:URL_DA_IMAGEM]\nPara cada veículo, use o ID entre colchetes para buscar as fotos. Inclua TODAS as fotos disponíveis do veículo.\nSe o veículo não tiver fotos (Fotos: NÃO), informe que as fotos estão sendo preparadas.`;
        } else {
          stockContext = "\n\n--- ESTOQUE ATUAL DA LOJA ---\nNenhum veículo cadastrado no estoque no momento.";
        }
      }

      const systemPrompt = (settings.system_prompt || "Você é um assistente de vendas de veículos. Seja cordial e profissional.") + stockContext + photoInstructions;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.openai_api_key}`,
          "Content-Type": "application/json",
        },
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

      // ── Replace [FOTO:ID_BASED] references with actual image URLs ────
      // Check if AI referenced product IDs for photos, inject real URLs
      const photoTagRegex = /\[FOTO:([^\]]+)\]/g;
      const mediaUrls: string[] = [];

      // Also try to detect product ID references and inject real photos
      for (const prod of cachedProducts) {
        const prodName = `${prod.brand || ""} ${prod.model || ""}`.trim().toLowerCase();
        if (assistantContent.toLowerCase().includes(prodName) || assistantContent.includes(prod.id)) {
          // Check if the AI is discussing this vehicle and photos were requested
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

      // Replace [FOTO:url] tags with actual media_urls
      let match;
      while ((match = photoTagRegex.exec(assistantContent)) !== null) {
        const url = match[1].trim();
        if (url.startsWith("http")) mediaUrls.push(url);
      }
      // Clean FOTO tags from text display
      assistantContent = assistantContent.replace(photoTagRegex, "").trim();

      const audioUrl = await generateTTS(assistantContent);

      const assistantMsg = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: assistantContent,
        media_url: mediaUrls.length > 0 ? mediaUrls.join(",") : null,
        audio_url: audioUrl,
        created_at: new Date().toISOString(),
      };
      setTestMessages((prev) => [...prev, assistantMsg]);

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
    if (!settings.openai_api_key) {
      toast.error("Configure a chave da OpenAI primeiro");
      return;
    }

    const userMsg = {
      id: crypto.randomUUID(),
      role: "user",
      content: testInput,
      media_url: null,
      audio_url: null,
      created_at: new Date().toISOString(),
    };
    setTestMessages((prev) => [...prev, userMsg]);
    const input = testInput;
    setTestInput("");
    setTestLoading(true);
    await processAIResponse(input);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BrainCircuit className="h-8 w-8" />
            Agentes IA - Atendimento ao Cliente
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuração
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

        {/* TAB: Configuração */}
        <TabsContent value="config" className="space-y-6 mt-6">
          {/* Prompt do Sistema */}
          <PromptEditor
            value={settings.system_prompt}
            onChange={(value) => setSettings((prev) => ({ ...prev, system_prompt: value }))}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* API Keys */}
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

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5" />
                    <Label>ElevenLabs (Voz)</Label>
                  </div>
                  <Switch
                    checked={enableVoice}
                    onCheckedChange={setEnableVoice}
                  />
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
                  </div>
                )}
              </CardContent>
            </Card>

            {/* WhatsApp */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Conexão WhatsApp</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="instance-url">URL da Instância UAZAPI</Label>
                    <Input
                      id="instance-url"
                      placeholder="https://sua-instancia.uazapi.com"
                      value={settings.uazapi_instance_url}
                      onChange={(e) => setSettings((prev) => ({ ...prev, uazapi_instance_url: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="uazapi-token">Token UAZAPI</Label>
                    <div className="flex gap-2">
                      <Input
                        id="uazapi-token"
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
                </CardContent>
              </Card>

              <WhatsAppQRCode
                instanceUrl={settings.uazapi_instance_url}
                token={settings.uazapi_token}
                connected={settings.whatsapp_connected}
                onStatusChange={handleStatusChange}
              />
            </div>
          </div>

          <Button onClick={saveSettings} disabled={loading} size="lg" className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Salvar Todas as Configurações
          </Button>
        </TabsContent>

        {/* TAB: Conversas */}
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

        {/* TAB: Teste */}
        <TabsContent value="test" className="mt-6">
          <div className="rounded-2xl border border-slate-200 shadow-lg overflow-hidden flex flex-col" style={{ height: "calc(100vh - 240px)", minHeight: "500px" }}>
            {/* Chat Header */}
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
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Voz Ativa</span>
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
                /* Recording Mode */
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
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendTestMessage();
                    }
                  }}
                  className="flex-1 min-h-[44px] max-h-[120px] resize-none rounded-xl border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 text-sm focus:border-blue-500 focus:ring-blue-500/30"
                  rows={1}
                />
              )}

              {/* Mic / Stop / Send button */}
              {isRecording ? (
                <Button
                  onClick={stopRecording}
                  size="icon"
                  className="h-11 w-11 rounded-xl bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/25 transition-all"
                >
                  <Square className="h-4 w-4 fill-white" />
                </Button>
              ) : testInput.trim() ? (
                <Button
                  onClick={sendTestMessage}
                  disabled={testLoading}
                  size="icon"
                  className="h-11 w-11 rounded-xl bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/25 transition-all disabled:opacity-40"
                >
                  {testLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              ) : (
                <Button
                  onClick={startRecording}
                  disabled={testLoading}
                  size="icon"
                  className="h-11 w-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-40"
                >
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
