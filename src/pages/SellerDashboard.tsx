import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Kanban,
  Users,
  TrendingUp,
  Clock,
  Target,
  ArrowUpRight,
  Car,
} from "lucide-react";

interface CrmStats {
  totalLeads: number;
  wonDeals: number;
  pendingDeals: number;
  totalVehicles: number;
}

export default function SellerDashboard() {
  const { displayName, ownerId } = useUserRole();
  const [stats, setStats] = useState<CrmStats>({
    totalLeads: 0,
    wonDeals: 0,
    pendingDeals: 0,
    totalVehicles: 0,
  });
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const dataOwnerId = ownerId || user.id;

        // Fetch CRM deals count
        const { data: deals } = await (supabase as any)
          .from("crm_deals")
          .select("id, status")
          .eq("user_id", dataOwnerId);

        const totalLeads = deals?.length || 0;
        const wonDeals = deals?.filter((d: any) => d.status === "won").length || 0;
        const pendingDeals = deals?.filter((d: any) => !["won", "lost"].includes(d.status)).length || 0;

        // Fetch vehicles count
        const { count: vehicleCount } = await (supabase as any)
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("user_id", dataOwnerId);

        setStats({
          totalLeads,
          wonDeals,
          pendingDeals,
          totalVehicles: vehicleCount || 0,
        });

        // Recent leads
        const { data: recent } = await (supabase as any)
          .from("crm_deals")
          .select("id, title, status, created_at")
          .eq("user_id", dataOwnerId)
          .order("created_at", { ascending: false })
          .limit(5);

        setRecentLeads(recent || []);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ownerId]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    new: { label: "Novo", color: "bg-[#DBEAFE] text-[#2563EB]" },
    contacted: { label: "Contactado", color: "bg-[#FEF3C7] text-[#D97706]" },
    negotiating: { label: "Negociando", color: "bg-[#E0E7FF] text-[#4F46E5]" },
    won: { label: "Fechado ✓", color: "bg-[#D1FAE5] text-[#059669]" },
    lost: { label: "Perdido", color: "bg-[#FEE2E2] text-[#EF4444]" },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Greeting */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold text-[#1A1A2E]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {greeting()}, {displayName?.split(" ")[0] || "Vendedor"} 👋
        </h1>
        <p className="text-sm text-[#6B6B8A] mt-1" style={{ fontFamily: "var(--font-ui)" }}>
          Aqui está o resumo do seu CRM
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total de Leads",
            value: stats.totalLeads,
            icon: Users,
            color: "text-[#2563EB]",
            bg: "bg-[#DBEAFE]",
          },
          {
            label: "Vendas Fechadas",
            value: stats.wonDeals,
            icon: Target,
            color: "text-[#059669]",
            bg: "bg-[#D1FAE5]",
          },
          {
            label: "Em Negociação",
            value: stats.pendingDeals,
            icon: TrendingUp,
            color: "text-[#D97706]",
            bg: "bg-[#FEF3C7]",
          },
          {
            label: "Veículos no Estoque",
            value: stats.totalVehicles,
            icon: Car,
            color: "text-[#7C3AED]",
            bg: "bg-[#EDE9FE]",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-[14px] border border-[#E8E8F0] p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-[10px] ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-2xl font-black text-[#1A1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              {stat.value}
            </p>
            <p className="text-xs text-[#94A3B8] font-medium mt-1" style={{ fontFamily: "var(--font-ui)" }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Leads */}
      <div className="bg-white rounded-[14px] border border-[#E8E8F0] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-[#1A1A2E] flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
            <Kanban className="w-5 h-5 text-[#2563EB]" />
            Leads Recentes
          </h2>
          <a
            href="/crm"
            className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1"
          >
            Ver CRM <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>

        {recentLeads.length > 0 ? (
          <div className="space-y-3">
            {recentLeads.map((lead) => {
              const statusInfo = STATUS_MAP[lead.status] || STATUS_MAP.new;
              return (
                <div
                  key={lead.id}
                  className="flex items-center justify-between py-3 border-b border-[#F1F5F9] last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-xs font-bold text-[#6B6B8A]">
                      {(lead.title || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A2E]">{lead.title || "Sem título"}</p>
                      <p className="text-xs text-[#94A3B8] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-[#94A3B8]">
            <Kanban className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum lead cadastrado ainda</p>
          </div>
        )}
      </div>
    </div>
  );
}
