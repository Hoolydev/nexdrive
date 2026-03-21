import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Package,
  Clock,
  AlertTriangle,
  DollarSign,
  Car,
} from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

interface StockVehicle {
  id: string;
  title: string;
  plate: string;
  days_in_stock: number;
  purchase_price: number;
  fipe_price: number | null;
  stock_entry_date: string | null;
  band: "0-30" | "31-60" | "61-90" | "90+";
}

const BAND_CONFIG = {
  "0-30": { label: "0 - 30 dias", color: "#16a34a", bgClass: "bg-green-50 border-green-200", textClass: "text-green-700", dotClass: "bg-green-500" },
  "31-60": { label: "31 - 60 dias", color: "#eab308", bgClass: "bg-yellow-50 border-yellow-200", textClass: "text-yellow-700", dotClass: "bg-yellow-500" },
  "61-90": { label: "61 - 90 dias", color: "#f97316", bgClass: "bg-orange-50 border-orange-200", textClass: "text-orange-700", dotClass: "bg-orange-500" },
  "90+": { label: "90+ dias", color: "#dc2626", bgClass: "bg-red-50 border-red-200", textClass: "text-red-700", dotClass: "bg-red-500" },
} as const;

function getBand(days: number): StockVehicle["band"] {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export default function RelatorioEstoque() {
  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["relatorio-estoque"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id)
        .eq("sold", false)
        .order("created_at", { ascending: true });

      if (error) throw error;
      const now = new Date();

      return (data || []).map((v): StockVehicle => {
        const entryDate = (v as any).stock_entry_date || v.created_at;
        const days = Math.max(
          0,
          Math.round((now.getTime() - new Date(entryDate).getTime()) / (1000 * 60 * 60 * 24))
        );
        return {
          id: v.id,
          title: v.title || `${v.brand || ""} ${v.model || ""}`.trim() || "Sem titulo",
          plate: v.plate || "-",
          days_in_stock: days,
          purchase_price: Number(v.purchase_price || 0),
          fipe_price: (v as any).fipe_price ? Number((v as any).fipe_price) : null,
          stock_entry_date: entryDate,
          band: getBand(days),
        };
      });
    },
  });

  const groups = useMemo(() => {
    const bands: Record<StockVehicle["band"], StockVehicle[]> = {
      "0-30": [],
      "31-60": [],
      "61-90": [],
      "90+": [],
    };
    (vehicles || []).forEach((v) => bands[v.band].push(v));
    return bands;
  }, [vehicles]);

  const chartData = useMemo(() => {
    return (["0-30", "31-60", "61-90", "90+"] as const).map((band) => ({
      name: BAND_CONFIG[band].label,
      veiculos: groups[band].length,
      capital: groups[band].reduce((s, v) => s + v.purchase_price, 0),
      color: BAND_CONFIG[band].color,
    }));
  }, [groups]);

  const totalCapital = useMemo(
    () => (vehicles || []).reduce((s, v) => s + v.purchase_price, 0),
    [vehicles]
  );
  const totalVehicles = vehicles?.length || 0;
  const avgDays = useMemo(() => {
    if (!vehicles || vehicles.length === 0) return 0;
    return Math.round(vehicles.reduce((s, v) => s + v.days_in_stock, 0) / vehicles.length);
  }, [vehicles]);
  const over90Count = groups["90+"].length;

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
        <Package className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Giro e Idade dos Veiculos</h1>
          <p className="text-muted-foreground">Analise de envelhecimento do estoque</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total em Estoque
            </CardTitle>
            <Car className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalVehicles}</div>
            <p className="text-xs text-muted-foreground">veiculos ativos</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Capital Imobilizado
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalCapital)}</div>
            <p className="text-xs text-muted-foreground">investido no estoque</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Media de Dias
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgDays}d</div>
            <p className="text-xs text-muted-foreground">tempo medio em estoque</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estoque Critico
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{over90Count}</div>
            <p className="text-xs text-muted-foreground">veiculos acima de 90 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Distribuicao por Faixa de Idade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === "capital" ? formatCurrency(value) : value,
                    name === "capital" ? "Capital" : "Veiculos",
                  ]}
                />
                <Bar dataKey="veiculos" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Band Sections */}
      {(["0-30", "31-60", "61-90", "90+"] as const).map((band) => {
        const cfg = BAND_CONFIG[band];
        const items = groups[band];
        if (items.length === 0) return null;
        const bandCapital = items.reduce((s, v) => s + v.purchase_price, 0);

        return (
          <div key={band} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${cfg.dotClass}`} />
                <h2 className={`text-lg font-semibold ${cfg.textClass}`}>
                  {cfg.label}
                </h2>
                <Badge variant="outline" className={cfg.textClass}>
                  {items.length} {items.length === 1 ? "veiculo" : "veiculos"}
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                Capital: <strong>{formatCurrency(bandCapital)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items
                .sort((a, b) => b.days_in_stock - a.days_in_stock)
                .map((v) => (
                  <Card
                    key={v.id}
                    className={`border shadow-sm ${cfg.bgClass}`}
                  >
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold truncate">{v.title}</h3>
                          <p className="text-sm text-muted-foreground">{v.plate}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${cfg.textClass}`}>
                            {v.days_in_stock}d
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Compra</p>
                          <p className="font-medium">{formatCurrency(v.purchase_price)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">FIPE</p>
                          <p className="font-medium">
                            {v.fipe_price ? formatCurrency(v.fipe_price) : "-"}
                          </p>
                        </div>
                      </div>

                      {band === "90+" && (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 w-full justify-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Remarcacao sugerida
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        );
      })}

      {totalVehicles === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Nenhum veiculo em estoque</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
