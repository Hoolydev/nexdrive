import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Package,
  Users,
  Kanban,
  Wallet,
  Receipt,
  BookOpen,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  BarChart3,
  Car,
  Percent,
  UserCheck,
  FileSignature,
  FileText,
  Store,
  Bot,
  BrainCircuit,
  ChevronDown,
  LogOut,
  PieChart,
  ArrowLeftRight,
  Users2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

// ---------------------------------------------------------------------------
// Flat top-level items
// ---------------------------------------------------------------------------

const TOP_ITEMS = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Veículos", url: "/products", icon: Car },
  { title: "Entidades", url: "/entities", icon: Users },
  { title: "CRM Pipeline", url: "/crm", icon: Kanban },
];

const BOTTOM_ITEMS = [
  { title: "Vendedores", url: "/financeiro/vendedores", icon: UserCheck },
  { title: "Minha Loja", url: "/minha-loja", icon: Store },
  { title: "Assistente IA", url: "/ai-store", icon: Bot },
  { title: "Agentes IA", url: "/ai-agents", icon: BrainCircuit },
];

// ---------------------------------------------------------------------------
// Collapsible groups
// ---------------------------------------------------------------------------

const FINANCEIRO_ITEMS = [
  { title: "Resumo", url: "/financeiro", icon: Wallet },
  { title: "Lançamentos", url: "/financeiro/lancamentos", icon: Receipt },
  { title: "Plano de Contas", url: "/financeiro/plano-contas", icon: BookOpen },
  { title: "Contas a Pagar", url: "/financeiro/contas-pagar", icon: ArrowDownCircle },
  { title: "Contas a Receber", url: "/financeiro/contas-receber", icon: ArrowUpCircle },
  { title: "Fluxo de Caixa", url: "/financeiro/fluxo-caixa", icon: TrendingUp },
  { title: "DRE", url: "/financeiro/dre", icon: BarChart3 },
  { title: "Clearing House (Permuta)", url: "/financeiro/clearing-house", icon: ArrowLeftRight },
  { title: "Copropriedade", url: "/financeiro/vehicle-owners", icon: Users2 },
];

const RELATORIOS_ITEMS = [
  { title: "ROI por Veículo", url: "/financeiro/relatorio-roi", icon: BarChart3 },
  { title: "Giro de Estoque", url: "/financeiro/relatorio-estoque", icon: Package },
  { title: "Comissões", url: "/financeiro/relatorio-comissoes", icon: Percent },
  { title: "Investidores", url: "/financeiro/relatorio-investidores", icon: TrendingUp },
  { title: "Despesas Departamento", url: "/financeiro/relatorio-despesas", icon: PieChart },
];

const CONTRATOS_ITEMS = [
  { title: "Contratos", url: "/contract", icon: FileSignature },
  { title: "Templates", url: "/financeiro/contrato-templates", icon: FileText },
];

// ---------------------------------------------------------------------------
// Sub-item link
// ---------------------------------------------------------------------------

function SubItem({
  url,
  title,
  icon: Icon,
}: {
  url: string;
  title: string;
  icon: React.ElementType;
}) {
  return (
    <NavLink
      to={url}
      end
      className={({ isActive }) =>
        [
          "flex items-center gap-2 pl-4 pr-3 py-1.5 rounded-lg text-sm transition-colors w-full",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        ].join(" ")
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{title}</span>
    </NavLink>
  );
}

// ---------------------------------------------------------------------------
// Collapsible group
// ---------------------------------------------------------------------------

function CollapsibleGroup({
  groupKey,
  label,
  icon: GroupIcon,
  items,
  openGroups,
  setOpenGroups,
  sidebarOpen,
}: {
  groupKey: string;
  label: string;
  icon: React.ElementType;
  items: { title: string; url: string; icon: React.ElementType }[];
  openGroups: string[];
  setOpenGroups: React.Dispatch<React.SetStateAction<string[]>>;
  sidebarOpen: boolean;
}) {
  const location = useLocation();
  const isOpen = openGroups.includes(groupKey);
  const isChildActive = items.some((item) =>
    location.pathname.startsWith(item.url)
  );

  const toggle = () => {
    setOpenGroups((prev) =>
      prev.includes(groupKey)
        ? prev.filter((k) => k !== groupKey)
        : [...prev, groupKey]
    );
  };

  if (!sidebarOpen) {
    // Icon-only mode: show just the group icon, no submenu
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          className={isChildActive ? "text-primary" : ""}
          tooltip={label}
        >
          <GroupIcon className="h-4 w-4" />
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={toggle}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            className={[
              "w-full flex items-center justify-between",
              isChildActive && !isOpen
                ? "text-primary font-medium"
                : "",
            ].join(" ")}
          >
            <span className="flex items-center gap-2">
              <GroupIcon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </span>
            <ChevronDown
              className={[
                "h-4 w-4 shrink-0 transition-transform duration-200",
                isOpen ? "rotate-180" : "",
              ].join(" ")}
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-1 space-y-0.5 pb-1">
            {items.map((item) => (
              <SubItem
                key={item.url}
                url={item.url}
                title={item.title}
                icon={item.icon}
              />
            ))}
          </div>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AppSidebar() {
  const { open } = useSidebar();
  const [openGroups, setOpenGroups] = useState<string[]>(["financeiro"]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair");
    } else {
      toast.success("Logout realizado com sucesso");
    }
  };

  return (
    <Sidebar collapsible="icon">
      {/* Logo area */}
      <div className="flex items-center px-4 py-3 border-b border-sidebar-border">
        <img
          src="/nexdrive-logo.png"
          alt="NexDrive"
          className="h-10 w-auto object-contain"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        {open && (
          <span className="ml-2 font-semibold text-sidebar-foreground truncate">
            NexDrive
          </span>
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Top-level flat items */}
              {TOP_ITEMS.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        isActive ? "text-primary font-medium" : ""
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Financeiro collapsible */}
              <CollapsibleGroup
                groupKey="financeiro"
                label="Financeiro"
                icon={Wallet}
                items={FINANCEIRO_ITEMS}
                openGroups={openGroups}
                setOpenGroups={setOpenGroups}
                sidebarOpen={open}
              />

              {/* Relatórios collapsible */}
              <CollapsibleGroup
                groupKey="relatorios"
                label="Relatórios"
                icon={BarChart3}
                items={RELATORIOS_ITEMS}
                openGroups={openGroups}
                setOpenGroups={setOpenGroups}
                sidebarOpen={open}
              />

              {/* Vendedores flat item */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Vendedores">
                  <NavLink
                    to="/financeiro/vendedores"
                    end
                    className={({ isActive }) =>
                      isActive ? "text-primary font-medium" : ""
                    }
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>Vendedores</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Contratos collapsible */}
              <CollapsibleGroup
                groupKey="contratos"
                label="Contratos"
                icon={FileSignature}
                items={CONTRATOS_ITEMS}
                openGroups={openGroups}
                setOpenGroups={setOpenGroups}
                sidebarOpen={open}
              />

              {/* Bottom flat items */}
              {BOTTOM_ITEMS.filter(
                (item) => item.url !== "/financeiro/vendedores"
              ).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        isActive ? "text-primary font-medium" : ""
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Sair">
              <LogOut className="h-4 w-4" />
              {open && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
