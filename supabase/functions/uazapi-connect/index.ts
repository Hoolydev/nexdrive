import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, settingsId, instanceUrl, token } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: "Action required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (action) {
      case "qrcode": {
        if (!instanceUrl || !token) {
          return new Response(JSON.stringify({ error: "Instance URL and token required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const qrRes = await fetch(`${instanceUrl}/instance/qrcode`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!qrRes.ok) {
          return new Response(JSON.stringify({ error: "Failed to get QR code from UAZAPI" }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const qrData = await qrRes.json();

        // Update connection status in settings
        if (settingsId) {
          await supabase
            .from("ai_settings")
            .update({
              whatsapp_connected: qrData.connected || false,
              whatsapp_qr_code: qrData.qrcode || null,
            })
            .eq("id", settingsId);
        }

        return new Response(JSON.stringify(qrData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "status": {
        if (!instanceUrl || !token) {
          return new Response(JSON.stringify({ error: "Instance URL and token required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const statusRes = await fetch(`${instanceUrl}/instance/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!statusRes.ok) {
          return new Response(JSON.stringify({ error: "Failed to get status from UAZAPI" }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const statusData = await statusRes.json();

        if (settingsId) {
          await supabase
            .from("ai_settings")
            .update({ whatsapp_connected: statusData.connected || false })
            .eq("id", settingsId);
        }

        return new Response(JSON.stringify(statusData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "set-webhook": {
        if (!instanceUrl || !token) {
          return new Response(JSON.stringify({ error: "Instance URL and token required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { webhookUrl } = body;
        if (!webhookUrl) {
          return new Response(JSON.stringify({ error: "Webhook URL required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const webhookRes = await fetch(`${instanceUrl}/instance/webhook`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: webhookUrl, enabled: true }),
        });

        if (!webhookRes.ok) {
          return new Response(JSON.stringify({ error: "Failed to set webhook" }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const webhookData = await webhookRes.json();
        return new Response(JSON.stringify(webhookData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
