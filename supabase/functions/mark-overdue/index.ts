import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Deno cron: runs every day at 00:05 UTC (02:05 Brasília)
Deno.cron("mark-overdue-transactions", "5 0 * * *", async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase.rpc("mark_overdue_transactions");

  if (error) {
    console.error("[mark-overdue] Error:", error.message);
  } else {
    console.log("[mark-overdue] Done at", new Date().toISOString());
  }
});

// Also expose as HTTP endpoint for manual trigger
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error } = await supabase.rpc("mark_overdue_transactions");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ ok: true, ran_at: new Date().toISOString() }),
    { headers: { "Content-Type": "application/json" } }
  );
});
