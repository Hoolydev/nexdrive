import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Percent,
  Plus,
  CheckCircle,
  Users,
  TrendingUp,
  Clock,
  DollarSign,
  Car,
  Filter,
  Calendar,
} from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (date: string | null) => {
  if (!date) return "-";
  return new Date(date + "T12:00:00").toLocaleDateString("pt-BR");
};

interface CommissionTx {
  id: string;
  amount: number;
  status: string;
  due_date: string | null;
  payment_date: string | null;
  description: string | null;
  seller?: { id: string; name: string } | null;
  entity?: { id: string; name: string } | null;
  vehicle?: { id: string; title: string; plate: string | null } | null;
  account?: { id: string; name: string; dre_mapping_key: string | null } | null;
  source_transaction?: { id: string; amount: number; payment_date: string | null } | null;
}

interface SellerOption {
  id: string;
  name: string;
}

interface VehicleOption {
  id: string;
  title: string;
  plate: string | null;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const emptyPayForm = { payment_date: "", payment_method: "pix" };
const emptyManualForm = {
  seller_entity_id: "",
  vehicle_id: "",
  amount: "",
  due_date: "",
  description: "",
};

export default function Comissoes() {
  const [allCommissions, setAllCommissions] = useState<CommissionTx[]>([]);
  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth());
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterSeller, setFilterSeller] = useState("all");

  // Pay dialog
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payForm, setPayForm] = useState(emptyPayForm);

  // Manual commission sheet
  const [manualSheetOpen, setManualSheetOpen] = useState(false);
  const [manualForm, setManualForm] = useState(emptyManualForm);
  const [commissionAccountId, setCommissionAccountId] = useState<string | null>(null);

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

    const [txRes, sellersRes, vehiclesRes, accountRes] = await Promise.all([
      (supabase as any)
        .from("financial_transactions")
        .select(`
          id, amount, status, due_date, payment_date, description,
          seller:entities!financial_transactions_seller_entity_id_fkey (id, name),
          entity:entities!financial_transactions_entity_id_fkey (id, name),
          vehicle:products!financial_transactions_vehicle_id_fkey (id, title, plate),
          account:chart_of_accounts!financial_transactions_account_category_id_fkey (id, name, dre_mapping_key),
          source_transaction:commission_source_transaction_id (id, amount, payment_date)
        `)
        .eq("user_id", userId)
        .eq("type", "expense")
        .is("deleted_at", null)
        .order("due_date", { ascending: false }),
      (supabase as any)
        .from("entities")
        .select("id, name")
        .eq("user_id", userId)
        .eq("is_seller", true)
        .is("deleted_at", null)
        .order("name"),
      (supabase as any)
        .from("vehicles")
        .select("id, title, plate")
        .eq("user_id", userId)
        .order("title"),
      (supabase as any)
        .from("chart_of_accounts")
        .select("id")
        .eq("user_id", userId)
        .eq("dre_mapping_key", "DESPESA_VAR_COMISSAO")
        .limit(1),
    ]);

    const commissionData = (txRes.data || []).filter(
      (tx: CommissionTx) => tx.account?.dre_mapping_key === "DESPESA_VAR_COMISSAO"
    );

    setAllCommissions(commissionData);
    setSellers(sellersRes.data || []);
    setVehicles(vehiclesRes.data || []);
    if (accountRes.data && accountRes.data.length > 0) {
      setCommissionAccountId(accountRes.data[0].id);
    }
    setLoading(false);
  };

  // Filter commissions by month/year and seller
  const filteredCommissions = useMemo(() => {
    return allCommissions.filter((tx) => {
      const dateStr = tx.due_date;
      if (dateStr) {
        const d = new Date(dateStr + "T12:00:00");
        if (d.getMonth() !== filterMonth || d.getFullYear() !== filterYear) {
          return false;
        }
      }
      if (filterSeller !== "all") {
        const sellerId = tx.seller?.id || tx.entity?.id;
        if (sellerId !== filterSeller) return false;
      }
      return true;
    });
  }, [allCommissions, filterMonth, filterYear, filterSeller]);

  // Summaries
  const totalGerado = filteredCommissions.reduce((acc, tx) => acc + (tx.amount || 0), 0);
  const totalPago = filteredCommissions
    .filter((tx) => tx.status === "paid")
    .reduce((acc, tx) => acc + (tx.amount || 0), 0);
  const totalPendente = filteredCommissions
    .filter((tx) => tx.status === "open" || tx.status === "overdue")
    .reduce((acc, tx) => acc + (tx.amount || 0), 0);

  const uniqueSellersWithCommission = new Set(
    filteredCommissions.map((tx) => tx.seller?.id || tx.entity?.id).filter(Boolean)
  ).size;

  // Group by seller for accordion
  const groupedBySeller = useMemo(() => {
    const groups: Record<string, { sellerName: string; items: CommissionTx[] }> = {};
    filteredCommissions.forEach((tx) => {
      const sellerId = tx.seller?.id || tx.entity?.id || "unknown";
      const sellerName = tx.seller?.name || tx.entity?.name || "Sem vendedor";
      if (!groups[sellerId]) {
        groups[sellerId] = { sellerName, items: [] };
      }
      groups[sellerId].items.push(tx);
    });
    return groups;
  }, [filteredCommissions]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-0">
            Pago
          </Badge>
        );
      case "overdue":
        return (
          <Badge className="rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-0">
            Vencido
          </Badge>
        );
      default:
        return (
          <Badge className="rounded-full text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 border-0">
            Pendente
          </Badge>
        );
    }
  };

  const openPayDialog = (id: string) => {
    setPayingId(id);
    setPayForm({ payment_date: new Date().toISOString().split("T")[0], payment_method: "pix" });
    setPayDialogOpen(true);
  };

  const confirmPayment = async () => {
    if (!payingId) return;
    if (!payForm.payment_date) {
      toast.error("Informe a data de pagamento");
      return;
    }
    const { error } = await (supabase as any)
      .from("financial_transactions")
      .update({
        status: "paid",
        payment_date: payForm.payment_date,
        payment_method: payForm.payment_method,
      })
      .eq("id", payingId);

    if (error) {
      toast.error("Erro ao registrar pagamento");
      return;
    }
    toast.success("Comissao paga com sucesso");
    setPayDialogOpen(false);
    setPayingId(null);
    load();
  };

  const saveManual = async () => {
    if (!manualForm.seller_entity_id || !manualForm.amount || !manualForm.due_date) {
      toast.error("Preencha vendedor, valor e data de vencimento");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const payload: Record<string, unknown> = {
      user_id: user.id,
      type: "expense",
      status: "open",
      seller_entity_id: manualForm.seller_entity_id,
      amount: parseFloat(manualForm.amount),
      due_date: manualForm.due_date,
      description: manualForm.description || "Comissao manual",
    };

    if (manualForm.vehicle_id) payload.vehicle_id = manualForm.vehicle_id;
    if (commissionAccountId) payload.account_category_id = commissionAccountId;

    const { error } = await (supabase as any)
      .from("financial_transactions")
      .insert(payload);

    if (error) {
      toast.error("Erro ao registrar comissao manual");
      return;
    }
    toast.success("Comissao manual registrada");
    setManualSheetOpen(false);
    setManualForm(emptyManualForm);
    load();
  };

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(now.getFullYear());
    years.add(now.getFullYear() - 1);
    allCommissions.forEach((tx) => {
      if (tx.due_date) {
        years.add(new Date(tx.due_date + "T12:00:00").getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [allCommissions]);

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Percent className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Comissoes</h1>
            <p className="text-sm text-muted-foreground">Gestao de comissoes de vendas</p>
          </div>
        </div>
        <Button
          onClick={() => {
            setManualForm(emptyManualForm);
            setManualSheetOpen(true);
          }}
          className="gap-2 rounded-xl shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Comissao Manual
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Gerado</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                  {loading ? "-" : formatCurrency(totalGerado)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-200 dark:bg-blue-800">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600 dark:text-green-400">Total Pago</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300 mt-1">
                  {loading ? "-" : formatCurrency(totalPago)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-green-200 dark:bg-green-800">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
                  Total Pendente
                </p>
                <p className="text-xl font-bold text-orange-700 dark:text-orange-300 mt-1">
                  {loading ? "-" : formatCurrency(totalPendente)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-orange-200 dark:bg-orange-800">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400">
                  Vendedores
                </p>
                <p className="text-xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                  {loading ? "-" : uniqueSellersWithCommission}
                </p>
                <p className="text-xs text-purple-500">c/ comissao no periodo</p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-200 dark:bg-purple-800">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-300" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select
                value={filterMonth.toString()}
                onValueChange={(v) => setFilterMonth(parseInt(v))}
              >
                <SelectTrigger className="w-36 rounded-xl h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filterYear.toString()}
                onValueChange={(v) => setFilterYear(parseInt(v))}
              >
                <SelectTrigger className="w-24 rounded-xl h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={filterSeller} onValueChange={setFilterSeller}>
              <SelectTrigger className="w-48 rounded-xl h-9">
                <SelectValue placeholder="Todos os vendedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os vendedores</SelectItem>
                {sellers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Commissions grouped by seller */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          Carregando comissoes...
        </div>
      ) : Object.keys(groupedBySeller).length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="p-12 text-center">
            <Percent className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground font-medium">
              Nenhuma comissao encontrada
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Ajuste os filtros ou adicione uma comissao manual
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={Object.keys(groupedBySeller)} className="space-y-3">
          {Object.entries(groupedBySeller).map(([sellerId, group]) => {
            const groupTotal = group.items.reduce((acc, tx) => acc + (tx.amount || 0), 0);
            const groupPaid = group.items
              .filter((tx) => tx.status === "paid")
              .reduce((acc, tx) => acc + (tx.amount || 0), 0);
            const groupPending = group.items
              .filter((tx) => tx.status === "open" || tx.status === "overdue")
              .reduce((acc, tx) => acc + (tx.amount || 0), 0);

            return (
              <AccordionItem
                key={sellerId}
                value={sellerId}
                className="border-0 rounded-2xl shadow-sm bg-card overflow-hidden"
              >
                <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 rounded-2xl">
                  <div className="flex items-center justify-between w-full mr-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {group.sellerName.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm">{group.sellerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.items.length} comissao{group.items.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-bold">{formatCurrency(groupTotal)}</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-green-600">Pago</p>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(groupPaid)}
                        </p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-orange-600">Pendente</p>
                        <p className="font-semibold text-orange-600">
                          {formatCurrency(groupPending)}
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="px-5 pb-4 space-y-2">
                    {/* Mobile totals */}
                    <div className="flex gap-3 sm:hidden text-xs mb-3 pt-1">
                      <span className="font-bold">Total: {formatCurrency(groupTotal)}</span>
                      <span className="text-green-600">Pago: {formatCurrency(groupPaid)}</span>
                      <span className="text-orange-600">
                        Pendente: {formatCurrency(groupPending)}
                      </span>
                    </div>
                    {group.items.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors gap-3"
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {tx.vehicle ? (
                              <div className="flex items-center gap-1.5">
                                <Car className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm font-medium truncate">
                                  {tx.vehicle.title}
                                </span>
                                {tx.vehicle.plate && (
                                  <Badge
                                    variant="outline"
                                    className="rounded-full text-xs px-1.5 py-0"
                                  >
                                    {tx.vehicle.plate}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {tx.description || "Comissao"}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            {tx.source_transaction && (
                              <span>
                                Venda:{" "}
                                <span className="font-medium text-foreground">
                                  {formatCurrency(tx.source_transaction.amount)}
                                </span>
                              </span>
                            )}
                            {tx.due_date && (
                              <span>Venc.: {formatDate(tx.due_date)}</span>
                            )}
                            {tx.payment_date && tx.status === "paid" && (
                              <span className="text-green-600">
                                Pago em {formatDate(tx.payment_date)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <p className="font-bold text-sm">{formatCurrency(tx.amount)}</p>
                            {getStatusBadge(tx.status)}
                          </div>
                          {(tx.status === "open" || tx.status === "overdue") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl h-8 text-xs gap-1 border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
                              onClick={() => openPayDialog(tx.id)}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Pagar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Pay Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription>Informe os dados do pagamento da comissao</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Data de Pagamento</Label>
              <Input
                className="mt-1.5"
                type="date"
                value={payForm.payment_date}
                onChange={(e) =>
                  setPayForm((prev) => ({ ...prev, payment_date: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Forma de Pagamento</Label>
              <Select
                value={payForm.payment_method}
                onValueChange={(v) =>
                  setPayForm((prev) => ({ ...prev, payment_method: v }))
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="check">Cheque</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setPayDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button className="flex-1 rounded-xl" onClick={confirmPayment}>
                Confirmar Pagamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Commission Sheet */}
      <Sheet open={manualSheetOpen} onOpenChange={setManualSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Comissao Manual</SheetTitle>
            <SheetDescription>
              Use quando o disparo automatico nao ocorreu. A comissao sera registrada como
              despesa financeira.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5">
            <div>
              <Label>Vendedor *</Label>
              <Select
                value={manualForm.seller_entity_id}
                onValueChange={(v) =>
                  setManualForm((prev) => ({ ...prev, seller_entity_id: v }))
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione o vendedor..." />
                </SelectTrigger>
                <SelectContent>
                  {sellers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Veiculo</Label>
              <Select
                value={manualForm.vehicle_id || "none"}
                onValueChange={(v) =>
                  setManualForm((prev) => ({ ...prev, vehicle_id: v === "none" ? "" : v }))
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione o veiculo (opcional)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum veiculo</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.title}
                      {v.plate ? ` — ${v.plate}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor da Comissao *</Label>
                <Input
                  className="mt-1.5"
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualForm.amount}
                  onChange={(e) =>
                    setManualForm((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label>Data de Vencimento *</Label>
                <Input
                  className="mt-1.5"
                  type="date"
                  value={manualForm.due_date}
                  onChange={(e) =>
                    setManualForm((prev) => ({ ...prev, due_date: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <Label>Descricao</Label>
              <Input
                className="mt-1.5"
                value={manualForm.description}
                onChange={(e) =>
                  setManualForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Ex: Comissao venda #123"
              />
            </div>

            {!commissionAccountId && (
              <div className="rounded-xl bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-3 text-sm text-yellow-700 dark:text-yellow-400">
                Aviso: Nenhuma conta contabil com chave DESPESA_VAR_COMISSAO encontrada no
                Plano de Contas. A comissao sera registrada sem categoria.
              </div>
            )}

            <div className="pt-2">
              <Button className="w-full rounded-xl h-11" onClick={saveManual}>
                Registrar Comissao
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
