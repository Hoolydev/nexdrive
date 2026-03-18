import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { WhatsAppQRCode } from "@/components/ai/WhatsAppQRCode";
import { ConversationList } from "@/components/ai/ConversationList";
import { ChatViewer } from "@/components/ai/ChatViewer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bot, Save, Package, DollarSign, TrendingUp, Eye, EyeOff } from "lucide-react";

const AIStore = () => {
  const [settings, setSettings] = useState({
    id: "",
    uazapi_instance_url: "",
    uazapi_token: "",
    openai_api_key: "",
    owner_phone: "",
    enabled: true,
    whatsapp_connected: false,
  });
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stockStats, setStockStats] = useState({ total: 0, invested: 0, fipeTotal: 0 });
  const [showApiKey, setShowApiKey] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    loadSettings();
    loadConversations();
    loadStockStats();
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
      .eq("agent_type", "store_assistant")
      .maybeSingle();

    if (data) {
      setSettings({
        id: data.id,
        uazapi_instance_url: data.uazapi_instance_url || "",
        uazapi_token: data.uazapi_token || "",
        openai_api_key: data.openai_api_key || "",
        owner_phone: data.owner_phone || "",
        enabled: data.enabled ?? true,
        whatsapp_connected: data.whatsapp_connected ?? false,
      });
    }
  };

  const loadConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", user.id)
      .eq("agent_type", "store_assistant")
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

  const loadStockStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: products } = await supabase
      .from("products")
      .select("purchase_price, fipe_price")
      .eq("user_id", user.id)
      .eq("sold", false);

    if (products) {
      setStockStats({
        total: products.length,
        invested: products.reduce((sum, p) => sum + (p.purchase_price || 0), 0),
        fipeTotal: products.reduce((sum, p) => sum + (p.fipe_price || 0), 0),
      });
    }
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
      agent_type: "store_assistant" as const,
      uazapi_instance_url: settings.uazapi_instance_url,
      uazapi_token: settings.uazapi_token,
      openai_api_key: settings.openai_api_key,
      owner_phone: settings.owner_phone,
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bot className="h-8 w-8" />
            Assistente IA LOJA
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seu estoque via WhatsApp com inteligência artificial
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Veículos em Estoque</p>
                <p className="text-2xl font-bold">{stockStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Investido</p>
                <p className="text-2xl font-bold">{formatCurrency(stockStats.invested)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Valor FIPE Total</p>
                <p className="text-2xl font-bold">{formatCurrency(stockStats.fipeTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Code & Connection */}
        <WhatsAppQRCode
          instanceUrl={settings.uazapi_instance_url}
          token={settings.uazapi_token}
          connected={settings.whatsapp_connected}
          onStatusChange={handleStatusChange}
        />

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
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

            <div className="space-y-2">
              <Label htmlFor="owner-phone">Telefone do Dono (com DDD)</Label>
              <Input
                id="owner-phone"
                placeholder="5511999999999"
                value={settings.owner_phone}
                onChange={(e) => setSettings((prev) => ({ ...prev, owner_phone: e.target.value }))}
              />
            </div>

            <Separator />

            <Button onClick={saveSettings} disabled={loading} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Conversations */}
      <Separator />
      <h2 className="text-xl font-semibold">Monitoramento de Conversas</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversation}
          onSelect={setSelectedConversation}
        />
        <div className="lg:col-span-2">
          <ChatViewer
            messages={messages}
            title={selectedConversation ? "Histórico" : "Selecione uma conversa"}
          />
        </div>
      </div>
    </div>
  );
};

export default AIStore;
