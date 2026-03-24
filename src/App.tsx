import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppNavbar } from "@/components/AppNavbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGuard } from "@/components/RoleGuard";
import { FinanceiroLayout } from "@/components/financeiro/FinanceiroLayout";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const Customers = lazy(() => import("./pages/Customers"));
const Messages = lazy(() => import("./pages/Messages"));
const Reports = lazy(() => import("./pages/Reports"));
const Contract = lazy(() => import("./pages/Contract"));
const Auth = lazy(() => import("./pages/Auth"));
const AIStore = lazy(() => import("./pages/AIStore"));
const AIAgents = lazy(() => import("./pages/AIAgents"));
const Financeiro = lazy(() => import("./pages/financeiro/Financeiro"));
const Vendedores = lazy(() => import("./pages/financeiro/Vendedores"));
const Comissoes = lazy(() => import("./pages/financeiro/Comissoes"));
const ContasPagar = lazy(() => import("./pages/financeiro/ContasPagar"));
const ContasReceber = lazy(() => import("./pages/financeiro/ContasReceber"));
const FluxoCaixa = lazy(() => import("./pages/financeiro/FluxoCaixa"));
const PlanoContas = lazy(() => import("./pages/financeiro/PlanoContas"));
const Lancamentos = lazy(() => import("./pages/financeiro/Lancamentos"));
const RelatorioROI = lazy(() => import("./pages/financeiro/RelatorioROI"));
const RelatorioEstoque = lazy(() => import("./pages/financeiro/RelatorioEstoque"));
const RelatorioComissoes = lazy(() => import("./pages/financeiro/RelatorioComissoes"));
const RelatorioInvestidores = lazy(() => import("./pages/financeiro/RelatorioInvestidores"));
const DRE = lazy(() => import("./pages/financeiro/DRE"));
const RelatorioDespesas = lazy(() => import("./pages/financeiro/RelatorioDespesas"));
const StoreSettingsPage = lazy(() => import("./pages/StoreSettings"));
const StorePage = lazy(() => import("./pages/loja/StorePage"));
const StoreVehicleDetail = lazy(() => import("./pages/loja/StoreVehicleDetail"));
const StoreLayout = lazy(() => import("./components/loja/StoreLayout"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Entities = lazy(() => import("./pages/Entities"));
const EntityForm = lazy(() => import("./pages/EntityForm"));
const LancamentoForm = lazy(() => import("./pages/financeiro/LancamentoForm"));
const CrmKanban = lazy(() => import("./pages/CrmKanban"));
const ContratoTemplates = lazy(() => import("./pages/financeiro/ContratoTemplates"));
const ClearingHouse = lazy(() => import("./pages/financeiro/ClearingHouse"));
const VehicleOwners = lazy(() => import("./pages/financeiro/VehicleOwners"));
const VitrinePage = lazy(() => import("./pages/loja/VitrinePage"));
const MarketplacePage = lazy(() => import("./pages/loja/MarketplacePage"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const TeamManagement = lazy(() => import("./pages/settings/TeamManagement"));
const SellerDashboard = lazy(() => import("./pages/SellerDashboard"));
const DashboardRouter = lazy(() => import("./components/DashboardRouter"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const DomainRouter = ({ children }: { children: React.ReactNode }) => {
  const [isCustomDomain, setIsCustomDomain] = useState(false);
  const [loadingDomain, setLoadingDomain] = useState(true);

  useEffect(() => {
    const hostname = window.location.hostname;
    // Check if it's a known non-custom domain
    const isPlatform = hostname === "localhost" || hostname.includes("nexdrive") || hostname.includes("vercel.app");
    
    if (!isPlatform) {
      setIsCustomDomain(true);
    }
    setLoadingDomain(false);
  }, []);

  if (loadingDomain) return <Loading />;

  // If we are on a custom domain, root hits the public store layout
  if (isCustomDomain) {
    return (
      <Routes>
        <Route path="/" element={<StoreLayout />}>
          <Route index element={<StorePage />} />
          <Route path="veiculo/:vehicleId" element={<StoreVehicleDetail />} />
        </Route>
        <Route path="*" element={<StoreLayout />}>
          <Route index element={<NotFound />} />
        </Route>
      </Routes>
    );
  }

  // Otherwise, render standard platform routes
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <DomainRouter>
            <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/v/:vehicleId" element={<VitrinePage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/loja/:slug" element={<StoreLayout />}>
              <Route index element={<StorePage />} />
              <Route path="veiculo/:vehicleId" element={<StoreVehicleDetail />} />
            </Route>
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <div className="min-h-screen w-full flex flex-col">
                    <AppNavbar />
                    <main className="flex-1">
                      <Suspense fallback={<Loading />}>
                        <Routes>
                          <Route path="/dashboard" element={<DashboardRouter />} />
                          <Route path="/products" element={<Products />} />
                          <Route path="/customers" element={<Customers />} />
                          <Route path="/entities" element={<Entities />} />
                          <Route path="/entities/new" element={<EntityForm />} />
                          <Route path="/entities/:id/edit" element={<EntityForm />} />
                          <Route path="/crm" element={<CrmKanban />} />
                          <Route path="/messages" element={<RoleGuard allowedRoles={["owner"]}><Messages /></RoleGuard>} />
                          <Route path="/reports" element={<RoleGuard allowedRoles={["owner"]}><Reports /></RoleGuard>} />
                          <Route path="/contract" element={<RoleGuard allowedRoles={["owner", "manager"]}><Contract /></RoleGuard>} />
                          <Route path="/ai-store" element={<RoleGuard allowedRoles={["owner"]}><AIStore /></RoleGuard>} />
                          <Route path="/ai-agents" element={<RoleGuard allowedRoles={["owner"]}><AIAgents /></RoleGuard>} />
                          <Route path="/financeiro" element={<RoleGuard allowedRoles={["owner"]}><FinanceiroLayout /></RoleGuard>}>
                            <Route index element={<Financeiro />} />
                            <Route path="vendedores" element={<Vendedores />} />
                            <Route path="comissoes" element={<Comissoes />} />
                            <Route path="contas-pagar" element={<ContasPagar />} />
                            <Route path="contas-receber" element={<ContasReceber />} />
                            <Route path="fluxo-caixa" element={<FluxoCaixa />} />
                            <Route path="plano-contas" element={<PlanoContas />} />
                            <Route path="lancamentos" element={<Lancamentos />} />
                            <Route path="lancamentos/new" element={<LancamentoForm />} />
                            <Route path="relatorio-roi" element={<RelatorioROI />} />
                            <Route path="relatorio-estoque" element={<RelatorioEstoque />} />
                            <Route path="relatorio-comissoes" element={<RelatorioComissoes />} />
                            <Route path="relatorio-investidores" element={<RelatorioInvestidores />} />
                            <Route path="dre" element={<DRE />} />
                            <Route path="contrato-templates" element={<ContratoTemplates />} />
                            <Route path="clearing-house" element={<ClearingHouse />} />
                            <Route path="vehicle-owners" element={<VehicleOwners />} />
                            <Route path="relatorio-despesas" element={<RelatorioDespesas />} />
                          </Route>
                          <Route path="/minha-loja" element={<RoleGuard allowedRoles={["owner"]}><StoreSettingsPage /></RoleGuard>} />
                          <Route path="/settings/team" element={<RoleGuard allowedRoles={["owner"]}><TeamManagement /></RoleGuard>} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                    </main>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
          </DomainRouter>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

