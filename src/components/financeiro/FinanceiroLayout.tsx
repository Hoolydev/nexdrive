import { Outlet } from "react-router-dom";
import { FinanceiroNav } from "./FinanceiroNav";

/**
 * Layout wrapper for all /financeiro/* routes.
 * Renders the vertical sidebar (FinanceiroNav) with <Outlet /> as the content.
 */
export function FinanceiroLayout() {
  return (
    <FinanceiroNav>
      <Outlet />
    </FinanceiroNav>
  );
}
