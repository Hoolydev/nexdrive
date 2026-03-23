import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, ArrowUpCircle, CheckCircle2, User } from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
};

const todayStr = () => new Date().toISOString().split("T")[0];

function daysDiff(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + "T00:00:00");
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

function startOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().split("T")[0];
}

function endOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  return d.toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TxStatus = "open" | "partial" | "paid" | "overdue" | "cancelled";

type QuickFilter = "all" | "today" | "week" | "overdue";

interface FinancialTx {
  id: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: TxStatus;
  description: string | null;
  type: string;
  seller_entity_id: string | null;
  entity: { id: string; name: string } | null;
  vehicle: { id: string; title: string | null; plate: string | null } | null;
  seller: { id: string; name: string } | null;
  account: { id: string; name: string; dre_mapping_key: string | null } | null;
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: TxStatus }) {
  switch (status) {
    case "open":
      return <Badge className="bg-blue-500 text-white">Aberto</Badge>;
    case "overdue":
      return <Badge className="bg-red-500 text-white">Vencido</Badge>;
    case "partial":
      return <Badge className="bg-yellow-500 text-white">Parcial</Badge>;
    case "paid":
      return <Badge className="bg-green-500 text-white">Pago</Badge>;
    case "cancelled":
      return <Badge className="bg-gray-400 text-white">Cancelado</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContasReceber() {
  const [items, setItems] = useState<FinancialTx[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDueDateFrom, setFilterDueDateFrom] = useState("");
  const [filterDueDateTo, setFilterDueDateTo] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");

  // Receber dialog
  const [receberOpen, setReceberOpen] = useState(false);
  const [receberItem, setReceberItem] = useState<FinancialTx | null>(null);
  const [receberDate, setReceberDate] = useState(todayStr());
  const [receberMethod, setReceberMethod] = useState("PIX");
  const [receberSubmitting, setReceberSubmitting] = useState(false);

  // Inadimplência threshold (days overdue to show red badge)
  const OVERDUE_THRESHOLD_DAYS = 7;

  // ---------------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------------

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from("financial_transactions")
        .select(`
          id, amount, due_date, payment_date, status, description, type, seller_entity_id,
          entity:entities!financial_transactions_entity_id_fkey (id, name),
          vehicle:vehicles!financial_transactions_vehicle_id_fkey (id, title, plate),
          seller:entities!financial_transactions_seller_entity_id_fkey (id, name),
          account:chart_of_accounts!financial_transactions_account_category_id_fkey (id, name, dre_mapping_key)
        `)
        .eq("user_id", user.id)
        .eq("type", "income")
        .is("deleted_at", null)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setItems((data || []) as FinancialTx[]);
    } catch (error: any) {
      toast.error("Erro ao carregar contas: " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ---------------------------------------------------------------------------
  // Quick filter logic
  // ---------------------------------------------------------------------------

  const today = todayStr();

  const applyQuickFilter = (item: FinancialTx): boolean => {
    switch (quickFilter) {
      case "today":
        return item.due_date === today;
      case "week":
        return item.due_date >= startOfWeek() && item.due_date <= endOfWeek();
      case "overdue":
        return (item.status === "open" || item.status === "overdue") && item.due_date < today;
      default:
        return true;
    }
  };

  // ---------------------------------------------------------------------------
  // Filtered items
  // ---------------------------------------------------------------------------

  const filtered = items.filter((item) => {
    if (!applyQuickFilter(item)) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (filterDueDateFrom && item.due_date < filterDueDateFrom) return false;
    if (filterDueDateTo && item.due_date > filterDueDateTo) return false;
    if (filterEntity && !(item.entity?.name?.toLowerCase().includes(filterEntity.toLowerCase()))) return false;
    if (filterVehicle) {
      const plate = item.vehicle?.plate?.toLowerCase() || "";
      const title = item.vehicle?.title?.toLowerCase() || "";
      const q = filterVehicle.toLowerCase();
      if (!plate.includes(q) && !title.includes(q)) return false;
    }
    return true;
  });

  // ---------------------------------------------------------------------------
  // Overdue alert
  // ---------------------------------------------------------------------------

  const overdueItems = items.filter(
    (i) => (i.status === "open" || i.status === "overdue") && i.due_date < today
  );

  // ---------------------------------------------------------------------------
  // Totals
  // ---------------------------------------------------------------------------

  const totalAReceber = items
    .filter((i) => i.status === "open" || i.status === "partial")
    .reduce((s, i) => s + Number(i.amount), 0);

  const totalVencido = items
    .filter((i) => (i.status === "open" || i.status === "overdue") && i.due_date < today)
    .reduce((s, i) => s + Number(i.amount), 0);

  const totalRecebidoPeriodo = items
    .filter((i) => i.status === "paid" && i.payment_date)
    .reduce((s, i) => s + Number(i.amount), 0);

  // ---------------------------------------------------------------------------
  // Receber
  // ---------------------------------------------------------------------------

  const openReceber = (item: FinancialTx) => {
    setReceberItem(item);
    setReceberDate(todayStr());
    setReceberMethod("PIX");
    setReceberOpen(true);
  };

  const handleReceber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receberItem) return;
    setReceberSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from("financial_transactions")
        .update({
          status: "paid",
          payment_date: receberDate,
          payment_method: receberMethod,
        })
        .eq("id", receberItem.id);
      if (error) throw error;
      toast.success("Recebimento registrado com sucesso!");
      setReceberOpen(false);
      setReceberItem(null);
      load();
    } catch (error: any) {
      toast.error("Erro ao registrar recebimento: " + error.message);
    } finally {
      setReceberSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ArrowUpCircle className="h-8 w-8 text-green-500" />
        <div>
          <h1 className="text-3xl font-bold">Contas a Receber</h1>
          <p className="text-muted-foreground text-sm">Receitas e valores a receber</p>
        </div>
      </div>

      {/* Inadimplência alert */}
      {overdueItems.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-700">
              {overdueItems.length} {overdueItems.length === 1 ? "conta vencida" : "contas vencidas"} (inadimplência)
            </p>
            <p className="text-sm text-red-600">
              Total inadimplente: {formatCurrency(overdueItems.reduce((s, i) => s + Number(i.amount), 0))}
            </p>
          </div>
        </div>
      )}

      {/* Totals bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Total a Receber</p>
          <p className="text-xl font-bold text-blue-700">{formatCurrency(totalAReceber)}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <p className="text-xs text-red-600 font-medium uppercase tracking-wide mb-1">Total Vencido</p>
          <p className="text-xl font-bold text-red-700">{formatCurrency(totalVencido)}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-xs text-green-600 font-medium uppercase tracking-wide mb-1">Recebido no Período</p>
          <p className="text-xl font-bold text-green-700">{formatCurrency(totalRecebidoPeriodo)}</p>
        </div>
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: "all", label: "Todos" },
          { key: "today", label: "Vencendo Hoje" },
          { key: "week", label: "Esta Semana" },
          { key: "overdue", label: "Vencidos" },
        ] as { key: QuickFilter; label: string }[]).map((qf) => (
          <Button
            key={qf.key}
            variant={quickFilter === qf.key ? "default" : "outline"}
            size="sm"
            onClick={() => setQuickFilter(qf.key)}
          >
            {qf.label}
            {qf.key === "overdue" && overdueItems.length > 0 && (
              <Badge className="ml-2 bg-red-500 text-white text-[10px] h-4 min-w-4 px-1">
                {overdueItems.length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Advanced filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="overdue">Vencido</SelectItem>
              <SelectItem value="partial">Parcial</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Vencimento de</Label>
          <Input
            type="date"
            className="w-40 h-9"
            value={filterDueDateFrom}
            onChange={(e) => setFilterDueDateFrom(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">até</Label>
          <Input
            type="date"
            className="w-40 h-9"
            value={filterDueDateTo}
            onChange={(e) => setFilterDueDateTo(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Cliente / Entidade</Label>
          <Input
            className="w-44 h-9"
            placeholder="Buscar entidade..."
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Veículo (placa/nome)</Label>
          <Input
            className="w-40 h-9"
            placeholder="Buscar veículo..."
            value={filterVehicle}
            onChange={(e) => setFilterVehicle(e.target.value)}
          />
        </div>

        {(filterStatus !== "all" || filterDueDateFrom || filterDueDateTo || filterEntity || filterVehicle) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs"
            onClick={() => {
              setFilterStatus("all");
              setFilterDueDateFrom("");
              setFilterDueDateTo("");
              setFilterEntity("");
              setFilterVehicle("");
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-center text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Categoria DRE</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Recebimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                      Nenhuma conta encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => {
                    const isOverdue =
                      (item.status === "open" || item.status === "overdue") &&
                      item.due_date < today;
                    const daysOverdue = isOverdue ? daysDiff(item.due_date) : 0;
                    const showOverdueBadge = isOverdue && daysOverdue >= OVERDUE_THRESHOLD_DAYS;

                    return (
                      <TableRow key={item.id} className={isOverdue ? "bg-red-50/40" : undefined}>
                        <TableCell className="font-medium max-w-[180px]">
                          <div className="truncate">{item.description || "—"}</div>
                          {showOverdueBadge && (
                            <Badge className="bg-red-600 text-white text-[10px] mt-1 whitespace-nowrap">
                              VENCIDO há {daysOverdue} {daysOverdue === 1 ? "dia" : "dias"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.entity?.name || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.vehicle ? (
                            <span>
                              {item.vehicle.plate && (
                                <Badge variant="outline" className="mr-1 text-xs font-mono">
                                  {item.vehicle.plate}
                                </Badge>
                              )}
                              <span className="text-muted-foreground text-xs">{item.vehicle.title}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.account?.name || "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.seller ? (
                            <div className="flex items-center gap-1.5">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span>{item.seller.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-bold text-green-600">
                          {formatCurrency(item.amount)}
                        </TableCell>
                        <TableCell className={isOverdue ? "text-red-600 font-semibold" : ""}>
                          {formatDate(item.due_date)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(item.payment_date)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={item.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          {(item.status === "open" || item.status === "overdue" || item.status === "partial") && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 border-green-400 text-green-700 hover:bg-green-50"
                              onClick={() => openReceber(item)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Receber
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Receber Dialog */}
      <Dialog open={receberOpen} onOpenChange={setReceberOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Recebimento</DialogTitle>
            <DialogDescription>
              {receberItem?.description} — {receberItem ? formatCurrency(receberItem.amount) : ""}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReceber} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receber_date">Data do Recebimento</Label>
              <Input
                id="receber_date"
                type="date"
                value={receberDate}
                onChange={(e) => setReceberDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={receberMethod} onValueChange={setReceberMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="TED">TED</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Cartão">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setReceberOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={receberSubmitting}
              >
                {receberSubmitting ? "Registrando..." : "Confirmar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
