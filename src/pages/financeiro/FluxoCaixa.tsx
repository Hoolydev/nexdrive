import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroNav } from "@/components/financeiro/FinanceiroNav";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface MonthData {
  month: string;
  receitas: number;
  despesas: number;
  saldo: number;
  saldoAcumulado: number;
}

export default function FluxoCaixa() {
  const [data, setData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());

  useEffect(() => { load(); }, [year]);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const yearNum = parseInt(year);
    const startDate = `${yearNum}-01-01`;
    const endDate = `${yearNum}-12-31`;

    const [payableRes, installmentsRes, vehicleSalesRes] = await Promise.all([
      supabase.from("accounts_payable")
        .select("amount, payment_date, due_date, status")
        .eq("user_id", user.id)
        .gte("due_date", startDate)
        .lte("due_date", endDate),
      supabase.from("receivable_installments")
        .select("amount, due_date, payment_date, status, receivable_id")
        .gte("due_date", startDate)
        .lte("due_date", endDate),
      supabase.from("products")
        .select("actual_sale_price, sale_date")
        .eq("user_id", user.id)
        .eq("sold", true)
        .gte("sale_date", startDate)
        .lte("sale_date", endDate),
    ]);

    const months: MonthData[] = [];
    let acumulado = 0;

    for (let m = 0; m < 12; m++) {
      const monthStr = `${yearNum}-${String(m + 1).padStart(2, "0")}`;

      // Despesas pagas neste mes
      const despesas = (payableRes.data || [])
        .filter(p => p.status === "paid" && p.payment_date?.startsWith(monthStr))
        .reduce((s, p) => s + Number(p.amount), 0);

      // Receitas: parcelas pagas + vendas diretas
      const receitaParcelas = (installmentsRes.data || [])
        .filter(i => i.status === "paid" && i.payment_date?.startsWith(monthStr))
        .reduce((s, i) => s + Number(i.amount), 0);

      const receitaVendas = (vehicleSalesRes.data || [])
        .filter(v => v.sale_date?.startsWith(monthStr))
        .reduce((s, v) => s + Number(v.actual_sale_price || 0), 0);

      const receitas = receitaParcelas + receitaVendas;
      const saldo = receitas - despesas;
      acumulado += saldo;

      months.push({
        month: monthNames[m],
        receitas,
        despesas,
        saldo,
        saldoAcumulado: acumulado,
      });
    }

    setData(months);
    setLoading(false);
  };

  const totalReceitas = data.reduce((s, d) => s + d.receitas, 0);
  const totalDespesas = data.reduce((s, d) => s + d.despesas, 0);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Fluxo de Caixa</h1>
      </div>

      <FinanceiroNav />

      <div className="flex items-center gap-4">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? <p>Carregando...</p> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Receitas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceitas)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Despesas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-500">{formatCurrency(totalDespesas)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Resultado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${totalReceitas - totalDespesas >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {formatCurrency(totalReceitas - totalDespesas)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Receitas vs Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="receitas" name="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saldo Acumulado</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Line type="monotone" dataKey="saldoAcumulado" name="Saldo Acumulado" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
