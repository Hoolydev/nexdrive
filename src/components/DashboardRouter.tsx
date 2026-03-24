import { useUserRole } from "@/hooks/useUserRole";
import { lazy, Suspense } from "react";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const SellerDashboard = lazy(() => import("@/pages/SellerDashboard"));

const Loading = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

export default function DashboardRouter() {
  const { isSeller, loading } = useUserRole();

  if (loading) return <Loading />;

  return (
    <Suspense fallback={<Loading />}>
      {isSeller ? <SellerDashboard /> : <Dashboard />}
    </Suspense>
  );
}
