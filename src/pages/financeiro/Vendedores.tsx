import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  BarChart2,
  Phone,
  Mail,
  IdCard,
  TrendingUp,
  Clock,
} from "lucide-react";

interface SellerEntity {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document_num: string | null;
  commission_rate: number | null;
  commission_pay_rule: string | null;
  seller_active: boolean | null;
  is_seller: boolean | null;
}

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  document_num: "",
  commission_rate: "",
  commission_pay_rule: "D+30",
  seller_active: true,
  address: "",
  city: "",
  state: "",
  bank_name: "",
  agency: "",
  account: "",
  pix_key: "",
  pix_key_type: "",
};

type FormState = typeof emptyForm;

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const maskCPF = (cpf: string | null) => {
  if (!cpf) return "-";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
};

const PAY_RULES = [
  { value: "D+5", label: "D+5" },
  { value: "D+10", label: "D+10" },
  { value: "D+15", label: "D+15" },
  { value: "D+30", label: "D+30" },
  { value: "5_DU", label: "5º dia util" },
];

const getPayRuleLabel = (rule: string | null) => {
  if (!rule) return "-";
  const found = PAY_RULES.find((r) => r.value === rule);
  return found ? found.label : rule;
};

export default function Vendedores() {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<SellerEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<SellerEntity | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const userId = user.id;

    const [sellersRes, pendingRes] = await Promise.all([
      (supabase as any)
        .from("entities")
        .select(
          "id, name, email, phone, document_num, commission_rate, commission_pay_rule, seller_active, is_seller"
        )
        .eq("user_id", userId)
        .eq("is_seller", true)
        .is("deleted_at", null)
        .order("name"),
      (supabase as any)
        .from("financial_transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("type", "expense")
        .is("deleted_at", null)
        .in("status", ["open", "overdue"]),
    ]);

    setSellers(sellersRes.data || []);

    // Filter pending commissions client-side is not possible with count: head query
    // so we fetch and filter
    const pendingTxRes = await (supabase as any)
      .from("financial_transactions")
      .select(
        "id, account:account_category_id (id, dre_mapping_key)"
      )
      .eq("user_id", userId)
      .eq("type", "expense")
      .is("deleted_at", null)
      .in("status", ["open", "overdue"]);

    const pendingCommissions = (pendingTxRes.data || []).filter(
      (tx: any) => tx.account?.dre_mapping_key === "DESPESA_VAR_COMISSAO"
    );
    setPendingCount(pendingCommissions.length);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setSheetOpen(true);
  };

  const openEdit = (seller: SellerEntity) => {
    setEditing(seller);
    setForm({
      name: seller.name,
      email: seller.email || "",
      phone: seller.phone || "",
      whatsapp: "",
      document_num: seller.document_num || "",
      commission_rate: seller.commission_rate?.toString() || "",
      commission_pay_rule: seller.commission_pay_rule || "D+30",
      seller_active: seller.seller_active !== false,
      address: "",
      city: "",
      state: "",
      bank_name: "",
      agency: "",
      account: "",
      pix_key: "",
      pix_key_type: "",
    });
    setSheetOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Nome e obrigatorio");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const payload: Record<string, unknown> = {
      user_id: user.id,
      name: form.name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      document_num: form.document_num || null,
      is_seller: true,
      commission_rate: form.commission_rate ? parseFloat(form.commission_rate) : null,
      commission_pay_rule: form.commission_pay_rule || null,
      seller_active: form.seller_active,
    };

    if (form.address) payload.address = form.address;
    if (form.city) payload.city = form.city;
    if (form.state) payload.state = form.state;
    if (form.bank_name) payload.bank_name = form.bank_name;
    if (form.agency) payload.agency = form.agency;
    if (form.account) payload.account = form.account;
    if (form.pix_key) payload.pix_key = form.pix_key;
    if (form.pix_key_type) payload.pix_key_type = form.pix_key_type;

    if (editing) {
      const { error } = await (supabase as any)
        .from("entities")
        .update(payload)
        .eq("id", editing.id);
      if (error) {
        toast.error("Erro ao atualizar vendedor");
        return;
      }
      toast.success("Vendedor atualizado");
    } else {
      const { error } = await (supabase as any).from("entities").insert(payload);
      if (error) {
        toast.error("Erro ao cadastrar vendedor");
        return;
      }
      toast.success("Vendedor cadastrado");
    }

    setSheetOpen(false);
    load();
  };

  const toggleActive = async (seller: SellerEntity) => {
    const { error } = await (supabase as any)
      .from("entities")
      .update({ seller_active: !seller.seller_active })
      .eq("id", seller.id);
    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    toast.success(seller.seller_active ? "Vendedor desativado" : "Vendedor ativado");
    load();
  };

  const softDelete = async (id: string) => {
    if (!confirm("Remover este vendedor?")) return;
    const { error } = await (supabase as any)
      .from("entities")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao remover");
      return;
    }
    toast.success("Vendedor removido");
    load();
  };

  const activeSellers = sellers.filter((s) => s.seller_active !== false);
  const avgCommission =
    sellers.length > 0
      ? sellers.reduce((acc, s) => acc + (s.commission_rate || 0), 0) / sellers.length
      : 0;

  const setField = (key: keyof FormState, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Vendedores</h1>
            <p className="text-sm text-muted-foreground">Gestao da equipe de vendas</p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2 rounded-xl shadow-sm">
          <Plus className="h-4 w-4" />
          Novo Vendedor
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Vendedores Ativos
                </p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                  {loading ? "-" : activeSellers.length}
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  de {sellers.length} cadastrados
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-blue-200 dark:bg-blue-800">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Comissao Media
                </p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300 mt-1">
                  {loading ? "-" : `${avgCommission.toFixed(1).replace(".", ",")}%`}
                </p>
                <p className="text-xs text-green-500 mt-1">media da equipe</p>
              </div>
              <div className="p-3 rounded-2xl bg-green-200 dark:bg-green-800">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                  Comissoes Pendentes
                </p>
                <p className="text-3xl font-bold text-orange-700 dark:text-orange-300 mt-1">
                  {loading ? "-" : pendingCount}
                </p>
                <p className="text-xs text-orange-500 mt-1">aguardando pagamento</p>
              </div>
              <div className="p-3 rounded-2xl bg-orange-200 dark:bg-orange-800">
                <Clock className="h-6 w-6 text-orange-600 dark:text-orange-300" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seller Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          Carregando vendedores...
        </div>
      ) : sellers.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground font-medium">Nenhum vendedor cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Clique em "Novo Vendedor" para comecar
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sellers.map((seller) => (
            <Card
              key={seller.id}
              className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {seller.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold leading-tight">
                        {seller.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {maskCPF(seller.document_num)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={seller.seller_active !== false}
                      onCheckedChange={() => toggleActive(seller)}
                      className="scale-75"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {/* Contact info */}
                <div className="space-y-1.5">
                  {seller.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{seller.email}</span>
                    </div>
                  )}
                  {seller.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{seller.phone}</span>
                    </div>
                  )}
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {seller.commission_rate != null && (
                    <Badge
                      variant="secondary"
                      className="rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    >
                      {seller.commission_rate.toFixed(1).replace(".", ",")}% comissao
                    </Badge>
                  )}
                  {seller.commission_pay_rule && (
                    <Badge
                      variant="secondary"
                      className="rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    >
                      {getPayRuleLabel(seller.commission_pay_rule)}
                    </Badge>
                  )}
                  <Badge
                    variant={seller.seller_active !== false ? "default" : "secondary"}
                    className="rounded-full text-xs font-semibold"
                  >
                    {seller.seller_active !== false ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-xl text-xs h-8"
                    onClick={() =>
                      navigate(`/financeiro/relatorio-comissoes?seller=${seller.id}`)
                    }
                  >
                    <BarChart2 className="h-3.5 w-3.5 mr-1" />
                    Ver Comissoes
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-xl h-8 w-8 p-0"
                    onClick={() => openEdit(seller)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-xl h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => softDelete(seller.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sheet Form */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editing ? "Editar Vendedor" : "Novo Vendedor"}</SheetTitle>
            <SheetDescription>
              {editing
                ? "Atualize os dados do vendedor"
                : "Preencha os dados para cadastrar um vendedor"}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Dados Pessoais
              </h3>
              <div>
                <Label>Nome *</Label>
                <Input
                  className="mt-1.5"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <Label>CPF</Label>
                <Input
                  className="mt-1.5"
                  value={form.document_num}
                  onChange={(e) =>
                    setField("document_num", formatCPF(e.target.value))
                  }
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Email</Label>
                  <Input
                    className="mt-1.5"
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    className="mt-1.5"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input
                  className="mt-1.5"
                  value={form.whatsapp}
                  onChange={(e) => setField("whatsapp", e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <Separator />

            {/* Commission Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Configuracoes de Comissao
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Taxa de Comissao (%)</Label>
                  <Input
                    className="mt-1.5"
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={form.commission_rate}
                    onChange={(e) => setField("commission_rate", e.target.value)}
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <Label>Regra de Pagamento</Label>
                  <Select
                    value={form.commission_pay_rule}
                    onValueChange={(v) => setField("commission_pay_rule", v)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAY_RULES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.seller_active}
                  onCheckedChange={(v) => setField("seller_active", v)}
                />
                <Label>Vendedor ativo</Label>
              </div>
            </div>

            <Separator />

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Endereco
              </h3>
              <div>
                <Label>Logradouro</Label>
                <Input
                  className="mt-1.5"
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  placeholder="Rua, numero, complemento"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cidade</Label>
                  <Input
                    className="mt-1.5"
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Input
                    className="mt-1.5"
                    value={form.state}
                    onChange={(e) => setField("state", e.target.value)}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Banking */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Dados Bancarios
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Banco</Label>
                  <Input
                    className="mt-1.5"
                    value={form.bank_name}
                    onChange={(e) => setField("bank_name", e.target.value)}
                    placeholder="Nome do banco"
                  />
                </div>
                <div>
                  <Label>Agencia</Label>
                  <Input
                    className="mt-1.5"
                    value={form.agency}
                    onChange={(e) => setField("agency", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Conta</Label>
                <Input
                  className="mt-1.5"
                  value={form.account}
                  onChange={(e) => setField("account", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Chave PIX</Label>
                  <Input
                    className="mt-1.5"
                    value={form.pix_key}
                    onChange={(e) => setField("pix_key", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Tipo da Chave</Label>
                  <Select
                    value={form.pix_key_type}
                    onValueChange={(v) => setField("pix_key_type", v)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                      <SelectItem value="phone">Telefone</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="random">Chave aleatoria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button className="w-full rounded-xl h-11" onClick={save}>
                {editing ? "Salvar Alteracoes" : "Cadastrar Vendedor"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
