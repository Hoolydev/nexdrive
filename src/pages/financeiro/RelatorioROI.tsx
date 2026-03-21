import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FinancialTransaction } from "@/integrations/supabase/types-prd";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Car,
  ArrowUpDown,
  Calendar,
  DollarSign,
  Award,
  AlertTriangle,
} from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

type SortKey = "roi" | "profit" | "days";

interface VehicleROI {
  id: string;
  title: string;
  plate: string;
  purchase_price: number;
  sale_price: number;
  sale_date: string;
  stock_entry_date: string | null;
  costs: number;
  gross_profit: number;
  net_profit: number;
  roi: number;
  days_in_stock: number;
}

export default function RelatorioROI() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("roi");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["relatorio-roi", dateFrom, dateTo],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id)
        .eq("sold", true)
        .order("sale_date", { ascending: false });

      if (dateFrom) query = query.gte("sale_date", dateFrom);
      if (dateTo) query = query.lte("sale_date", dateTo);

      const { data: soldVehicles, error } = await query;
      if (error) throw error;
      if (!soldVehicles || soldVehicles.length === 0) return [];

      const vehicleIds = soldVehicles.map((v) => v.id);

      // Fetch costs from vehicle_costs (legacy)
      const { data: legacyCosts } = await supabase
        .from("vehicle_costs")
        .select("product_id, amount")
        .in("product_id", vehicleIds);

      // Fetch costs from financial_transactions (new system)
      const { data: ftCosts } = await (supabase as any)
        .from("financial_transactions")
        .select("vehicle_id, amount, type")
        .in("vehicle_id", vehicleIds)
        .eq("type", "expense")
        .is("deleted_at", null);

      const costMap: Record<string, number> = {};
      (legacyCosts || []).forEach((c: any) => {
        costMap[c.product_id] = (costMap[c.product_id] || 0) + Number(c.amount);
      });
      ((ftCosts as any[]) || []).forEach((c: any) => {
        costMap[c.vehicle_id] = (costMap[c.vehicle_id] || 0) + Number(c.amount);
      });

      return soldVehicles.map((v): VehicleROI => {
        const purchasePrice = Number(v.purchase_price || 0);
        const salePrice = Number(v.actual_sale_price || 0);
        const costs = costMap[v.id] || 0;
        const grossProfit = salePrice - purchasePrice;
        const netProfit = salePrice - purchasePrice - costs;
        const totalInvested = purchasePrice + costs;
        const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;
        const entryDate = (v as any).stock_entry_date || v.created_at;
        const daysInStock =
          v.sale_date && entryDate
            ? Math.max(
                0,
                Math.round(
                  (new Date(v.sale_date).getTime() - new Date(entryDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              )
            : 0;

        return {
          id: v.id,
          title: v.title || `${v.brand || ""} ${v.model || ""}`.trim() || "Sem titulo",
          plate: v.plate || "-",
          purchase_price: purchasePrice,
          sale_price: salePrice,
          sale_date: v.sale_date || "",
          stock_entry_date: entryDate,
          costs,
          gross_profit: grossProfit,
          net_profit: netProfit,
          roi,
          days_in_stock: daysInStock,
        };
      });
    },
  });

  const sorted = useMemo(() => {
    if (!vehicles) return [];
    const list = [...vehicles];
    list.sort((a, b) => {
      let valA = 0,
        valB = 0;
      if (sortBy === "roi") {
        valA = a.roi;
        valB = b.roi;
      } else if (sortBy === "profit") {
        valA = a.net_profit;
        valB = b.net_profit;
      } else {
        valA = a.days_in_stock;
        valB = b.days_in_stock;
      }
      return sortDir === "desc" ? valB - valA : valA - valB;
    });
    return list;
  }, [vehicles, sortBy, sortDir]);

  const stats = useMemo(() => {
    if (!vehicles || vehicles.length === 0)
      return { count: 0, avgROI: 0, best: null as VehicleROI | null, worst: null as VehicleROI | null };
    const avgROI = vehicles.reduce((s, v) => s + v.roi, 0) / vehicles.length;
    const best = vehicles.reduce((a, b) => (a.roi > b.roi ? a : b));
    const worst = vehicles.reduce((a, b) => (a.roi < b.roi ? a : b));
    return { count: vehicles.length, avgROI, best, worst };
  }, [vehicles]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortBy(key);
      setSortDir("desc");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-3">
        <Target className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rentabilidade por Veiculo</h1>
          <p className="text-muted-foreground">Analise de ROI detalhada das vendas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> De
          </label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> Ate
          </label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Ordenar por</label>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="roi">ROI %</SelectItem>
              <SelectItem value="profit">Lucro Liquido</SelectItem>
              <SelectItem value="days">Dias em Estoque</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
          title={sortDir === "desc" ? "Decrescente" : "Crescente"}
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
        {(dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Veiculos Vendidos
            </CardTitle>
            <Car className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.count}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ROI Medio</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold ${stats.avgROI >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {stats.avgROI.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Melhor Performance
            </CardTitle>
            <Award className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {stats.best ? (
              <>
                <div className="text-lg font-bold text-green-600 truncate">
                  {stats.best.title}
                </div>
                <p className="text-xs text-muted-foreground">
                  ROI {stats.best.roi.toFixed(1)}% &middot;{" "}
                  {formatCurrency(stats.best.net_profit)}
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">-</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pior Performance
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {stats.worst ? (
              <>
                <div className="text-lg font-bold text-red-600 truncate">
                  {stats.worst.title}
                </div>
                <p className="text-xs text-muted-foreground">
                  ROI {stats.worst.roi.toFixed(1)}% &middot;{" "}
                  {formatCurrency(stats.worst.net_profit)}
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">-</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Cards */}
      {sorted.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Car className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Nenhum veiculo vendido encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {sorted.map((v) => {
            const isPositive = v.roi >= 0;
            return (
              <Card
                key={v.id}
                className={`border-0 shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
                  isPositive ? "border-l-4 border-l-green-500" : "border-l-4 border-l-red-500"
                }`}
              >
                <CardContent className="p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{v.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {v.plate} &middot; Vendido em{" "}
                        {v.sale_date
                          ? new Date(v.sale_date).toLocaleDateString("pt-BR")
                          : "-"}
                      </p>
                    </div>
                    <Badge
                      className={
                        isPositive
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : "bg-red-100 text-red-800 hover:bg-red-100"
                      }
                    >
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {v.roi.toFixed(1)}%
                    </Badge>
                  </div>

                  {/* Financial breakdown */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground">Compra</p>
                      <p className="font-medium">{formatCurrency(v.purchase_price)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground">Custos</p>
                      <p className="font-medium">{formatCurrency(v.costs)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground">Venda</p>
                      <p className="font-medium">{formatCurrency(v.sale_price)}</p>
                    </div>
                  </div>

                  {/* Profit row */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs text-muted-foreground">Lucro Bruto</p>
                        <p
                          className={`font-semibold ${v.gross_profit >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {formatCurrency(v.gross_profit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Lucro Liquido</p>
                        <p
                          className={`font-semibold ${v.net_profit >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {formatCurrency(v.net_profit)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Dias em estoque</p>
                      <p className="font-semibold">{v.days_in_stock}d</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
