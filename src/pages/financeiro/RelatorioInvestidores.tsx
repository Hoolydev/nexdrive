import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  Car,
  ArrowRightCircle,
} from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value / 100);

interface Investor {
  id: string;
  name: string;
  investor_roi_type: string | null;
  investor_roi_rate: number | null;
  pix_key: string | null;
}

interface VehicleOwner {
  id: string;
  equity_percentage: number | null;
  ownership_type: string | null;
  entry_date: string | null;
  exit_date: string | null;
  vehicle: {
    id: string;
    title: string | null;
    plate: string | null;
    status: string | null;
    price: number | null;
    actual_sale_price: number | null;
    stock_entry_date: string | null;
  } | null;
}

interface PayoutTransaction {
  id: string;
  vehicle_id: string | null;
  amount: number;
  status: string;
}

interface InvestorData {
  investor: Investor;
  ownerships: VehicleOwner[];
  payouts: PayoutTransaction[];
  equityValue: number;
  pendingRepasse: number;
}

function getRoiTypeBadge(roiType: string | null) {
  if (roiType === "fixed_monthly") {
    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
        Juros Mensais
      </Badge>
    );
  }
  if (roiType === "profit_share") {
    return (
      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200">
        Participacao nos Lucros
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      {roiType || "Nao definido"}
    </Badge>
  );
}

function getVehicleStatusBadge(status: string | null) {
  if (status === "sold") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Vendido
      </Badge>
    );
  }
  if (status === "active") {
    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
        Em Estoque
      </Badge>
    );
  }
  if (status === "quarantine") {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        Quarentena
      </Badge>
    );
  }
  return <Badge variant="outline">{status || "-"}</Badge>;
}

function calcAccruedInterest(
  equityValue: number,
  monthlyRate: number,
  entryDate: string | null
): number {
  if (!entryDate || !equityValue || !monthlyRate) return 0;
  const now = new Date();
  const entry = new Date(entryDate);
  const monthsElapsed =
    (now.getFullYear() - entry.getFullYear()) * 12 +
    (now.getMonth() - entry.getMonth());
  return equityValue * (monthlyRate / 100) * Math.max(0, monthsElapsed);
}

function calcDaysInStock(entryDate: string | null, exitDate: string | null): number {
  if (!entryDate) return 0;
  const from = new Date(entryDate);
  const to = exitDate ? new Date(exitDate) : new Date();
  return Math.max(
    0,
    Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function InvestorAccordionItem({
  data,
  userId,
  onGerarRepasse,
  isCreating,
}: {
  data: InvestorData;
  userId: string;
  onGerarRepasse: (params: { investorId: string; vehicleId: string; amount: number }) => void;
  isCreating: boolean;
}) {
  const { investor, ownerships, payouts } = data;

  const activeOwnerships = ownerships.filter(
    (o) => o.vehicle && o.vehicle.status !== "sold" && o.vehicle.status !== "archived"
  );
  const soldOwnerships = ownerships.filter(
    (o) => o.vehicle && (o.vehicle.status === "sold" || o.vehicle.status === "archived")
  );

  const totalEquityValue = useMemo(() => {
    return activeOwnerships.reduce((sum, o) => {
      const vehicleValue = o.vehicle?.price || 0;
      const equity = (o.equity_percentage || 0) / 100;
      return sum + vehicleValue * equity;
    }, 0);
  }, [activeOwnerships]);

  const pendingRepasse = useMemo(() => {
    return soldOwnerships.reduce((sum, o) => {
      if (!o.vehicle) return sum;
      const salePrice = o.vehicle.actual_sale_price || 0;
      const equity = (o.equity_percentage || 0) / 100;
      const grossShare = salePrice * equity;
      const vehiclePayouts = payouts
        .filter((p) => p.vehicle_id === o.vehicle!.id && p.status === "paid")
        .reduce((s, p) => s + p.amount, 0);
      const pending = Math.max(0, grossShare - vehiclePayouts);
      return sum + pending;
    }, 0);
  }, [soldOwnerships, payouts]);

  const hasPendingRepasse = pendingRepasse > 0;

  return (
    <AccordionItem value={investor.id} className="border rounded-xl bg-white shadow-sm mb-4 overflow-hidden">
      <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 transition-colors">
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-base">{investor.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {getRoiTypeBadge(investor.investor_roi_type)}
                {investor.investor_roi_rate != null && (
                  <span className="text-xs text-muted-foreground">
                    {investor.investor_roi_rate}%
                    {investor.investor_roi_type === "fixed_monthly" ? " a.m." : " dos lucros"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">Capital em Estoque</p>
              <p className="font-semibold text-sm">
                {formatCurrency(totalEquityValue)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Repasse Pendente</p>
              <p
                className={`font-bold text-sm ${
                  hasPendingRepasse ? "text-yellow-700" : "text-green-700"
                }`}
              >
                {formatCurrency(pendingRepasse)}
              </p>
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-0 pb-0">
        <div className="border-t">
          {/* Active Vehicles */}
          {activeOwnerships.length > 0 && (
            <div className="p-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-2">
                Veiculos em Estoque
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veiculo</TableHead>
                    <TableHead className="text-center">Participacao</TableHead>
                    <TableHead className="text-center">Tipo</TableHead>
                    <TableHead className="text-right">Valor Atual</TableHead>
                    <TableHead className="text-right">Cota do Investidor</TableHead>
                    <TableHead className="text-right">Dias em Estoque</TableHead>
                    {investor.investor_roi_type === "fixed_monthly" && (
                      <TableHead className="text-right">Juros Acumulados</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeOwnerships.map((o) => {
                    const vehicleValue = o.vehicle?.price || 0;
                    const equity = (o.equity_percentage || 0) / 100;
                    const investorShare = vehicleValue * equity;
                    const days = calcDaysInStock(
                      o.vehicle?.stock_entry_date || o.entry_date,
                      null
                    );
                    const accruedInterest =
                      investor.investor_roi_type === "fixed_monthly"
                        ? calcAccruedInterest(
                            investorShare,
                            investor.investor_roi_rate || 0,
                            o.entry_date
                          )
                        : 0;

                    return (
                      <TableRow key={o.id}>
                        <TableCell>
                          <p className="font-medium">
                            {o.vehicle?.title || "Sem titulo"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {o.vehicle?.plate || "-"}
                          </p>
                        </TableCell>
                        <TableCell className="text-center">
                          {formatPercent(o.equity_percentage || 0)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">
                            {o.ownership_type || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(vehicleValue)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(investorShare)}
                        </TableCell>
                        <TableCell className="text-right">{days}d</TableCell>
                        {investor.investor_roi_type === "fixed_monthly" && (
                          <TableCell className="text-right text-blue-600 font-medium">
                            {formatCurrency(accruedInterest)}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Sold Vehicles */}
          {soldOwnerships.length > 0 && (
            <div className={`p-4 ${activeOwnerships.length > 0 ? "border-t" : ""}`}>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-2">
                Veiculos Vendidos
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veiculo</TableHead>
                    <TableHead className="text-center">Participacao</TableHead>
                    <TableHead className="text-right">Valor Venda</TableHead>
                    <TableHead className="text-right">Cota Bruta</TableHead>
                    <TableHead className="text-right">Repasses Pagos</TableHead>
                    <TableHead className="text-right">Saldo a Repassar</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {soldOwnerships.map((o) => {
                    if (!o.vehicle) return null;
                    const salePrice = o.vehicle.actual_sale_price || 0;
                    const equity = (o.equity_percentage || 0) / 100;
                    const grossShare = salePrice * equity;
                    const vehiclePayouts = payouts.filter(
                      (p) => p.vehicle_id === o.vehicle!.id && p.status === "paid"
                    );
                    const totalPaid = vehiclePayouts.reduce(
                      (s, p) => s + p.amount,
                      0
                    );
                    const netPending = Math.max(0, grossShare - totalPaid);
                    const isPending = netPending > 0.01;
                    const days = calcDaysInStock(
                      o.vehicle.stock_entry_date || o.entry_date,
                      o.exit_date
                    );

                    return (
                      <TableRow key={o.id}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium">
                              {o.vehicle.title || "Sem titulo"}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">
                                {o.vehicle.plate || "-"}
                              </span>
                              {getVehicleStatusBadge(o.vehicle.status)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {days}d em estoque
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {formatPercent(o.equity_percentage || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(salePrice)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(grossShare)}
                        </TableCell>
                        <TableCell className="text-right text-green-700">
                          {formatCurrency(totalPaid)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-bold ${
                            isPending ? "text-yellow-700" : "text-green-600"
                          }`}
                        >
                          {formatCurrency(netPending)}
                        </TableCell>
                        <TableCell className="text-right">
                          {isPending ? (
                            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                              Pendente
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              Liquidado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isPending && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 text-blue-700 border-blue-300 hover:bg-blue-50"
                              disabled={isCreating}
                              onClick={() =>
                                onGerarRepasse({
                                  investorId: investor.id,
                                  vehicleId: o.vehicle!.id,
                                  amount: netPending,
                                })
                              }
                            >
                              <ArrowRightCircle className="h-3 w-3" />
                              Gerar Repasse
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {ownerships.length === 0 && (
            <div className="py-10 flex flex-col items-center justify-center text-muted-foreground">
              <Car className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Nenhum veiculo vinculado a este investidor</p>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default function RelatorioInvestidores() {
  const queryClient = useQueryClient();

  const { data: investorsData, isLoading } = useQuery({
    queryKey: ["relatorio-investidores"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      // 1. Fetch investors
      const { data: investors, error: invErr } = await (supabase as any)
        .from("entities")
        .select("id, name, investor_roi_type, investor_roi_rate, pix_key")
        .eq("is_investor", true)
        .eq("user_id", user.id);

      if (invErr) throw invErr;
      if (!investors || investors.length === 0) return [];

      // 2. For each investor, fetch vehicle_owners
      const ownershipPromises = (investors as Investor[]).map((inv) =>
        (supabase as any)
          .from("vehicle_owners")
          .select(
            `id, equity_percentage, ownership_type, entry_date, exit_date,
            vehicle:vehicle_id (id, title, plate, status, price, actual_sale_price, stock_entry_date)`
          )
          .eq("entity_id", inv.id)
          .then((res: any) => ({
            investorId: inv.id,
            ownerships: (res.data || []) as VehicleOwner[],
          }))
      );

      const ownershipResults = await Promise.all(ownershipPromises);
      const ownershipMap = new Map(
        ownershipResults.map((r) => [r.investorId, r.ownerships])
      );

      // 3. Collect all vehicle IDs sold/archived for payout queries
      const allVehicleIds: string[] = [];
      ownershipResults.forEach(({ ownerships }) => {
        ownerships.forEach((o) => {
          if (
            o.vehicle?.id &&
            (o.vehicle.status === "sold" || o.vehicle.status === "archived")
          ) {
            allVehicleIds.push(o.vehicle.id);
          }
        });
      });

      // 4. Fetch payout transactions for all sold vehicles
      let payouts: PayoutTransaction[] = [];
      if (allVehicleIds.length > 0) {
        const { data: payoutData } = await (supabase as any)
          .from("financial_transactions")
          .select("id, vehicle_id, amount, status")
          .in("vehicle_id", allVehicleIds)
          .eq("type", "expense")
          .is("deleted_at", null);

        // Filter client-side for DESPESA_REPASSE_INVESTIDOR would require joining account,
        // but we keep it simple: all expense transactions for those vehicles as proxy
        payouts = (payoutData || []) as PayoutTransaction[];
      }

      return (investors as Investor[]).map((inv): InvestorData => {
        const ownerships = ownershipMap.get(inv.id) || [];
        const investorVehicleIds = ownerships
          .map((o) => o.vehicle?.id)
          .filter(Boolean) as string[];
        const investorPayouts = payouts.filter(
          (p) => p.vehicle_id && investorVehicleIds.includes(p.vehicle_id)
        );

        const equityValue = ownerships
          .filter(
            (o) =>
              o.vehicle &&
              o.vehicle.status !== "sold" &&
              o.vehicle.status !== "archived"
          )
          .reduce((sum, o) => {
            const vehicleValue = o.vehicle?.price || 0;
            const equity = (o.equity_percentage || 0) / 100;
            return sum + vehicleValue * equity;
          }, 0);

        const pendingRepasse = ownerships
          .filter(
            (o) =>
              o.vehicle &&
              (o.vehicle.status === "sold" || o.vehicle.status === "archived")
          )
          .reduce((sum, o) => {
            if (!o.vehicle) return sum;
            const salePrice = o.vehicle.actual_sale_price || 0;
            const equity = (o.equity_percentage || 0) / 100;
            const grossShare = salePrice * equity;
            const paid = investorPayouts
              .filter((p) => p.vehicle_id === o.vehicle!.id && p.status === "paid")
              .reduce((s, p) => s + p.amount, 0);
            return sum + Math.max(0, grossShare - paid);
          }, 0);

        return {
          investor: inv,
          ownerships,
          payouts: investorPayouts,
          equityValue,
          pendingRepasse,
        };
      });
    },
  });

  const { mutate: gerarRepasse, isPending: isCreating } = useMutation({
    mutationFn: async ({
      investorId,
      vehicleId,
      amount,
    }: {
      investorId: string;
      vehicleId: string;
      amount: number;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Nao autenticado");

      const { error } = await (supabase as any)
        .from("financial_transactions")
        .insert({
          user_id: user.id,
          type: "expense",
          amount,
          status: "open",
          vehicle_id: vehicleId,
          entity_id: investorId,
          description: "Repasse ao investidor",
          due_date: new Date().toISOString().split("T")[0],
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Repasse gerado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["relatorio-investidores"] });
    },
    onError: () => {
      toast.error("Erro ao gerar repasse");
    },
  });

  // Summary stats
  const summary = useMemo(() => {
    if (!investorsData) return { count: 0, capitalEmEstoque: 0, repassesPendentes: 0, roiMedio: 0 };
    const count = investorsData.length;
    const capitalEmEstoque = investorsData.reduce((s, d) => s + d.equityValue, 0);
    const repassesPendentes = investorsData.reduce(
      (s, d) => s + d.pendingRepasse,
      0
    );
    const rates = investorsData
      .map((d) => d.investor.investor_roi_rate)
      .filter((r) => r != null) as number[];
    const roiMedio = rates.length
      ? rates.reduce((s, r) => s + r, 0) / rates.length
      : 0;
    return { count, capitalEmEstoque, repassesPendentes, roiMedio };
  }, [investorsData]);

  const userId = "";

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3">
        <TrendingUp className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Relatorio de Investidores
          </h1>
          <p className="text-muted-foreground">
            ROI e repasses por investidor
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Investidores Ativos
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.count}</div>
            <p className="text-xs text-muted-foreground">
              cadastrados como investidores
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Capital em Estoque
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.capitalEmEstoque)}
            </div>
            <p className="text-xs text-muted-foreground">
              soma das cotas em veiculos ativos
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Repasses Pendentes
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(summary.repassesPendentes)}
            </div>
            <p className="text-xs text-muted-foreground">
              a pagar para investidores
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ROI Medio
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {summary.roiMedio.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              taxa media dos investidores
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Investor Accordion */}
      {!investorsData || investorsData.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              Nenhum investidor cadastrado
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Marque entidades como investidor no cadastro de Entidades
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-0">
          {investorsData.map((data) => (
            <InvestorAccordionItem
              key={data.investor.id}
              data={data}
              userId={userId}
              onGerarRepasse={gerarRepasse}
              isCreating={isCreating}
            />
          ))}
        </Accordion>
      )}
    </div>
  );
}
