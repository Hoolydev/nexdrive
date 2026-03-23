import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle,
  XCircle,
  Search,
  Receipt,
  Scale,
} from "lucide-react";
import type { FinancialTransaction } from "@/integrations/supabase/types-prd";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (date: string) =>
  new Date(date + "T00:00:00").toLocaleDateString("pt-BR");

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Aberto", className: "bg-gray-100 text-gray-700 border-gray-200" },
  overdue: { label: "Vencido", className: "bg-red-100 text-red-700 border-red-200" },
  partial: { label: "Parcial", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  paid: { label: "Pago", className: "bg-green-100 text-green-700 border-green-200" },
  cancelled: { label: "Cancelado", className: "bg-gray-100 text-gray-400 border-gray-200 line-through" },
};

interface TransactionRow extends FinancialTransaction {
  entity?: { name: string } | null;
  category?: { name: string; code: string } | null;
  vehicle?: { brand: string | null; model: string | null } | null;
}

export default function Lancamentos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["financial_transactions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase as any)
        .from("financial_transactions")
        .select(
          "*, entity:entities!financial_transactions_entity_id_fkey(name), category:chart_of_accounts!financial_transactions_account_category_id_fkey(name, code), vehicle:products!financial_transactions_vehicle_id_fkey(brand, model)"
        )
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("due_date", { ascending: false });

      if (error) throw error;
      return (data || []) as TransactionRow[];
    },
  });

  const payMutation = useMutation({
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
      toast.success("Lançamento baixado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
    },
    onError: () => {
      toast.error("Erro ao baixar lançamento");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("financial_transactions")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento estornado");
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
    },
    onError: () => {
      toast.error("Erro ao estornar lançamento");
    },
  });

  const filteredTransactions = useMemo(() => {
    let result = transactions;

    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          (t.entity?.name || "").toLowerCase().includes(term) ||
          (t.description || "").toLowerCase().includes(term)
      );
    }

    if (dateFrom) {
      result = result.filter((t) => t.due_date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((t) => t.due_date <= dateTo);
    }

    return result;
  }, [transactions, typeFilter, statusFilter, searchTerm, dateFrom, dateTo]);

  const totals = useMemo(() => {
    const active = transactions.filter((t) => t.status !== "cancelled");
    const totalPagar = active.filter((t) => t.type === "expense" && t.status !== "paid").reduce((s, t) => s + Number(t.amount), 0);
    const totalReceber = active.filter((t) => t.type === "income" && t.status !== "paid").reduce((s, t) => s + Number(t.amount), 0);
    return { totalPagar, totalReceber, saldo: totalReceber - totalPagar };
  }, [transactions]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Receipt className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Lançamentos</h1>
          <p className="text-muted-foreground">Contas a pagar e receber unificadas</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl bg-red-50/50 border-red-100">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-700">Total a Pagar</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.totalPagar)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl bg-green-50/50 border-green-100">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-700">Total a Receber</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.totalReceber)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl bg-gray-50 border-gray-100">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Scale className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">Saldo</span>
            </div>
            <p className={`text-2xl font-bold ${totals.saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(totals.saldo)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Row */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Tabs
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as "all" | "expense" | "income")}
          >
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="expense">Contas a Pagar</TabsTrigger>
              <TabsTrigger value="income">Contas a Receber</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button onClick={() => navigate("/financeiro/lancamentos/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Lançamento
          </Button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Status pills */}
          <div className="flex gap-1.5">
            {[
              { key: "all", label: "Todos" },
              { key: "open", label: "Aberto" },
              { key: "overdue", label: "Vencido" },
              { key: "partial", label: "Parcial" },
              { key: "paid", label: "Pago" },
            ].map((s) => (
              <Button
                key={s.key}
                variant={statusFilter === s.key ? "default" : "outline"}
                size="sm"
                className="rounded-full text-xs px-3 h-7"
                onClick={() => setStatusFilter(s.key)}
              >
                {s.label}
              </Button>
            ))}
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por entidade ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-36"
              placeholder="De"
            />
            <span className="text-sm text-muted-foreground">a</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-36"
              placeholder="Até"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <Card className="rounded-2xl">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-muted-foreground py-12">
                      Nenhum lançamento encontrado
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const rowTint =
                      tx.type === "income"
                        ? "bg-green-50/40 hover:bg-green-50/70"
                        : "bg-red-50/30 hover:bg-red-50/60";
                    const sc = statusConfig[tx.status] || statusConfig.open;

                    return (
                      <TableRow key={tx.id} className={`${rowTint} transition-colors`}>
                        <TableCell className="text-sm">{formatDate(tx.due_date)}</TableCell>
                        <TableCell className="font-medium text-sm max-w-[200px] truncate">
                          {tx.description || "-"}
                        </TableCell>
                        <TableCell className="text-sm">{tx.entity?.name || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tx.vehicle ? `${tx.vehicle.brand || ""} ${tx.vehicle.model || ""}`.trim() : "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {tx.category ? (
                            <span title={tx.category.code}>
                              {tx.category.name}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold text-sm">
                          <span className={tx.type === "income" ? "text-green-700" : "text-red-600"}>
                            {tx.type === "expense" ? "- " : "+ "}
                            {formatCurrency(Number(tx.amount))}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${sc.className}`}>
                            {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {tx.status === "open" || tx.status === "overdue" || tx.status === "partial" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-700 hover:text-green-800 hover:bg-green-50"
                                onClick={() => payMutation.mutate(tx.id)}
                                disabled={payMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Baixar
                              </Button>
                            ) : null}
                            {tx.status !== "cancelled" && tx.status !== "paid" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => cancelMutation.mutate(tx.id)}
                                disabled={cancelMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Estornar
                              </Button>
                            )}
                          </div>
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
    </div>
  );
}
