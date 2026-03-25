import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the user ID that should be used for data queries.
 * - For owners: returns their own user ID.
 * - For team members (manager/seller): returns their owner's user ID,
 *   so they see the same data as their owner (their tenant).
 */
export async function getEffectiveUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("owner_id")
    .eq("id", user.id)
    .maybeSingle();

  return (profile as any)?.owner_id || user.id;
}
