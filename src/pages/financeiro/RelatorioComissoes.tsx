import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Percent,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

interface CommissionTransaction {
  id: string;
  amount: number;
  status: string;
  due_date: string | null;
  payment_date: string | null;
  description: string | null;
  vehicle_id: string | null;
  seller_entity: { id: string; name: string } | null;
  entity: { id: string; name: string } | null;
  vehicle: { id: string; title: string | null; plate: string | null } | null;
  account: { dre_mapping_key: string | null } | null;
}

interface SellerGroup {
  sellerId: string;
  sellerName: string;
  transactions: CommissionTransaction[];
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  saleCount: number;
}

function getStatusBadge(status: string, dueDate: string | null) {
  if (status === "paid") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
        Pago
      </Badge>
    );
  }
  const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== "paid";
  if (isOverdue) {
    return (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
        Vencido
      </Badge>
    );
  }
  return (
    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">
      Pendente
    </Badge>
  );
}

function SellerRow({
  group,
  onMarkPaid,
  isPaying,
}: {
  group: SellerGroup;
  onMarkPaid: (id: string) => void;
  isPaying: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <TableRow className="cursor-pointer hover:bg-muted/50">
          <TableCell>
            <div className="flex items-center gap-2">
              {open ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-semibold">{group.sellerName}</span>
            </div>
          </TableCell>
          <TableCell className="text-center">{group.saleCount}</TableCell>
          <TableCell className="text-right font-medium">
            {formatCurrency(group.totalAmount)}
          </TableCell>
          <TableCell className="text-right text-green-700 font-medium">
            {formatCurrency(group.paidAmount)}
          </TableCell>
          <TableCell className="text-right text-yellow-700 font-medium">
            {formatCurrency(group.pendingAmount)}
          </TableCell>
          <TableCell />
        </TableRow>
      </CollapsibleTrigger>
      <CollapsibleContent asChild>
        <>
          {group.transactions.map((tx) => (
            <TableRow key={tx.id} className="bg-muted/20 text-sm">
              <TableCell className="pl-10">
                <div className="space-y-0.5">
                  <p className="font-medium">
                    {tx.vehicle?.title || tx.description || "Comissao"}
                  </p>
                  {tx.vehicle?.plate && (
                    <p className="text-xs text-muted-foreground">
                      {tx.vehicle.plate}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center text-muted-foreground">
                {tx.due_date
                  ? new Date(tx.due_date).toLocaleDateString("pt-BR")
                  : "-"}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(tx.amount)}
              </TableCell>
              <TableCell className="text-right">
                {tx.payment_date
                  ? new Date(tx.payment_date).toLocaleDateString("pt-BR")
                  : "-"}
              </TableCell>
              <TableCell className="text-right">
                {getStatusBadge(tx.status, tx.due_date)}
              </TableCell>
              <TableCell className="text-right">
                {tx.status !== "paid" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                    onClick={() => onMarkPaid(tx.id)}
                    disabled={isPaying}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Marcar Pago
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function RelatorioComissoes() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const queryClient = useQueryClient();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["relatorio-comissoes", selectedMonth],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase as any)
        .from("financial_transactions")
        .select(`
          id, amount, status, due_date, payment_date, description, vehicle_id,
          seller_entity:seller_entity_id (id, name),
          entity:entity_id (id, name),
          vehicle:products!financial_transactions_vehicle_id_fkey (id, title, plate),
          account:account_category_id (dre_mapping_key)
        `)
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .eq("type", "expense");

      if (error) throw error;

      // Filter client-side for commission key
      const all = (data || []) as CommissionTransaction[];
      return all.filter(
        (tx) => tx.account?.dre_mapping_key === "DESPESA_VAR_COMISSAO"
      );
    },
  });

  const { mutate: markPaid, isPending: isPaying } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("financial_transactions")
        .update({
          status: "paid",
          payment_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comissao marcada como paga");
      queryClient.invalidateQueries({ queryKey: ["relatorio-comissoes"] });
    },
    onError: () => {
      toast.error("Erro ao atualizar comissao");
    },
  });

  // Filter by selected month
  const filtered = useMemo(() => {
    if (!transactions) return [];
    const [year, month] = selectedMonth.split("-").map(Number);
    return transactions.filter((tx) => {
      const dateStr = tx.due_date || tx.payment_date;
      if (!dateStr) return true;
      const d = new Date(dateStr);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  }, [transactions, selectedMonth]);

  // Group by seller
  const sellerGroups = useMemo((): SellerGroup[] => {
    const map = new Map<string, SellerGroup>();

    filtered.forEach((tx) => {
      const sellerId =
        tx.seller_entity?.id || tx.entity?.id || "unknown";
      const sellerName =
        tx.seller_entity?.name || tx.entity?.name || "Vendedor nao identificado";

      if (!map.has(sellerId)) {
        map.set(sellerId, {
          sellerId,
          sellerName,
          transactions: [],
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          saleCount: 0,
        });
      }

      const group = map.get(sellerId)!;
      group.transactions.push(tx);
      group.totalAmount += tx.amount;
      group.saleCount += 1;
      if (tx.status === "paid") {
        group.paidAmount += tx.amount;
      } else {
        group.pendingAmount += tx.amount;
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.sellerName.localeCompare(b.sellerName)
    );
  }, [filtered]);

  // Summary stats
  const totalGerado = useMemo(
    () => filtered.reduce((s, tx) => s + tx.amount, 0),
    [filtered]
  );
  const totalPago = useMemo(
    () =>
      filtered
        .filter((tx) => tx.status === "paid")
        .reduce((s, tx) => s + tx.amount, 0),
    [filtered]
  );
  const totalPendente = totalGerado - totalPago;
  const vendedoresAtivos = sellerGroups.length;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Percent className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Relatorio de Comissoes
          </h1>
          <p className="text-muted-foreground">
            Controle de comissoes por vendedor
          </p>
        </div>
      </div>

      {/* Month Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-muted-foreground">
          Competencia:
        </label>
        <Input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-44 bg-white"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Comissoes Geradas
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalGerado)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filtered.length} lancamentos
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pago
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalPago)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filtered.filter((tx) => tx.status === "paid").length} liquidados
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pendente
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(totalPendente)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filtered.filter((tx) => tx.status !== "paid").length} em aberto
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendedores Ativos
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendedoresAtivos}</div>
            <p className="text-xs text-muted-foreground">
              com comissoes no periodo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grouped Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Comissoes por Vendedor</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sellerGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Percent className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                Nenhuma comissao encontrada para o periodo selecionado
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-center">Vendas</TableHead>
                  <TableHead className="text-right">Total Comissao</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                  <TableHead className="text-right">Pendente</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellerGroups.map((group) => (
                  <SellerRow
                    key={group.sellerId}
                    group={group}
                    onMarkPaid={markPaid}
                    isPaying={isPaying}
                  />
                ))}
                {/* Totals Row */}
                <TableRow className="border-t-2 font-bold bg-muted/30">
                  <TableCell>Total Geral</TableCell>
                  <TableCell className="text-center">
                    {filtered.length}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totalGerado)}
                  </TableCell>
                  <TableCell className="text-right text-green-700">
                    {formatCurrency(totalPago)}
                  </TableCell>
                  <TableCell className="text-right text-yellow-700">
                    {formatCurrency(totalPendente)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
