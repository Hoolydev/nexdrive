import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Share2,
  MessageCircle,
  ShieldCheck,
  Star,
  Headphones,
  Loader2,
  AlertCircle,
  QrCode,
  Download,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number | null): string {
  if (value == null) return "Consulte";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatKm(km: number | null): string {
  if (km == null) return "—";
  return new Intl.NumberFormat("pt-BR").format(km) + " km";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VehicleData {
  id: string;
  title: string | null;
  brand: string | null;
  model: string | null;
  plate: string | null;
  price: number | null;
  manufacturing_year: number | null;
  model_year: number | null;
  current_km: number | null;
  description: string | null;
  fuel_type: string | null;
  transmission: string | null;
  color: string | null;
  doors: number | null;
  status: string | null;
  store_settings: {
    store_name: string | null;
    whatsapp: string | null;
    logo_url: string | null;
  } | null;
}

interface VehicleImage {
  url: string;
  position: number;
}

// ---------------------------------------------------------------------------
// VitrinePage
// ---------------------------------------------------------------------------

export default function VitrinePage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  // Fetch vehicle data
  const { data: vehicle, isLoading: loadingVehicle } = useQuery({
    queryKey: ["vitrine", vehicleId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("products")
        .select("*, store_settings:user_id(store_name, whatsapp, logo_url)")
        .eq("id", vehicleId)
        .eq("status", "active")
        .single();
      return data as VehicleData | null;
    },
    enabled: !!vehicleId,
  });

  // Fetch vehicle images
  const { data: vehicleImages = [] } = useQuery({
    queryKey: ["vitrine-images", vehicleId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("product_images")
        .select("url, position")
        .eq("product_id", vehicleId)
        .order("position");
      return (data || []) as VehicleImage[];
    },
    enabled: !!vehicleId,
  });

  // Fallback: use vehicle_images from products table if product_images is empty
  const heroImage =
    vehicleImages[0]?.url ||
    (vehicle as any)?.vehicle_images?.[0] ||
    null;

  const allImages: string[] =
    vehicleImages.length > 0
      ? vehicleImages.map((i) => i.url)
      : (vehicle as any)?.vehicle_images || [];

  // Set OpenGraph + document title
  useEffect(() => {
    if (!vehicle) return;

    const title = vehicle.title ?? `${vehicle.brand} ${vehicle.model}`;
    document.title = `${title} - NexDrive`;

    const setMeta = (prop: string, content: string) => {
      let el = document.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", prop);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    setMeta("og:title", title);
    setMeta(
      "og:description",
      `${vehicle.brand ?? ""} ${vehicle.model ?? ""} ${vehicle.manufacturing_year ?? ""} — ${formatCurrency(vehicle.price)}`
    );
    setMeta("og:image", heroImage ?? "");
    setMeta("og:url", window.location.href);
    setMeta("og:type", "product");

    return () => {
      document.title = "NexDrive - Gestão Automotiva";
    };
  }, [vehicle, heroImage]);

  // Download QR Code as PNG
  const handleDownloadQR = () => {
    const svg = document.getElementById("vitrine-qr-svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const img = new Image();
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgStr)));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 200, 200);
      ctx.drawImage(img, 0, 0, 200, 200);
      const link = document.createElement("a");
      link.download = "qrcode-vitrine.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
  };

  // Share handler
  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: vehicle?.title ?? "Veículo", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado!");
      }
    } catch {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    }
  };

  // WhatsApp link
  const whatsappNumber = vehicle?.store_settings?.whatsapp?.replace(/\D/g, "") ?? "";
  const vehicleTitle = vehicle?.title ?? `${vehicle?.brand ?? ""} ${vehicle?.model ?? ""}`.trim();
  const whatsappText = encodeURIComponent(
    `Olá, tenho interesse no ${vehicleTitle}${vehicle?.plate ? ` - ${vehicle.plate}` : ""}`
  );
  const whatsappHref = `https://wa.me/55${whatsappNumber}?text=${whatsappText}`;

  // Loading state
  if (loadingVehicle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    );
  }

  // Not found / inactive
  if (!vehicle) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4 text-center px-6">
        <AlertCircle className="h-12 w-12 text-gray-300" />
        <h1 className="text-xl font-semibold text-gray-700">Veículo não disponível</h1>
        <p className="text-sm text-gray-400">
          Este veículo não está mais disponível ou o link é inválido.
        </p>
      </div>
    );
  }

  const store = vehicle.store_settings;

  const specs: { label: string; value: string | null | undefined }[] = [
    { label: "Marca", value: vehicle.brand },
    { label: "Modelo", value: vehicle.model },
    { label: "Ano Fab.", value: vehicle.manufacturing_year ? String(vehicle.manufacturing_year) : null },
    { label: "Ano Mod.", value: vehicle.model_year ? String(vehicle.model_year) : null },
    { label: "Combustível", value: vehicle.fuel_type },
    { label: "Câmbio", value: vehicle.transmission },
    { label: "Cor", value: vehicle.color },
    { label: "Portas", value: vehicle.doors ? String(vehicle.doors) : null },
    { label: "Quilometragem", value: formatKm(vehicle.current_km) },
  ].filter((s) => s.value);

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Store branding header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        {store?.logo_url ? (
          <img
            src={store.logo_url}
            alt={store.store_name ?? "Loja"}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {store?.store_name?.[0]?.toUpperCase() ?? "N"}
            </span>
          </div>
        )}
        <span className="font-semibold text-gray-800 text-sm truncate">
          {store?.store_name ?? "NexDrive"}
        </span>

        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 rounded-full"
            onClick={() => setQrDialogOpen(true)}
            title="QR Code"
          >
            <QrCode className="h-4 w-4 text-gray-500" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 rounded-full"
            onClick={handleShare}
            title="Compartilhar"
          >
            <Share2 className="h-4 w-4 text-gray-500" />
          </Button>
        </div>
      </header>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code da Vitrine
            </DialogTitle>
            <DialogDescription>
              Compartilhe este QR code para que clientes acessem este veículo diretamente
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="p-4 bg-white border rounded-xl shadow-sm">
              <QRCodeSVG
                id="vitrine-qr-svg"
                value={window.location.href}
                size={200}
              />
            </div>
            <p className="text-xs text-gray-500 break-all max-w-full px-2">
              {window.location.href}
            </p>
            <Button
              className="w-full gap-2"
              onClick={handleDownloadQR}
            >
              <Download className="h-4 w-4" />
              Baixar QR
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hero image */}
      <div className="relative w-full aspect-[4/3] sm:aspect-video bg-gray-100 overflow-hidden">
        {heroImage ? (
          <img
            src={heroImage}
            alt={vehicleTitle}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <span className="text-5xl">🚗</span>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {allImages.length > 1 && (
        <div className="flex gap-2 px-4 pt-3 overflow-x-auto pb-1 scrollbar-hide">
          {allImages.slice(1).map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Foto ${i + 2}`}
              className="h-16 w-24 object-cover rounded-lg flex-shrink-0 border border-gray-100"
            />
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="px-4 pt-5 pb-32 max-w-2xl mx-auto space-y-6">
        {/* Title + price */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {vehicleTitle}
          </h1>
          {vehicle.model_year && vehicle.manufacturing_year && (
            <p className="text-sm text-gray-400 mt-0.5">
              {vehicle.manufacturing_year}/{vehicle.model_year}
              {vehicle.current_km != null && (
                <> · {formatKm(vehicle.current_km)}</>
              )}
            </p>
          )}
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-600">
              {formatCurrency(vehicle.price)}
            </span>
          </div>
        </div>

        {/* Specs grid */}
        {specs.length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-gray-50 rounded-2xl p-4">
            {specs.map((spec) => (
              <div key={spec.label}>
                <p className="text-xs text-gray-400 uppercase tracking-wide">{spec.label}</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{spec.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Description */}
        {vehicle.description && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-1.5">Descrição</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {vehicle.description}
            </p>
          </div>
        )}

        {/* Trust badges */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: ShieldCheck, label: "Documentação Verificada" },
            { icon: Star, label: "Garantia de Procedência" },
            { icon: Headphones, label: "Atendimento Especializado" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 text-center p-3 rounded-2xl bg-gray-50"
            >
              <Icon className="h-5 w-5 text-blue-600" />
              <span className="text-xs text-gray-600 font-medium leading-tight">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 shadow-xl px-4 py-3 flex gap-3 max-w-2xl mx-auto">
        <Button
          variant="outline"
          size="sm"
          className="h-12 px-4 rounded-xl border-gray-200 flex-shrink-0"
          onClick={() => setQrDialogOpen(true)}
          title="QR Code"
        >
          <QrCode className="h-4 w-4 text-gray-500" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-12 px-4 rounded-xl border-gray-200 flex-shrink-0"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4 text-gray-500" />
        </Button>

        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1"
        >
          <Button className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl text-base shadow-md shadow-green-200">
            <MessageCircle className="h-5 w-5 mr-2" />
            Tenho interesse → Falar no WhatsApp
          </Button>
        </a>
      </div>
    </div>
  );
}
