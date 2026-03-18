import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroNav } from "@/components/financeiro/FinanceiroNav";
import { toast } from "sonner";
import { Plus, ArrowUpCircle, CheckCircle, Trash2, Eye } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const paymentMethodLabel: Record<string, string> = {
  cash: "Dinheiro", financing: "Financiamento", credit_card: "Cartao de Credito",
  pix: "PIX", boleto: "Boleto", other: "Outro",
};

const statusBadge = (status: string) => {
  switch (status) {
    case "paid": return <Badge className="bg-green-500">Pago</Badge>;
    case "partial": return <Badge className="bg-yellow-500">Parcial</Badge>;
    case "overdue": return <Badge variant="destructive">Vencido</Badge>;
    default: return <Badge variant="secondary">Pendente</Badge>;
  }
};

interface Receivable {
  id: string;
  description: string;
  total_amount: number;
  installments: number | null;
  payment_method: string | null;
  status: string;
  notes: string | null;
  product_id: string | null;
  customer_id: string | null;
  created_at: string;
  products?: { brand: string | null; model: string | null } | null;
  customers?: { name: string } | null;
}

interface Installment {
  id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: string;
}

export default function ContasReceber() {
  const [items, setItems] = useState<Receivable[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [installmentsDialogOpen, setInstallmentsDialogOpen] = useState(false);
  const [selectedInstallments, setSelectedInstallments] = useState<Installment[]>([]);
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({
    description: "", total_amount: "", installments: "1", payment_method: "cash",
    customer_id: "", due_date: "", notes: "",
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [recRes, custRes] = await Promise.all([
      supabase.from("accounts_receivable").select("*, products(brand, model), customers(name)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("customers").select("id, name").eq("user_id", user.id),
    ]);

    setItems((recRes.data as unknown as Receivable[]) || []);
    setCustomers(custRes.data || []);
    setLoading(false);
  };

  const filteredItems = filter === "all" ? items : items.filter(i => i.status === filter);

  const save = async () => {
    if (!form.description.trim() || !form.total_amount || !form.due_date) {
      toast.error("Preencha descricao, valor e data");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const totalAmount = parseFloat(form.total_amount);
    const numInstallments = parseInt(form.installments) || 1;

    const { data: receivable, error } = await supabase.from("accounts_receivable").insert({
      user_id: user.id,
      description: form.description.trim(),
      total_amount: totalAmount,
      installments: numInstallments,
      payment_method: form.payment_method,
      customer_id: form.customer_id || null,
      notes: form.notes || null,
    }).select().single();

    if (error || !receivable) { toast.error("Erro ao cadastrar"); return; }

    // Create installments
    const installmentAmount = Math.round((totalAmount / numInstallments) * 100) / 100;
    const baseDate = new Date(form.due_date + "T00:00:00");
    const installmentRows = [];

    for (let i = 0; i < numInstallments; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      installmentRows.push({
        receivable_id: receivable.id,
        installment_number: i + 1,
        amount: i === numInstallments - 1 ? Math.round((totalAmount - installmentAmount * (numInstallments - 1)) * 100) / 100 : installmentAmount,
        due_date: dueDate.toISOString().split("T")[0],
      });
    }

    await supabase.from("receivable_installments").insert(installmentRows);

    toast.success(`Conta cadastrada com ${numInstallments} parcela(s)`);
    setDialogOpen(false);
    setForm({ description: "", total_amount: "", installments: "1", payment_method: "cash", customer_id: "", due_date: "", notes: "" });
    load();
  };

  const viewInstallments = async (receivable: Receivable) => {
    setSelectedReceivable(receivable);
    const { data } = await supabase.from("receivable_installments")
      .select("*")
      .eq("receivable_id", receivable.id)
      .order("installment_number");
    setSelectedInstallments(data || []);
    setInstallmentsDialogOpen(true);
  };

  const markInstallmentPaid = async (installmentId: string, receivableId: string) => {
    await supabase.from("receivable_installments").update({
      status: "paid",
      payment_date: new Date().toISOString().split("T")[0],
    }).eq("id", installmentId);

    // Check if all installments are paid
    const { data: remaining } = await supabase.from("receivable_installments")
      .select("id").eq("receivable_id", receivableId).neq("status", "paid");

    if (remaining && remaining.length === 0) {
      await supabase.from("accounts_receivable").update({ status: "paid" }).eq("id", receivableId);
    } else {
      await supabase.from("accounts_receivable").update({ status: "partial" }).eq("id", receivableId);
    }

    toast.success("Parcela marcada como paga");
    if (selectedReceivable) viewInstallments(selectedReceivable);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover esta conta?")) return;
    await supabase.from("accounts_receivable").delete().eq("id", id);
    toast.success("Conta removida");
    load();
  };

  const total = filteredItems.reduce((s, i) => s + Number(i.total_amount), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ArrowUpCircle className="h-8 w-8 text-green-500" />
        <h1 className="text-3xl font-bold">Contas a Receber</h1>
      </div>

      <FinanceiroNav />

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          {["all", "pending", "partial", "overdue", "paid"].map(s => (
            <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)}>
              {s === "all" ? "Todas" : s === "pending" ? "Pendentes" : s === "partial" ? "Parcial" : s === "overdue" ? "Vencidas" : "Pagas"}
            </Button>
          ))}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Conta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Conta a Receber</DialogTitle>
              <DialogDescription>Cadastre uma nova receita</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Descricao *</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor Total (R$) *</Label>
                  <Input type="number" step="0.01" value={form.total_amount} onChange={e => setForm({ ...form, total_amount: e.target.value })} />
                </div>
                <div>
                  <Label>Parcelas</Label>
                  <Input type="number" min="1" value={form.installments} onChange={e => setForm({ ...form, installments: e.target.value })} />
                </div>
              </div>
              {parseInt(form.installments) > 1 && form.total_amount && (
                <p className="text-sm text-muted-foreground">
                  {form.installments}x de {formatCurrency(parseFloat(form.total_amount) / parseInt(form.installments))}
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Forma de Pagamento</Label>
                  <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(paymentMethodLabel).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Primeiro Vencimento *</Label>
                  <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Cliente</Label>
                <Select value={form.customer_id} onValueChange={v => setForm({ ...form, customer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observacoes</Label>
                <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button className="w-full" onClick={save}>Cadastrar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-muted rounded-lg p-3 text-center">
        <p className="text-sm text-muted-foreground">Total {filter === "all" ? "" : `(${filter})`}</p>
        <p className="text-2xl font-bold text-green-600">{formatCurrency(total)}</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <p className="p-6">Carregando...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Parcelas</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma conta encontrada</TableCell></TableRow>
                ) : filteredItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.description}
                      {item.products && <span className="text-xs text-muted-foreground ml-1">({item.products.brand} {item.products.model})</span>}
                    </TableCell>
                    <TableCell>{item.customers?.name || "-"}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(item.total_amount)}</TableCell>
                    <TableCell>{item.installments || 1}x</TableCell>
                    <TableCell>{item.payment_method ? paymentMethodLabel[item.payment_method] || item.payment_method : "-"}</TableCell>
                    <TableCell>{statusBadge(item.status)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => viewInstallments(item)}>
                        <Eye className="h-4 w-4 mr-1" />Parcelas
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(item.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Installments Dialog */}
      <Dialog open={installmentsDialogOpen} onOpenChange={setInstallmentsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Parcelas - {selectedReceivable?.description}</DialogTitle>
            <DialogDescription>{selectedReceivable ? formatCurrency(selectedReceivable.total_amount) + ` em ${selectedReceivable.installments || 1}x` : ""}</DialogDescription>
          </DialogHeader>
          <Separator />
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {selectedInstallments.map(inst => (
              <div key={inst.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Parcela {inst.installment_number}</p>
                  <p className="text-sm text-muted-foreground">
                    Vencimento: {new Date(inst.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                    {inst.payment_date && ` | Pago em: ${new Date(inst.payment_date + "T00:00:00").toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{formatCurrency(inst.amount)}</span>
                  {inst.status === "paid" ? (
                    <Badge className="bg-green-500">Pago</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => markInstallmentPaid(inst.id, selectedReceivable!.id)}>
                      <CheckCircle className="h-4 w-4 mr-1" />Pagar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
