import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Users, Percent, ArrowDownCircle, ArrowUpCircle, TrendingUp } from "lucide-react";

const navItems = [
  { title: "Resumo", url: "/financeiro", icon: TrendingUp },
  { title: "Vendedores", url: "/financeiro/vendedores", icon: Users },
  { title: "Comissoes", url: "/financeiro/comissoes", icon: Percent },
  { title: "Contas a Pagar", url: "/financeiro/contas-pagar", icon: ArrowDownCircle },
  { title: "Contas a Receber", url: "/financeiro/contas-receber", icon: ArrowUpCircle },
  { title: "Fluxo de Caixa", url: "/financeiro/fluxo-caixa", icon: TrendingUp },
];

export function FinanceiroNav() {
  return (
    <nav className="flex gap-1 border-b pb-2 mb-6 overflow-x-auto">
      {navItems.map((item) => (
        <NavLink
          key={item.url}
          to={item.url}
          end
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )
          }
        >
          <item.icon className="h-4 w-4" />
          {item.title}
        </NavLink>
      ))}
    </nav>
  );
}
