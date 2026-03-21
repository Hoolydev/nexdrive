import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { domain, action = "add" } = await req.json();
    if (!domain) {
      throw new Error("Domain is required");
    }

    const vercelToken = Deno.env.get("VERCEL_API_TOKEN");
    const vercelProjectId = Deno.env.get("VERCEL_PROJECT_ID");

    if (!vercelToken || !vercelProjectId) {
      throw new Error("Vercel credentials not configured in Supabase Secrets");
    }

    // Call Vercel API
    let url = `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`;
    let method = "POST";
    
    if (action === "remove") {
      url = `${url}/${domain}`;
      method = "DELETE";
    }

    const vercelRes = await fetch(url, {
      method,
      headers: {
        "Authorization": `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
      body: action === "add" ? JSON.stringify({ name: domain }) : undefined,
    });

    const vercelData = await vercelRes.json();

    if (!vercelRes.ok) {
      console.error("Vercel API error:", vercelData);
      throw new Error(vercelData.error?.message || "Error communicating with Vercel API");
    }

    // Clean up or Add to store_settings
    let updateError;
    if (action === "add") {
      const { error } = await supabaseClient
        .from("store_settings")
        .update({ custom_domain: domain })
        .eq("user_id", user.id);
      updateError = error;
    } else if (action === "remove") {
      const { error } = await supabaseClient
        .from("store_settings")
        .update({ custom_domain: null })
        .eq("user_id", user.id);
      updateError = error;
    }

    if (updateError) {
      throw new Error("Vercel succeeded, but Database update failed: " + updateError.message);
    }

    return new Response(
      JSON.stringify({ success: true, data: vercelData }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
