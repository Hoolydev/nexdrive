import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, Car, Gauge, Calendar, MessageCircle, ChevronDown } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

interface MarketVehicle {
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
  fuel: string | null;
  color: string | null;
}

const PAGE_SIZE = 12;

export default function MarketplacePage() {
  const [vehicles, setVehicles] = useState<MarketVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [fuelFilter, setFuelFilter] = useState("all");
  const [minYear, setMinYear] = useState("");
  const [maxYear, setMaxYear] = useState("");

  // All vehicles for filter (first load, unfiltered for UI counts)
  const [allVehicles, setAllVehicles] = useState<MarketVehicle[]>([]);
  const [filtered, setFiltered] = useState<MarketVehicle[]>([]);
  const [displayed, setDisplayed] = useState<MarketVehicle[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("products")
        .select(
          "id, brand, model, title, price, fipe_price, current_km, manufacturing_year, model_year, image_url, vehicle_images, fuel, color"
        )
        .eq("is_marketplace_visible", true)
        .eq("sold", false)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      const list = (data as unknown as MarketVehicle[]) || [];
      setAllVehicles(list);
      setLoading(false);
    };
    load();
  }, []);

  // Apply filters whenever filter state or allVehicles changes
  useEffect(() => {
    let result = allVehicles;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (v) =>
          v.brand?.toLowerCase().includes(q) ||
          v.model?.toLowerCase().includes(q) ||
          v.title?.toLowerCase().includes(q)
      );
    }

    if (fuelFilter !== "all") {
      result = result.filter((v) => v.fuel === fuelFilter);
    }

    const minP = minPrice ? parseFloat(minPrice) : null;
    const maxP = maxPrice ? parseFloat(maxPrice) : null;
    if (minP !== null) result = result.filter((v) => (v.price || 0) >= minP);
    if (maxP !== null) result = result.filter((v) => (v.price || 0) <= maxP);

    const minY = minYear ? parseInt(minYear) : null;
    const maxY = maxYear ? parseInt(maxYear) : null;
    if (minY !== null) result = result.filter((v) => (v.model_year || 0) >= minY);
    if (maxY !== null) result = result.filter((v) => (v.model_year || 0) <= maxY);

    setFiltered(result);
    setPage(0);
    setDisplayed(result.slice(0, PAGE_SIZE));
    setHasMore(result.length > PAGE_SIZE);
  }, [allVehicles, search, fuelFilter, minPrice, maxPrice, minYear, maxYear]);

  const loadMore = () => {
    const nextPage = page + 1;
    const next = filtered.slice(0, (nextPage + 1) * PAGE_SIZE);
    setDisplayed(next);
    setHasMore(next.length < filtered.length);
    setPage(nextPage);
  };

  const getVehicleImage = (v: MarketVehicle): string | null => {
    if (v.vehicle_images && Array.isArray(v.vehicle_images) && v.vehicle_images.length > 0) {
      return v.vehicle_images[0];
    }
    return v.image_url || null;
  };

  const buildWhatsApp = (v: MarketVehicle) => {
    const text = encodeURIComponent(
      `Olá! Tenho interesse no ${v.brand || ""} ${v.model || ""} ${v.model_year ? `(${v.model_year})` : ""}. Poderia me dar mais informações?`
    );
    return `https://wa.me/55?text=${text}`;
  };

  const fuels = [...new Set(allVehicles.map((v) => v.fuel).filter(Boolean))] as string[];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/nexdrive-logo.png"
              alt="NexDrive"
              className="h-9 w-auto"
            />
            <div className="hidden md:block">
              <span className="text-sm font-semibold text-gray-800">Rede NexDrive</span>
              <span className="text-gray-400 mx-2">—</span>
              <span className="text-sm text-gray-500">Veículos</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-sm text-gray-500 hover:text-blue-600 transition-colors hidden md:inline"
            >
              Início
            </Link>
            <Link
              to="/auth"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-full transition-all"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero banner */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Marketplace NexDrive</h1>
          <p className="text-blue-100 text-lg">
            Encontre o veículo ideal entre {allVehicles.length} opções da rede
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-xl border p-4 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por marca ou modelo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Fuel */}
            <Select value={fuelFilter} onValueChange={setFuelFilter}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Combustível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {fuels.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            {/* Price range */}
            <div className="flex gap-2 flex-1">
              <Input
                placeholder="Preço mínimo"
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <Input
                placeholder="Preço máximo"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
            {/* Year range */}
            <div className="flex gap-2 flex-1">
              <Input
                placeholder="Ano mínimo"
                type="number"
                value={minYear}
                onChange={(e) => setMinYear(e.target.value)}
              />
              <Input
                placeholder="Ano máximo"
                type="number"
                value={maxYear}
                onChange={(e) => setMaxYear(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {loading ? "Carregando..." : `${filtered.length} veículo(s) encontrado(s)`}
          </p>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border h-72 animate-pulse" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20">
            <Car className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nenhum veículo encontrado</p>
            <p className="text-gray-400 text-sm mt-1">Tente ajustar os filtros</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayed.map((vehicle) => {
                const img = getVehicleImage(vehicle);
                return (
                  <div
                    key={vehicle.id}
                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border group"
                  >
                    {/* Image */}
                    <div className="aspect-[16/10] bg-gray-100 overflow-hidden">
                      {img ? (
                        <img
                          src={img}
                          alt={`${vehicle.brand} ${vehicle.model}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-50">
                          <Car className="h-16 w-16 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-bold text-lg text-gray-800 leading-tight">
                          {vehicle.brand} {vehicle.model}
                        </h3>
                        {vehicle.title && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{vehicle.title}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        {vehicle.model_year && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {vehicle.manufacturing_year}/{vehicle.model_year}
                          </span>
                        )}
                        {vehicle.current_km ? (
                          <span className="flex items-center gap-1">
                            <Gauge className="h-3.5 w-3.5" />
                            {vehicle.current_km.toLocaleString("pt-BR")} km
                          </span>
                        ) : null}
                        {vehicle.fuel && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {vehicle.fuel}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-blue-700">
                            {vehicle.price ? formatCurrency(vehicle.price) : "Consulte"}
                          </p>
                          {vehicle.fipe_price && vehicle.price && vehicle.price < vehicle.fipe_price && (
                            <span className="text-xs text-green-600 font-medium">Abaixo da FIPE</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <Link
                          to={`/v/${vehicle.id}`}
                          className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-3 rounded-lg transition-colors"
                        >
                          Ver Detalhes
                        </Link>
                        <a
                          href={buildWhatsApp(vehicle)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2 px-3 rounded-lg transition-colors"
                          title="Contato via WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={loadMore} className="gap-2">
                  <ChevronDown className="h-4 w-4" />
                  Carregar mais veículos
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t bg-white py-6 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} NexDrive. Todos os direitos reservados.
      </footer>
    </div>
  );
}
