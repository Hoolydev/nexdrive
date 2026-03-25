import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getEffectiveUserId } from "@/lib/getEffectiveUserId";
import type { Entity, EntityRole } from "@/integrations/supabase/types-prd";
import { ENTITY_ROLE_LABELS } from "@/integrations/supabase/types-prd";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type RoleFilter = "all" | EntityRole;

const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "client", label: "Clientes" },
  { value: "supplier", label: "Fornecedores" },
  { value: "seller", label: "Vendedores" },
  { value: "investor", label: "Investidores" },
];

const ROLE_BADGE_STYLES: Record<EntityRole, string> = {
  client: "bg-blue-100 text-blue-700 border-blue-200",
  supplier: "bg-orange-100 text-orange-700 border-orange-200",
  seller: "bg-green-100 text-green-700 border-green-200",
  investor: "bg-purple-100 text-purple-700 border-purple-200",
};

const ROLE_FLAG_KEYS: Record<EntityRole, keyof Entity> = {
  client: "is_client",
  supplier: "is_supplier",
  seller: "is_seller",
  investor: "is_investor",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEntityRoles(entity: Entity): EntityRole[] {
  const roles: EntityRole[] = [];
  if (entity.is_client) roles.push("client");
  if (entity.is_supplier) roles.push("supplier");
  if (entity.is_seller) roles.push("seller");
  if (entity.is_investor) roles.push("investor");
  return roles;
}

function formatCpf(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatCnpj(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function formatPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Entities() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeRoleFilter, setActiveRoleFilter] = useState<RoleFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: entities = [],
    isLoading,
  } = useQuery({
    queryKey: ["entities"],
    queryFn: async () => {
      const effectiveId = await getEffectiveUserId();
      if (!effectiveId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("entities")
        .select("*")
        .eq("user_id", effectiveId)
        .is("deleted_at", null)
        .order("name", { ascending: true });

      if (error) throw error;
      return (data || []) as Entity[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("entities")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      toast.success("Entidade excluída com sucesso!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredEntities = useMemo(() => {
    let list = entities;

    if (activeRoleFilter !== "all") {
      const key = ROLE_FLAG_KEYS[activeRoleFilter];
      list = list.filter((e) => e[key]);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.name?.toLowerCase().includes(q) ||
          e.document_num?.toLowerCase().includes(q) ||
          e.phone?.includes(q) ||
          e.email?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [entities, activeRoleFilter, searchQuery]);

  const handleDelete = useCallback(
    (entity: Entity) => {
      if (!confirm(`Tem certeza que deseja excluir "${entity.name}"?`)) return;
      deleteMutation.mutate(entity.id);
    },
    [deleteMutation],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Carregando entidades...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Cadastro de Entidades
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredEntities.length}{" "}
            {filteredEntities.length === 1 ? "registro" : "registros"}
          </p>
        </div>
        <Button
          onClick={() => navigate("/entities/new")}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Entidade
        </Button>
      </div>

      {/* Role filter pills */}
      <div className="flex flex-wrap gap-2">
        {ROLE_FILTERS.map((rf) => (
          <button
            key={rf.value}
            onClick={() => setActiveRoleFilter(rf.value)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all
              ${
                activeRoleFilter === rf.value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600"
              }
            `}
          >
            {rf.label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, documento, telefone ou e-mail..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 rounded-xl bg-white border-gray-200"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Table card */}
      <Card className="rounded-2xl border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {filteredEntities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Nenhuma entidade encontrada
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {searchQuery
                  ? "Tente ajustar sua busca"
                  : "Clique em \"Nova Entidade\" para começar"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="font-semibold">Nome</TableHead>
                    <TableHead className="font-semibold">CPF/CNPJ</TableHead>
                    <TableHead className="font-semibold">Classificação</TableHead>
                    <TableHead className="font-semibold">Telefone</TableHead>
                    <TableHead className="font-semibold">Cidade</TableHead>
                    <TableHead className="font-semibold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntities.map((entity) => {
                    const roles = getEntityRoles(entity);
                    const docDisplay = entity.document_num
                      ? entity.document_type === "CNPJ"
                        ? formatCnpj(entity.document_num)
                        : formatCpf(entity.document_num)
                      : "—";

                    return (
                      <TableRow
                        key={entity.id}
                        className="hover:bg-gray-50/60 transition-colors"
                      >
                        <TableCell className="font-medium text-gray-900">
                          {entity.name}
                        </TableCell>
                        <TableCell className="text-gray-600 font-mono text-sm">
                          {docDisplay}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {roles.map((role) => (
                              <Badge
                                key={role}
                                variant="outline"
                                className={`text-xs ${ROLE_BADGE_STYLES[role]}`}
                              >
                                {ENTITY_ROLE_LABELS[role]}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {entity.phone ? formatPhone(entity.phone) : "—"}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {entity.city
                            ? `${entity.city}${entity.state ? `/${entity.state}` : ""}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/entities/${entity.id}/edit`)}
                              className="rounded-lg hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(entity)}
                              className="rounded-lg hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
