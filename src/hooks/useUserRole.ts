import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "owner" | "manager" | "seller";

type Module =
  | "dashboard"
  | "vehicles"
  | "entities"
  | "crm"
  | "financeiro"
  | "contracts"
  | "store"
  | "ai"
  | "settings";

const PERMISSIONS: Record<UserRole, Module[]> = {
  owner: ["dashboard", "vehicles", "entities", "crm", "financeiro", "contracts", "store", "ai", "settings"],
  manager: ["dashboard", "vehicles", "entities", "crm", "contracts"],
  seller: ["dashboard", "vehicles", "entities", "crm"],
};

export function useUserRole() {
  const [role, setRole] = useState<UserRole>("owner");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await (supabase as any)
          .from("profiles")
          .select("role, owner_id, display_name")
          .eq("id", user.id)
          .single();

        if (!error && data && mounted) {
          setRole((data.role as UserRole) || "owner");
          setOwnerId(data.owner_id || null);
          setDisplayName(data.display_name || user.email || "");
        }
      } catch {
        // Default to owner if fetch fails
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchRole();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isOwner = role === "owner";
  const isManager = role === "manager";
  const isSeller = role === "seller";

  const canAccess = (module: Module): boolean => {
    return PERMISSIONS[role]?.includes(module) ?? false;
  };

  // Get the effective user_id for data queries (owner's id for team members)
  const effectiveUserId = ownerId || undefined;

  return {
    role,
    isOwner,
    isManager,
    isSeller,
    canAccess,
    loading,
    displayName,
    ownerId,
    effectiveUserId,
  };
}
