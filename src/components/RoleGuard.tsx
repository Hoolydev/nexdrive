import { Navigate } from "react-router-dom";
import { useUserRole, UserRole } from "@/hooks/useUserRole";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#A6DD05] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
