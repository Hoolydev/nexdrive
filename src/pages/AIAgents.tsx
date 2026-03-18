import { useState, useEffect } from "react";
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
import { BrainCircuit, Save, Settings, MessageSquare, TestTube, Eye, EyeOff, Volume2, Send } from "lucide-react";

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
    setTestInput("");
    setTestLoading(true);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.openai_api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: settings.system_prompt || "Você é um assistente de vendas de veículos. Seja cordial e profissional.",
            },
            ...testMessages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: testInput },
          ],
          max_tokens: 500,
        }),
      });

      const data = await response.json();
      const assistantContent = data.choices?.[0]?.message?.content || "Sem resposta";

      const assistantMsg = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: assistantContent,
        media_url: null,
        audio_url: null,
        created_at: new Date().toISOString(),
      };
      setTestMessages((prev) => [...prev, assistantMsg]);
    } catch {
      toast.error("Erro ao testar agente. Verifique a chave da OpenAI.");
    } finally {
      setTestLoading(false);
    }
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Testar Agente
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Teste seu agente antes de conectar ao WhatsApp. As mensagens aqui usam o prompt configurado acima.
              </p>
            </CardHeader>
            <CardContent>
              <ChatViewer messages={testMessages} title="" />
              <div className="flex gap-2 mt-4">
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
                  className="min-h-[60px]"
                />
                <Button onClick={sendTestMessage} disabled={testLoading || !testInput.trim()} size="icon" className="h-[60px] w-[60px]">
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIAgents;
