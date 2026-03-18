import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package, Users, DollarSign, TrendingUp, Car, AlertTriangle,
  ShoppingCart, ArrowUpRight, ArrowDownRight, Clock
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("pt-BR");

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

interface DashboardData {
  totalVehicles: number;
  vehiclesInStock: number;
  soldThisMonth: number;
  soldTotal: number;
  totalCustomers: number;
  revenueThisMonth: number;
  profitThisMonth: number;
  totalStockValue: number;
  pendingPayables: number;
  pendingPayablesAmount: number;
  overduePayables: number;
  pendingReceivables: number;
  pendingCommissions: number;
  pendingCommissionsAmount: number;
  recentSales: Array<{
    id: string;
    title: string;
    brand: string | null;
    model: string | null;
    actual_sale_price: number;
    sale_date: string;
  }>;
  recentVehicles: Array<{
    id: string;
    title: string;
    brand: string | null;
    model: string | null;
    price: number;
    stock_entry_date: string | null;
    created_at: string;
  }>;
  monthlySales: Array<{ month: string; vendas: number; receita: number }>;
  brandDistribution: Array<{ name: string; value: number }>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const monthStart = `${year}-${month}-01`;
      const monthEnd = `${year}-${month}-31`;
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;

      const [
        allVehiclesRes,
        soldThisMonthRes,
        customersRes,
        payablesRes,
        receivablesRes,
        commissionsRes,
        yearlySalesRes,
        costsRes,
      ] = await Promise.all([
        supabase.from("products").select("*").eq("user_id", user.id),
        supabase.from("products").select("*").eq("user_id", user.id).eq("sold", true)
          .gte("sale_date", monthStart).lte("sale_date", monthEnd),
        supabase.from("customers").select("id", { count: "exact" }).eq("user_id", user.id),
        supabase.from("accounts_payable").select("amount, status, due_date").eq("user_id", user.id),
        supabase.from("accounts_receivable").select("amount, status").eq("user_id", user.id),
        supabase.from("commissions").select("amount, status").eq("user_id", user.id),
        supabase.from("products").select("actual_sale_price, sale_date, purchase_price, id")
          .eq("user_id", user.id).eq("sold", true)
          .gte("sale_date", yearStart).lte("sale_date", yearEnd),
        supabase.from("vehicle_costs").select("product_id, amount"),
      ]);

      const allVehicles = allVehiclesRes.data || [];
      const inStock = allVehicles.filter(v => !v.sold);
      const soldAll = allVehicles.filter(v => v.sold);
      const soldMonth = soldThisMonthRes.data || [];
      const yearlySales = yearlySalesRes.data || [];
      const costs = costsRes.data || [];

      // Revenue & profit this month
      const revenueThisMonth = soldMonth.reduce((s, v) => s + Number(v.actual_sale_price || 0), 0);
      const monthVehicleIds = soldMonth.map(v => v.id);
      const monthCosts = costs.filter(c => monthVehicleIds.includes(c.product_id));
      const monthTotalCosts = monthCosts.reduce((s, c) => s + Number(c.amount), 0);
      const monthPurchase = soldMonth.reduce((s, v) => s + Number(v.purchase_price || 0), 0);
      const profitThisMonth = revenueThisMonth - monthPurchase - monthTotalCosts;

      // Stock value
      const totalStockValue = inStock.reduce((s, v) => s + Number(v.price || 0), 0);

      // Payables
      const payables = payablesRes.data || [];
      const pendingPayables = payables.filter(p => p.status === "pending");
      const today = now.toISOString().split("T")[0];
      const overduePayables = payables.filter(p => p.status === "pending" && p.due_date < today);

      // Receivables
      const receivables = receivablesRes.data || [];
      const pendingReceivables = receivables.filter(r => r.status === "pending");

      // Commissions
      const commissions = commissionsRes.data || [];
      const pendingComm = commissions.filter(c => c.status === "pending");

      // Monthly sales chart data
      const monthlySales = Array.from({ length: 12 }, (_, i) => {
        const ms = `${year}-${String(i + 1).padStart(2, "0")}`;
        const monthSales = yearlySales.filter(v => v.sale_date?.startsWith(ms));
        return {
          month: monthNames[i],
          vendas: monthSales.length,
          receita: monthSales.reduce((s, v) => s + Number(v.actual_sale_price || 0), 0),
        };
      });

      // Brand distribution (in stock)
      const brandCounts: Record<string, number> = {};
      inStock.forEach(v => {
        const brand = v.brand || "Outros";
        brandCounts[brand] = (brandCounts[brand] || 0) + 1;
      });
      const brandDistribution = Object.entries(brandCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      // Recent sales (last 5)
      const recentSales = soldAll
        .filter(v => v.sale_date)
        .sort((a, b) => (b.sale_date || "").localeCompare(a.sale_date || ""))
        .slice(0, 5)
        .map(v => ({
          id: v.id,
          title: v.title || "",
          brand: v.brand,
          model: v.model,
          actual_sale_price: Number(v.actual_sale_price || 0),
          sale_date: v.sale_date || "",
        }));

      // Recent vehicles added (last 5)
      const recentVehicles = inStock
        .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
        .slice(0, 5)
        .map(v => ({
          id: v.id,
          title: v.title || "",
          brand: v.brand,
          model: v.model,
          price: Number(v.price || 0),
          stock_entry_date: v.stock_entry_date,
          created_at: v.created_at,
        }));

      setData({
        totalVehicles: allVehicles.length,
        vehiclesInStock: inStock.length,
        soldThisMonth: soldMonth.length,
        soldTotal: soldAll.length,
        totalCustomers: customersRes.count || 0,
        revenueThisMonth,
        profitThisMonth,
        totalStockValue,
        pendingPayables: pendingPayables.length,
        pendingPayablesAmount: pendingPayables.reduce((s, p) => s + Number(p.amount), 0),
        overduePayables: overduePayables.length,
        pendingReceivables: pendingReceivables.length,
        pendingCommissions: pendingComm.length,
        pendingCommissionsAmount: pendingComm.reduce((s, c) => s + Number(c.amount), 0),
        recentSales,
        recentVehicles,
        monthlySales,
        brandDistribution,
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
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

  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
        <p className="text-muted-foreground">
          Visao geral do seu negocio
        </p>
      </div>

      {/* KPI Cards - Row 1 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Veiculos em Estoque</CardTitle>
            <Car className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.vehiclesInStock}</div>
            <p className="text-xs text-muted-foreground">
              {data.totalVehicles} total cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas no Mes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.soldThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              {data.soldTotal} vendas no total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita do Mes</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.revenueThisMonth)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {data.profitThisMonth >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              )}
              Lucro: {formatCurrency(data.profitThisMonth)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor em Estoque</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalStockValue)}</div>
            <p className="text-xs text-muted-foreground">
              {data.vehiclesInStock} veiculos disponiveis
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Cadastrados na base</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas a Pagar</CardTitle>
            {data.overduePayables > 0 ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <Clock className="h-4 w-4 text-orange-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.pendingPayablesAmount)}</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{data.pendingPayables} pendentes</span>
              {data.overduePayables > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  {data.overduePayables} vencidas
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Receber</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pendingReceivables}</div>
            <p className="text-xs text-muted-foreground">Contas pendentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissoes Pendentes</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.pendingCommissionsAmount)}</div>
            <p className="text-xs text-muted-foreground">{data.pendingCommissions} a pagar</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Vendas Mensais - {new Date().getFullYear()}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.monthlySales.some(m => m.vendas > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.monthlySales}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis yAxisId="left" allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === "Receita" ? formatCurrency(value) : value
                    }
                  />
                  <Bar yAxisId="left" dataKey="vendas" name="Qtd Vendas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="receita" name="Receita" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhuma venda registrada este ano
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Marcas em Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            {data.brandDistribution.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.brandDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.brandDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center">
                  {data.brandDistribution.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-1 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {item.name} ({item.value})
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Nenhum veiculo em estoque
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ultimas Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentSales.length > 0 ? (
              <div className="space-y-3">
                {data.recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-sm">
                        {sale.title || `${sale.brand} ${sale.model}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(sale.sale_date)}
                      </p>
                    </div>
                    <span className="font-semibold text-green-600 text-sm">
                      {formatCurrency(sale.actual_sale_price)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-6 text-sm">
                Nenhuma venda realizada
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ultimos Veiculos Adicionados</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentVehicles.length > 0 ? (
              <div className="space-y-3">
                {data.recentVehicles.map((vehicle) => (
                  <div key={vehicle.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-sm">
                        {vehicle.title || `${vehicle.brand} ${vehicle.model}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {vehicle.stock_entry_date
                          ? formatDate(vehicle.stock_entry_date)
                          : formatDate(vehicle.created_at)}
                      </p>
                    </div>
                    <span className="font-semibold text-blue-600 text-sm">
                      {formatCurrency(vehicle.price)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-6 text-sm">
                Nenhum veiculo no estoque
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
