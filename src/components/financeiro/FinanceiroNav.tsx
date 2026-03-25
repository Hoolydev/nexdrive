import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Users,
  Percent,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  Receipt,
  BookOpen,
  BarChart3,
  Package,
  PieChart,
  ArrowLeftRight,
  Wallet,
  Users2,
  UserCheck,
  FileText,
  ChevronRight,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────
   Navigation groups — AUTOFLOW sidebar spec
   ───────────────────────────────────────────────────────────────── */

const GROUPS = [
  {
    label: "Geral",
    items: [
      { title: "Resumo",         url: "/financeiro",                 icon: Wallet  },
      { title: "Lançamentos",    url: "/financeiro/lancamentos",     icon: Receipt },
      { title: "Plano de Contas",url: "/financeiro/plano-contas",    icon: BookOpen},
    ],
  },
  {
    label: "Contas",
    items: [
      { title: "Contas a Pagar",   url: "/financeiro/contas-pagar",    icon: ArrowDownCircle },
      { title: "Contas a Receber", url: "/financeiro/contas-receber",  icon: ArrowUpCircle   },
      { title: "Fluxo de Caixa",   url: "/financeiro/fluxo-caixa",    icon: TrendingUp      },
      { title: "DRE",              url: "/financeiro/dre",             icon: BarChart3       },
    ],
  },
  {
    label: "Equipe",
    items: [
      { title: "Vendedores",  url: "/financeiro/vendedores",  icon: UserCheck },
      { title: "Comissões",   url: "/financeiro/comissoes",   icon: Percent   },
    ],
  },
  {
    label: "Operações",
    items: [
      { title: "Clearing House", url: "/financeiro/clearing-house",  icon: ArrowLeftRight },
      { title: "Copropriedade",  url: "/financeiro/vehicle-owners",  icon: Users2         },
      { title: "Templates",      url: "/financeiro/contrato-templates", icon: FileText    },
    ],
  },
  {
    label: "Relatórios",
    items: [
      { title: "ROI Veículos",   url: "/financeiro/relatorio-roi",           icon: TrendingUp },
      { title: "Giro Estoque",   url: "/financeiro/relatorio-estoque",       icon: Package    },
      { title: "Comissões",      url: "/financeiro/relatorio-comissoes",     icon: Percent    },
      { title: "Investidores",   url: "/financeiro/relatorio-investidores",  icon: Users      },
      { title: "Despesas",       url: "/financeiro/relatorio-despesas",      icon: PieChart   },
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────
   FinanceiroNav — dark sidebar + content outlet
   AUTOFLOW spec: 240px, #0C0E12 bg, active item: #A6DD05 + 3px indicator
   ───────────────────────────────────────────────────────────────── */

export function FinanceiroNav({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex" style={{ minHeight: "calc(100vh - var(--navbar-height))" }}>
      {/* ── Dark Sidebar ── */}
      <aside
        className="hidden md:flex flex-col shrink-0 overflow-y-auto"
        style={{
          width: "var(--sidebar-width)",
          background: "linear-gradient(180deg, #0C0E12 0%, #1a1f2e 100%)",
        }}
      >
        {/* Module header */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-[8px] bg-[#A6DD05] flex items-center justify-center">
              <Wallet className="h-4 w-4 text-[#213201]" />
            </div>
            <span
              className="text-white font-semibold text-sm"
              style={{ fontFamily: "var(--font-ui)" }}
            >
              Financeiro
            </span>
          </div>
        </div>

        <div className="h-px bg-white/10 mx-5" />

        {/* Nav groups */}
        <nav className="flex-1 px-3 py-4 space-y-5">
          {GROUPS.map((group) => (
            <div key={group.label}>
              <p
                className="px-3 mb-2 uppercase text-[11px] font-semibold tracking-widest"
                style={{
                  fontFamily: "var(--font-ui)",
                  color: "#94A3B8",
                }}
              >
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    end={item.url === "/financeiro"}
                    className={({ isActive }) =>
                      cn(
                        "relative flex items-center gap-3 px-3 py-2 rounded-[14px] text-sm transition-all duration-150 group",
                        isActive
                          ? "bg-[#A6DD05] text-[#213201] font-medium"
                          : "text-white/55 hover:text-white hover:bg-white/10"
                      )
                    }
                    style={{ fontFamily: "var(--font-ui)" }}
                  >
                    {({ isActive }) => (
                      <>
                        {/* 3px left indicator bar */}
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#E0FF74] rounded-r-full -ml-[1px]" />
                        )}
                        <item.icon
                          className="h-4 w-4 shrink-0"
                          strokeWidth={1.5}
                        />
                        <span className="flex-1 truncate">{item.title}</span>
                        {isActive && (
                          <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 px-4 py-4">
          <p className="text-white/30 text-[11px]" style={{ fontFamily: "var(--font-ui)" }}>
            Módulo Financeiro
          </p>
        </div>
      </aside>

      {/* ── Mobile horizontal nav ── */}
      <div className="md:hidden w-full">
        <nav
          className="flex gap-1 border-b border-[#E8E8F0] px-3 py-2 overflow-x-auto bg-white"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          {GROUPS.flatMap((g) => g.items).map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/financeiro"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-[#A6DD05] text-[#213201]"
                    : "text-[#6B6B8A] hover:bg-[#F8FAFC] hover:text-[#1A1A2E]"
                )
              }
              style={{ fontFamily: "var(--font-ui)" }}
            >
              <item.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {item.title}
            </NavLink>
          ))}
        </nav>
        {children && (
          <div className="p-6 bg-[#F8FAFC]">{children}</div>
        )}
      </div>

      {/* ── Desktop content ── */}
      {children && (
        <main
          className="flex-1 hidden md:block overflow-auto bg-[#F8FAFC]"
          style={{ padding: "var(--space-xl)" }}
        >
          {children}
        </main>
      )}
    </div>
  );
}
