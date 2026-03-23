import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
} from "lucide-react";
import type {
  ChartOfAccount,
  Entity,
} from "@/integrations/supabase/types-prd";

const paymentMethodLabels: Record<string, string> = {
  cash: "Dinheiro",
  pix: "PIX",
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  boleto: "Boleto",
  financing: "Financiamento",
  transfer: "Transferência",
  other: "Outro",
};

export default function LancamentoForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    type: "expense" as "income" | "expense",
    entity_id: "",
    account_category_id: "",
    vehicle_id: "",
    amount: "",
    due_date: "",
    payment_method: "pix",
    description: "",
    notes: "",
    is_refundable: false,
    refund_target_entity_id: "",
  });

  const { data: entities = [] } = useQuery({
    queryKey: ["entities_select"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("entities")
        .select("id, name")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("name");
      return (data || []) as Pick<Entity, "id" | "name">[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["chart_of_accounts_l3"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("chart_of_accounts")
        .select("id, name, code, type")
        .eq("user_id", user.id)
        .eq("level", 3)
        .eq("active", true)
        .order("code");
      return (data || []) as Pick<ChartOfAccount, "id" | "name" | "code" | "type">[];
    },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles_select"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("products")
        .select("id, brand, model, model_year")
        .eq("user_id", user.id)
        .order("brand");
      return (data || []) as { id: string; brand: string | null; model: string | null; model_year: number | null }[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await (supabase as any).from("financial_transactions").insert({
        user_id: user.id,
        type: form.type,
        entity_id: form.entity_id,
        account_category_id: form.account_category_id,
        vehicle_id: form.vehicle_id || null,
        amount: parseFloat(form.amount),
        due_date: form.due_date,
        payment_method: form.payment_method || null,
        description: form.description.trim() || null,
        notes: form.notes.trim() || null,
        status: "open",
        is_refundable: form.is_refundable,
        refund_target_entity_id: form.is_refundable && form.refund_target_entity_id ? form.refund_target_entity_id : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento criado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      navigate("/financeiro/lancamentos");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao criar lançamento");
    },
  });

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === form.type),
    [categories, form.type],
  );

  const handleSave = () => {
    if (!form.entity_id || !form.account_category_id || !form.amount || !form.due_date) {
      toast.error("Preencha entidade, categoria, valor e vencimento");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/financeiro/lancamentos")}
          className="rounded-xl"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex items-center gap-3">
          <Receipt className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Novo Lançamento</h1>
            <p className="text-muted-foreground text-sm">Cadastre uma nova conta a pagar ou receber.</p>
          </div>
        </div>
      </div>

      <Card className="rounded-2xl max-w-2xl">
        <CardContent className="p-6 space-y-5">
          {/* Type Toggle */}
          <div>
            <Label className="mb-2 block">Tipo</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={form.type === "expense" ? "default" : "outline"}
                className={form.type === "expense" ? "bg-red-600 hover:bg-red-700" : ""}
                onClick={() => setForm({ ...form, type: "expense", account_category_id: "" })}
              >
                <ArrowDownCircle className="h-4 w-4 mr-2" />
                Despesa
              </Button>
              <Button
                type="button"
                variant={form.type === "income" ? "default" : "outline"}
                className={form.type === "income" ? "bg-green-600 hover:bg-green-700" : ""}
                onClick={() => setForm({ ...form, type: "income", account_category_id: "" })}
              >
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Receita
              </Button>
            </div>
          </div>

          {/* Entity */}
          <div>
            <Label>Entidade *</Label>
            <Select value={form.entity_id} onValueChange={(v) => setForm({ ...form, entity_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a entidade..." />
              </SelectTrigger>
              <SelectContent>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div>
            <Label>Categoria (Plano de Contas) *</Label>
            <Select
              value={form.account_category_id}
              onValueChange={(v) => setForm({ ...form, account_category_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria..." />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vehicle (optional) */}
          <div>
            <Label>Veículo (opcional)</Label>
            <Select
              value={form.vehicle_id || "none"}
              onValueChange={(v) => setForm({ ...form, vehicle_id: v === "none" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.brand} {v.model} {(v as any).model_year || ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Vencimento *</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Forma de Pagamento</Label>
            <Select
              value={form.payment_method}
              onValueChange={(v) => setForm({ ...form, payment_method: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(paymentMethodLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Descrição</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Breve descrição do lançamento..."
            />
          </div>

          <div>
            <Label>Observações</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas adicionais..."
            />
          </div>

          <Separator />

          {/* Refundable */}
          <div className="flex items-center gap-3">
            <Switch
              checked={form.is_refundable}
              onCheckedChange={(v) => setForm({ ...form, is_refundable: v })}
            />
            <Label>Reembolsável</Label>
          </div>

          {form.is_refundable && (
            <div>
              <Label>Entidade para Reembolso</Label>
              <Select
                value={form.refund_target_entity_id}
                onValueChange={(v) => setForm({ ...form, refund_target_entity_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleSave}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Salvando..." : "Criar Lançamento"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
