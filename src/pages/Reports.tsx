import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign } from "lucide-react";

type VehicleReport = {
  id: string;
  title: string | null;
  brand: string | null;
  model: string | null;
  plate: string | null;
  purchase_price: number | null;
  actual_sale_price: number | null;
  sale_date: string | null;
  total_costs: number;
  total_invested: number;
  profit: number;
  profit_percentage: number;
};

export default function Reports() {
  const [reports, setReports] = useState<VehicleReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar veículos vendidos
      const { data: soldVehicles, error: vehiclesError } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id)
        .eq("sold", true)
        .order("sale_date", { ascending: false });

      if (vehiclesError) throw vehiclesError;

      // Buscar custos de todos os veículos vendidos
      const vehicleIds = soldVehicles?.map(v => v.id) || [];
      const { data: costs, error: costsError } = await supabase
        .from("vehicle_costs")
        .select("product_id, amount")
        .in("product_id", vehicleIds);

      if (costsError) throw costsError;

      // Calcular relatórios
      const reportsData: VehicleReport[] = (soldVehicles || []).map(vehicle => {
        const vehicleCosts = costs?.filter(c => c.product_id === vehicle.id) || [];
        const totalCosts = vehicleCosts.reduce((sum, cost) => sum + Number(cost.amount), 0);
        const purchasePrice = Number(vehicle.purchase_price || 0);
        const salePrice = Number(vehicle.actual_sale_price || 0);
        const totalInvested = purchasePrice + totalCosts;
        const profit = salePrice - totalInvested;
        const profitPercentage = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

        return {
          id: vehicle.id,
          title: vehicle.title,
          brand: vehicle.brand,
          model: vehicle.model,
          plate: vehicle.plate,
          purchase_price: purchasePrice,
          actual_sale_price: salePrice,
          sale_date: vehicle.sale_date,
          total_costs: totalCosts,
          total_invested: totalInvested,
          profit,
          profit_percentage: profitPercentage,
        };
      });

      setReports(reportsData);
      setTotalProfit(reportsData.reduce((sum, r) => sum + r.profit, 0));
      setTotalRevenue(reportsData.reduce((sum, r) => sum + r.actual_sale_price, 0));
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  if (loading) {
    return <div className="p-6">Carregando relatórios...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Relatórios de Vendas</h1>
        <p className="text-muted-foreground">
          Análise de lucro e performance das vendas
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Receita Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Valor total de vendas realizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Lucro Total
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Lucro líquido após custos
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Veículo</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum veículo vendido encontrado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Data Venda</TableHead>
                  <TableHead className="text-right">Compra</TableHead>
                  <TableHead className="text-right">Custos</TableHead>
                  <TableHead className="text-right">Investido</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {report.title || `${report.brand} ${report.model}`}
                    </TableCell>
                    <TableCell>{report.plate || "-"}</TableCell>
                    <TableCell>{formatDate(report.sale_date)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(report.purchase_price || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(report.total_costs)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(report.total_invested)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(report.actual_sale_price || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={report.profit >= 0 ? "default" : "destructive"}
                      >
                        {formatCurrency(report.profit)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={report.profit_percentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {report.profit_percentage.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
