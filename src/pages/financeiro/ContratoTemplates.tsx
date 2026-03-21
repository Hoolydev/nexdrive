import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileText, Star } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ContractType = "CONSIGNMENT_IN" | "PURCHASE_IN" | "SALE_OUT" | "SERVICE_ORDER";

interface ContractTemplate {
  id: string;
  user_id: string;
  name: string;
  contract_type: ContractType;
  body: string;
  is_default: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

type TemplateFormState = {
  name: string;
  contract_type: ContractType | "";
  body: string;
  is_default: boolean;
  active: boolean;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  CONSIGNMENT_IN: "Entrada por Consignacao",
  PURCHASE_IN: "Compra de Veiculo",
  SALE_OUT: "Venda de Veiculo",
  SERVICE_ORDER: "Ordem de Servico",
};

const CONTRACT_TYPES: ContractType[] = [
  "CONSIGNMENT_IN",
  "PURCHASE_IN",
  "SALE_OUT",
  "SERVICE_ORDER",
];

const CONTRACT_TYPE_BADGE_COLORS: Record<ContractType, string> = {
  CONSIGNMENT_IN: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  PURCHASE_IN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  SALE_OUT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  SERVICE_ORDER: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

const AVAILABLE_VARIABLES = [
  {
    group: "Entidade (cliente/vendedor)",
    vars: [
      "{{entity.name}}",
      "{{entity.document_num}}",
      "{{entity.address}}",
      "{{entity.city}}",
      "{{entity.rg}}",
      "{{entity.cnh}}",
      "{{entity.pix_key}}",
    ],
  },
  {
    group: "Veiculo",
    vars: [
      "{{vehicle.title}}",
      "{{vehicle.plate}}",
      "{{vehicle.chassis}}",
      "{{vehicle.renavam}}",
      "{{vehicle.brand}}",
      "{{vehicle.model}}",
      "{{vehicle.year}}",
    ],
  },
  {
    group: "Contrato",
    vars: [
      "{{contract.total_value}}",
      "{{contract.down_payment}}",
      "{{contract.sign_date}}",
      "{{contract.payment_method}}",
      "{{contract.installments}}",
    ],
  },
];

const EMPTY_FORM: TemplateFormState = {
  name: "",
  contract_type: "",
  body: "",
  is_default: false,
  active: true,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContratoTemplates() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TemplateFormState>(EMPTY_FORM);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from("contract_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("contract_type")
        .order("name");

      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      toast.error("Erro ao carregar templates: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  };

  const openEdit = (tpl: ContractTemplate) => {
    setEditingId(tpl.id);
    setForm({
      name: tpl.name,
      contract_type: tpl.contract_type,
      body: tpl.body,
      is_default: tpl.is_default,
      active: tpl.active,
    });
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Informe o nome do template");
      return;
    }
    if (!form.contract_type) {
      toast.error("Selecione o tipo de contrato");
      return;
    }
    if (!form.body.trim()) {
      toast.error("O corpo do template nao pode estar vazio");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Nao autenticado");

      const payload = {
        user_id: user.id,
        name: form.name.trim(),
        contract_type: form.contract_type,
        body: form.body,
        is_default: form.is_default,
        active: form.active,
      };

      if (editingId) {
        const { error } = await (supabase as any)
          .from("contract_templates")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.id);
        if (error) throw error;
        toast.success("Template atualizado com sucesso");
      } else {
        const { error } = await (supabase as any)
          .from("contract_templates")
          .insert(payload);
        if (error) throw error;
        toast.success("Template criado com sucesso");
      }

      setSheetOpen(false);
      await load();
    } catch (err: any) {
      toast.error("Erro ao salvar template: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir este template? Esta acao nao pode ser desfeita.")) return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await (supabase as any)
        .from("contract_templates")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Template excluido");
      await load();
    } catch (err: any) {
      toast.error("Erro ao excluir: " + err.message);
    }
  };

  // Group templates by contract_type
  const grouped = CONTRACT_TYPES.reduce<Record<ContractType, ContractTemplate[]>>(
    (acc, type) => {
      acc[type] = templates.filter((t) => t.contract_type === type);
      return acc;
    },
    {} as Record<ContractType, ContractTemplate[]>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Templates de Contrato</h1>
        </div>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Templates de Contrato</h1>
            <p className="text-muted-foreground">
              Crie e gerencie modelos de contrato com variaveis dinamicas
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Template
        </Button>
      </div>

      {/* Groups */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum template criado ainda</p>
            <p className="text-muted-foreground mt-1 mb-4">
              Crie modelos de contrato para agilizar o processo de negociacao
            </p>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar primeiro template
            </Button>
          </CardContent>
        </Card>
      ) : (
        CONTRACT_TYPES.map((type) => {
          const group = grouped[type];
          if (group.length === 0) return null;
          return (
            <div key={type} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">{CONTRACT_TYPE_LABELS[type]}</h2>
                <Badge variant="outline">{group.length}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.map((tpl) => (
                  <Card
                    key={tpl.id}
                    className={`transition-shadow hover:shadow-md ${
                      !tpl.active ? "opacity-60" : ""
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">{tpl.name}</CardTitle>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(tpl)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(tpl.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CONTRACT_TYPE_BADGE_COLORS[type]}`}
                        >
                          {CONTRACT_TYPE_LABELS[type]}
                        </span>
                        {tpl.is_default && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                            <Star className="h-3 w-3" />
                            Padrao
                          </span>
                        )}
                        {!tpl.active && (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 font-mono">
                        {tpl.body.substring(0, 120)}
                        {tpl.body.length > 120 ? "..." : ""}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Sheet Form */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto" side="right">
          <SheetHeader>
            <SheetTitle>
              {editingId ? "Editar Template" : "Novo Template de Contrato"}
            </SheetTitle>
            <SheetDescription>
              Use variaveis no formato {"{{entity.name}}"} para dados dinamicos
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="tpl-name">Nome do template *</Label>
              <Input
                id="tpl-name"
                placeholder="Ex: Contrato Padrao de Venda"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {/* Contract type */}
            <div className="space-y-2">
              <Label>Tipo de contrato *</Label>
              <Select
                value={form.contract_type}
                onValueChange={(v) =>
                  setForm({ ...form, contract_type: v as ContractType })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {CONTRACT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="tpl-default"
                  checked={form.is_default}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, is_default: !!checked })
                  }
                />
                <Label htmlFor="tpl-default" className="cursor-pointer">
                  Template padrao para este tipo
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="tpl-active"
                  checked={form.active}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, active: !!checked })
                  }
                />
                <Label htmlFor="tpl-active" className="cursor-pointer">
                  Ativo
                </Label>
              </div>
            </div>

            <Separator />

            {/* Body + variable reference */}
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-2">
                <Label htmlFor="tpl-body">Corpo do template *</Label>
                <Textarea
                  id="tpl-body"
                  placeholder="Digite o texto do contrato com variaveis como {{entity.name}}, {{vehicle.plate}}..."
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  className="min-h-[400px] font-mono text-sm resize-y"
                />
              </div>

              {/* Variable reference sidebar */}
              <div className="space-y-3">
                <Label>Variaveis disponiveis</Label>
                <div className="rounded-lg border bg-muted/50 p-3 space-y-4 text-xs">
                  {AVAILABLE_VARIABLES.map((section) => (
                    <div key={section.group}>
                      <p className="font-semibold text-muted-foreground mb-2 uppercase tracking-wide text-[10px]">
                        {section.group}
                      </p>
                      <div className="space-y-1">
                        {section.vars.map((v) => (
                          <button
                            key={v}
                            type="button"
                            className="block w-full text-left font-mono text-xs px-2 py-1 rounded hover:bg-background hover:shadow-sm transition-colors text-primary"
                            onClick={() => {
                              setForm((prev) => ({ ...prev, body: prev.body + v }));
                            }}
                            title="Clique para inserir no corpo"
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <p className="text-muted-foreground text-[10px] pt-1">
                    Clique em uma variavel para inseri-la no corpo do template
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSheetOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : editingId ? "Salvar alteracoes" : "Criar template"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
