import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Building2,
  TrendingDown,
  Receipt,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Calendar,
  PieChart,
} from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const CHART_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#84cc16",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

interface AccountNode {
  id: string;
  name: string;
  code: string | null;
  level: number | null;
  parent_id: string | null;
  type: string | null;
  dre_mapping_key: string | null;
}

interface CategorySummary {
  id: string;
  name: string;
  total: number;
  count: number;
}

interface GroupSummary {
  id: string;
  name: string;
  total: number;
  count: number;
  categories: CategorySummary[];
}

interface TransactionRow {
  id: string;
  amount: number;
  due_date: string | null;
  payment_date: string | null;
  description: string | null;
  status: string | null;
  account_category_id: string | null;
  entity_id: string | null;
  vehicle_id: string | null;
}

export default function RelatorioDespesas() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const { data, isLoading } = useQuery({
    queryKey: ["relatorio-despesas", dateFrom, dateTo],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { transactions: [], accounts: [], entities: [], vehicles: [] };

      const [txResult, acResult, entResult, vehResult] = await Promise.all([
        (supabase as any)
          .from("financial_transactions")
          .select(
            "id, amount, due_date, payment_date, description, status, account_category_id, entity_id, vehicle_id"
          )
          .eq("user_id", user.id)
          .eq("type", "expense")
          .is("deleted_at", null)
          .gte("due_date", dateFrom || "2000-01-01")
          .lte("due_date", dateTo || "2099-12-31"),
        (supabase as any)
          .from("chart_of_accounts")
          .select("id, name, code, level, parent_id, type, dre_mapping_key")
          .eq("user_id", user.id)
          .eq("type", "expense"),
        supabase.from("entities").select("id, name").eq("user_id", user.id),
        supabase.from("products").select("id, title, plate").eq("user_id", user.id),
      ]);

      return {
        transactions: (txResult.data as TransactionRow[]) || [],
        accounts: (acResult.data as AccountNode[]) || [],
        entities: (entResult.data as { id: string; name: string }[]) || [],
        vehicles:
          (vehResult.data as { id: string; title: string; plate: string | null }[]) || [],
      };
    },
  });

  const { transactions, accounts, entities, vehicles } = data || {
    transactions: [],
    accounts: [],
    entities: [],
    vehicles: [],
  };

  const entityMap = useMemo(() => {
    const m: Record<string, string> = {};
    (entities || []).forEach((e) => {
      m[e.id] = e.name;
    });
    return m;
  }, [entities]);

  const vehicleMap = useMemo(() => {
    const m: Record<string, string> = {};
    (vehicles || []).forEach((v) => {
      m[v.id] = v.plate ? `${v.title} (${v.plate})` : v.title;
    });
    return m;
  }, [vehicles]);

  const accountMap = useMemo(() => {
    const m: Record<string, AccountNode> = {};
    (accounts || []).forEach((a) => {
      m[a.id] = a;
    });
    return m;
  }, [accounts]);

  // Build hierarchy: groups and categories
  const { groups, totalExpenses, totalCount } = useMemo(() => {
    // category totals
    const catTotals: Record<string, { total: number; count: number }> = {};
    (transactions || []).forEach((tx) => {
      const catId = tx.account_category_id || "__uncategorized__";
      if (!catTotals[catId]) catTotals[catId] = { total: 0, count: 0 };
      catTotals[catId].total += Number(tx.amount);
      catTotals[catId].count += 1;
    });

    const totalExpenses = Object.values(catTotals).reduce((s, v) => s + v.total, 0);
    const totalCount = Object.values(catTotals).reduce((s, v) => s + v.count, 0);

    // Map each category to its parent group
    const groupMap: Record<
      string,
      { id: string; name: string; categories: CategorySummary[]; total: number; count: number }
    > = {};

    Object.entries(catTotals).forEach(([catId, { total, count }]) => {
      if (catId === "__uncategorized__") {
        const gid = "__uncategorized_group__";
        if (!groupMap[gid]) {
          groupMap[gid] = {
            id: gid,
            name: "Sem Categoria",
            categories: [],
            total: 0,
            count: 0,
          };
        }
        groupMap[gid].categories.push({ id: catId, name: "Sem Categoria", total, count });
        groupMap[gid].total += total;
        groupMap[gid].count += count;
        return;
      }

      const cat = accountMap[catId];
      if (!cat) {
        const gid = "__unknown_group__";
        if (!groupMap[gid]) {
          groupMap[gid] = {
            id: gid,
            name: "Categoria Desconhecida",
            categories: [],
            total: 0,
            count: 0,
          };
        }
        groupMap[gid].categories.push({ id: catId, name: catId, total, count });
        groupMap[gid].total += total;
        groupMap[gid].count += count;
        return;
      }

      // find parent (level 2 or above)
      let parentId = cat.parent_id;
      let parentName = "Outros";
      if (parentId && accountMap[parentId]) {
        parentName = accountMap[parentId].name;
      } else if (!parentId) {
        // This account itself might be a group-level account
        parentId = cat.id;
        parentName = cat.name;
      }

      const gid = parentId || "__other__";
      if (!groupMap[gid]) {
        groupMap[gid] = {
          id: gid,
          name: parentName,
          categories: [],
          total: 0,
          count: 0,
        };
      }
      groupMap[gid].categories.push({ id: catId, name: cat.name, total, count });
      groupMap[gid].total += total;
      groupMap[gid].count += count;
    });

    // Sort categories within each group
    const groups: GroupSummary[] = Object.values(groupMap).map((g) => ({
      ...g,
      categories: [...g.categories].sort((a, b) => b.total - a.total),
    }));
    groups.sort((a, b) => b.total - a.total);

    return { groups, totalExpenses, totalCount };
  }, [transactions, accountMap]);

  const topCategories = useMemo(() => {
    const allCats: { name: string; total: number }[] = [];
    groups.forEach((g) => {
      g.categories.forEach((c) => {
        allCats.push({ name: c.name, total: c.total });
      });
    });
    return allCats.sort((a, b) => b.total - a.total).slice(0, 8);
  }, [groups]);

  const biggestCategory = useMemo(() => {
    if (groups.length === 0) return null;
    return groups[0];
  }, [groups]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Building2 className="h-8 w-8 text-orange-500" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Despesas por Departamento</h1>
          <p className="text-muted-foreground">
            Analise de gastos agrupados pelo plano de contas
          </p>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Despesas
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalExpenses)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Categoria com Maior Gasto
            </CardTitle>
            <PieChart className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {biggestCategory ? (
              <>
                <div className="text-lg font-bold truncate">{biggestCategory.name}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(biggestCategory.total)}
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
              N° de Lancamentos
            </CardTitle>
            <Receipt className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      {topCategories.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Top 8 Categorias por Valor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={topCategories}
                layout="vertical"
                margin={{ left: 16, right: 24, top: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) =>
                    new Intl.NumberFormat("pt-BR", {
                      notation: "compact",
                      style: "currency",
                      currency: "BRL",
                    }).format(v)
                  }
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Despesa"]}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {topCategories.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Department Accordion */}
      {groups.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Nenhuma despesa encontrada no periodo</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Breakdown por Grupo</h2>
          {groups.map((group) => {
            const isExpanded = expandedGroups.has(group.id);
            return (
              <Card key={group.id} className="border-0 shadow-sm overflow-hidden">
                <div
                  className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleGroup(group.id)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <FolderOpen className="h-4 w-4 text-orange-500" />
                    <span className="font-semibold">{group.name}</span>
                    <Badge variant="outline">{group.count} lancamentos</Badge>
                  </div>
                  <span className="font-bold text-red-600">
                    {formatCurrency(group.total)}
                  </span>
                </div>
                {isExpanded && (
                  <div className="border-t px-4 pb-4 space-y-0">
                    {group.categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex justify-between text-sm py-1.5 pl-6 border-b border-gray-50 last:border-0"
                      >
                        <span className="text-muted-foreground">{cat.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {cat.count} lanc.
                          </span>
                          <span className="font-medium">{formatCurrency(cat.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Transactions Table */}
      {transactions.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Lancamentos</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllTransactions((v) => !v)}
              >
                {showAllTransactions
                  ? "Ocultar"
                  : `Ver Todos os Lancamentos (${transactions.length})`}
              </Button>
            </div>
          </CardHeader>
          {showAllTransactions && (
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left pb-2 pr-4 font-medium">Data</th>
                      <th className="text-left pb-2 pr-4 font-medium">Categoria</th>
                      <th className="text-left pb-2 pr-4 font-medium">Entidade</th>
                      <th className="text-left pb-2 pr-4 font-medium">Veiculo</th>
                      <th className="text-right pb-2 font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...transactions]
                      .sort((a, b) => {
                        const da = a.due_date || "";
                        const db = b.due_date || "";
                        return db.localeCompare(da);
                      })
                      .map((tx) => {
                        const cat = tx.account_category_id
                          ? accountMap[tx.account_category_id]
                          : null;
                        return (
                          <tr
                            key={tx.id}
                            className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                          >
                            <td className="py-2 pr-4 text-muted-foreground">
                              {tx.due_date
                                ? new Date(tx.due_date).toLocaleDateString("pt-BR")
                                : "-"}
                            </td>
                            <td className="py-2 pr-4">
                              {cat ? cat.name : tx.description || "-"}
                            </td>
                            <td className="py-2 pr-4 text-muted-foreground">
                              {tx.entity_id ? (entityMap[tx.entity_id] || "-") : "-"}
                            </td>
                            <td className="py-2 pr-4 text-muted-foreground">
                              {tx.vehicle_id ? (vehicleMap[tx.vehicle_id] || "-") : "-"}
                            </td>
                            <td className="py-2 text-right font-medium text-red-600">
                              {formatCurrency(Number(tx.amount))}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
