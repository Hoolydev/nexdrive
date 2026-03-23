import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Percent,
} from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("pt-BR");

type FinancialTransaction = {
  id: string;
  amount: number;
  type: string;
  status: string;
  payment_date: string | null;
  due_date: string | null;
  description: string | null;
  created_at: string;
  entity?: { name: string } | null;
  account?: { name: string; dre_mapping_key: string | null } | null;
};

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    open: "Aberto",
    partial: "Parcial",
    paid: "Pago",
    overdue: "Vencido",
    cancelled: "Cancelado",
  };
  return map[status] ?? status;
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "paid") return "default";
  if (status === "overdue") return "destructive";
  if (status === "open" || status === "partial") return "secondary";
  return "outline";
}

export default function Financeiro() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const { data } = await (supabase as any)
        .from("financial_transactions")
        .select(
          "id, amount, type, status, payment_date, due_date, description, created_at, entity:entities!financial_transactions_entity_id_fkey(name), account:chart_of_accounts!financial_transactions_account_category_id_fkey(name, dre_mapping_key)"
        )

        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      setTransactions(data ?? []);
    } catch (err) {
      console.error("Error loading financeiro:", err);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // KPI - current month paid
    const receitaBruta = transactions
      .filter((t) => t.type === "income" && t.status === "paid" && t.payment_date?.startsWith(monthStr))
      .reduce((s, t) => s + Number(t.amount), 0);

    const despesasTotais = transactions
      .filter((t) => t.type === "expense" && t.status === "paid" && t.payment_date?.startsWith(monthStr))
      .reduce((s, t) => s + Number(t.amount), 0);

    const resultadoLiquido = receitaBruta - despesasTotais;
    const margem = receitaBruta > 0 ? (resultadoLiquido / receitaBruta) * 100 : 0;

    // Alert: overdue expenses
    const overdueExpenses = transactions.filter(
      (t) => t.type === "expense" && t.status === "overdue"
    );
    const overdueExpensesAmount = overdueExpenses.reduce((s, t) => s + Number(t.amount), 0);

    // Alert: pending commissions
    const pendingCommissions = transactions.filter(
      (t) =>
        t.type === "expense" &&
        (t.status === "open" || t.status === "overdue") &&
        (t.account as any)?.dre_mapping_key === "DESPESA_VAR_COMISSAO"
    );
    const pendingCommissionsAmount = pendingCommissions.reduce((s, t) => s + Number(t.amount), 0);

    // AP summary (open/overdue expenses)
    const openExpenses = transactions.filter(
      (t) => t.type === "expense" && (t.status === "open" || t.status === "overdue" || t.status === "partial")
    );
    const apTotal = openExpenses.reduce((s, t) => s + Number(t.amount), 0);
    const apNextDue = openExpenses
      .filter((t) => t.due_date)
      .map((t) => t.due_date!)
      .sort()[0] ?? null;

    // AR summary (open/overdue income)
    const openIncome = transactions.filter(
      (t) => t.type === "income" && (t.status === "open" || t.status === "overdue" || t.status === "partial")
    );
    const arTotal = openIncome.reduce((s, t) => s + Number(t.amount), 0);
    const arOldestDue = openIncome
      .filter((t) => t.due_date)
      .map((t) => t.due_date!)
      .sort()[0] ?? null;

    return {
      receitaBruta,
      despesasTotais,
      resultadoLiquido,
      margem,
      overdueExpenses,
      overdueExpensesAmount,
      pendingCommissions,
      pendingCommissionsAmount,
      apTotal,
      apCount: openExpenses.length,
      apNextDue,
      arTotal,
      arCount: openIncome.length,
      arOldestDue,
    };
  }, [transactions]);

  const last10 = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 10),
    [transactions]
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Wallet className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">Visao geral das financas</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Bruta</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.receitaBruta)}</div>
            <p className="text-xs text-muted-foreground">Receitas pagas no mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Totais</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.despesasTotais)}</div>
            <p className="text-xs text-muted-foreground">Despesas pagas no mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resultado Liquido</CardTitle>
            {stats.resultadoLiquido >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                stats.resultadoLiquido >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(stats.resultadoLiquido)}
            </div>
            <p className="text-xs text-muted-foreground">Receita - Despesas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem</CardTitle>
            <Percent className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                stats.margem >= 0 ? "text-blue-600" : "text-red-600"
              }`}
            >
              {stats.margem.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Resultado / Receita</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert Banners */}
      {stats.overdueExpenses.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <CardContent className="flex items-center justify-between pt-5 pb-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-400">Contas vencidas</p>
                <p className="text-sm text-red-600 dark:text-red-300">
                  {stats.overdueExpenses.length} titulo(s) vencido(s) —{" "}
                  {formatCurrency(stats.overdueExpensesAmount)} em risco
                </p>
              </div>
            </div>
            <Link to="/financeiro/contas-pagar">
              <Button variant="destructive" size="sm">
                Ver
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {stats.pendingCommissions.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
          <CardContent className="flex items-center justify-between pt-5 pb-5">
            <div className="flex items-center gap-3">
              <Percent className="h-5 w-5 text-orange-500 shrink-0" />
              <div>
                <p className="font-medium text-orange-700 dark:text-orange-400">Comissoes pendentes</p>
                <p className="text-sm text-orange-600 dark:text-orange-300">
                  {stats.pendingCommissions.length} comissao(oes) pendente(s) —{" "}
                  {formatCurrency(stats.pendingCommissionsAmount)} a pagar
                </p>
              </div>
            </div>
            <Link to="/financeiro/relatorio-comissoes">
              <Button
                variant="outline"
                size="sm"
                className="border-orange-400 text-orange-700 hover:bg-orange-100"
              >
                Ver
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quick Summary Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Ultimos Lancamentos</CardTitle>
          <Link to="/financeiro/lancamentos">
            <Button variant="outline" size="sm">
              Ver todos
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {last10.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left pb-2 pr-4 font-medium">Data</th>
                    <th className="text-left pb-2 pr-4 font-medium">Descricao</th>
                    <th className="text-left pb-2 pr-4 font-medium">Entidade</th>
                    <th className="text-left pb-2 pr-4 font-medium">Categoria</th>
                    <th className="text-right pb-2 pr-4 font-medium">Valor</th>
                    <th className="text-left pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {last10.map((tx) => (
                    <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground">
                        {tx.payment_date
                          ? formatDate(tx.payment_date)
                          : tx.due_date
                          ? formatDate(tx.due_date)
                          : formatDate(tx.created_at)}
                      </td>
                      <td className="py-2.5 pr-4 max-w-[180px] truncate">
                        {tx.description || "—"}
                      </td>
                      <td className="py-2.5 pr-4 max-w-[140px] truncate text-muted-foreground">
                        {(tx.entity as any)?.name ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4 max-w-[140px] truncate text-muted-foreground">
                        {(tx.account as any)?.name ?? "—"}
                      </td>
                      <td
                        className={`py-2.5 pr-4 text-right font-semibold whitespace-nowrap ${
                          tx.type === "income" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {tx.type === "expense" ? "- " : "+ "}
                        {formatCurrency(Number(tx.amount))}
                      </td>
                      <td className="py-2.5">
                        <Badge
                          variant={getStatusVariant(tx.status)}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {getStatusLabel(tx.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8 text-sm">
              Nenhum lancamento registrado
            </p>
          )}
        </CardContent>
      </Card>

      {/* AP/AR Summary Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">A Pagar</CardTitle>
            <ArrowDownCircle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-red-600">{formatCurrency(stats.apTotal)}</div>
            <p className="text-sm text-muted-foreground">
              {stats.apCount} titulo(s) em aberto
            </p>
            {stats.apNextDue && (
              <p className="text-xs text-muted-foreground">
                Proximo vencimento: {formatDate(stats.apNextDue)}
              </p>
            )}
            <Link to="/financeiro/contas-pagar">
              <Button variant="outline" size="sm" className="mt-2 w-full">
                Ver contas a pagar
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">A Receber</CardTitle>
            <ArrowUpCircle className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-green-600">{formatCurrency(stats.arTotal)}</div>
            <p className="text-sm text-muted-foreground">
              {stats.arCount} titulo(s) em aberto
            </p>
            {stats.arOldestDue && (
              <p className="text-xs text-muted-foreground">
                Mais antigo: {formatDate(stats.arOldestDue)}
              </p>
            )}
            <Link to="/financeiro/contas-receber">
              <Button variant="outline" size="sm" className="mt-2 w-full">
                Ver contas a receber
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
