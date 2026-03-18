import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";

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
const StoreSettingsPage = lazy(() => import("./pages/StoreSettings"));
const StorePage = lazy(() => import("./pages/loja/StorePage"));
const StoreVehicleDetail = lazy(() => import("./pages/loja/StoreVehicleDetail"));
const StoreLayout = lazy(() => import("./components/loja/StoreLayout"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
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
                        <Suspense fallback={<Loading />}>
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
                        </Suspense>
                      </main>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
