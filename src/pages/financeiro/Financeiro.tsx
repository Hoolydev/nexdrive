import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroNav } from "@/components/financeiro/FinanceiroNav";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Percent, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default function Financeiro() {
  const [stats, setStats] = useState({
    totalPayable: 0,
    totalReceivable: 0,
    pendingCommissions: 0,
    overduePayable: 0,
    overdueReceivable: 0,
    paidThisMonth: 0,
    receivedThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    const [payable, receivable, commissions] = await Promise.all([
      supabase.from("accounts_payable").select("amount, status, payment_date").eq("user_id", user.id),
      supabase.from("accounts_receivable").select("total_amount, status").eq("user_id", user.id),
      supabase.from("commissions").select("calculated_amount, status").eq("user_id", user.id),
    ]);

    const payableData = payable.data || [];
    const receivableData = receivable.data || [];
    const commissionsData = commissions.data || [];

    setStats({
      totalPayable: payableData.filter(p => p.status === "pending" || p.status === "overdue").reduce((s, p) => s + Number(p.amount), 0),
      totalReceivable: receivableData.filter(r => r.status === "pending" || r.status === "partial").reduce((s, r) => s + Number(r.total_amount), 0),
      pendingCommissions: commissionsData.filter(c => c.status === "pending").reduce((s, c) => s + Number(c.calculated_amount), 0),
      overduePayable: payableData.filter(p => p.status === "overdue").reduce((s, p) => s + Number(p.amount), 0),
      overdueReceivable: receivableData.filter(r => r.status === "overdue").reduce((s, r) => s + Number(r.total_amount), 0),
      paidThisMonth: payableData.filter(p => p.status === "paid" && p.payment_date && p.payment_date >= monthStart && p.payment_date <= monthEnd).reduce((s, p) => s + Number(p.amount), 0),
      receivedThisMonth: receivableData.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.total_amount), 0),
    });
    setLoading(false);
  };

  const balance = stats.receivedThisMonth - stats.paidThisMonth;

  if (loading) return <div className="p-6"><FinanceiroNav /><p>Carregando...</p></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Wallet className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">Visao geral das financas</p>
        </div>
      </div>

      <FinanceiroNav />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas a Pagar</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatCurrency(stats.totalPayable)}</div>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas a Receber</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatCurrency(stats.totalReceivable)}</div>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissoes Pendentes</CardTitle>
            <Percent className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{formatCurrency(stats.pendingCommissions)}</div>
            <p className="text-xs text-muted-foreground">A pagar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo do Mes</CardTitle>
            {balance >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? "text-green-500" : "text-red-500"}`}>
              {formatCurrency(balance)}
            </div>
            <p className="text-xs text-muted-foreground">Recebido - Pago</p>
          </CardContent>
        </Card>
      </div>

      {stats.overduePayable > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="font-medium text-red-700 dark:text-red-400">Contas Vencidas</p>
              <p className="text-sm text-red-600 dark:text-red-300">
                Voce tem {formatCurrency(stats.overduePayable)} em contas vencidas a pagar
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pago este mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats.paidThisMonth)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recebido este mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats.receivedThisMonth)}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
