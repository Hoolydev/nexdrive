import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Store, ExternalLink, Save, Palette, Upload, Globe, LayoutTemplate, CheckCircle2 } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function StoreSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectingDomain, setConnectingDomain] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    store_name: "",
    slug: "",
    description: "",
    whatsapp_number: "",
    phone: "",
    cnpj: "",
    email: "",
    address: "",
    instagram_url: "",
    facebook_url: "",
    primary_color: "#1e40af",
    secondary_color: "#ffffff",
    custom_domain: "",
    hero_template: "modern",
    theme_palette: "nexdrive-blue",
    font_family: "inter",
    active: true,
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from("store_settings").select("*").eq("user_id", user.id).maybeSingle();

    if (data) {
      setSettingsId(data.id);
      setLogoUrl((data as any).logo_url || null);
      setForm({
        store_name: data.store_name || "",
        slug: data.slug || "",
        description: data.description || "",
        whatsapp_number: data.whatsapp_number || "",
        phone: data.phone || "",
        cnpj: (data as any).cnpj || "",
        email: data.email || "",
        address: data.address || "",
        instagram_url: data.instagram_url || "",
        facebook_url: data.facebook_url || "",
        primary_color: data.primary_color || "#1e40af",
        secondary_color: data.secondary_color || "#ffffff",
        custom_domain: data.custom_domain || "",
        hero_template: data.hero_template || "modern",
        theme_palette: data.theme_palette || "nexdrive-blue",
        font_family: data.font_family || "inter",
        active: data.active !== false,
      });
    }
    setLoading(false);
  };

  const maskCnpj = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nao autenticado");

      const { error } = await supabase.storage
        .from('vehicle-images')
        .upload(`logos/${user.id}/logo`, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('vehicle-images').getPublicUrl(`logos/${user.id}/logo`);
      const newLogoUrl = urlData.publicUrl + `?t=${Date.now()}`;
      setLogoUrl(newLogoUrl);

      // Save logo_url to store_settings
      if (settingsId) {
        await supabase.from("store_settings").update({ logo_url: urlData.publicUrl } as any).eq("id", settingsId);
      }

      toast.success("Logo enviada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao enviar logo: " + error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (name: string) => {
    setForm({
      ...form,
      store_name: name,
      slug: form.slug || generateSlug(name),
    });
  };

  const save = async () => {
    if (!form.store_name.trim() || !form.slug.trim()) {
      toast.error("Nome e slug sao obrigatorios");
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const slug = generateSlug(form.slug);

    // Check slug uniqueness
    const { data: existing } = await supabase.from("store_settings")
      .select("id").eq("slug", slug).neq("user_id", user.id).maybeSingle();

    if (existing) {
      toast.error("Este slug ja esta em uso. Escolha outro.");
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      store_name: form.store_name.trim(),
      slug,
      description: form.description || null,
      whatsapp_number: form.whatsapp_number || null,
      phone: form.phone || null,
      cnpj: form.cnpj || null,
      email: form.email || null,
      address: form.address || null,
      instagram_url: form.instagram_url || null,
      facebook_url: form.facebook_url || null,
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
      custom_domain: form.custom_domain || null,
      hero_template: form.hero_template,
      theme_palette: form.theme_palette,
      font_family: form.font_family,
      active: form.active,
    } as any;

    let error;
    if (settingsId) {
      ({ error } = await supabase.from("store_settings").update(payload).eq("id", settingsId));
    } else {
      const res = await supabase.from("store_settings").insert(payload).select().single();
      error = res.error;
      if (res.data) setSettingsId(res.data.id);
    }

    if (error) { toast.error("Erro ao salvar"); setSaving(false); return; }
    toast.success("Configurações salvas!");
    setForm({ ...form, slug });
    setSaving(false);
  };

  const handleConnectDomain = async () => {
    if (!form.custom_domain) {
      toast.error("Digite um domínio válido");
      return;
    }
    
    // basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(form.custom_domain)) {
      toast.error("Formato de domínio inválido. Ex: sualoja.com.br");
      return;
    }

    setConnectingDomain(true);
    try {
      const { data, error } = await supabase.functions.invoke('vercel-domains', {
        body: { domain: form.custom_domain.toLowerCase(), action: "add" }
      });

      if (error) throw error;
      
      toast.success("Domínio registrado na plataforma!");
      // The edge function updates the database as well
      await load(); // reload to get ID if needed, or just let state be
    } catch (error: any) {
      toast.error("Erro ao conectar domínio: " + error.message);
    } finally {
      setConnectingDomain(false);
    }
  };

  const storeUrl = form.slug ? `${window.location.origin}/loja/${form.slug}` : null;

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Store className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Minha Loja</h1>
          <p className="text-muted-foreground">Configure sua loja virtual publica</p>
        </div>
      </div>

      {storeUrl && form.active && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">Sua loja esta ativa!</p>
              <p className="text-sm text-green-600 dark:text-green-300">{storeUrl}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.open(storeUrl, "_blank")}>
              <ExternalLink className="h-4 w-4 mr-2" />Visitar Loja
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informacoes da Loja</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo Uploader */}
            <div>
              <Label>Logo da Loja</Label>
              <div className="flex items-center gap-4 mt-2">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-20 h-20 rounded-full object-cover border"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border text-muted-foreground text-xs text-center">
                    Sem logo
                  </div>
                )}
                <div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingLogo ? "Enviando..." : "Enviar Logo"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">Recomendado: imagem quadrada (PNG ou JPG)</p>
                </div>
              </div>
            </div>
            <div>
              <Label>Nome da Loja *</Label>
              <Input value={form.store_name} onChange={e => handleNameChange(e.target.value)} placeholder="Ex: Auto Center Silva" />
            </div>
            <div>
              <Label>Slug (URL) *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/loja/</span>
                <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="auto-center-silva" />
              </div>
            </div>
            <div>
              <Label>Descricao</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descricao da sua loja..." rows={3} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
              <Label>Loja ativa (visivel ao publico)</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>WhatsApp (com DDD)</Label>
              <Input value={form.whatsapp_number} onChange={e => setForm({ ...form, whatsapp_number: e.target.value })} placeholder="5511999999999" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(11) 3333-3333" />
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input
                  value={form.cnpj}
                  onChange={e => setForm({ ...form, cnpj: maskCnpj(e.target.value) })}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Endereco</Label>
              <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Rua, numero - Cidade/UF" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Redes Sociais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Instagram</Label>
              <Input value={form.instagram_url} onChange={e => setForm({ ...form, instagram_url: e.target.value })} placeholder="https://instagram.com/sualoja" />
            </div>
            <div>
              <Label>Facebook</Label>
              <Input value={form.facebook_url} onChange={e => setForm({ ...form, facebook_url: e.target.value })} placeholder="https://facebook.com/sualoja" />
            </div>
          </CardContent>
        </Card>


        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LayoutTemplate className="h-5 w-5" />Aparência e Componentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Layout do Herói (Início da Página)</Label>
              <Select value={form.hero_template} onValueChange={v => setForm({ ...form, hero_template: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">Moderno (Busca Centralizada)</SelectItem>
                  <SelectItem value="classic">Clássico (Imagem Lateral)</SelectItem>
                  <SelectItem value="minimal">Minimalista (Foco tipográfico)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Paleta de Cores do Site</Label>
              <Select value={form.theme_palette} onValueChange={v => setForm({ ...form, theme_palette: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nexdrive-blue">Azul Nexdrive (Padrão)</SelectItem>
                  <SelectItem value="emerald">Esmeralda (Premium)</SelectItem>
                  <SelectItem value="slate">Grafite Escuro (Elegante)</SelectItem>
                  <SelectItem value="rose">Rosa/Vermelho (Esportivo)</SelectItem>
                  <SelectItem value="orange">Laranja (Vibrante)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fonte Tipográfica Principal</Label>
              <Select value={form.font_family} onValueChange={v => setForm({ ...form, font_family: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inter">Inter (Clara e Moderna)</SelectItem>
                  <SelectItem value="roboto">Roboto (Tradicional)</SelectItem>
                  <SelectItem value="outfit">Outfit (Arrojada)</SelectItem>
                  <SelectItem value="playfair">Playfair Display (Luxo com Serifa)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />Domínio Personalizado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Use seu próprio domínio (ex: www.sualoja.com.br) para a sua vitrine pública ao invés de usar o link da plataforma.
            </p>
            
            <div className="space-y-2">
              <Label>Seu Domínio</Label>
              <div className="flex gap-2">
                <Input 
                  value={form.custom_domain} 
                  onChange={e => setForm({ ...form, custom_domain: e.target.value })} 
                  placeholder="www.sualoja.com.br" 
                />
                <Button onClick={handleConnectDomain} disabled={connectingDomain}>
                  {connectingDomain ? "Conectando..." : "Conectar"}
                </Button>
              </div>
            </div>

            {form.custom_domain && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-2">
                <p className="font-semibold flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Domínio Salvo</p>
                <p>Para concluir a ativação e seu site funcionar, você precisa configurar o DNS no provedor onde comprou o domínio (Hostinger, Registro.br, etc):</p>
                <div className="bg-white p-3 rounded border font-mono text-xs overflow-x-auto select-all">
                  <p><strong>Tipo:</strong> CNAME</p>
                  <p><strong>Nome/Host:</strong> www (ou @)</p>
                  <p><strong>Valor/Destino:</strong> cname.vercel-dns.com</p>
                </div>
                <p className="text-xs text-blue-600">Pode levar até 24 horas para propagar pela internet.</p>
              </div>
            )}
            
          </CardContent>
        </Card>
      </div>

      <Button size="lg" className="w-full md:w-auto" onClick={save} disabled={saving}>
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Salvando..." : "Salvar Configuracoes"}
      </Button>
    </div>
  );
}
