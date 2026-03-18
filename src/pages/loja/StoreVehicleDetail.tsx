import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useStoreContext } from "@/components/loja/StoreLayout";
import { ArrowLeft, Calendar, Gauge, Car, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

interface Vehicle {
  id: string;
  brand: string | null;
  model: string | null;
  title: string | null;
  price: number | null;
  fipe_price: number | null;
  purchase_price: number | null;
  current_km: number | null;
  manufacturing_year: number | null;
  model_year: number | null;
  plate: string | null;
  description: string | null;
  image_url: string | null;
  vehicle_images: string[] | null;
}

export default function StoreVehicleDetail() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { settings } = useStoreContext();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    if (!vehicleId) return;
    supabase.from("products")
      .select("id, brand, model, title, price, fipe_price, current_km, manufacturing_year, model_year, plate, description, image_url, vehicle_images")
      .eq("id", vehicleId)
      .eq("sold", false)
      .maybeSingle()
      .then(({ data }) => {
        setVehicle(data as unknown as Vehicle | null);
        setLoading(false);
      });
  }, [vehicleId]);

  if (loading) return <p className="text-center py-12 text-gray-500">Carregando...</p>;

  if (!vehicle) {
    return (
      <div className="text-center py-12">
        <Car className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Veiculo nao encontrado</h2>
        <Link to={`/loja/${settings.slug}`} className="text-blue-600 hover:underline">Voltar para a loja</Link>
      </div>
    );
  }

  const images: string[] = [];
  if (vehicle.vehicle_images && Array.isArray(vehicle.vehicle_images)) {
    images.push(...vehicle.vehicle_images);
  } else if (vehicle.image_url) {
    images.push(vehicle.image_url);
  }

  const whatsappMessage = `Ola! Tenho interesse no ${vehicle.brand} ${vehicle.model}${vehicle.model_year ? ` ${vehicle.model_year}` : ""}${vehicle.price ? ` - ${formatCurrency(vehicle.price)}` : ""}. Vi na loja virtual.`;
  const whatsappUrl = settings.whatsapp_number
    ? `https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(whatsappMessage)}`
    : null;

  const prevImage = () => setCurrentImage(i => (i - 1 + images.length) % images.length);
  const nextImage = () => setCurrentImage(i => (i + 1) % images.length);

  return (
    <div className="space-y-6">
      <Link to={`/loja/${settings.slug}`} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />Voltar para a loja
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div>
          <div className="relative aspect-[16/10] bg-gray-100 rounded-xl overflow-hidden">
            {images.length > 0 ? (
              <>
                <img
                  src={images[currentImage]}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  className="w-full h-full object-cover"
                />
                {images.length > 1 && (
                  <>
                    <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
                      {currentImage + 1} / {images.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Car className="h-24 w-24 text-gray-300" />
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImage(i)}
                  className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-colors ${i === currentImage ? "border-blue-500" : "border-transparent"}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Vehicle Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {vehicle.brand} {vehicle.model}
            </h1>
            {vehicle.title && <p className="text-gray-500 mt-1">{vehicle.title}</p>}
          </div>

          <div className="flex flex-wrap gap-3">
            {vehicle.model_year && (
              <Badge variant="outline" className="text-sm px-3 py-1">
                <Calendar className="h-3.5 w-3.5 mr-1" />
                {vehicle.manufacturing_year}/{vehicle.model_year}
              </Badge>
            )}
            {vehicle.current_km && (
              <Badge variant="outline" className="text-sm px-3 py-1">
                <Gauge className="h-3.5 w-3.5 mr-1" />
                {vehicle.current_km.toLocaleString("pt-BR")} km
              </Badge>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-4xl font-bold" style={{ color: settings.primary_color || "#1e40af" }}>
              {vehicle.price ? formatCurrency(vehicle.price) : "Consulte"}
            </p>
            {vehicle.fipe_price && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">FIPE: {formatCurrency(vehicle.fipe_price)}</span>
                {vehicle.price && vehicle.price < vehicle.fipe_price && (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    {Math.round(((vehicle.fipe_price - vehicle.price) / vehicle.fipe_price) * 100)}% abaixo da FIPE
                  </Badge>
                )}
              </div>
            )}
          </div>

          {vehicle.description && (
            <>
              <Separator />
              <div>
                <h3 className="font-bold text-lg mb-2">Descricao</h3>
                <p className="text-gray-600 whitespace-pre-line">{vehicle.description}</p>
              </div>
            </>
          )}

          <Separator />

          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="w-full bg-green-500 hover:bg-green-600 text-white text-lg">
                <MessageCircle className="h-5 w-5 mr-2" />
                Tenho Interesse - WhatsApp
              </Button>
            </a>
          )}

          {settings.phone && (
            <a href={`tel:${settings.phone}`}>
              <Button variant="outline" size="lg" className="w-full mt-2">
                Ligar: {settings.phone}
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
