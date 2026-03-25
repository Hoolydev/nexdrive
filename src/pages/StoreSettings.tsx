import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Store, ExternalLink, Save, Upload, Globe, LayoutTemplate, CheckCircle2,
  Image as ImageIcon, Car, Search,
} from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// ── Theme palettes ────────────────────────────────────────────────────────
const PALETTES: Record<string, { primary: string; bg: string; accent: string }> = {
  "nexdrive-blue": { primary: "#1e40af", bg: "#eff6ff", accent: "#3b82f6" },
  emerald:         { primary: "#065f46", bg: "#ecfdf5", accent: "#10b981" },
  slate:           { primary: "#1e293b", bg: "#f1f5f9", accent: "#475569" },
  rose:            { primary: "#9f1239", bg: "#fff1f2", accent: "#f43f5e" },
  orange:          { primary: "#c2410c", bg: "#fff7ed", accent: "#f97316" },
};

const FONT_LABELS: Record<string, string> = {
  inter:    "Inter",
  roboto:   "Roboto",
  outfit:   "Outfit",
  playfair: "Playfair Display",
};

// ── Store Preview component ───────────────────────────────────────────────
function StorePreview({
  storeName,
  description,
  heroTemplate,
  themePalette,
  fontFamily,
  logoUrl,
  bannerUrl,
  primaryColor,
}: {
  storeName: string;
  description: string;
  heroTemplate: string;
  themePalette: string;
  fontFamily: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  primaryColor: string;
}) {
  const palette = PALETTES[themePalette] || PALETTES["nexdrive-blue"];
  const color = primaryColor || palette.primary;
  const name = storeName || "Minha Loja";

  const fontStyle: React.CSSProperties = {
    fontFamily: fontFamily === "playfair"
      ? "'Playfair Display', Georgia, serif"
      : fontFamily === "roboto"
      ? "'Roboto', sans-serif"
      : fontFamily === "outfit"
      ? "'Outfit', sans-serif"
      : "'Inter', sans-serif",
  };

  return (
    <div
      className="rounded-xl overflow-hidden border shadow-sm select-none"
      style={{ background: palette.bg, ...fontStyle }}
    >
      {/* Simulated nav bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt="logo" className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: color }}>
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs font-bold text-gray-800">{name}</span>
        </div>
        <div className="flex gap-2">
          <div className="w-12 h-2 rounded bg-gray-100" />
          <div className="w-12 h-2 rounded bg-gray-100" />
        </div>
      </div>

      {/* Hero Section */}
      {heroTemplate === "classic" && (
        <div className="bg-white p-5 flex gap-4 items-center border-b">
          <div className="flex-1 space-y-2">
            <div className="text-sm font-bold text-gray-800">
              Encontre o veículo dos seus sonhos
            </div>
            <div className="text-xs text-gray-500">{description || "Seleção premium com procedência garantida."}</div>
            <div className="w-20 h-5 rounded text-[9px] text-white font-semibold flex items-center justify-center" style={{ background: color }}>
              Ver Estoque
            </div>
          </div>
          {bannerUrl ? (
            <img src={bannerUrl} alt="banner" className="w-24 h-16 object-cover rounded-lg" />
          ) : (
            <div className="w-24 h-16 rounded-lg flex items-center justify-center" style={{ background: palette.bg }}>
              <Car className="h-8 w-8 text-gray-300" />
            </div>
          )}
        </div>
      )}

      {heroTemplate === "minimal" && (
        <div className="bg-white p-5 border-b">
          <div className="text-sm font-light text-gray-800">Estoque Selecionado</div>
          <div className="text-[9px] uppercase tracking-widest text-gray-400 mt-1 font-semibold">
            12 Veículos Disponíveis
          </div>
          {bannerUrl && (
            <img src={bannerUrl} alt="banner" className="w-full h-16 object-cover rounded-lg mt-3 opacity-80" />
          )}
        </div>
      )}

      {(!heroTemplate || heroTemplate === "modern") && (
        <div
          className="p-5 text-center border-b relative overflow-hidden"
          style={{
            background: bannerUrl ? undefined : palette.bg,
          }}
        >
          {bannerUrl && (
            <img
              src={bannerUrl}
              alt="banner"
              className="absolute inset-0 w-full h-full object-cover opacity-20"
            />
          )}
          <div className="relative z-10">
            <div className="text-sm font-extrabold text-gray-800">Nossos Veículos</div>
            <div
              className="text-[9px] inline-block px-2 py-0.5 rounded-full mt-1 text-gray-500 border bg-white"
            >
              12 veículos disponíveis
            </div>
          </div>
        </div>
      )}

      {/* Search bar mock */}
      <div className="px-4 py-3 flex gap-2">
        <div className="flex-1 flex items-center gap-1.5 bg-white border rounded-lg px-2 py-1">
          <Search className="h-2.5 w-2.5 text-gray-400" />
          <span className="text-[9px] text-gray-400">Buscar por marca, modelo...</span>
        </div>
        <div className="w-16 h-6 rounded-lg bg-white border" />
      </div>

      {/* Fake cards */}
      <div className="px-4 pb-4 grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border overflow-hidden">
            <div className="h-10 bg-gray-100" />
            <div className="p-1.5 space-y-1">
              <div className="h-1.5 rounded bg-gray-200 w-3/4" />
              <div className="h-1.5 rounded bg-gray-100 w-1/2" />
              <div className="h-2 rounded w-1/2 mt-1" style={{ background: color + "33" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function StoreSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectingDomain, setConnectingDomain] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

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
      setBannerUrl((data as any).banner_url || null);
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

  const uploadImage = async (file: File, path: string): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");
    const { error } = await supabase.storage
      .from("vehicle-images")
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("vehicle-images").getPublicUrl(path);
    return urlData.publicUrl + `?t=${Date.now()}`;
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const url = await uploadImage(file, `logos/${user.id}/logo`);
      const cleanUrl = url!.split("?")[0];
      setLogoUrl(url);
      if (settingsId) {
        await supabase.from("store_settings").update({ logo_url: cleanUrl } as any).eq("id", settingsId);
      }
      toast.success("Logo enviada com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao enviar logo: " + e.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBannerUpload = async (file: File) => {
    setUploadingBanner(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const url = await uploadImage(file, `banners/${user.id}/banner`);
      const cleanUrl = url!.split("?")[0];
      setBannerUrl(url);
      if (settingsId) {
        await supabase.from("store_settings").update({ banner_url: cleanUrl } as any).eq("id", settingsId);
      }
      toast.success("Banner enviado com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao enviar banner: " + e.message);
    } finally {
      setUploadingBanner(false);
    }
  };

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const handleNameChange = (name: string) => {
    setForm({ ...form, store_name: name, slug: form.slug || generateSlug(name) });
  };

  const save = async () => {
    if (!form.store_name.trim() || !form.slug.trim()) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const slug = generateSlug(form.slug);
    const { data: existing } = await supabase.from("store_settings")
      .select("id").eq("slug", slug).neq("user_id", user.id).maybeSingle();
    if (existing) { toast.error("Este slug já está em uso. Escolha outro."); setSaving(false); return; }

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
    if (!form.custom_domain) { toast.error("Digite um domínio válido"); return; }
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(form.custom_domain)) {
      toast.error("Formato de domínio inválido. Ex: sualoja.com.br"); return;
    }
    setConnectingDomain(true);
    try {
      const { error } = await supabase.functions.invoke("vercel-domains", {
        body: { domain: form.custom_domain.toLowerCase(), action: "add" },
      });
      if (error) throw error;
      toast.success("Domínio registrado na plataforma!");
      await load();
    } catch (e: any) {
      toast.error("Erro ao conectar domínio: " + e.message);
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
          <p className="text-muted-foreground">Configure sua loja virtual pública</p>
        </div>
      </div>

      {storeUrl && form.active && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">Sua loja está ativa!</p>
              <p className="text-sm text-green-600 dark:text-green-300">{storeUrl}</p>
              {form.custom_domain && (
                <p className="text-sm text-green-600 dark:text-green-300">
                  Domínio personalizado: {form.custom_domain}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => window.open(storeUrl, "_blank")}>
              <ExternalLink className="h-4 w-4 mr-2" />Visitar Loja
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Two-column layout: settings + preview */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">

        {/* ── Left column: all form cards ─────────────────────────────── */}
        <div className="space-y-6">

          {/* Informações da Loja */}
          <Card>
            <CardHeader>
              <CardTitle>Informações da Loja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo */}
              <div>
                <Label>Logo da Loja</Label>
                <div className="flex items-center gap-4 mt-2">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-20 h-20 rounded-full object-cover border" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border text-muted-foreground text-xs text-center">
                      Sem logo
                    </div>
                  )}
                  <div>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} />
                    <Button type="button" variant="outline" size="sm" disabled={uploadingLogo}
                      onClick={() => logoInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingLogo ? "Enviando..." : "Enviar Logo"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">Recomendado: imagem quadrada (PNG ou JPG)</p>
                  </div>
                </div>
              </div>

              {/* Banner */}
              <div>
                <Label>Banner / Imagem de Destaque</Label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  Aparece na seção principal da loja. Recomendado: 1200×400px.
                </p>
                <div className="space-y-2">
                  {bannerUrl ? (
                    <div className="relative rounded-lg overflow-hidden border">
                      <img src={bannerUrl} alt="Banner" className="w-full h-28 object-cover" />
                      <button
                        className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded hover:bg-black/70"
                        onClick={() => bannerInputRef.current?.click()}
                      >
                        Trocar
                      </button>
                    </div>
                  ) : (
                    <div
                      className="w-full h-28 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => bannerInputRef.current?.click()}
                    >
                      <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                      <span className="text-sm text-muted-foreground">Clique para enviar o banner</span>
                    </div>
                  )}
                  <input ref={bannerInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBannerUpload(f); }} />
                  <Button type="button" variant="outline" size="sm" disabled={uploadingBanner}
                    onClick={() => bannerInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingBanner ? "Enviando..." : "Enviar Banner"}
                  </Button>
                </div>
              </div>

              <div>
                <Label>Nome da Loja *</Label>
                <Input value={form.store_name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Ex: Auto Center Silva" />
              </div>
              <div>
                <Label>Slug (URL) *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">/loja/</span>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-center-silva" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Link da loja: <span className="font-mono">{window.location.origin}/loja/{form.slug || "seu-slug"}</span>
                </p>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição da sua loja..." rows={3} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <Label>Loja ativa (visível ao público)</Label>
              </div>
            </CardContent>
          </Card>

          {/* Contato */}
          <Card>
            <CardHeader><CardTitle>Contato</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>WhatsApp (com DDD)</Label>
                <Input value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} placeholder="5511999999999" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 3333-3333" />
                </div>
                <div>
                  <Label>CNPJ</Label>
                  <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: maskCnpj(e.target.value) })} placeholder="00.000.000/0000-00" maxLength={18} />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Endereço</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua, número - Cidade/UF" />
              </div>
            </CardContent>
          </Card>

          {/* Redes Sociais */}
          <Card>
            <CardHeader><CardTitle>Redes Sociais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Instagram</Label>
                <Input value={form.instagram_url} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} placeholder="https://instagram.com/sualoja" />
              </div>
              <div>
                <Label>Facebook</Label>
                <Input value={form.facebook_url} onChange={(e) => setForm({ ...form, facebook_url: e.target.value })} placeholder="https://facebook.com/sualoja" />
              </div>
            </CardContent>
          </Card>

          {/* Aparência */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5" />Aparência e Componentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Layout do Herói (Início da Página)</Label>
                <Select value={form.hero_template} onValueChange={(v) => setForm({ ...form, hero_template: v })}>
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
                <Select value={form.theme_palette} onValueChange={(v) => setForm({ ...form, theme_palette: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nexdrive-blue">Azul NexDrive (Padrão)</SelectItem>
                    <SelectItem value="emerald">Esmeralda (Premium)</SelectItem>
                    <SelectItem value="slate">Grafite Escuro (Elegante)</SelectItem>
                    <SelectItem value="rose">Rosa/Vermelho (Esportivo)</SelectItem>
                    <SelectItem value="orange">Laranja (Vibrante)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cor Primária</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.primary_color}
                    onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={form.primary_color}
                    onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                    className="w-32 font-mono text-sm"
                    placeholder="#1e40af"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fonte Tipográfica Principal</Label>
                <Select value={form.font_family} onValueChange={(v) => setForm({ ...form, font_family: v })}>
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

          {/* Domínio Personalizado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />Domínio Personalizado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use seu próprio domínio (ex: www.sualoja.com.br) para sua vitrine pública.
                O endereço <span className="font-mono text-xs">/loja/{form.slug || "seu-slug"}</span> continua funcionando normalmente.
              </p>

              <div className="space-y-2">
                <Label>Seu Domínio</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.custom_domain}
                    onChange={(e) => setForm({ ...form, custom_domain: e.target.value })}
                    placeholder="www.sualoja.com.br"
                  />
                  <Button onClick={handleConnectDomain} disabled={connectingDomain}>
                    {connectingDomain ? "Conectando..." : "Conectar"}
                  </Button>
                </div>
              </div>

              {form.custom_domain && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-2">
                  <p className="font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Domínio Salvo
                  </p>
                  <p>Configure o DNS no seu provedor (Hostinger, Registro.br, etc):</p>
                  <div className="bg-white p-3 rounded border font-mono text-xs overflow-x-auto">
                    <p><strong>Tipo:</strong> CNAME</p>
                    <p><strong>Nome/Host:</strong> www (ou @)</p>
                    <p><strong>Valor/Destino:</strong> cname.vercel-dns.com</p>
                  </div>
                  <p className="text-xs text-blue-600">Pode levar até 24 horas para propagar.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Button size="lg" className="w-full md:w-auto" onClick={save} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>

        {/* ── Right column: live preview ──────────────────────────────── */}
        <div className="xl:sticky xl:top-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            <LayoutTemplate className="h-4 w-4" />
            Preview da Loja
          </div>
          <StorePreview
            storeName={form.store_name}
            description={form.description}
            heroTemplate={form.hero_template}
            themePalette={form.theme_palette}
            fontFamily={form.font_family}
            logoUrl={logoUrl}
            bannerUrl={bannerUrl}
            primaryColor={form.primary_color}
          />
          <p className="text-xs text-muted-foreground text-center">
            Preview em tempo real — atualiza conforme você edita
          </p>
          {storeUrl && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => window.open(storeUrl, "_blank")}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir loja real
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
