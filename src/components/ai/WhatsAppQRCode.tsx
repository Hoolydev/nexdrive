import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

export type WaProvider = "uazapi" | "zapi";

interface WhatsAppQRCodeProps {
  provider: WaProvider;
  /** UAZAPI: base instance URL. Z-API: full https://api.z-api.io/instances/{id}/token/{token} */
  instanceUrl: string;
  /** UAZAPI: Bearer token. Z-API: Client-Token (security token). */
  token: string;
  connected: boolean;
  onStatusChange: (connected: boolean) => void;
}

// ── UAZAPI helpers ────────────────────────────────────────────────────────
async function uazapiGetQR(instanceUrl: string, token: string) {
  const res = await fetch(`${instanceUrl}/instance/qrcode`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Falha ao obter QR Code");
  return res.json() as Promise<{ qrcode: string; connected: boolean }>;
}

async function uazapiGetStatus(instanceUrl: string, token: string) {
  const res = await fetch(`${instanceUrl}/instance/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Falha ao verificar status");
  return res.json() as Promise<{ connected: boolean; phone: string | null }>;
}

// ── Z-API helpers ─────────────────────────────────────────────────────────
// instanceUrl is the full base: https://api.z-api.io/instances/{id}/token/{token}
// token is the Client-Token (security token)
async function zapiGetQR(instanceUrl: string, clientToken: string) {
  const res = await fetch(`${instanceUrl}/qr-code/image`, {
    headers: { "Client-Token": clientToken },
  });
  if (!res.ok) throw new Error("Falha ao obter QR Code Z-API");
  // Z-API returns { value: "data:image/png;base64,..." }
  const data = await res.json();
  return { qrcode: data.value as string, connected: false };
}

async function zapiGetStatus(instanceUrl: string, clientToken: string) {
  const res = await fetch(`${instanceUrl}/status`, {
    headers: { "Client-Token": clientToken },
  });
  if (!res.ok) throw new Error("Falha ao verificar status Z-API");
  const data = await res.json();
  // Z-API returns { connected: boolean, smartphoneConnected: boolean, ... }
  return { connected: data.connected as boolean, phone: null };
}

// ─────────────────────────────────────────────────────────────────────────

export function WhatsAppQRCode({
  provider,
  instanceUrl,
  token,
  connected,
  onStatusChange,
}: WhatsAppQRCodeProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchQRCode = async () => {
    if (!instanceUrl || !token) {
      toast.error("Preencha as credenciais antes de gerar o QR Code");
      return;
    }
    setLoading(true);
    try {
      const data =
        provider === "zapi"
          ? await zapiGetQR(instanceUrl, token)
          : await uazapiGetQR(instanceUrl, token);

      if (data.connected) {
        onStatusChange(true);
        setQrCode(null);
      } else {
        setQrCode(data.qrcode);
        onStatusChange(false);
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao obter QR Code. Verifique as credenciais.");
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!instanceUrl || !token) return;
    try {
      const data =
        provider === "zapi"
          ? await zapiGetStatus(instanceUrl, token)
          : await uazapiGetStatus(instanceUrl, token);
      onStatusChange(data.connected);
      if (data.connected) setQrCode(null);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    if (instanceUrl && token) {
      checkStatus();
      const interval = setInterval(checkStatus, 15000);
      return () => clearInterval(interval);
    }
  }, [instanceUrl, token]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {connected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            WhatsApp
          </span>
          <Badge variant={connected ? "default" : "destructive"}>
            {connected ? "Conectado" : "Desconectado"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {connected ? (
          <p className="text-sm text-muted-foreground">
            WhatsApp conectado e funcionando.
          </p>
        ) : (
          <>
            {qrCode ? (
              <div className="border rounded-lg p-4 bg-white">
                <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                Clique no botão abaixo para gerar o QR Code e escaneie com o WhatsApp.
              </p>
            )}
            <Button
              onClick={fetchQRCode}
              disabled={loading || !instanceUrl || !token}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {qrCode ? "Atualizar QR Code" : "Gerar QR Code"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
