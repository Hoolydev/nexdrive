import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroNav } from "@/components/financeiro/FinanceiroNav";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users } from "lucide-react";

interface Salesperson {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  commission_rate: number | null;
  active: boolean | null;
}

const emptyForm = { name: "", phone: "", email: "", cpf: "", commission_rate: "", active: true };

export default function Vendedores() {
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Salesperson | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("salespeople").select("*").eq("user_id", user.id).order("name");
    setSalespeople(data || []);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (sp: Salesperson) => {
    setEditing(sp);
    setForm({
      name: sp.name,
      phone: sp.phone || "",
      email: sp.email || "",
      cpf: sp.cpf || "",
      commission_rate: sp.commission_rate?.toString() || "",
      active: sp.active !== false,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Nome e obrigatorio"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      phone: form.phone || null,
      email: form.email || null,
      cpf: form.cpf || null,
      commission_rate: form.commission_rate ? parseFloat(form.commission_rate) : 0,
      active: form.active,
    };

    if (editing) {
      const { error } = await supabase.from("salespeople").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Vendedor atualizado");
    } else {
      const { error } = await supabase.from("salespeople").insert(payload);
      if (error) { toast.error("Erro ao cadastrar"); return; }
      toast.success("Vendedor cadastrado");
    }
    setDialogOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este vendedor?")) return;
    const { error } = await supabase.from("salespeople").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    toast.success("Vendedor removido");
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Vendedores</h1>
      </div>

      <FinanceiroNav />

      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Vendedor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Vendedor" : "Novo Vendedor"}</DialogTitle>
              <DialogDescription>Preencha os dados do vendedor</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>CPF</Label>
                  <Input value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} />
                </div>
                <div>
                  <Label>Comissao Padrao (%)</Label>
                  <Input type="number" step="0.5" value={form.commission_rate} onChange={e => setForm({ ...form, commission_rate: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
                <Label>Ativo</Label>
              </div>
              <Button className="w-full" onClick={save}>Salvar</Button>
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
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Comissao %</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salespeople.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum vendedor cadastrado</TableCell></TableRow>
                ) : salespeople.map(sp => (
                  <TableRow key={sp.id}>
                    <TableCell className="font-medium">{sp.name}</TableCell>
                    <TableCell>{sp.phone || "-"}</TableCell>
                    <TableCell>{sp.email || "-"}</TableCell>
                    <TableCell>{sp.commission_rate ?? 0}%</TableCell>
                    <TableCell>
                      <Badge variant={sp.active !== false ? "default" : "secondary"}>
                        {sp.active !== false ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(sp)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(sp.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
