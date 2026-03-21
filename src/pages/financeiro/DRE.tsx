import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";
import { cn } from "@/lib/utils";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatPct = (value: number) => `${value.toFixed(1)}%`;

// ─── DRE Structure Definition ────────────────────────────────────────────────

interface DRELineDefinition {
  key: string;
  label: string;
  mappingKeys: string[];
  isSubtotal?: boolean;
  isResult?: boolean;
  sign: 1 | -1; // 1 = adds to result, -1 = subtracts
  indented?: boolean;
}

const DRE_LINES: DRELineDefinition[] = [
  {
    key: "RECEITA_BRUTA",
    label: "Receita Bruta",
    mappingKeys: ["RECEITA_BRUTA_VENDA", "RECEITA_SERVICOS", "RECEITA_COMISSOES"],
    isSubtotal: true,
    sign: 1,
  },
  {
    key: "CMV",
    label: "(-) Custo das Mercadorias Vendidas",
    mappingKeys: ["CMV_VEICULO", "CMV_OFICINA", "CMV_DOCUMENTACAO", "CMV_DESPACHANTE", "CMV_FRETE"],
    sign: -1,
    indented: true,
  },
  {
    key: "LUCRO_BRUTO",
    label: "= Lucro Bruto",
    mappingKeys: [],
    isResult: true,
    sign: 1,
  },
  {
    key: "DESPESAS_FIXAS",
    label: "(-) Despesas Fixas",
    mappingKeys: [],
    sign: -1,
    indented: true,
  },
  {
    key: "DESPESAS_VARIAVEIS",
    label: "(-) Despesas Variaveis",
    mappingKeys: [],
    sign: -1,
    indented: true,
  },
  {
    key: "RESULTADO_OPERACIONAL",
    label: "= Resultado Operacional",
    mappingKeys: [],
    isResult: true,
    sign: 1,
  },
  {
    key: "DESPESAS_FINANCEIRAS",
    label: "(-) Despesas Financeiras",
    mappingKeys: [],
    sign: -1,
    indented: true,
  },
  {
    key: "RECEITAS_FINANCEIRAS",
    label: "(+) Receitas Financeiras",
    mappingKeys: [],
    sign: 1,
    indented: true,
  },
  {
    key: "RESULTADO_ANTES_IR",
    label: "= Resultado Antes IR",
    mappingKeys: [],
    isResult: true,
    sign: 1,
  },
  {
    key: "DESPESAS_INVESTIDORES",
    label: "(-) Repasse a Investidores",
    mappingKeys: ["DESPESA_REPASSE_INVESTIDOR", "DESPESA_ROI_INVESTIDOR"],
    sign: -1,
    indented: true,
  },
  {
    key: "RESULTADO_LIQUIDO",
    label: "= Resultado Liquido",
    mappingKeys: [],
    isResult: true,
    sign: 1,
  },
];

// ─── Period helpers ───────────────────────────────────────────────────────────

function getMonthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function getQuarterRange(year: number, quarter: number) {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = quarter * 3;
  const lastDay = new Date(year, endMonth, 0).getDate();
  const start = `${year}-${String(startMonth).padStart(2, "0")}-01`;
  const end = `${year}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function getYearRange(year: number) {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

function getPreviousPeriod(
  periodType: "month" | "quarter" | "annual",
  year: number,
  month: number,
  quarter: number
): { start: string; end: string } {
  if (periodType === "month") {
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    return getMonthRange(prevYear, prevMonth);
  }
  if (periodType === "quarter") {
    let prevQ = quarter - 1;
    let prevYear = year;
    if (prevQ === 0) {
      prevQ = 4;
      prevYear -= 1;
    }
    return getQuarterRange(prevYear, prevQ);
  }
  return getYearRange(year - 1);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DRE() {
  const now = new Date();
  const [periodType, setPeriodType] = useState<"month" | "quarter" | "annual">("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.ceil((now.getMonth() + 1) / 3));
  const [showComparison, setShowComparison] = useState(false);

  // ─── Date ranges ──────────────────────────────────────────────────────────

  const currentRange = useMemo(() => {
    if (periodType === "month") return getMonthRange(year, month);
    if (periodType === "quarter") return getQuarterRange(year, quarter);
    return getYearRange(year);
  }, [periodType, year, month, quarter]);

  const previousRange = useMemo(
    () => getPreviousPeriod(periodType, year, month, quarter),
    [periodType, year, month, quarter]
  );

  // ─── Query helper ─────────────────────────────────────────────────────────

  const fetchTransactions = async (start: string, end: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return [];

    const { data, error } = await (supabase as any)
      .from("financial_transactions")
      .select(
        `id, amount, type, status, due_date, payment_date,
         chart_of_accounts:account_category_id (
           id, code, name, level, dre_mapping_key, dre_order, type
         )`
      )
      .eq("user_id", session.user.id)
      .is("deleted_at", null)
      .gte("due_date", start)
      .lte("due_date", end);

    if (error) throw error;
    return (data || []) as any[];
  };

  const { data: currentTx = [], isLoading: loadingCurrent } = useQuery({
    queryKey: ["dre-current", currentRange.start, currentRange.end],
    queryFn: () => fetchTransactions(currentRange.start, currentRange.end),
  });

  const { data: previousTx = [], isLoading: loadingPrev } = useQuery({
    queryKey: ["dre-previous", previousRange.start, previousRange.end],
    queryFn: () => fetchTransactions(previousRange.start, previousRange.end),
    enabled: showComparison,
  });

  // ─── Aggregation ──────────────────────────────────────────────────────────

  function aggregateByMappingKey(transactions: any[]): Record<string, number> {
    const result: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.status === "cancelled") continue;
      const key: string | null = tx.chart_of_accounts?.dre_mapping_key ?? null;
      if (!key) continue;
      const amount = Number(tx.amount) || 0;
      result[key] = (result[key] || 0) + amount;
    }
    return result;
  }

  function computeDRE(transactions: any[]) {
    const byKey = aggregateByMappingKey(transactions);

    // Sum groups with wildcards
    const fixedExpenseKeys = Object.keys(byKey).filter((k) => k.startsWith("DESPESA_FIXA_"));
    const varExpenseKeys = Object.keys(byKey).filter((k) => k.startsWith("DESPESA_VAR_"));
    const finExpenseKeys = Object.keys(byKey).filter((k) => k.startsWith("DESPESA_FINANCEIRA_"));
    const finIncomeKeys = Object.keys(byKey).filter((k) => k.startsWith("RECEITA_FINANCEIRA_"));

    const sum = (keys: string[]) => keys.reduce((s, k) => s + (byKey[k] || 0), 0);

    const receitaBruta =
      (byKey["RECEITA_BRUTA_VENDA"] || 0) +
      (byKey["RECEITA_SERVICOS"] || 0) +
      (byKey["RECEITA_COMISSOES"] || 0);

    const cmv =
      (byKey["CMV_VEICULO"] || 0) +
      (byKey["CMV_OFICINA"] || 0) +
      (byKey["CMV_DOCUMENTACAO"] || 0) +
      (byKey["CMV_DESPACHANTE"] || 0) +
      (byKey["CMV_FRETE"] || 0);

    const lucroBruto = receitaBruta - cmv;
    const despesasFixas = sum(fixedExpenseKeys);
    const despesasVariaveis = sum(varExpenseKeys);
    const resultadoOperacional = lucroBruto - despesasFixas - despesasVariaveis;
    const despesasFinanceiras = sum(finExpenseKeys);
    const receitasFinanceiras = sum(finIncomeKeys);
    const resultadoAntesIR = resultadoOperacional - despesasFinanceiras + receitasFinanceiras;
    const despesasInvestidores =
      (byKey["DESPESA_REPASSE_INVESTIDOR"] || 0) + (byKey["DESPESA_ROI_INVESTIDOR"] || 0);
    const resultadoLiquido = resultadoAntesIR - despesasInvestidores;

    return {
      RECEITA_BRUTA: receitaBruta,
      CMV: cmv,
      LUCRO_BRUTO: lucroBruto,
      DESPESAS_FIXAS: despesasFixas,
      DESPESAS_VARIAVEIS: despesasVariaveis,
      RESULTADO_OPERACIONAL: resultadoOperacional,
      DESPESAS_FINANCEIRAS: despesasFinanceiras,
      RECEITAS_FINANCEIRAS: receitasFinanceiras,
      RESULTADO_ANTES_IR: resultadoAntesIR,
      DESPESAS_INVESTIDORES: despesasInvestidores,
      RESULTADO_LIQUIDO: resultadoLiquido,
    };
  }

  const current = useMemo(() => computeDRE(currentTx), [currentTx]);
  const previous = useMemo(() => computeDRE(previousTx), [previousTx]);

  const isLoading = loadingCurrent || (showComparison && loadingPrev);

  // ─── Period label ─────────────────────────────────────────────────────────

  const monthNames = [
    "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const periodLabel = useMemo(() => {
    if (periodType === "month") return `${monthNames[month - 1]} / ${year}`;
    if (periodType === "quarter") return `T${quarter} / ${year}`;
    return `Exercicio ${year}`;
  }, [periodType, year, month, quarter]);

  const prevPeriodLabel = useMemo(() => {
    const r = previousRange;
    if (periodType === "month") {
      const d = new Date(r.start + "T12:00:00");
      return `${monthNames[d.getMonth()]} / ${d.getFullYear()}`;
    }
    if (periodType === "quarter") {
      const d = new Date(r.start + "T12:00:00");
      const q = Math.ceil((d.getMonth() + 1) / 3);
      return `T${q} / ${d.getFullYear()}`;
    }
    return `Exercicio ${new Date(r.start + "T12:00:00").getFullYear()}`;
  }, [previousRange, periodType]);

  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // ─── Margin ───────────────────────────────────────────────────────────────

  const margemLiquida =
    current.RECEITA_BRUTA > 0 ? (current.RESULTADO_LIQUIDO / current.RECEITA_BRUTA) * 100 : 0;

  // ─── Row renderer ─────────────────────────────────────────────────────────

  function pctOfRevenue(val: number) {
    if (current.RECEITA_BRUTA === 0) return 0;
    return (val / current.RECEITA_BRUTA) * 100;
  }

  function rowColorClass(def: DRELineDefinition, value: number) {
    if (def.isResult || def.isSubtotal) {
      return value >= 0 ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400";
    }
    return "text-foreground";
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DRE</h1>
          <p className="text-muted-foreground">Demonstrativo de Resultado do Exercicio</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Period type */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Periodo</Label>
          <Tabs
            value={periodType}
            onValueChange={(v) => setPeriodType(v as "month" | "quarter" | "annual")}
          >
            <TabsList>
              <TabsTrigger value="month">Mensal</TabsTrigger>
              <TabsTrigger value="quarter">Trimestral</TabsTrigger>
              <TabsTrigger value="annual">Anual</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Year */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Ano</Label>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={() => setYear((y) => y - 1)}>
              ‹
            </Button>
            <div className="flex items-center px-3 border rounded-md bg-background text-sm font-medium min-w-[60px] justify-center">
              {year}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setYear((y) => y + 1)}
              disabled={year >= currentYear}
            >
              ›
            </Button>
          </div>
        </div>

        {/* Month selector */}
        {periodType === "month" && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Mes</Label>
            <div className="flex flex-wrap gap-1">
              {monthNames.map((name, i) => (
                <Button
                  key={i}
                  variant={month === i + 1 ? "default" : "outline"}
                  size="sm"
                  className="px-2 text-xs h-8"
                  onClick={() => setMonth(i + 1)}
                >
                  {name.slice(0, 3)}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Quarter selector */}
        {periodType === "quarter" && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Trimestre</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((q) => (
                <Button
                  key={q}
                  variant={quarter === q ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuarter(q)}
                >
                  T{q}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Comparison toggle */}
        <div className="flex items-center gap-2 ml-auto">
          <Switch
            id="comparison-toggle"
            checked={showComparison}
            onCheckedChange={setShowComparison}
          />
          <Label htmlFor="comparison-toggle" className="text-sm cursor-pointer">
            Comparar com periodo anterior
          </Label>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Bruta</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(current.RECEITA_BRUTA)}</div>
            {showComparison && (
              <p className="text-xs text-muted-foreground mt-1">
                Anterior: {formatCurrency(previous.RECEITA_BRUTA)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Bruto</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                current.LUCRO_BRUTO >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {formatCurrency(current.LUCRO_BRUTO)}
            </div>
            {showComparison && (
              <p className="text-xs text-muted-foreground mt-1">
                Anterior: {formatCurrency(previous.LUCRO_BRUTO)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resultado Liquido</CardTitle>
            {current.RESULTADO_LIQUIDO >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                current.RESULTADO_LIQUIDO >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {formatCurrency(current.RESULTADO_LIQUIDO)}
            </div>
            {showComparison && (
              <p className="text-xs text-muted-foreground mt-1">
                Anterior: {formatCurrency(previous.RESULTADO_LIQUIDO)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Margem Liquida</CardTitle>
            <Percent className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                margemLiquida >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {formatPct(margemLiquida)}
            </div>
            {showComparison && previous.RECEITA_BRUTA > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Anterior:{" "}
                {formatPct((previous.RESULTADO_LIQUIDO / previous.RECEITA_BRUTA) * 100)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DRE Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Demonstrativo &mdash; {periodLabel}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/80 dark:bg-gray-900/50">
                  <th className="text-left py-3 px-6 font-medium text-muted-foreground">Descricao</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                    {periodLabel}
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground w-20">% RB</th>
                  {showComparison && (
                    <>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                        {prevPeriodLabel}
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground w-20">
                        % RB
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {DRE_LINES.map((def, idx) => {
                  const value = current[def.key as keyof typeof current] ?? 0;
                  const prevValue = previous[def.key as keyof typeof previous] ?? 0;
                  const pct = pctOfRevenue(def.sign === -1 ? -value : value);
                  const prevPct =
                    previous.RECEITA_BRUTA > 0
                      ? ((def.sign === -1 ? -prevValue : prevValue) / previous.RECEITA_BRUTA) * 100
                      : 0;

                  // Display value: for cost lines, show positive amount (already positive in DB)
                  const displayValue = def.sign === -1 ? -Math.abs(value) : value;
                  const displayPrevValue = def.sign === -1 ? -Math.abs(prevValue) : prevValue;

                  const isResultLine = def.isResult;
                  const isSubtotalLine = def.isSubtotal;
                  const isBold = isResultLine || isSubtotalLine;

                  return (
                    <tr
                      key={def.key}
                      className={cn(
                        "border-b transition-colors",
                        isResultLine
                          ? "bg-gray-100/80 dark:bg-gray-800/60 border-t-2 border-gray-300 dark:border-gray-600"
                          : "hover:bg-gray-50/60 dark:hover:bg-gray-900/30",
                        idx === DRE_LINES.length - 1 && isResultLine
                          ? "border-b-2 border-gray-400 dark:border-gray-500"
                          : ""
                      )}
                    >
                      <td
                        className={cn(
                          "py-3 px-6",
                          def.indented ? "pl-10" : "",
                          isBold ? "font-bold" : "font-normal"
                        )}
                      >
                        {def.label}
                      </td>
                      <td
                        className={cn(
                          "py-3 px-4 text-right tabular-nums",
                          isBold ? "font-bold" : "font-normal",
                          rowColorClass(def, displayValue)
                        )}
                      >
                        {formatCurrency(displayValue)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-muted-foreground text-xs">
                        {formatPct(pct)}
                      </td>
                      {showComparison && (
                        <>
                          <td
                            className={cn(
                              "py-3 px-4 text-right tabular-nums",
                              isBold ? "font-bold" : "font-normal",
                              isResultLine || isSubtotalLine
                                ? displayPrevValue >= 0
                                  ? "text-green-700 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                                : "text-muted-foreground"
                            )}
                          >
                            {formatCurrency(displayPrevValue)}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums text-muted-foreground text-xs">
                            {formatPct(prevPct)}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground pb-4">
        * Valores baseados em lancamentos com vencimento dentro do periodo selecionado. Lancamentos
        cancelados sao excluidos. Categorias sem chave DRE nao sao consideradas.
      </p>
    </div>
  );
}
