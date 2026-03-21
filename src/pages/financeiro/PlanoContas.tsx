import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Leaf,
  FolderTree,
  Database,
} from "lucide-react";
import type { ChartOfAccount } from "@/integrations/supabase/types-prd";

interface TreeNode extends ChartOfAccount {
  children: TreeNode[];
}

function buildTree(accounts: ChartOfAccount[]): { income: TreeNode[]; expense: TreeNode[] } {
  const map = new Map<string, TreeNode>();
  accounts.forEach((a) => map.set(a.id, { ...a, children: [] }));

  const incomeRoots: TreeNode[] = [];
  const expenseRoots: TreeNode[] = [];

  accounts.forEach((a) => {
    const node = map.get(a.id)!;
    if (a.parent_id && map.has(a.parent_id)) {
      map.get(a.parent_id)!.children.push(node);
    } else if (a.level === 1) {
      if (a.type === "income") incomeRoots.push(node);
      else expenseRoots.push(node);
    }
  });

  const sortByCode = (a: TreeNode, b: TreeNode) => a.code.localeCompare(b.code);
  const sortRecursive = (nodes: TreeNode[]) => {
    nodes.sort(sortByCode);
    nodes.forEach((n) => sortRecursive(n.children));
  };
  sortRecursive(incomeRoots);
  sortRecursive(expenseRoots);

  return { income: incomeRoots, expense: expenseRoots };
}

function TreeNodeRow({
  node,
  expanded,
  onToggle,
}: {
  node: TreeNode;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children.length > 0;
  const indent = (node.level - 1) * 28;

  return (
    <>
      <div
        className={`flex items-center gap-2 py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors group ${
          node.level === 1 ? "font-semibold text-base" : node.level === 2 ? "font-medium text-sm" : "text-sm"
        }`}
        style={{ paddingLeft: `${12 + indent}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.id)}
            className="p-0.5 rounded hover:bg-gray-200 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>
        ) : (
          <Leaf className="h-4 w-4 text-gray-300 ml-0.5" />
        )}

        <span className="text-gray-400 text-xs font-mono min-w-[50px]">{node.code}</span>

        <span className="flex-1">{node.name}</span>

        {node.dre_mapping_key && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-gray-400 border-gray-200">
            {node.dre_mapping_key}
          </Badge>
        )}

        {!node.active && (
          <Badge variant="secondary" className="text-[10px]">
            Inativo
          </Badge>
        )}
      </div>

      {isExpanded &&
        node.children.map((child) => (
          <TreeNodeRow key={child.id} node={child} expanded={expanded} onToggle={onToggle} />
        ))}
    </>
  );
}

export default function PlanoContas() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    parent_id: "",
    type: "expense" as "income" | "expense",
    dre_mapping_key: "",
  });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["chart_of_accounts"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("chart_of_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("code");
      if (error) throw error;
      return (data || []) as ChartOfAccount[];
    },
  });

  const tree = buildTree(accounts);
  const level2Accounts = accounts.filter((a) => a.level === 2);

  const seedMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("seed_chart_of_accounts");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plano de contas padrao inicializado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["chart_of_accounts"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao inicializar plano de contas");
    },
  });

  const addCategoryMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      code: string;
      parent_id: string;
      type: "income" | "expense";
      dre_mapping_key: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Nao autenticado");

      const { error } = await (supabase as any).from("chart_of_accounts").insert({
        user_id: user.id,
        name: payload.name.trim(),
        code: payload.code.trim(),
        level: 3,
        parent_id: payload.parent_id,
        type: payload.type,
        dre_mapping_key: payload.dre_mapping_key.trim() || null,
        is_system: false,
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoria adicionada");
      queryClient.invalidateQueries({ queryKey: ["chart_of_accounts"] });
      setSheetOpen(false);
      setForm({ name: "", code: "", parent_id: "", type: "expense", dre_mapping_key: "" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao adicionar categoria");
    },
  });

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = accounts.filter((a) => a.level < 3).map((a) => a.id);
    setExpanded(new Set(allIds));
  };

  const collapseAll = () => {
    setExpanded(new Set());
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.code.trim() || !form.parent_id) {
      toast.error("Preencha nome, codigo e grupo pai");
      return;
    }
    addCategoryMutation.mutate(form);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Plano de Contas</h1>
          <p className="text-muted-foreground">Estrutura de categorias financeiras (DRE)</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expandir Tudo
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Recolher Tudo
          </Button>
        </div>
        <div className="flex gap-2">
          {accounts.length === 0 && (
            <Button
              variant="outline"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              <Database className="h-4 w-4 mr-2" />
              {seedMutation.isPending ? "Inicializando..." : "Inicializar Plano Padrao"}
            </Button>
          )}
          <Button onClick={() => setSheetOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Categoria
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : accounts.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <FolderTree className="h-12 w-12 text-gray-300" />
            <p className="text-muted-foreground text-center">
              Nenhuma conta cadastrada. Clique em "Inicializar Plano Padrao" para criar a estrutura basica.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income Side */}
          <Card className="rounded-2xl border-green-100 bg-green-50/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <h2 className="text-lg font-semibold text-green-800">Receitas</h2>
                <Badge className="bg-green-100 text-green-700 border-green-200" variant="outline">
                  {accounts.filter((a) => a.type === "income").length} contas
                </Badge>
              </div>
              <div className="space-y-0.5">
                {tree.income.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma receita cadastrada</p>
                ) : (
                  tree.income.map((node) => (
                    <TreeNodeRow key={node.id} node={node} expanded={expanded} onToggle={toggleExpand} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Expense Side */}
          <Card className="rounded-2xl border-red-100 bg-red-50/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <h2 className="text-lg font-semibold text-red-800">Despesas</h2>
                <Badge className="bg-red-100 text-red-700 border-red-200" variant="outline">
                  {accounts.filter((a) => a.type === "expense").length} contas
                </Badge>
              </div>
              <div className="space-y-0.5">
                {tree.expense.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma despesa cadastrada</p>
                ) : (
                  tree.expense.map((node) => (
                    <TreeNodeRow key={node.id} node={node} expanded={expanded} onToggle={toggleExpand} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Category Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Adicionar Categoria</SheetTitle>
            <SheetDescription>Cadastre uma nova categoria de nivel 3 vinculada a um grupo existente.</SheetDescription>
          </SheetHeader>
          <div className="space-y-5 mt-6">
            <div>
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v: "income" | "expense") => setForm({ ...form, type: v, parent_id: "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Grupo Pai (Nivel 2) *</Label>
              <Select value={form.parent_id} onValueChange={(v) => setForm({ ...form, parent_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o grupo..." />
                </SelectTrigger>
                <SelectContent>
                  {level2Accounts
                    .filter((a) => a.type === form.type)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Codigo *</Label>
              <Input
                placeholder="Ex: 1.1.3"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>

            <div>
              <Label>Nome *</Label>
              <Input
                placeholder="Ex: Receita de Servicos"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Chave DRE (dre_mapping_key)</Label>
              <Input
                placeholder="Ex: revenue_services"
                value={form.dre_mapping_key}
                onChange={(e) => setForm({ ...form, dre_mapping_key: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Identificador usado para agrupar no DRE. Deixe vazio se nao aplicavel.
              </p>
            </div>

            <Button className="w-full" onClick={handleSave} disabled={addCategoryMutation.isPending}>
              {addCategoryMutation.isPending ? "Salvando..." : "Salvar Categoria"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
