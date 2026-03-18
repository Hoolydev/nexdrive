import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroNav } from "@/components/financeiro/FinanceiroNav";
import { toast } from "sonner";
import { Plus, ArrowDownCircle, CheckCircle, Trash2 } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

interface Payable {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: string;
  is_recurring: boolean | null;
  recurrence_interval: string | null;
  notes: string | null;
  category_id: string | null;
  financial_categories?: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

const statusBadge = (status: string) => {
  switch (status) {
    case "paid": return <Badge className="bg-green-500">Pago</Badge>;
    case "overdue": return <Badge variant="destructive">Vencido</Badge>;
    default: return <Badge variant="secondary">Pendente</Badge>;
  }
};

export default function ContasPagar() {
  const [items, setItems] = useState<Payable[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({
    description: "", amount: "", due_date: "", category_id: "", notes: "",
    is_recurring: false, recurrence_interval: "monthly",
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [payRes, catRes] = await Promise.all([
      supabase.from("accounts_payable").select("*, financial_categories(name)").eq("user_id", user.id).order("due_date", { ascending: true }),
      supabase.from("financial_categories").select("id, name").eq("user_id", user.id).eq("type", "expense"),
    ]);

    // Auto-mark overdue
    const today = new Date().toISOString().split("T")[0];
    const data = (payRes.data as unknown as Payable[]) || [];
    const overdueIds = data.filter(p => p.status === "pending" && p.due_date < today).map(p => p.id);
    if (overdueIds.length > 0) {
      await supabase.from("accounts_payable").update({ status: "overdue" }).in("id", overdueIds);
      data.forEach(p => { if (overdueIds.includes(p.id)) p.status = "overdue"; });
    }

    setItems(data);
    setCategories(catRes.data || []);
    setLoading(false);
  };

  const filteredItems = filter === "all" ? items : items.filter(i => i.status === filter);

  const save = async () => {
    if (!form.description.trim() || !form.amount || !form.due_date) {
      toast.error("Preencha descricao, valor e vencimento");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("accounts_payable").insert({
      user_id: user.id,
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      due_date: form.due_date,
      category_id: form.category_id || null,
      notes: form.notes || null,
      is_recurring: form.is_recurring,
      recurrence_interval: form.is_recurring ? form.recurrence_interval : null,
    });

    if (error) { toast.error("Erro ao cadastrar"); return; }
    toast.success("Conta cadastrada");
    setDialogOpen(false);
    setForm({ description: "", amount: "", due_date: "", category_id: "", notes: "", is_recurring: false, recurrence_interval: "monthly" });
    load();
  };

  const markPaid = async (id: string) => {
    const { error } = await supabase.from("accounts_payable").update({
      status: "paid",
      payment_date: new Date().toISOString().split("T")[0],
    }).eq("id", id);
    if (error) { toast.error("Erro"); return; }
    toast.success("Conta marcada como paga");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover esta conta?")) return;
    await supabase.from("accounts_payable").delete().eq("id", id);
    toast.success("Conta removida");
    load();
  };

  const total = filteredItems.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ArrowDownCircle className="h-8 w-8 text-red-500" />
        <h1 className="text-3xl font-bold">Contas a Pagar</h1>
      </div>

      <FinanceiroNav />

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          {["all", "pending", "overdue", "paid"].map(s => (
            <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)}>
              {s === "all" ? "Todas" : s === "pending" ? "Pendentes" : s === "overdue" ? "Vencidas" : "Pagas"}
            </Button>
          ))}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Conta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Conta a Pagar</DialogTitle>
              <DialogDescription>Cadastre uma nova despesa</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Descricao *</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor (R$) *</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div>
                  <Label>Vencimento *</Label>
                  <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category_id} onValueChange={v => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_recurring} onCheckedChange={v => setForm({ ...form, is_recurring: v })} />
                <Label>Despesa recorrente</Label>
              </div>
              {form.is_recurring && (
                <div>
                  <Label>Frequencia</Label>
                  <Select value={form.recurrence_interval} onValueChange={v => setForm({ ...form, recurrence_interval: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
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
        <p className="text-2xl font-bold">{formatCurrency(total)}</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <p className="p-6">Carregando...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma conta encontrada</TableCell></TableRow>
                ) : filteredItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.description}
                      {item.is_recurring && <Badge variant="outline" className="ml-2 text-xs">Recorrente</Badge>}
                    </TableCell>
                    <TableCell>{item.financial_categories?.name || "-"}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(item.amount)}</TableCell>
                    <TableCell>{new Date(item.due_date + "T00:00:00").toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{statusBadge(item.status)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {item.status !== "paid" && (
                        <Button variant="ghost" size="sm" onClick={() => markPaid(item.id)}>
                          <CheckCircle className="h-4 w-4 mr-1" />Pagar
                        </Button>
                      )}
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
    </div>
  );
}
