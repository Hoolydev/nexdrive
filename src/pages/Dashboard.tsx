import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, TrendingUp, Car, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Clock, TrendingDown,
  CalendarClock, ReceiptText, BarChart2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { Link } from "react-router-dom";

/* ── Helpers ── */
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("pt-BR");
const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// AUTOFLOW diverse chart palette for brands
const CHART_COLORS = [
  "#2563EB", // Primary Blue
  "#059669", // Emerald
  "#EA580C", // Orange
  "#DC2626", // Red
  "#0891B2", // Cyan
  "#CA8A04", // Yellow
  "#475569", // Slate
  "#14B8A6", // Teal
  "#F43F5E", // Rose
];

/* ── Types ── */
type FinancialTransaction = {
  id: string; amount: number; type: string; status: string;
  payment_date: string | null; due_date: string | null;
  description: string | null; created_at: string;
  entity?: { name: string } | null;
  account?: { name: string; dre_mapping_key: string | null } | null;
};
type Product = {
  id: string; title: string | null; price: number | null;
  actual_sale_price: number | null; sale_date: string | null;
  status: string | null; created_at: string;
  brand: string | null; model: string | null; updated_at: string | null;
};

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    open: "Aberto", partial: "Parcial", paid: "Pago",
    overdue: "Vencido", cancelled: "Cancelado",
  };
  return map[status] ?? status;
}

/* ── Skeleton card ── */
function KpiSkeleton() {
  return (
    <div className="bg-white rounded-[20px] p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="skeleton h-4 w-24 rounded-[6px] mb-4" />
      <div className="skeleton h-8 w-36 rounded-[6px] mb-2" />
      <div className="skeleton h-3 w-20 rounded-[6px]" />
    </div>
  );
}

/* ── Status pill ── */
function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { label: string; bg: string; text: string }> = {
    paid:     { label: "Pago",      bg: "#DCFCE7", text: "#16A34A" },
    open:     { label: "Aberto",    bg: "#EFF6FF", text: "#2563EB" },
    overdue:  { label: "Vencido",   bg: "#FEE2E2", text: "#DC2626" },
    partial:  { label: "Parcial",   bg: "#FEF9C3", text: "#A16207" },
    cancelled:{ label: "Cancelado", bg: "#F1F5F9", text: "#64748B" },
  };
  const s = cfg[status] ?? { label: status, bg: "#F1F5F9", text: "#64748B" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: s.bg, color: s.text, fontFamily: "var(--font-ui)" }}
    >
      {s.label}
    </span>
  );
}

/* ── Main component ── */
export default function Dashboard() {
  const [state, setState] = useState<{ transactions: FinancialTransaction[]; products: Product[] }>({
    transactions: [], products: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const [txRes, prodRes] = await Promise.all([
        (supabase as any)
          .from("financial_transactions")
          .select("id, amount, type, status, payment_date, due_date, description, created_at, entity:entity_id(name), account:account_id(name, dre_mapping_key)")
          .eq("user_id", userId).is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase.from("products")
          .select("id, title, price, actual_sale_price, sale_date, status, created_at, brand, model, updated_at")
          .eq("user_id", userId).is("deleted_at", null),
      ]);
      setState({ transactions: txRes.data ?? [], products: prodRes.data ?? [] });
    } catch (err) {
      console.error("Error loading dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const kpis = useMemo(() => {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const today = now.toISOString().split("T")[0];
    const in7Days = new Date(now.getTime() + 7 * 86400000).toISOString().split("T")[0];
    const { transactions, products } = state;

    const receitaMes = transactions.filter(t => t.type === "income" && t.status === "paid" && t.payment_date?.startsWith(monthStr)).reduce((s, t) => s + Number(t.amount), 0);
    const despesasMes = transactions.filter(t => t.type === "expense" && t.status === "paid" && t.payment_date?.startsWith(monthStr)).reduce((s, t) => s + Number(t.amount), 0);
    const resultadoMes = receitaMes - despesasMes;
    const veiculosEstoque = products.filter(p => p.status === "active").length;
    const veiculosVendidosMes = products.filter(p => p.status === "sold" && p.updated_at?.startsWith(monthStr)).length;
    const openIncome = transactions.filter(t => t.type === "income" && ["open", "overdue", "partial"].includes(t.status));
    const aReceber = openIncome.reduce((s, t) => s + Number(t.amount), 0);
    const openExpense = transactions.filter(t => t.type === "expense" && ["open", "overdue", "partial"].includes(t.status));
    const aPagar = openExpense.reduce((s, t) => s + Number(t.amount), 0);
    const overdueExpenseCount = transactions.filter(t => t.type === "expense" && t.status === "overdue").length;
    const commissionsPending = transactions.filter(t => t.type === "expense" && ["open","overdue"].includes(t.status) && (t.account as any)?.dre_mapping_key === "DESPESA_VAR_COMISSAO");
    const comissoesPendentes = commissionsPending.reduce((s, t) => s + Number(t.amount), 0);
    const margemBruta = receitaMes > 0 ? ((receitaMes - despesasMes) / receitaMes) * 100 : 0;
    const overdueIncome = transactions.filter(t => t.type === "income" && t.status === "overdue");
    const taxaInadimplencia = aReceber > 0 ? (overdueIncome.reduce((s,t) => s+Number(t.amount),0) / aReceber) * 100 : 0;
    const soldThisMonth = products.filter(p => p.status === "sold" && p.sale_date?.startsWith(monthStr));
    const ticketMedioVenda = soldThisMonth.length > 0 ? soldThisMonth.reduce((s, p) => s + Number(p.actual_sale_price ?? p.price ?? 0), 0) / soldThisMonth.length : 0;
    const upcoming = transactions.filter(t => ["open","overdue","partial"].includes(t.status) && t.due_date && t.due_date >= today && t.due_date <= in7Days).sort((a,b) => (a.due_date??'').localeCompare(b.due_date??'')).slice(0,10);

    return { receitaMes, despesasMes, resultadoMes, veiculosEstoque, veiculosVendidosMes, aReceber, aPagar, overdueExpenseCount, comissoesPendentes, comissoesPendentesCount: commissionsPending.length, margemBruta, taxaInadimplencia, ticketMedioVenda, soldThisMonthCount: soldThisMonth.length, upcoming };
  }, [state]);

  const chartData = useMemo(() => {
    const { transactions, products } = state;
    const now = new Date();
    const last6 = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const ms = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const receita = transactions.filter(t => { const ref = t.status === "paid" ? t.payment_date : t.due_date; return t.type === "income" && ref?.startsWith(ms); }).reduce((s,t) => s+Number(t.amount),0);
      const despesa = transactions.filter(t => { const ref = t.status === "paid" ? t.payment_date : t.due_date; return t.type === "expense" && ref?.startsWith(ms); }).reduce((s,t) => s+Number(t.amount),0);
      return { month: monthNames[d.getMonth()], Receita: receita, Despesa: despesa };
    });
    const brandCounts: Record<string, number> = {};
    products.filter(p => p.status === "active").forEach(p => { const b = p.brand || "Outros"; brandCounts[b] = (brandCounts[b] || 0) + 1; });
    const brandDistribution = Object.entries(brandCounts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value-a.value).slice(0,6);
    return { last6, brandDistribution };
  }, [state]);

  const lists = useMemo(() => {
    const { transactions, products } = state;
    const lastTransactions = [...transactions].sort((a,b) => b.created_at.localeCompare(a.created_at)).slice(0,5);
    const recentVehicles = [...products].sort((a,b) => b.created_at.localeCompare(a.created_at)).slice(0,5);
    return { lastTransactions, recentVehicles };
  }, [state]);

  /* ── Custom Tooltip for charts ── */
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-[#E8E8F0] rounded-[14px] px-4 py-3 text-sm" style={{ boxShadow: "var(--shadow-md)", fontFamily: "var(--font-ui)" }}>
        <p className="font-semibold text-[#1A1A2E] mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.fill }}>{p.name}: {formatCurrency(p.value)}</p>
        ))}
      </div>
    );
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="skeleton h-8 w-48 rounded-[10px]" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => <KpiSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  /* ── KPI card helper ── */
  const KpiCard = ({
    title, value, sub, icon: Icon, iconColor, gradient, trend
  }: {
    title: string; value: string; sub?: string; icon: React.ElementType;
    iconColor?: string; gradient?: boolean; trend?: "up" | "down" | "neutral";
  }) => (
    <div
      className="rounded-[20px] p-6 transition-all duration-200 hover-lift"
      style={{
        background: gradient ? "linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)" : "#FFFFFF",
        boxShadow: gradient ? "var(--shadow-brand)" : "var(--shadow-sm)",
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <p
          className="text-sm font-medium"
          style={{ fontFamily: "var(--font-ui)", color: gradient ? "rgba(255,255,255,0.8)" : "#6B6B8A" }}
        >
          {title}
        </p>
        <div
          className="h-9 w-9 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: gradient ? "rgba(255,255,255,0.2)" : (iconColor ? iconColor + "18" : "#F8FAFC") }}
        >
          <Icon
            className="h-5 w-5"
            style={{ color: gradient ? "#fff" : (iconColor ?? "#2563EB") }}
            strokeWidth={1.5}
          />
        </div>
      </div>
      <div
        className="text-2xl font-semibold mb-1"
        style={{
          fontFamily: "var(--font-ui)",
          color: gradient ? "#fff" : "#1A1A2E",
        }}
      >
        {value}
      </div>
      {sub && (
        <p
          className="text-xs"
          style={{ fontFamily: "var(--font-body)", color: gradient ? "rgba(255,255,255,0.65)" : "#94A3B8" }}
        >
          {sub}
        </p>
      )}
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trend === "up" && <ArrowUpRight className="h-3.5 w-3.5" style={{ color: gradient ? "rgba(255,255,255,0.9)" : "#22C55E" }} />}
          {trend === "down" && <ArrowDownRight className="h-3.5 w-3.5" style={{ color: gradient ? "rgba(255,255,255,0.9)" : "#EF4444" }} />}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="space-y-6"
      style={{ padding: "var(--space-xl)", maxWidth: "1440px", margin: "0 auto" }}
    >
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="font-semibold text-[#1A1A2E] mb-0.5"
            style={{ fontFamily: "var(--font-display)", fontSize: "24px", lineHeight: 1.3 }}
          >
            Dashboard
          </h1>
          <p className="text-sm text-[#94A3B8]" style={{ fontFamily: "var(--font-body)" }}>
            Visão geral do seu negócio
          </p>
        </div>
        <Link
          to="/financeiro"
          className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-sm font-medium text-white transition-all duration-150 hover:opacity-90 btn-press"
          style={{
            fontFamily: "var(--font-ui)",
            background: "linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)",
            boxShadow: "var(--shadow-brand)",
          }}
        >
          <BarChart2 className="h-4 w-4" />
          Ver Financeiro
        </Link>
      </div>

      {/* ── KPI Row 1 — 4 cards (first is gradient) ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Receita do Mês"
          value={formatCurrency(kpis.receitaMes)}
          sub="Receitas pagas no mês atual"
          icon={TrendingUp}
          gradient
          trend="up"
        />
        <KpiCard title="Despesas do Mês"   value={formatCurrency(kpis.despesasMes)}  sub="Pagas no mês atual"        icon={ArrowDownRight} iconColor="#EF4444" />
        <KpiCard title="Resultado do Mês"  value={formatCurrency(kpis.resultadoMes)} sub="Receita − Despesas"        icon={kpis.resultadoMes >= 0 ? TrendingUp : TrendingDown} iconColor={kpis.resultadoMes >= 0 ? "#22C55E" : "#EF4444"} />
        <KpiCard title="Veículos em Estoque" value={String(kpis.veiculosEstoque)}    sub={`${kpis.veiculosVendidosMes} vendidos este mês`} icon={Car} iconColor="#2563EB" />
      </div>

      {/* ── KPI Row 2 ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="A Receber"          value={formatCurrency(kpis.aReceber)}          sub="Receitas em aberto"            icon={ArrowUpRight}   iconColor="#22C55E" />
        <KpiCard title="A Pagar"            value={formatCurrency(kpis.aPagar)}            sub={`${kpis.overdueExpenseCount} vencidas`} icon={kpis.overdueExpenseCount > 0 ? AlertTriangle : Clock} iconColor="#EF4444" />
        <KpiCard title="Comissões Pendentes" value={formatCurrency(kpis.comissoesPendentes)} sub={`${kpis.comissoesPendentesCount} em aberto`} icon={DollarSign} iconColor="#F59E0B" />
        <KpiCard title="Ticket Médio Venda" value={kpis.ticketMedioVenda > 0 ? formatCurrency(kpis.ticketMedioVenda) : "—"} sub={`${kpis.soldThisMonthCount} venda(s) este mês`} icon={TrendingUp} iconColor="#2563EB" />
      </div>

      {/* ── Charts ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-white rounded-[20px] p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
          <h2
            className="text-base font-semibold text-[#1A1A2E] mb-4"
            style={{ fontFamily: "var(--font-ui)" }}
          >
            Receita vs Despesa — Últimos 6 Meses
          </h2>
          {chartData.last6.some(m => m.Receita > 0 || m.Despesa > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData.last6} barCategoryGap="30%">
                <XAxis dataKey="month" tick={{ fontSize: 12, fontFamily: "var(--font-ui)", fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontFamily: "var(--font-ui)", fill: "#94A3B8" }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Receita" fill="#2563EB" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Despesa" fill="#EF4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-[#94A3B8] text-sm" style={{ fontFamily: "var(--font-body)" }}>
              Nenhuma transação nos últimos 6 meses
            </div>
          )}
        </div>

        {/* Donut chart */}
        <div className="bg-white rounded-[20px] p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
          <h2 className="text-base font-semibold text-[#1A1A2E] mb-4" style={{ fontFamily: "var(--font-ui)" }}>
            Estoque por Marca
          </h2>
          {chartData.brandDistribution.length > 0 ? (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={chartData.brandDistribution} cx="50%" cy="50%" innerRadius={52} outerRadius={78} strokeWidth={0} dataKey="value">
                    {chartData.brandDistribution.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [v, n]} content={({ active, payload }) => active && payload?.length ? (
                    <div className="bg-white border border-[#E8E8F0] rounded-[10px] px-3 py-2 text-xs" style={{ boxShadow: "var(--shadow-md)", fontFamily: "var(--font-ui)" }}>
                      <span className="font-semibold">{payload[0].name}</span>: {payload[0].value} veículos
                    </div>
                  ) : null} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2">
                {chartData.brandDistribution.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs text-[#6B6B8A]" style={{ fontFamily: "var(--font-ui)" }}>
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    {item.name} ({item.value})
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-[#94A3B8] text-sm" style={{ fontFamily: "var(--font-body)" }}>
              Nenhum veículo em estoque
            </div>
          )}
        </div>
      </div>

      {/* ── Activity lists ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Last transactions */}
        <div className="bg-white rounded-[20px] p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="h-8 w-8 rounded-[10px] flex items-center justify-center" style={{ background: "rgba(105,80,240,0.1)" }}>
              <ReceiptText className="h-4 w-4" style={{ color: "#2563EB" }} strokeWidth={1.5} />
            </div>
            <h2 className="text-sm font-semibold text-[#1A1A2E]" style={{ fontFamily: "var(--font-ui)" }}>Últimas Transações</h2>
          </div>
          {lists.lastTransactions.length > 0 ? (
            <div className="space-y-3">
              {lists.lastTransactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between border-b border-[#E8E8F0] pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="text-sm font-medium text-[#1A1A2E] truncate" style={{ fontFamily: "var(--font-ui)" }}>
                      {tx.description || (tx.entity as any)?.name || "—"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <StatusPill status={tx.status} />
                    </div>
                  </div>
                  <span className={`font-semibold text-sm whitespace-nowrap ${tx.type === "income" ? "text-[#16A34A]" : "text-[#DC2626]"}`} style={{ fontFamily: "var(--font-ui)" }}>
                    {tx.type === "expense" ? "−" : "+"} {formatCurrency(Number(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[#94A3B8] text-sm py-6" style={{ fontFamily: "var(--font-body)" }}>
              Nenhuma transação registrada
            </p>
          )}
        </div>

        {/* Recent vehicles */}
        <div className="bg-white rounded-[20px] p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="h-8 w-8 rounded-[10px] flex items-center justify-center" style={{ background: "rgba(105,80,240,0.1)" }}>
              <Car className="h-4 w-4" style={{ color: "#2563EB" }} strokeWidth={1.5} />
            </div>
            <h2 className="text-sm font-semibold text-[#1A1A2E]" style={{ fontFamily: "var(--font-ui)" }}>Veículos Adicionados</h2>
          </div>
          {lists.recentVehicles.length > 0 ? (
            <div className="space-y-3">
              {lists.recentVehicles.map(v => (
                <div key={v.id} className="flex items-center justify-between border-b border-[#E8E8F0] pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="text-sm font-medium text-[#1A1A2E] truncate" style={{ fontFamily: "var(--font-ui)" }}>
                      {v.title || `${v.brand ?? ""} ${v.model ?? ""}`.trim() || "—"}
                    </p>
                    <p className="text-xs text-[#94A3B8]" style={{ fontFamily: "var(--font-body)" }}>
                      {formatDate(v.created_at)}
                    </p>
                  </div>
                  <span className="font-semibold text-sm whitespace-nowrap text-[#2563EB]" style={{ fontFamily: "var(--font-ui)" }}>
                    {v.price != null ? formatCurrency(Number(v.price)) : "—"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[#94A3B8] text-sm py-6" style={{ fontFamily: "var(--font-body)" }}>
              Nenhum veículo cadastrado
            </p>
          )}
        </div>

        {/* Upcoming dues */}
        <div className="bg-white rounded-[20px] p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="h-8 w-8 rounded-[10px] flex items-center justify-center" style={{ background: "rgba(245,158,11,0.1)" }}>
              <CalendarClock className="h-4 w-4" style={{ color: "#F59E0B" }} strokeWidth={1.5} />
            </div>
            <h2 className="text-sm font-semibold text-[#1A1A2E]" style={{ fontFamily: "var(--font-ui)" }}>Vencimentos (7 dias)</h2>
          </div>
          {kpis.upcoming.length > 0 ? (
            <div className="space-y-3">
              {kpis.upcoming.map(tx => (
                <div key={tx.id} className="flex items-center justify-between border-b border-[#E8E8F0] pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="text-sm font-medium text-[#1A1A2E] truncate" style={{ fontFamily: "var(--font-ui)" }}>
                      {tx.description || (tx.entity as any)?.name || "—"}
                    </p>
                    <p className="text-xs text-[#94A3B8]" style={{ fontFamily: "var(--font-body)" }}>
                      Vence: {tx.due_date ? formatDate(tx.due_date) : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`font-semibold text-sm whitespace-nowrap block ${tx.type === "income" ? "text-[#16A34A]" : "text-[#DC2626]"}`} style={{ fontFamily: "var(--font-ui)" }}>
                      {formatCurrency(Number(tx.amount))}
                    </span>
                    <StatusPill status={tx.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[#94A3B8] text-sm py-6" style={{ fontFamily: "var(--font-body)" }}>
              Nenhum vencimento nos próximos 7 dias
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
