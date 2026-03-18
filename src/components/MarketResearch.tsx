import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Search, TrendingUp, TrendingDown, MapPin, Gauge, ExternalLink, Loader2 } from "lucide-react";
import { searchMarketPrices, type MarketResearchResult } from "@/integrations/market/client";

interface MarketResearchProps {
  brand: string;
  model: string;
  year?: string;
  purchasePrice?: number;
  onSuggestPrice?: (price: number) => void;
}

export function MarketResearch({ brand, model, year, purchasePrice, onSuggestPrice }: MarketResearchProps) {
  const [result, setResult] = useState<MarketResearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const searchMarket = async () => {
    if (!brand || !model) {
      toast.error("Selecione a marca e o modelo primeiro");
      return;
    }

    setLoading(true);
    try {
      const data = await searchMarketPrices(brand, model, year);
      setResult(data);

      if (data.totalFound === 0) {
        toast.info("Nenhum anúncio encontrado. Sites podem bloquear buscas automáticas - tente pesquisar manualmente.");
      } else {
        toast.success(`${data.totalFound} anúncios encontrados!`);
      }
    } catch {
      toast.error("Erro ao pesquisar mercado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const getPriceComparison = (price: number) => {
    if (!result) return null;
    const diff = ((price - result.averagePrice) / result.averagePrice) * 100;
    return diff;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Pesquisa de Mercado
          </span>
          <Button onClick={searchMarket} disabled={loading || !brand || !model} size="sm">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Pesquisando...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Pesquisar
              </>
            )}
          </Button>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Busca preços em Webmotors, OLX e Mercado Livre para ajudar na precificação
        </p>
      </CardHeader>
      <CardContent>
        {result && result.totalFound > 0 ? (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Preço Médio</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(result.averagePrice)}</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Menor Preço</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(result.minPrice)}</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Maior Preço</p>
                <p className="text-lg font-bold text-red-500">{formatCurrency(result.maxPrice)}</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">KM Médio</p>
                <p className="text-lg font-bold">
                  {result.averageKm ? `${result.averageKm.toLocaleString("pt-BR")}` : "N/D"}
                </p>
              </div>
            </div>

            {/* Price comparison with purchase */}
            {purchasePrice && purchasePrice > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm font-medium mb-1">Comparativo com seu preço de compra</p>
                {(() => {
                  const diff = getPriceComparison(purchasePrice);
                  if (diff === null) return null;
                  return (
                    <div className="flex items-center gap-2">
                      {diff < 0 ? (
                        <>
                          <TrendingDown className="h-4 w-4 text-green-600" />
                          <span className="text-green-600 font-semibold">
                            {Math.abs(diff).toFixed(1)}% abaixo da média
                          </span>
                          <span className="text-xs text-muted-foreground">- Boa compra!</span>
                        </>
                      ) : (
                        <>
                          <TrendingUp className="h-4 w-4 text-red-500" />
                          <span className="text-red-500 font-semibold">
                            {diff.toFixed(1)}% acima da média
                          </span>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Suggest price button */}
            {onSuggestPrice && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onSuggestPrice(result.averagePrice)}
              >
                Usar preço médio como sugestão de venda ({formatCurrency(result.averagePrice)})
              </Button>
            )}

            <Separator />

            {/* Listings */}
            <div>
              <p className="text-sm font-medium mb-2">
                Anúncios encontrados ({result.totalFound})
              </p>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {result.listings.map((listing, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={listing.source === "Webmotors" ? "default" : listing.source === "MercadoLivre" ? "outline" : "secondary"} className="text-xs">
                            {listing.source}
                          </Badge>
                          <span className="font-medium truncate">{listing.title}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {listing.km && (
                            <span className="flex items-center gap-1">
                              <Gauge className="h-3 w-3" />
                              {listing.km.toLocaleString("pt-BR")} km
                            </span>
                          )}
                          {listing.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {listing.location}
                            </span>
                          )}
                          {listing.year && <span>{listing.year}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="font-bold whitespace-nowrap">{formatCurrency(listing.price)}</span>
                        {listing.url && (
                          <a href={listing.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        ) : result && result.totalFound === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum anúncio encontrado para "{result.searchQuery}".
            Tente com termos mais genéricos.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Selecione marca e modelo, depois clique em "Pesquisar" para ver preços do mercado.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
