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
import { AlertTriangle, ArrowDownCircle, CheckCircle2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
};

const today = () => new Date().toISOString().split("T")[0];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TxStatus = "open" | "partial" | "paid" | "overdue" | "cancelled";

interface FinancialTx {
  id: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: TxStatus;
  description: string | null;
  type: string;
  entity: { id: string; name: string } | null;
  vehicle: { id: string; title: string | null; plate: string | null } | null;
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

export default function ContasPagar() {
  const [items, setItems] = useState<FinancialTx[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDueDateFrom, setFilterDueDateFrom] = useState("");
  const [filterDueDateTo, setFilterDueDateTo] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");

  // Liquidar dialog
  const [liquidarOpen, setLiquidarOpen] = useState(false);
  const [liquidarItem, setLiquidarItem] = useState<FinancialTx | null>(null);
  const [liquidarDate, setLiquidarDate] = useState(today());
  const [liquidarMethod, setLiquidarMethod] = useState("PIX");
  const [liquidarSubmitting, setLiquidarSubmitting] = useState(false);

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
          id, amount, due_date, payment_date, status, description, type,
          entity:entities!financial_transactions_entity_id_fkey (id, name),
          vehicle:vehicles!financial_transactions_vehicle_id_fkey (id, title, plate),
          account:chart_of_accounts!financial_transactions_account_category_id_fkey (id, name, dre_mapping_key)
        `)
        .eq("user_id", user.id)
        .eq("type", "expense")
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
  // Filtered items
  // ---------------------------------------------------------------------------

  const todayStr = today();

  const filtered = items.filter((item) => {
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
    (i) => (i.status === "open" || i.status === "overdue") && i.due_date < todayStr
  );

  // ---------------------------------------------------------------------------
  // Totals
  // ---------------------------------------------------------------------------

  const totalAberto = items
    .filter((i) => i.status === "open" || i.status === "partial")
    .reduce((s, i) => s + Number(i.amount), 0);

  const totalVencido = items
    .filter((i) => (i.status === "open" || i.status === "overdue") && i.due_date < todayStr)
    .reduce((s, i) => s + Number(i.amount), 0);

  const totalPeriodo = filtered.reduce((s, i) => s + Number(i.amount), 0);

  // ---------------------------------------------------------------------------
  // Liquidar
  // ---------------------------------------------------------------------------

  const openLiquidar = (item: FinancialTx) => {
    setLiquidarItem(item);
    setLiquidarDate(today());
    setLiquidarMethod("PIX");
    setLiquidarOpen(true);
  };

  const handleLiquidar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liquidarItem) return;
    setLiquidarSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from("financial_transactions")
        .update({
          status: "paid",
          payment_date: liquidarDate,
          payment_method: liquidarMethod,
        })
        .eq("id", liquidarItem.id);
      if (error) throw error;
      toast.success("Conta liquidada com sucesso!");
      setLiquidarOpen(false);
      setLiquidarItem(null);
      load();
    } catch (error: any) {
      toast.error("Erro ao liquidar: " + error.message);
    } finally {
      setLiquidarSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ArrowDownCircle className="h-8 w-8 text-red-500" />
        <div>
          <h1 className="text-3xl font-bold">Contas a Pagar</h1>
          <p className="text-muted-foreground text-sm">Despesas e obrigações financeiras</p>
        </div>
      </div>

      {/* Overdue alert */}
      {overdueItems.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-700">
              {overdueItems.length} {overdueItems.length === 1 ? "conta vencida" : "contas vencidas"}
            </p>
            <p className="text-sm text-red-600">
              Total vencido: {formatCurrency(overdueItems.reduce((s, i) => s + Number(i.amount), 0))}
            </p>
          </div>
        </div>
      )}

      {/* Totals bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Total Aberto</p>
          <p className="text-xl font-bold text-blue-700">{formatCurrency(totalAberto)}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <p className="text-xs text-red-600 font-medium uppercase tracking-wide mb-1">Total Vencido</p>
          <p className="text-xl font-bold text-red-700">{formatCurrency(totalVencido)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-1">Total do Período</p>
          <p className="text-xl font-bold text-gray-700">{formatCurrency(totalPeriodo)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Status filter */}
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

        {/* Due date from */}
        <div className="space-y-1">
          <Label className="text-xs">Vencimento de</Label>
          <Input
            type="date"
            className="w-40 h-9"
            value={filterDueDateFrom}
            onChange={(e) => setFilterDueDateFrom(e.target.value)}
          />
        </div>

        {/* Due date to */}
        <div className="space-y-1">
          <Label className="text-xs">até</Label>
          <Input
            type="date"
            className="w-40 h-9"
            value={filterDueDateTo}
            onChange={(e) => setFilterDueDateTo(e.target.value)}
          />
        </div>

        {/* Entity search */}
        <div className="space-y-1">
          <Label className="text-xs">Fornecedor / Entidade</Label>
          <Input
            className="w-44 h-9"
            placeholder="Buscar entidade..."
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
          />
        </div>

        {/* Vehicle filter */}
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
                  <TableHead>Entidade</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Categoria DRE</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                      Nenhuma conta encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => {
                    const isOverdue =
                      (item.status === "open" || item.status === "overdue") &&
                      item.due_date < todayStr;
                    return (
                      <TableRow key={item.id} className={isOverdue ? "bg-red-50/40" : undefined}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {item.description || "—"}
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
                        <TableCell className="font-bold text-red-600">
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
                              className="text-xs h-8"
                              onClick={() => openLiquidar(item)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Liquidar
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

      {/* Liquidar Dialog */}
      <Dialog open={liquidarOpen} onOpenChange={setLiquidarOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Liquidar Conta</DialogTitle>
            <DialogDescription>
              {liquidarItem?.description} — {liquidarItem ? formatCurrency(liquidarItem.amount) : ""}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLiquidar} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="liquidar_date">Data do Pagamento</Label>
              <Input
                id="liquidar_date"
                type="date"
                value={liquidarDate}
                onChange={(e) => setLiquidarDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={liquidarMethod} onValueChange={setLiquidarMethod}>
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
                onClick={() => setLiquidarOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={liquidarSubmitting}>
                {liquidarSubmitting ? "Liquidando..." : "Confirmar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
