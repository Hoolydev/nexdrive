import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroNav } from "@/components/financeiro/FinanceiroNav";
import { toast } from "sonner";
import { Plus, Percent, CheckCircle } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

interface Commission {
  id: string;
  product_id: string;
  salesperson_id: string;
  commission_type: string;
  commission_value: number;
  calculated_amount: number;
  status: string;
  payment_date: string | null;
  sale_date: string;
  notes: string | null;
  products?: { brand: string | null; model: string | null; actual_sale_price: number | null };
  salespeople?: { name: string };
}

export default function Comissoes() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [salespeople, setSalespeople] = useState<{ id: string; name: string; commission_rate: number | null }[]>([]);
  const [soldVehicles, setSoldVehicles] = useState<{ id: string; brand: string | null; model: string | null; actual_sale_price: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    product_id: "", salesperson_id: "", commission_type: "percentage", commission_value: "", notes: "",
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [comRes, spRes, vehRes] = await Promise.all([
      supabase.from("commissions").select("*, products(brand, model, actual_sale_price), salespeople(name)").eq("user_id", user.id).order("sale_date", { ascending: false }),
      supabase.from("salespeople").select("id, name, commission_rate").eq("user_id", user.id).eq("active", true),
      supabase.from("products").select("id, brand, model, actual_sale_price").eq("user_id", user.id).eq("sold", true),
    ]);

    setCommissions((comRes.data as unknown as Commission[]) || []);
    setSalespeople(spRes.data || []);
    setSoldVehicles(vehRes.data || []);
    setLoading(false);
  };

  const getCalculatedAmount = () => {
    const vehicle = soldVehicles.find(v => v.id === form.product_id);
    const value = parseFloat(form.commission_value) || 0;
    if (form.commission_type === "percentage" && vehicle?.actual_sale_price) {
      return (vehicle.actual_sale_price * value) / 100;
    }
    return value;
  };

  const save = async () => {
    if (!form.product_id || !form.salesperson_id || !form.commission_value) {
      toast.error("Preencha todos os campos obrigatorios");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const vehicle = soldVehicles.find(v => v.id === form.product_id);

    const { error } = await supabase.from("commissions").insert({
      user_id: user.id,
      product_id: form.product_id,
      salesperson_id: form.salesperson_id,
      commission_type: form.commission_type,
      commission_value: parseFloat(form.commission_value),
      calculated_amount: getCalculatedAmount(),
      sale_date: vehicle ? new Date().toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      notes: form.notes || null,
    });

    if (error) { toast.error("Erro ao registrar comissao"); return; }
    toast.success("Comissao registrada");
    setDialogOpen(false);
    setForm({ product_id: "", salesperson_id: "", commission_type: "percentage", commission_value: "", notes: "" });
    load();
  };

  const markPaid = async (id: string) => {
    const { error } = await supabase.from("commissions").update({
      status: "paid",
      payment_date: new Date().toISOString().split("T")[0],
    }).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    toast.success("Comissao marcada como paga");
    load();
  };

  const handleSalespersonChange = (spId: string) => {
    const sp = salespeople.find(s => s.id === spId);
    setForm({
      ...form,
      salesperson_id: spId,
      commission_value: sp?.commission_rate?.toString() || form.commission_value,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Percent className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Comissoes</h1>
      </div>

      <FinanceiroNav />

      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Comissao</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Comissao</DialogTitle>
              <DialogDescription>Registre uma comissao de venda</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Veiculo Vendido *</Label>
                <Select value={form.product_id} onValueChange={v => setForm({ ...form, product_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {soldVehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.brand} {v.model} - {v.actual_sale_price ? formatCurrency(v.actual_sale_price) : "Sem preco"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vendedor *</Label>
                <Select value={form.salesperson_id} onValueChange={handleSalespersonChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {salespeople.map(sp => (
                      <SelectItem key={sp.id} value={sp.id}>{sp.name} ({sp.commission_rate ?? 0}%)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.commission_type} onValueChange={v => setForm({ ...form, commission_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentual (%)</SelectItem>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{form.commission_type === "percentage" ? "Percentual (%)" : "Valor (R$)"}</Label>
                  <Input type="number" step="0.5" value={form.commission_value} onChange={e => setForm({ ...form, commission_value: e.target.value })} />
                </div>
              </div>
              {form.product_id && form.commission_value && (
                <div className="bg-muted p-3 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Valor da Comissao</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(getCalculatedAmount())}</p>
                </div>
              )}
              <div>
                <Label>Observacoes</Label>
                <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button className="w-full" onClick={save}>Registrar Comissao</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <p className="p-6">Carregando...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Veiculo</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma comissao registrada</TableCell></TableRow>
                ) : commissions.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.products?.brand} {c.products?.model}</TableCell>
                    <TableCell>{c.salespeople?.name}</TableCell>
                    <TableCell>{c.commission_type === "percentage" ? `${c.commission_value}%` : formatCurrency(c.commission_value)}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(c.calculated_amount)}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "paid" ? "default" : "secondary"}>
                        {c.status === "paid" ? "Pago" : "Pendente"}
                      </Badge>
                      {c.payment_date && <span className="text-xs text-muted-foreground ml-1">{new Date(c.payment_date).toLocaleDateString("pt-BR")}</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.status === "pending" && (
                        <Button variant="ghost" size="sm" onClick={() => markPaid(c.id)}>
                          <CheckCircle className="h-4 w-4 mr-1" />Pagar
                        </Button>
                      )}
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
