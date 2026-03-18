import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import Messages from "./pages/Messages";
import Reports from "./pages/Reports";
import Contract from "./pages/Contract";
import Auth from "./pages/Auth";
import AIStore from "./pages/AIStore";
import AIAgents from "./pages/AIAgents";
import Financeiro from "./pages/financeiro/Financeiro";
import Vendedores from "./pages/financeiro/Vendedores";
import Comissoes from "./pages/financeiro/Comissoes";
import ContasPagar from "./pages/financeiro/ContasPagar";
import ContasReceber from "./pages/financeiro/ContasReceber";
import FluxoCaixa from "./pages/financeiro/FluxoCaixa";
import StoreSettingsPage from "./pages/StoreSettings";
import StorePage from "./pages/loja/StorePage";
import StoreVehicleDetail from "./pages/loja/StoreVehicleDetail";
import StoreLayout from "./components/loja/StoreLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/loja/:slug" element={<StoreLayout />}>
            <Route index element={<StorePage />} />
            <Route path="veiculo/:vehicleId" element={<StoreVehicleDetail />} />
          </Route>
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <SidebarProvider>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <main className="flex-1">
                      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4">
                        <SidebarTrigger />
                      </header>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/customers" element={<Customers />} />
                        <Route path="/messages" element={<Messages />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/contract" element={<Contract />} />
                        <Route path="/ai-store" element={<AIStore />} />
                        <Route path="/ai-agents" element={<AIAgents />} />
                        <Route path="/financeiro" element={<Financeiro />} />
                        <Route path="/financeiro/vendedores" element={<Vendedores />} />
                        <Route path="/financeiro/comissoes" element={<Comissoes />} />
                        <Route path="/financeiro/contas-pagar" element={<ContasPagar />} />
                        <Route path="/financeiro/contas-receber" element={<ContasReceber />} />
                        <Route path="/financeiro/fluxo-caixa" element={<FluxoCaixa />} />
                        <Route path="/minha-loja" element={<StoreSettingsPage />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </main>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
