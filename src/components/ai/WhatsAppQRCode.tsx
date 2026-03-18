import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { uazapiClient } from "@/integrations/uazapi/client";
import { toast } from "sonner";

interface WhatsAppQRCodeProps {
  instanceUrl: string;
  token: string;
  connected: boolean;
  onStatusChange: (connected: boolean) => void;
}

export function WhatsAppQRCode({ instanceUrl, token, connected, onStatusChange }: WhatsAppQRCodeProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchQRCode = async () => {
    if (!instanceUrl || !token) {
      toast.error("Configure a URL da instância e o token primeiro");
      return;
    }
    setLoading(true);
    try {
      const data = await uazapiClient.getQRCode(instanceUrl, token);
      if (data.connected) {
        onStatusChange(true);
        setQrCode(null);
      } else {
        setQrCode(data.qrcode);
        onStatusChange(false);
      }
    } catch {
      toast.error("Erro ao obter QR Code. Verifique a URL e o token.");
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!instanceUrl || !token) return;
    try {
      const data = await uazapiClient.getStatus(instanceUrl, token);
      onStatusChange(data.connected);
      if (data.connected) setQrCode(null);
    } catch {
      // silently fail status check
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
            {connected ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-red-500" />}
            WhatsApp
          </span>
          <Badge variant={connected ? "default" : "destructive"}>
            {connected ? "Conectado" : "Desconectado"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {connected ? (
          <p className="text-sm text-muted-foreground">WhatsApp conectado e funcionando.</p>
        ) : (
          <>
            {qrCode ? (
              <div className="border rounded-lg p-4 bg-white">
                <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Clique no botão abaixo para gerar o QR Code de conexão.
              </p>
            )}
            <Button onClick={fetchQRCode} disabled={loading || !instanceUrl || !token}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {qrCode ? "Atualizar QR Code" : "Gerar QR Code"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
