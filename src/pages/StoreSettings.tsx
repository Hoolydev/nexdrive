import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Store, ExternalLink, Save, Palette } from "lucide-react";

export default function StoreSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [form, setForm] = useState({
    store_name: "",
    slug: "",
    description: "",
    whatsapp_number: "",
    phone: "",
    email: "",
    address: "",
    instagram_url: "",
    facebook_url: "",
    primary_color: "#1e40af",
    secondary_color: "#ffffff",
    active: true,
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from("store_settings").select("*").eq("user_id", user.id).maybeSingle();

    if (data) {
      setSettingsId(data.id);
      setForm({
        store_name: data.store_name || "",
        slug: data.slug || "",
        description: data.description || "",
        whatsapp_number: data.whatsapp_number || "",
        phone: data.phone || "",
        email: data.email || "",
        address: data.address || "",
        instagram_url: data.instagram_url || "",
        facebook_url: data.facebook_url || "",
        primary_color: data.primary_color || "#1e40af",
        secondary_color: data.secondary_color || "#ffffff",
        active: data.active !== false,
      });
    }
    setLoading(false);
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
      email: form.email || null,
      address: form.address || null,
      instagram_url: form.instagram_url || null,
      facebook_url: form.facebook_url || null,
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
      active: form.active,
    };

    let error;
    if (settingsId) {
      ({ error } = await supabase.from("store_settings").update(payload).eq("id", settingsId));
    } else {
      const res = await supabase.from("store_settings").insert(payload).select().single();
      error = res.error;
      if (res.data) setSettingsId(res.data.id);
    }

    if (error) { toast.error("Erro ao salvar"); setSaving(false); return; }
    toast.success("Configuracoes salvas!");
    setForm({ ...form, slug });
    setSaving(false);
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
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(11) 3333-3333" />
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
            <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" />Cores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cor Primaria</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                  <Input value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>Cor Secundaria</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.secondary_color} onChange={e => setForm({ ...form, secondary_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                  <Input value={form.secondary_color} onChange={e => setForm({ ...form, secondary_color: e.target.value })} className="flex-1" />
                </div>
              </div>
            </div>
            <Separator />
            <div className="rounded-lg p-4" style={{ backgroundColor: form.primary_color, color: form.secondary_color }}>
              <p className="font-bold text-lg">{form.store_name || "Sua Loja"}</p>
              <p className="text-sm opacity-80">Preview das cores</p>
            </div>
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
