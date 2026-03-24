import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, UserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Car,
  Users,
  Kanban,
  Wallet,
  FileSignature,
  Store,
  Bot,
  BrainCircuit,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Bell,
  FileText,
  Search,
  Settings,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────────── */

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  roles?: UserRole[];
}

interface DropdownGroup {
  title: string;
  icon: React.ElementType;
  items: NavItem[];
  roles?: UserRole[];
}

/* ─────────────────────────────────────────────────────────────────
   Navigation data
   ───────────────────────────────────────────────────────────────── */

const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Veículos",  url: "/products",  icon: Car            },
  { title: "Entidades", url: "/entities",  icon: Users          },
  { title: "CRM",       url: "/crm",       icon: Kanban         },
];

const DROPDOWN_GROUPS: DropdownGroup[] = [
  {
    title: "Financeiro",
    icon: Wallet,
    items: [{ title: "Painel Financeiro", url: "/financeiro", icon: Wallet }],
    roles: ["owner"],
  },
  {
    title: "Contratos",
    icon: FileSignature,
    items: [
      { title: "Contratos",   url: "/contract",                    icon: FileSignature },
      { title: "Templates",   url: "/financeiro/contrato-templates", icon: FileText    },
    ],
    roles: ["owner", "manager"],
  },
  {
    title: "IA",
    icon: BrainCircuit,
    items: [
      { title: "Assistente IA", url: "/ai-store",  icon: Bot         },
      { title: "Agentes IA",    url: "/ai-agents", icon: BrainCircuit },
    ],
    roles: ["owner"],
  },
];

const SETTINGS_GROUP: DropdownGroup = {
  title: "Configurações",
  icon: Settings,
  items: [
    { title: "Gestão de Equipe",       url: "/settings/team", icon: Users    },
    { title: "Configurações da Loja",  url: "/minha-loja",    icon: Store    },
  ],
  roles: ["owner"],
};

/* ─────────────────────────────────────────────────────────────────
   NavLink item — AUTOFLOW horizontal nav style
   ───────────────────────────────────────────────────────────────── */

function TopNavLink({ item }: { item: NavItem }) {
  const location = useLocation();
  const isActive =
    location.pathname === item.url ||
    (item.url !== "/dashboard" && location.pathname.startsWith(item.url));

  return (
    <NavLink
      to={item.url}
      className={[
        "relative flex items-center gap-1.5 px-1 py-1 text-sm transition-colors duration-150 whitespace-nowrap",
        "font-ui font-medium",
        isActive
          ? "text-[#2563EB]"
          : "text-[#6B6B8A] hover:text-[#1A1A2E]",
      ].join(" ")}
      style={{ fontFamily: "var(--font-ui)" }}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {item.title}
      {/* Active underline */}
      {isActive && (
        <span className="absolute -bottom-[17px] left-0 right-0 h-0.5 rounded-full bg-[#2563EB]" />
      )}
    </NavLink>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Dropdown group
   ───────────────────────────────────────────────────────────────── */

function TopNavDropdown({ group }: { group: DropdownGroup }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const isChildActive = group.items.some(
    (i) => location.pathname === i.url || location.pathname.startsWith(i.url + "/")
  );
  const isSingle = group.items.length === 1;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Single-item → just a direct link
  if (isSingle) {
    return <TopNavLink item={{ ...group.items[0], title: group.title, icon: group.icon }} />;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={[
          "relative flex items-center gap-1.5 px-1 py-1 text-sm transition-colors duration-150 whitespace-nowrap font-medium",
          isChildActive ? "text-[#2563EB]" : "text-[#6B6B8A] hover:text-[#1A1A2E]",
        ].join(" ")}
        style={{ fontFamily: "var(--font-ui)" }}
      >
        <group.icon className="h-4 w-4 shrink-0" />
        {group.title}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
        {isChildActive && (
          <span className="absolute -bottom-[17px] left-0 right-0 h-0.5 rounded-full bg-[#2563EB]" />
        )}
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+18px)] left-1/2 -translate-x-1/2 w-52 bg-white border border-[#E8E8F0] rounded-[14px] shadow-md py-2 z-50 animate-slide-up"
          style={{ boxShadow: "var(--shadow-md)" }}
        >
          {group.items.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                [
                  "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors duration-150",
                  isActive
                    ? "text-[#2563EB] font-medium bg-[rgba(105,80,240,0.06)]"
                    : "text-[#6B6B8A] hover:text-[#1A1A2E] hover:bg-[#F8FAFC]",
                ].join(" ")
              }
              style={{ fontFamily: "var(--font-ui)" }}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.title}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Mobile drawer
   ───────────────────────────────────────────────────────────────── */

function MobileDrawer({
  open,
  onClose,
  onLogout,
  userRole,
}: {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  userRole: UserRole;
}) {
  const filteredDropdowns = DROPDOWN_GROUPS.filter(
    (g) => !g.roles || g.roles.includes(userRole)
  );
  const settingsItems = (!SETTINGS_GROUP.roles || SETTINGS_GROUP.roles.includes(userRole))
    ? SETTINGS_GROUP.items : [];
  const allLinks: NavItem[] = [
    ...NAV_ITEMS,
    ...filteredDropdowns.flatMap((g) => g.items),
    ...settingsItems,
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-[rgba(10,8,20,0.5)]"
        onClick={onClose}
        style={{ backdropFilter: "blur(4px)" }}
      />
      {/* Drawer */}
      <div
        className="absolute top-0 left-0 bottom-0 w-72 bg-white flex flex-col animate-slide-up"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-[#E8E8F0]">
          <div className="flex items-center gap-2">
            <img 
              src="/nexdrive-logo.png" 
              alt="NexDrive Logo" 
              className="h-8 w-auto object-contain"
            />
            <span className="font-semibold text-base text-[#1A1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              NexDrive
            </span>
          </div>
          <button onClick={onClose} className="p-2 rounded-[10px] hover:bg-[#F8FAFC] text-[#6B6B8A] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {allLinks.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end
              onClick={onClose}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 px-4 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-[rgba(105,80,240,0.08)] text-[#2563EB]"
                    : "text-[#6B6B8A] hover:bg-[#F8FAFC] hover:text-[#1A1A2E]",
                ].join(" ")
              }
              style={{ fontFamily: "var(--font-ui)" }}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.title}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[#E8E8F0] px-3 py-4">
          <button
            onClick={() => { onLogout(); onClose(); }}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-[10px] text-sm font-medium text-[#EF4444] hover:bg-[#FEE2E2] transition-colors"
            style={{ fontFamily: "var(--font-ui)" }}
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Main Navbar — AUTOFLOW spec: 64px, white, border-bottom #E8E8F0
   ───────────────────────────────────────────────────────────────── */

export function AppNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { role } = useUserRole();

  const filteredDropdowns = DROPDOWN_GROUPS.filter(
    (g) => !g.roles || g.roles.includes(role)
  );
  const showSettings = !SETTINGS_GROUP.roles || SETTINGS_GROUP.roles.includes(role);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair");
    } else {
      toast.success("Logout realizado");
      navigate("/auth");
    }
  };

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full bg-white border-b border-[#E8E8F0]"
        style={{ height: "var(--navbar-height)", boxShadow: "var(--shadow-xs)" }}
      >
        <div
          className="flex items-center gap-6 h-full px-6"
          style={{ maxWidth: "1440px", margin: "0 auto" }}
        >
          {/* Logo */}
          <NavLink to="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <img 
              src="/nexdrive-logo.png" 
              alt="NexDrive Logo" 
              className="h-9 w-auto object-contain"
            />
            <span
              className="font-semibold text-lg text-brand-gradient hidden sm:block"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
            >
              NexDrive
            </span>
          </NavLink>

          {/* Divider */}
          <div className="hidden lg:block w-px h-6 bg-[#E8E8F0] shrink-0" />

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-5 flex-1 border-b-0 relative">
            {NAV_ITEMS.map((item) => (
              <TopNavLink key={item.url} item={item} />
            ))}
            {filteredDropdowns.map((group) => (
              <TopNavDropdown key={group.title} group={group} />
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Search (desktop) */}
            <div className="hidden xl:flex items-center gap-2 h-9 px-3 rounded-[10px] bg-[#F8FAFC] border border-transparent focus-within:border-[#2563EB] focus-within:shadow-[0_0_0_3px_rgba(105,80,240,0.12)] transition-all">
              <Search className="h-4 w-4 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Buscar..."
                className="bg-transparent text-sm outline-none w-36 text-[#1A1A2E] placeholder:text-[#94A3B8]"
                style={{ fontFamily: "var(--font-body)" }}
              />
            </div>

            {/* Settings dropdown (owner only) */}
            {showSettings && (
              <TopNavDropdown group={SETTINGS_GROUP} />
            )}

            {/* Notification bell */}
            <button className="h-9 w-9 flex items-center justify-center rounded-[10px] bg-[#F8FAFC] text-[#6B6B8A] hover:text-[#2563EB] hover:bg-[rgba(105,80,240,0.08)] transition-colors">
              <Bell className="h-4.5 w-4.5 h-[18px] w-[18px]" />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="hidden lg:flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-sm font-medium text-[#6B6B8A] hover:text-[#EF4444] hover:bg-[#FEE2E2] transition-colors"
              style={{ fontFamily: "var(--font-ui)" }}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden xl:inline">Sair</span>
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden h-9 w-9 flex items-center justify-center rounded-[10px] bg-[#F8FAFC] text-[#6B6B8A]"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} onLogout={handleLogout} userRole={role} />
    </>
  );
}
