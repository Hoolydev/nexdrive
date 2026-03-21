import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Formatters ───────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatCurrencyShort = (value: number) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}R$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}R$${(abs / 1_000).toFixed(0)}k`;
  return formatCurrency(value);
};

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}`;
};

const formatDateFull = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawTransaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  status: string;
  due_date: string;
  payment_date: string | null;
  description: string | null;
}

interface DailyRow {
  date: string;
  income: number;
  expense: number;
  balance: number;
  runningBalance: number;
  isPast: boolean;
  entries: RawTransaction[];
}

// ─── Component ────────────────────────────────────────────────────────────────

const HORIZON_OPTIONS = [7, 15, 30] as const;
type Horizon = (typeof HORIZON_OPTIONS)[number];

export default function FluxoCaixa() {
  const [horizon, setHorizon] = useState<Horizon>(30);

  const today = toISODate(new Date());

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["fluxo-caixa-tx"],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return [];

      // Fetch paid transactions (realized cash basis) — look back 90 days
      const lookBack = addDays(today, -90);

      const { data, error } = await (supabase as any)
        .from("financial_transactions")
        .select("id, amount, type, status, due_date, payment_date, description")
        .eq("user_id", session.user.id)
        .is("deleted_at", null)
        .neq("status", "cancelled")
        .gte("due_date", lookBack);

      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        amount: Number(t.amount),
      })) as RawTransaction[];
    },
  });

  // ─── Compute today's realized balance ───────────────────────────────────────

  const todayBalance = useMemo(() => {
    return transactions
      .filter((t) => t.status === "paid")
      .reduce((sum, t) => {
        return t.type === "income" ? sum + t.amount : sum - t.amount;
      }, 0);
  }, [transactions]);

  // ─── AP vs AR summary (open) ────────────────────────────────────────────────

  const apArSummary = useMemo(() => {
    const openEnd = addDays(today, horizon);
    const openTx = transactions.filter(
      (t) => t.status !== "paid" && t.due_date >= today && t.due_date <= openEnd
    );
    const ar = openTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const ap = openTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { ar, ap };
  }, [transactions, horizon, today]);

  // ─── Build projection table ──────────────────────────────────────────────────

  const projectionRows = useMemo((): DailyRow[] => {
    const endDate = addDays(today, horizon);

    // Group all transactions by date (use payment_date for paid, due_date for open)
    const byDate: Record<string, RawTransaction[]> = {};

    for (const tx of transactions) {
      const dateKey =
        tx.status === "paid" && tx.payment_date ? tx.payment_date : tx.due_date;
      // Only include dates in our window
      if (dateKey < addDays(today, -horizon) || dateKey > endDate) continue;
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(tx);
    }

    // Generate all dates in window
    const dates: string[] = [];
    let d = addDays(today, -horizon + 1);
    while (d <= endDate) {
      dates.push(d);
      d = addDays(d, 1);
    }

    let running = 0;
    const rows: DailyRow[] = dates.map((date) => {
      const entries = byDate[date] || [];
      const isPast = date < today;

      // For past dates: only paid transactions
      // For future dates: all open/overdue transactions (projected)
      const relevantEntries = isPast
        ? entries.filter((t) => t.status === "paid")
        : entries.filter((t) => t.status !== "paid");

      const income = relevantEntries
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0);
      const expense = relevantEntries
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0);

      const balance = income - expense;
      running += balance;

      return {
        date,
        income,
        expense,
        balance,
        runningBalance: running,
        isPast,
        entries: relevantEntries,
      };
    });

    return rows;
  }, [transactions, horizon, today]);

  // ─── Chart data ──────────────────────────────────────────────────────────────

  const chartData = useMemo(() => {
    // Only show from today - horizon/2 to today + horizon
    const start = addDays(today, -(Math.round(horizon / 2)));
    return projectionRows
      .filter((r) => r.date >= start)
      .map((r) => ({
        date: r.date,
        label: formatDate(r.date),
        balance: r.runningBalance,
        income: r.income,
        expense: r.expense,
        isPast: r.isPast,
      }));
  }, [projectionRows, horizon, today]);

  // ─── Table rows (around today, +/- horizon) ──────────────────────────────────

  const tableRows = useMemo(() => {
    // Show ± horizon days around today
    const start = addDays(today, -7);
    return projectionRows.filter((r) => r.date >= start).filter((r) => r.income !== 0 || r.expense !== 0);
  }, [projectionRows, today]);

  // ─── Custom Tooltip ──────────────────────────────────────────────────────────

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-white dark:bg-gray-900 border rounded-xl shadow-lg p-3 text-sm min-w-[180px]">
        <p className="font-semibold mb-2 text-gray-800 dark:text-gray-100">
          {formatDateFull(d.date)}
          {d.isPast ? (
            <Badge variant="outline" className="ml-2 text-[10px] py-0">Realizado</Badge>
          ) : (
            <Badge variant="outline" className="ml-2 text-[10px] py-0 border-blue-300 text-blue-600">Projetado</Badge>
          )}
        </p>
        {d.income > 0 && (
          <p className="text-green-600">+ {formatCurrency(d.income)}</p>
        )}
        {d.expense > 0 && (
          <p className="text-red-500">- {formatCurrency(d.expense)}</p>
        )}
        <p className={cn("font-bold mt-1", d.balance >= 0 ? "text-blue-600" : "text-red-600")}>
          Saldo: {formatCurrency(d.balance)}
        </p>
      </div>
    );
  };

  const todayIdx = chartData.findIndex((r) => r.date === today);

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Wallet className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fluxo de Caixa</h1>
          <p className="text-muted-foreground">Posicao atual e projecao de entradas e saidas</p>
        </div>
      </div>

      {/* Horizon selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground font-medium">Projetar:</span>
        {HORIZON_OPTIONS.map((h) => (
          <Button
            key={h}
            variant={horizon === h ? "default" : "outline"}
            size="sm"
            className="rounded-full px-4"
            onClick={() => setHorizon(h)}
          >
            {h} dias
          </Button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo Realizado Hoje
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                todayBalance >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {formatCurrency(todayBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Soma de lancamentos pagos
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              A Receber ({horizon}d)
            </CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(apArSummary.ar)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Receitas em aberto</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              A Pagar ({horizon}d)
            </CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(apArSummary.ap)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Despesas em aberto</p>
          </CardContent>
        </Card>
      </div>

      {/* Projection Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Projecao de Saldo — {horizon} dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                <defs>
                  <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  interval={Math.floor(chartData.length / 8)}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={formatCurrencyShort}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 2" />
                {todayIdx >= 0 && (
                  <ReferenceLine
                    x={chartData[todayIdx]?.label}
                    stroke="#6366f1"
                    strokeDasharray="4 2"
                    label={{ value: "Hoje", position: "top", fill: "#6366f1", fontSize: 11 }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Entradas"
                  stroke="#22c55e"
                  strokeWidth={1.5}
                  fill="url(#incomeGradient)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Saidas"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  fill="url(#expenseGradient)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  name="Saldo Dia"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#balanceGradient)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Daily Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Movimentacoes Diarias
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-muted-foreground text-sm">Carregando...</p>
          ) : tableRows.length === 0 ? (
            <p className="p-6 text-muted-foreground text-sm text-center">
              Nenhuma movimentacao encontrada no periodo
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/80 dark:bg-gray-900/50">
                    <th className="text-left py-3 px-6 font-medium text-muted-foreground">Data</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Entradas</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Saidas</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Saldo Dia</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Acumulado</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => {
                    const isToday = row.date === today;
                    return (
                      <tr
                        key={row.date}
                        className={cn(
                          "border-b transition-colors",
                          isToday
                            ? "bg-indigo-50/60 dark:bg-indigo-900/20"
                            : row.isPast
                            ? "hover:bg-gray-50/60 dark:hover:bg-gray-900/20"
                            : "hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
                        )}
                      >
                        <td className="py-3 px-6 font-medium">
                          {formatDateFull(row.date)}
                          {isToday && (
                            <Badge className="ml-2 bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] py-0">
                              Hoje
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-green-600 font-medium">
                          {row.income > 0 ? `+ ${formatCurrency(row.income)}` : "-"}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-red-500 font-medium">
                          {row.expense > 0 ? `- ${formatCurrency(row.expense)}` : "-"}
                        </td>
                        <td
                          className={cn(
                            "py-3 px-4 text-right tabular-nums font-semibold",
                            row.balance >= 0 ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {formatCurrency(row.balance)}
                        </td>
                        <td
                          className={cn(
                            "py-3 px-4 text-right tabular-nums font-bold",
                            row.runningBalance >= 0 ? "text-blue-600" : "text-red-600"
                          )}
                        >
                          {formatCurrency(row.runningBalance)}
                        </td>
                        <td className="py-3 px-4">
                          {row.isPast ? (
                            <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">
                              Realizado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0 border-blue-300 text-blue-600">
                              Projetado
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AP vs AR Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base font-semibold text-green-700 dark:text-green-400">
                Contas a Receber (AR)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(apArSummary.ar)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Receitas em aberto nos proximos {horizon} dias
            </p>
            {apArSummary.ar > 0 && apArSummary.ap > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-green-600">AR</span>
                  <span className="text-red-500">AP</span>
                </div>
                <div className="h-2 rounded-full bg-red-200 overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (apArSummary.ar / (apArSummary.ar + apArSummary.ap)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-base font-semibold text-red-700 dark:text-red-400">
                Contas a Pagar (AP)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {formatCurrency(apArSummary.ap)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Despesas em aberto nos proximos {horizon} dias
            </p>
            {apArSummary.ar > 0 && apArSummary.ap > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span
                    className={cn(
                      "font-medium",
                      apArSummary.ar >= apArSummary.ap ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {apArSummary.ar >= apArSummary.ap ? (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Fluxo positivo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" /> Fluxo negativo
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    Saldo:{" "}
                    <strong
                      className={
                        apArSummary.ar - apArSummary.ap >= 0 ? "text-green-600" : "text-red-600"
                      }
                    >
                      {formatCurrency(apArSummary.ar - apArSummary.ap)}
                    </strong>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-green-200 overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (apArSummary.ap / (apArSummary.ar + apArSummary.ap)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground pb-4">
        * Saldo realizado: soma de lancamentos pagos. Projecao: lancamentos em aberto agrupados por
        data de vencimento. Cancelados sao excluidos.
      </p>
    </div>
  );
}
