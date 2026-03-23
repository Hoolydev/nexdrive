import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Entity, EntityInsert, EntityUpdate, EntityRole } from "@/integrations/supabase/types-prd";
import { ENTITY_ROLE_LABELS } from "@/integrations/supabase/types-prd";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { GedAttachments } from "@/components/GedAttachments";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MARITAL_STATUS_OPTIONS = [
  { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" },
  { value: "divorciado", label: "Divorciado(a)" },
  { value: "viuvo", label: "Viuvo(a)" },
  { value: "uniao_estavel", label: "União Estável" },
];

const INVESTOR_ROI_OPTIONS = [
  { value: "fixed_monthly", label: "Fixo Mensal" },
  { value: "net_profit", label: "Lucro Líquido" },
  { value: "revenue_share", label: "Participação na Receita" },
];

const BANKS = [
  { code: "001", name: "Banco do Brasil" },
  { code: "033", name: "Santander" },
  { code: "077", name: "Inter" },
  { code: "104", name: "Caixa Econômica Federal" },
  { code: "208", name: "BTG Pactual" },
  { code: "212", name: "Banco Original" },
  { code: "237", name: "Bradesco" },
  { code: "260", name: "Nubank" },
  { code: "290", name: "PagBank" },
  { code: "341", name: "Itaú" },
  { code: "422", name: "Safra" },
  { code: "623", name: "Pan" },
  { code: "655", name: "Votorantim" },
  { code: "756", name: "Sicoob" },
  { code: "748", name: "Sicredi" },
  { code: "other", name: "Outro" },
];

const PIX_KEY_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "random", label: "Aleatória" },
];

const BRAZILIAN_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const ROLE_BADGE_STYLES: Record<EntityRole, string> = {
  client: "bg-blue-100 text-blue-700 border-blue-200",
  supplier: "bg-orange-100 text-orange-700 border-orange-200",
  seller: "bg-green-100 text-green-700 border-green-200",
  investor: "bg-purple-100 text-purple-700 border-purple-200",
};

// ---------------------------------------------------------------------------
// Types & defaults
// ---------------------------------------------------------------------------

type EntityFormData = {
  name: string;
  document_type: "CPF" | "CNPJ";
  document_num: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  rg: string;
  rg_issuer: string;
  cnh: string;
  cnh_expiry: string;
  birth_date: string;
  nationality: string;
  marital_status: string;
  occupation: string;
  bank_code: string;
  bank_name: string;
  agency: string;
  account: string;
  account_type: "corrente" | "poupanca";
  pix_key: string;
  pix_key_type: string;
  is_client: boolean;
  is_supplier: boolean;
  is_seller: boolean;
  is_investor: boolean;
  commission_rate: string;
  commission_pay_rule: string;
  investor_roi_type: string;
  investor_roi_rate: string;
  notes: string;
};

const EMPTY_FORM: EntityFormData = {
  name: "",
  document_type: "CPF",
  document_num: "",
  email: "",
  phone: "",
  whatsapp: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
  rg: "",
  rg_issuer: "",
  cnh: "",
  cnh_expiry: "",
  birth_date: "",
  nationality: "Brasileira",
  marital_status: "",
  occupation: "",
  bank_code: "",
  bank_name: "",
  agency: "",
  account: "",
  account_type: "corrente",
  pix_key: "",
  pix_key_type: "",
  is_client: false,
  is_supplier: false,
  is_seller: false,
  is_investor: false,
  commission_rate: "",
  commission_pay_rule: "",
  investor_roi_type: "",
  investor_roi_rate: "",
  notes: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCpf(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatCnpj(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function formatPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function formatZip(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function entityToForm(entity: Entity): EntityFormData {
  return {
    name: entity.name || "",
    document_type: entity.document_type || "CPF",
    document_num: entity.document_num
      ? entity.document_type === "CNPJ"
        ? formatCnpj(entity.document_num)
        : formatCpf(entity.document_num)
      : "",
    email: entity.email || "",
    phone: entity.phone ? formatPhone(entity.phone) : "",
    whatsapp: entity.whatsapp ? formatPhone(entity.whatsapp) : "",
    address: entity.address || "",
    city: entity.city || "",
    state: entity.state || "",
    zip_code: entity.zip_code ? formatZip(entity.zip_code) : "",
    rg: entity.rg || "",
    rg_issuer: entity.rg_issuer || "",
    cnh: entity.cnh || "",
    cnh_expiry: entity.cnh_expiry || "",
    birth_date: entity.birth_date || "",
    nationality: entity.nationality || "Brasileira",
    marital_status: entity.marital_status || "",
    occupation: entity.occupation || "",
    bank_code: entity.bank_code || "",
    bank_name: entity.bank_name || "",
    agency: entity.agency || "",
    account: entity.account || "",
    account_type: entity.account_type || "corrente",
    pix_key: entity.pix_key || "",
    pix_key_type: entity.pix_key_type || "",
    is_client: entity.is_client,
    is_supplier: entity.is_supplier,
    is_seller: entity.is_seller,
    is_investor: entity.is_investor,
    commission_rate: entity.commission_rate?.toString() || "",
    commission_pay_rule: entity.commission_pay_rule || "",
    investor_roi_type: entity.investor_roi_type || "",
    investor_roi_rate: entity.investor_roi_rate?.toString() || "",
    notes: entity.notes || "",
  };
}

function formToPayload(form: EntityFormData, userId: string): EntityInsert {
  return {
    user_id: userId,
    name: form.name,
    document_type: form.document_type,
    document_num: form.document_num.replace(/\D/g, "") || null,
    trade_name: null,
    email: form.email || null,
    phone: form.phone.replace(/\D/g, "") || null,
    whatsapp: form.whatsapp.replace(/\D/g, "") || null,
    address: form.address || null,
    city: form.city || null,
    state: form.state || null,
    zip_code: form.zip_code.replace(/\D/g, "") || null,
    rg: form.rg || null,
    rg_issuer: form.rg_issuer || null,
    cnh: form.cnh || null,
    cnh_expiry: form.cnh_expiry || null,
    birth_date: form.birth_date || null,
    nationality: form.nationality || "Brasileira",
    marital_status: form.marital_status || null,
    occupation: form.occupation || null,
    bank_code: form.bank_code || null,
    bank_name: form.bank_name || null,
    agency: form.agency || null,
    account: form.account || null,
    account_type: form.account_type,
    pix_key: form.pix_key || null,
    pix_key_type: (form.pix_key_type as Entity["pix_key_type"]) || null,
    is_client: form.is_client,
    is_supplier: form.is_supplier,
    is_seller: form.is_seller,
    is_investor: form.is_investor,
    commission_rate: form.is_seller && form.commission_rate ? parseFloat(form.commission_rate) : null,
    commission_pay_rule: form.is_seller ? form.commission_pay_rule || null : null,
    seller_active: form.is_seller,
    investor_roi_type: form.is_investor
      ? (form.investor_roi_type as Entity["investor_roi_type"]) || null
      : null,
    investor_roi_rate: form.is_investor && form.investor_roi_rate
      ? parseFloat(form.investor_roi_rate)
      : null,
    notes: form.notes || null,
    deleted_at: null,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EntityForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [formData, setFormData] = useState<EntityFormData>({ ...EMPTY_FORM });
  const [formTab, setFormTab] = useState("basics");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const { data: entityData, isLoading } = useQuery({
    queryKey: ["entity", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Entity;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (entityData) {
      setFormData(entityToForm(entityData));
    }
  }, [entityData]);

  const createMutation = useMutation({
    mutationFn: async (payload: EntityInsert) => {
      const { error } = await supabase.from("entities").insert([payload as any]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      toast.success("Entidade criada com sucesso!");
      navigate("/entities");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ entityId, payload }: { entityId: string; payload: EntityUpdate }) => {
      const { error } = await supabase.from("entities").update(payload as any).eq("id", entityId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      toast.success("Entidade atualizada com sucesso!");
      navigate("/entities");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("O nome é obrigatório.");
      return;
    }

    const docDigits = formData.document_num.replace(/\D/g, "");
    if (docDigits) {
      if (formData.document_type === "CPF" && docDigits.length !== 11) {
        toast.error("CPF inválido. Informe 11 dígitos.");
        return;
      }
      if (formData.document_type === "CNPJ" && docDigits.length !== 14) {
        toast.error("CNPJ inválido. Informe 14 dígitos.");
        return;
      }
    }

    if (!formData.is_client && !formData.is_supplier && !formData.is_seller && !formData.is_investor) {
      toast.error("Selecione pelo menos uma classificação (Cliente, Fornecedor, Vendedor ou Investidor).");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    const payload = formToPayload(formData, user.id);

    if (isEdit && id) {
      const { user_id, ...updatePayload } = payload;
      updateMutation.mutate({ entityId: id, payload: updatePayload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const updateField = <K extends keyof EntityFormData>(key: K, value: EntityFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/entities")}
          className="rounded-xl"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {isEdit ? "Editar Entidade" : "Nova Entidade"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEdit
              ? "Atualize os dados da entidade."
              : "Preencha os dados para cadastrar uma nova entidade."}
          </p>
        </div>
      </div>

      <Card className="rounded-2xl border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs value={formTab} onValueChange={setFormTab}>
              <TabsList className="grid w-full grid-cols-6 h-auto gap-1 bg-gray-100 rounded-xl p-1">
                <TabsTrigger value="basics" className="rounded-lg text-xs px-2 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Dados Básicos
                </TabsTrigger>
                <TabsTrigger value="address" className="rounded-lg text-xs px-2 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Endereço
                </TabsTrigger>
                <TabsTrigger value="documents" className="rounded-lg text-xs px-2 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Documentos
                </TabsTrigger>
                <TabsTrigger value="banking" className="rounded-lg text-xs px-2 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Bancário
                </TabsTrigger>
                <TabsTrigger value="roles" className="rounded-lg text-xs px-2 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Classificação
                </TabsTrigger>
                <TabsTrigger value="ged" className="rounded-lg text-xs px-2 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Arquivos
                </TabsTrigger>
              </TabsList>

              {/* ----- Tab: Dados Básicos ---------------------------------- */}
              <TabsContent value="basics" className="space-y-4 mt-4">
                {/* Tipo de Entidade */}
                <div className="space-y-2">
                  <Label>Tipo de Entidade *</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "is_client" as const, label: "Cliente", color: "blue" },
                      { key: "is_supplier" as const, label: "Fornecedor", color: "orange" },
                      { key: "is_seller" as const, label: "Vendedor", color: "green" },
                      { key: "is_investor" as const, label: "Investidor", color: "purple" },
                    ].map(({ key, label, color }) => {
                      const active = formData[key];
                      const styles: Record<string, string> = {
                        blue: active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-600 border-blue-300 hover:bg-blue-50",
                        orange: active ? "bg-orange-500 text-white border-orange-500" : "bg-white text-orange-600 border-orange-300 hover:bg-orange-50",
                        green: active ? "bg-green-600 text-white border-green-600" : "bg-white text-green-600 border-green-300 hover:bg-green-50",
                        purple: active ? "bg-purple-600 text-white border-purple-600" : "bg-white text-purple-600 border-purple-300 hover:bg-purple-50",
                      };
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => updateField(key, !formData[key])}
                          className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${styles[color]}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {!formData.is_client && !formData.is_supplier && !formData.is_seller && !formData.is_investor && (
                    <p className="text-xs text-muted-foreground">Selecione pelo menos um tipo</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Nome completo ou razão social"
                    className="rounded-xl"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Documento</Label>
                    <Select
                      value={formData.document_type}
                      onValueChange={(v) => {
                        updateField("document_type", v as "CPF" | "CNPJ");
                        updateField("document_num", "");
                      }}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CPF">CPF (Pessoa Física)</SelectItem>
                        <SelectItem value="CNPJ">CNPJ (Pessoa Jurídica)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="document_num">
                      {formData.document_type === "CPF" ? "CPF" : "CNPJ"}
                    </Label>
                    <Input
                      id="document_num"
                      value={formData.document_num}
                      onChange={(e) => {
                        const formatted =
                          formData.document_type === "CPF"
                            ? formatCpf(e.target.value)
                            : formatCnpj(e.target.value);
                        updateField("document_num", formatted);
                      }}
                      placeholder={formData.document_type === "CPF" ? "000.000.000-00" : "00.000.000/0000-00"}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="email@exemplo.com"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => updateField("phone", formatPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => updateField("whatsapp", formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    className="rounded-xl"
                  />
                </div>
              </TabsContent>

              {/* ----- Tab: Endereço --------------------------------------- */}
              <TabsContent value="address" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="Rua, número, complemento"
                    className="rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      placeholder="Cidade"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(v) => updateField("state", v)}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        {BRAZILIAN_STATES.map((uf) => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 max-w-[200px]">
                  <Label htmlFor="zip_code">CEP</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => updateField("zip_code", formatZip(e.target.value))}
                    placeholder="00000-000"
                    className="rounded-xl"
                  />
                </div>
              </TabsContent>

              {/* ----- Tab: Documentos Pessoais ------------------------------ */}
              <TabsContent value="documents" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rg">RG</Label>
                    <Input
                      id="rg"
                      value={formData.rg}
                      onChange={(e) => updateField("rg", e.target.value)}
                      placeholder="Número do RG"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rg_issuer">Órgão Emissor</Label>
                    <Input
                      id="rg_issuer"
                      value={formData.rg_issuer}
                      onChange={(e) => updateField("rg_issuer", e.target.value)}
                      placeholder="SSP/SP"
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cnh">CNH</Label>
                    <Input
                      id="cnh"
                      value={formData.cnh}
                      onChange={(e) => updateField("cnh", e.target.value)}
                      placeholder="Número da CNH"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnh_expiry">Validade CNH</Label>
                    <Input
                      id="cnh_expiry"
                      type="date"
                      value={formData.cnh_expiry}
                      onChange={(e) => updateField("cnh_expiry", e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Data de Nascimento</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => updateField("birth_date", e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nationality">Nacionalidade</Label>
                    <Input
                      id="nationality"
                      value={formData.nationality}
                      onChange={(e) => updateField("nationality", e.target.value)}
                      placeholder="Brasileira"
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Estado Civil</Label>
                    <Select
                      value={formData.marital_status}
                      onValueChange={(v) => updateField("marital_status", v)}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {MARITAL_STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="occupation">Profissão</Label>
                    <Input
                      id="occupation"
                      value={formData.occupation}
                      onChange={(e) => updateField("occupation", e.target.value)}
                      placeholder="Profissão"
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* ----- Tab: Dados Bancários --------------------------------- */}
              <TabsContent value="banking" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Banco</Label>
                  <Select
                    value={formData.bank_code}
                    onValueChange={(v) => {
                      updateField("bank_code", v);
                      if (v !== "other") {
                        const found = BANKS.find((b) => b.code === v);
                        if (found) updateField("bank_name", found.name);
                      }
                    }}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecione o banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {BANKS.map((b) => (
                        <SelectItem key={b.code} value={b.code}>
                          {b.code !== "other" ? `${b.code} – ${b.name}` : b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank_name">Nome do Banco</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_name}
                    onChange={(e) => updateField("bank_name", e.target.value)}
                    placeholder="Nome do banco"
                    className="rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="agency">Agência</Label>
                    <Input
                      id="agency"
                      value={formData.agency}
                      onChange={(e) => updateField("agency", e.target.value)}
                      placeholder="0000"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account">Conta</Label>
                    <Input
                      id="account"
                      value={formData.account}
                      onChange={(e) => updateField("account", e.target.value)}
                      placeholder="00000-0"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={formData.account_type}
                      onValueChange={(v) => updateField("account_type", v as "corrente" | "poupanca")}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corrente">Corrente</SelectItem>
                        <SelectItem value="poupanca">Poupança</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Chave PIX</Label>
                    <Select
                      value={formData.pix_key_type}
                      onValueChange={(v) => updateField("pix_key_type", v)}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {PIX_KEY_TYPES.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pix_key">Chave PIX</Label>
                    <Input
                      id="pix_key"
                      value={formData.pix_key}
                      onChange={(e) => updateField("pix_key", e.target.value)}
                      placeholder="Chave PIX"
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* ----- Tab: Classificação ----------------------------------- */}
              <TabsContent value="roles" className="space-y-5 mt-4">
                <p className="text-sm text-muted-foreground">
                  Selecione as classificações que se aplicam a esta entidade.
                </p>

                {/* Client */}
                <div className="flex items-center space-x-3 p-3 rounded-xl border border-gray-200 bg-white">
                  <Checkbox
                    id="is_client"
                    checked={formData.is_client}
                    onCheckedChange={(checked) => updateField("is_client", !!checked)}
                  />
                  <Label htmlFor="is_client" className="cursor-pointer flex-1">
                    <span className="font-medium">Cliente</span>
                    <span className="block text-xs text-muted-foreground">
                      Comprador de veículos ou serviços
                    </span>
                  </Label>
                  <Badge variant="outline" className={ROLE_BADGE_STYLES.client}>
                    {ENTITY_ROLE_LABELS.client}
                  </Badge>
                </div>

                {/* Supplier */}
                <div className="flex items-center space-x-3 p-3 rounded-xl border border-gray-200 bg-white">
                  <Checkbox
                    id="is_supplier"
                    checked={formData.is_supplier}
                    onCheckedChange={(checked) => updateField("is_supplier", !!checked)}
                  />
                  <Label htmlFor="is_supplier" className="cursor-pointer flex-1">
                    <span className="font-medium">Fornecedor</span>
                    <span className="block text-xs text-muted-foreground">
                      Fornece veículos ou serviços
                    </span>
                  </Label>
                  <Badge variant="outline" className={ROLE_BADGE_STYLES.supplier}>
                    {ENTITY_ROLE_LABELS.supplier}
                  </Badge>
                </div>

                {/* Seller */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 rounded-xl border border-gray-200 bg-white">
                    <Checkbox
                      id="is_seller"
                      checked={formData.is_seller}
                      onCheckedChange={(checked) => updateField("is_seller", !!checked)}
                    />
                    <Label htmlFor="is_seller" className="cursor-pointer flex-1">
                      <span className="font-medium">Vendedor</span>
                      <span className="block text-xs text-muted-foreground">
                        Vendedor comissionado
                      </span>
                    </Label>
                    <Badge variant="outline" className={ROLE_BADGE_STYLES.seller}>
                      {ENTITY_ROLE_LABELS.seller}
                    </Badge>
                  </div>

                  {formData.is_seller && (
                    <div className="ml-7 p-4 rounded-xl bg-green-50/50 border border-green-100 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="commission_rate">Comissão (%)</Label>
                          <Input
                            id="commission_rate"
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={formData.commission_rate}
                            onChange={(e) => updateField("commission_rate", e.target.value)}
                            placeholder="Ex: 5.00"
                            className="rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="commission_pay_rule">Regra de Pagamento</Label>
                          <Input
                            id="commission_pay_rule"
                            value={formData.commission_pay_rule}
                            onChange={(e) => updateField("commission_pay_rule", e.target.value)}
                            placeholder="Ex: Pago na venda"
                            className="rounded-xl"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Investor */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 rounded-xl border border-gray-200 bg-white">
                    <Checkbox
                      id="is_investor"
                      checked={formData.is_investor}
                      onCheckedChange={(checked) => updateField("is_investor", !!checked)}
                    />
                    <Label htmlFor="is_investor" className="cursor-pointer flex-1">
                      <span className="font-medium">Investidor</span>
                      <span className="block text-xs text-muted-foreground">
                        Investidor com retorno sobre capital
                      </span>
                    </Label>
                    <Badge variant="outline" className={ROLE_BADGE_STYLES.investor}>
                      {ENTITY_ROLE_LABELS.investor}
                    </Badge>
                  </div>

                  {formData.is_investor && (
                    <div className="ml-7 p-4 rounded-xl bg-purple-50/50 border border-purple-100 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo de Retorno</Label>
                          <Select
                            value={formData.investor_roi_type}
                            onValueChange={(v) => updateField("investor_roi_type", v)}
                          >
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {INVESTOR_ROI_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="investor_roi_rate">Taxa de Retorno (%)</Label>
                          <Input
                            id="investor_roi_rate"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.investor_roi_rate}
                            onChange={(e) => updateField("investor_roi_rate", e.target.value)}
                            placeholder="Ex: 3.50"
                            className="rounded-xl"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ----- Tab: Arquivos GED ---------------------------------- */}
              <TabsContent value="ged" className="mt-4">
                {isEdit && id && currentUserId ? (
                  <GedAttachments
                    attachableType="entity"
                    attachableId={id}
                    userId={currentUserId}
                  />
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">
                    Salve a entidade primeiro para anexar documentos.
                  </p>
                )}
              </TabsContent>
            </Tabs>

            {/* Submit */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSaving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 text-base font-medium shadow-sm"
              >
                {isSaving
                  ? "Salvando..."
                  : isEdit
                    ? "Atualizar Entidade"
                    : "Cadastrar Entidade"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
