import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasStoreSettings, setHasStoreSettings] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        // Check user role — team members (manager/seller) skip onboarding
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        const isTeamMember = profile?.role === "manager" || profile?.role === "seller";

        if (isTeamMember) {
          // Team members never need onboarding — they use their owner's store
          setHasStoreSettings(true);
        } else {
          // Owner: check if onboarding is complete
          const { data } = await (supabase as any)
            .from("store_settings")
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle();
          setHasStoreSettings(!!data);
        }
      } else {
        setHasStoreSettings(null);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to onboarding if owner hasn't completed setup
  if (hasStoreSettings === false && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
