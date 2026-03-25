import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useStoreContext } from "@/components/loja/StoreLayout";
import { Search, Gauge, Calendar, Car } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

interface Vehicle {
  id: string;
  brand: string | null;
  model: string | null;
  title: string | null;
  price: number | null;
  fipe_price: number | null;
  current_km: number | null;
  manufacturing_year: number | null;
  model_year: number | null;
  image_url: string | null;
  vehicle_images: string[] | null;
  description: string | null;
}

export default function StorePage() {
  const { settings } = useStoreContext();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  useEffect(() => {
    supabase.from("products")
      .select("id, brand, model, title, price, fipe_price, current_km, manufacturing_year, model_year, image_url, vehicle_images, description")
      .eq("user_id", settings.user_id)
      .eq("sold", false)
      .eq("show_in_store", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setVehicles((data as unknown as Vehicle[]) || []);
        setLoading(false);
      });
  }, [settings.user_id]);

  const brands = [...new Set(vehicles.map(v => v.brand).filter(Boolean))] as string[];

  let filtered = vehicles;

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(v =>
      (v.brand?.toLowerCase().includes(q)) ||
      (v.model?.toLowerCase().includes(q)) ||
      (v.title?.toLowerCase().includes(q))
    );
  }

  if (brandFilter !== "all") {
    filtered = filtered.filter(v => v.brand === brandFilter);
  }

  if (sortBy === "price_asc") {
    filtered = [...filtered].sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (sortBy === "price_desc") {
    filtered = [...filtered].sort((a, b) => (b.price || 0) - (a.price || 0));
  } else if (sortBy === "year") {
    filtered = [...filtered].sort((a, b) => (b.model_year || 0) - (a.model_year || 0));
  }

  const getVehicleImage = (v: Vehicle) => {
    if (v.vehicle_images && Array.isArray(v.vehicle_images) && v.vehicle_images.length > 0) {
      return v.vehicle_images[0];
    }
    return v.image_url || null;
  };

  return (
    <div className="space-y-6 md:space-y-10">
      {/* Dynamic Hero Section */}
      {settings.hero_template === "classic" && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-8 flex flex-col md:flex-row items-center">
          <div className="flex-1 p-8 md:p-12 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 leading-tight">
              Encontre o veículo dos seus sonhos
            </h2>
            <p className="text-lg text-gray-500 max-w-lg">
              Oferecemos uma seleção premium com procedência garantida e as melhores condições de financiamento.
            </p>
          </div>
          <div className="flex-1 flex justify-center w-full h-56 md:h-auto overflow-hidden">
            {(settings as any).banner_url ? (
              <img
                src={(settings as any).banner_url}
                alt={settings.store_name}
                className="w-full h-56 md:h-full object-cover"
              />
            ) : (
              <div className="w-full h-56 flex items-center justify-center bg-gray-50">
                <Car className="h-48 w-48 text-gray-100" />
              </div>
            )}
          </div>
        </div>
      )}

      {settings.hero_template === "minimal" && (
        <div className="text-left mb-8 md:mt-6 border-b pb-8">
          {(settings as any).banner_url && (
            <div className="w-full h-40 rounded-xl overflow-hidden mb-5">
              <img src={(settings as any).banner_url} alt={settings.store_name} className="w-full h-full object-cover" />
            </div>
          )}
          <h2 className="text-4xl font-light text-gray-800 mb-3 tracking-tight">Estoque Selecionado</h2>
          <p className="text-gray-500 uppercase tracking-widest text-sm font-semibold">{vehicles.length} Veículos Constam Disponíveis</p>
        </div>
      )}

      {(!settings.hero_template || settings.hero_template === "modern") && (
        <div className="relative text-center mb-8 py-10 rounded-2xl overflow-hidden">
          {(settings as any).banner_url ? (
            <>
              <img
                src={(settings as any).banner_url}
                alt={settings.store_name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50" />
          )}
          <div className="relative z-10">
            <h2 className={`text-3xl md:text-4xl font-extrabold mb-4 tracking-tight ${(settings as any).banner_url ? "text-white" : "text-gray-800"}`}>
              Nossos Veículos
            </h2>
            <p className="text-lg bg-white text-gray-500 inline-block px-4 py-1.5 rounded-full shadow-sm border">
              {vehicles.length} veículos disponíveis em nosso estoque
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por marca, modelo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Marca" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Marcas</SelectItem>
            {brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mais Recentes</SelectItem>
            <SelectItem value="price_asc">Menor Preco</SelectItem>
            <SelectItem value="price_desc">Maior Preco</SelectItem>
            <SelectItem value="year">Mais Novos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-center text-gray-500 py-12">Carregando veiculos...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Car className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum veiculo encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(vehicle => {
            const img = getVehicleImage(vehicle);
            return (
              <Link
                key={vehicle.id}
                to={`veiculo/${vehicle.id}`}
                className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow overflow-hidden border"
              >
                <div className="aspect-[16/10] bg-gray-100 overflow-hidden">
                  {img ? (
                    <img src={img} alt={`${vehicle.brand} ${vehicle.model}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Car className="h-16 w-16 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-800 mb-1">
                    {vehicle.brand} {vehicle.model}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                    {vehicle.model_year && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />{vehicle.manufacturing_year}/{vehicle.model_year}
                      </span>
                    )}
                    {vehicle.current_km && (
                      <span className="flex items-center gap-1">
                        <Gauge className="h-3.5 w-3.5" />{vehicle.current_km.toLocaleString("pt-BR")} km
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold" style={{ color: settings.primary_color || "#1e40af" }}>
                      {vehicle.price ? formatCurrency(vehicle.price) : "Consulte"}
                    </p>
                    {vehicle.fipe_price && vehicle.price && vehicle.price < vehicle.fipe_price && (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        Abaixo da FIPE
                      </Badge>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
