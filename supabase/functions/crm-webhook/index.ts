/**
 * CRM Webhook — AI-SDR / Lead Triage (PRD §4.2)
 * Recebe leads de integrações externas (WhatsApp via UaZAPI, Marketplace, etc.)
 * e cria automaticamente um crm_lead com classificação por score.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface WebhookPayload {
  source: "whatsapp" | "marketplace" | "website" | "phone" | "walk_in" | "referral" | "other";
  contact_name: string;
  phone?: string;
  email?: string;
  message?: string;
  vehicle_plate?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  user_id: string; // garagem destino
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!payload.contact_name || !payload.user_id) {
    return new Response(
      JSON.stringify({ error: "contact_name and user_id are required" }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Try to find existing vehicle of interest
  let vehicleId: string | null = null;
  if (payload.vehicle_plate) {
    const { data: vehicle } = await supabase
      .from("products")
      .select("id")
      .eq("plate", payload.vehicle_plate)
      .eq("user_id", payload.user_id)
      .maybeSingle();
    vehicleId = vehicle?.id ?? null;
  }

  // Auto-score lead (simple heuristic)
  const score = [
    payload.phone ? 20 : 0,
    payload.email ? 15 : 0,
    payload.vehicle_plate ? 30 : 0,
    payload.message && payload.message.length > 20 ? 20 : 0,
    payload.source === "whatsapp" ? 15 : 0,
  ].reduce((a, b) => a + b, 0);

  // Insert CRM lead
  const { data: lead, error } = await supabase
    .from("crm_leads")
    .insert({
      user_id: payload.user_id,
      contact_name: payload.contact_name,
      phone: payload.phone ?? null,
      email: payload.email ?? null,
      origin: payload.source ?? "other",
      status_step: "new",
      vehicle_interest_id: vehicleId,
      notes: [
        payload.message ? `Mensagem: ${payload.message}` : null,
        payload.vehicle_brand ? `Interesse: ${payload.vehicle_brand} ${payload.vehicle_model ?? ""}`.trim() : null,
        `Score automático: ${score}/100`,
      ]
        .filter(Boolean)
        .join("\n"),
    })
    .select()
    .single();

  if (error) {
    console.error("[crm-webhook] DB error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log(`[crm-webhook] Lead criado: ${lead.id} score=${score}`);
  return new Response(
    JSON.stringify({ ok: true, lead_id: lead.id, score }),
    { status: 201, headers: { "Content-Type": "application/json" } }
  );
});
