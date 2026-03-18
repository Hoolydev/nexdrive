const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MarketListing {
  source: string;
  title: string;
  price: number;
  km: number | null;
  year: number | null;
  location: string | null;
  url: string | null;
}

interface MarketResearchResult {
  listings: MarketListing[];
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  averageKm: number | null;
  totalFound: number;
  searchQuery: string;
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function searchWebmotors(brand: string, model: string, yearNum?: number): Promise<MarketListing[]> {
  const listings: MarketListing[] = [];

  try {
    // Webmotors search API - multiple endpoint attempts
    const brandSlug = brand.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const modelSlug = model.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const urls = [
      `https://www.webmotors.com.br/api/search/car?url=https://www.webmotors.com.br/carros/${brandSlug}/${modelSlug}&actualPage=1&displayPerPage=24&order=1${yearNum ? `&yearMin=${yearNum}&yearMax=${yearNum}` : ""}`,
      `https://www.webmotors.com.br/api/search/car?url=https://www.webmotors.com.br/carros/estoque&marca1=${encodeURIComponent(brand)}&modelo1=${encodeURIComponent(model)}&actualPage=1&displayPerPage=24&order=1${yearNum ? `&ano1min=${yearNum}&ano1max=${yearNum}` : ""}`,
    ];

    for (const url of urls) {
      if (listings.length > 0) break;

      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": UA,
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "pt-BR,pt;q=0.9",
            "Referer": "https://www.webmotors.com.br/",
          },
        });

        if (!res.ok) continue;

        const data = await res.json();
        const results = data?.SearchResults || data?.Vehicles || data?.Result?.Vehicles || [];

        for (const item of results.slice(0, 20)) {
          const price = item?.Prices?.Price || item?.Price || item?.Specification?.Price?.Value || 0;
          if (price <= 0) continue;

          listings.push({
            source: "Webmotors",
            title: `${item.Make?.Name || item.Specification?.Make?.Value || brand} ${item.Model?.Name || item.Specification?.Model?.Value || model} ${item.YearFabrication || item.Specification?.YearFabrication?.Value || ""}`.trim(),
            price: typeof price === "string" ? parseFloat(price.replace(/\D/g, "")) : price,
            km: item.KM || item.Km || item.Specification?.Odometer?.Value || null,
            year: item.YearFabrication || item.Specification?.YearFabrication?.Value || null,
            location: item.City ? `${item.City}/${item.State}` : (item.Seller?.City ? `${item.Seller.City}/${item.Seller.State}` : null),
            url: item.UniqueId ? `https://www.webmotors.com.br/comprar/${brandSlug}/${modelSlug}/2p/${item.UniqueId}` : null,
          });
        }
      } catch (e) {
        console.error(`Webmotors URL error: ${e}`);
      }
    }
  } catch (error) {
    console.error("Webmotors general error:", error);
  }

  return listings;
}

async function searchOLX(brand: string, model: string, yearNum?: number): Promise<MarketListing[]> {
  const listings: MarketListing[] = [];

  try {
    const query = `${brand} ${model}${yearNum ? ` ${yearNum}` : ""}`;
    const url = `https://www.olx.com.br/autos-e-pecas/carros-vans-e-utilitarios?q=${encodeURIComponent(query)}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });

    if (!res.ok) return listings;

    const html = await res.text();

    // Try to extract __NEXT_DATA__ JSON
    const nextMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextMatch) {
      try {
        const nextData = JSON.parse(nextMatch[1]);
        const ads = nextData?.props?.pageProps?.ads
          || nextData?.props?.pageProps?.searchResult?.ads
          || nextData?.props?.pageProps?.searchProps?.ads
          || [];

        for (const ad of ads.slice(0, 20)) {
          const priceStr = ad.price || ad.listingCategoryId?.price || "";
          const price = typeof priceStr === "number" ? priceStr : parseInt(String(priceStr).replace(/\D/g, ""));
          if (!price || price <= 0) continue;

          const kmProp = ad.properties?.find((p: any) => p.name === "mileage" || p.name === "km" || p.label?.toLowerCase()?.includes("km"));
          const yearProp = ad.properties?.find((p: any) => p.name === "year" || p.name === "regdate" || p.label?.toLowerCase()?.includes("ano"));

          listings.push({
            source: "OLX",
            title: ad.subject || ad.title || `${brand} ${model}`,
            price,
            km: kmProp?.value ? parseInt(String(kmProp.value).replace(/\D/g, "")) : null,
            year: yearProp?.value ? parseInt(yearProp.value) : (yearNum || null),
            location: ad.location ? `${ad.location.municipality || ad.location.city || ""}/${ad.location.uf || ad.location.state || ""}` : null,
            url: ad.url || null,
          });
        }
      } catch {
        console.error("OLX NEXT_DATA parse error");
      }
    }

    // Fallback: try to find ad-card data in HTML
    if (listings.length === 0) {
      // Look for JSON-LD structured data
      const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
      if (jsonLdMatches) {
        for (const match of jsonLdMatches) {
          try {
            const content = match.replace(/<\/?script[^>]*>/g, "");
            const jsonLd = JSON.parse(content);
            if (jsonLd["@type"] === "ItemList" && jsonLd.itemListElement) {
              for (const item of jsonLd.itemListElement.slice(0, 20)) {
                const offer = item.item?.offers || item.offers;
                const price = offer?.price || offer?.lowPrice;
                if (!price || price <= 0) continue;

                listings.push({
                  source: "OLX",
                  title: item.item?.name || item.name || `${brand} ${model}`,
                  price: typeof price === "string" ? parseFloat(price) : price,
                  km: null,
                  year: yearNum || null,
                  location: null,
                  url: item.item?.url || item.url || null,
                });
              }
            }
          } catch { /* skip invalid JSON-LD */ }
        }
      }
    }
  } catch (error) {
    console.error("OLX general error:", error);
  }

  return listings;
}

async function searchMercadoLivre(brand: string, model: string, yearNum?: number): Promise<MarketListing[]> {
  const listings: MarketListing[] = [];

  try {
    const query = `${brand} ${model}${yearNum ? ` ${yearNum}` : ""}`;
    const url = `https://api.mercadolibre.com/sites/MLB/search?category=MLB1744&q=${encodeURIComponent(query)}&limit=20&sort=relevance`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept": "application/json",
      },
    });

    if (!res.ok) return listings;

    const data = await res.json();
    const results = data?.results || [];

    for (const item of results) {
      const price = item.price || 0;
      if (price <= 0) continue;

      const kmAttr = item.attributes?.find((a: any) => a.id === "KILOMETERS" || a.id === "MILEAGE");
      const yearAttr = item.attributes?.find((a: any) => a.id === "VEHICLE_YEAR");

      listings.push({
        source: "MercadoLivre",
        title: item.title || `${brand} ${model}`,
        price,
        km: kmAttr?.value_name ? parseInt(String(kmAttr.value_name).replace(/\D/g, "")) : null,
        year: yearAttr?.value_name ? parseInt(yearAttr.value_name) : (yearNum || null),
        location: item.address ? `${item.address.city_name}/${item.address.state_name}` : null,
        url: item.permalink || null,
      });
    }
  } catch (error) {
    console.error("MercadoLivre error:", error);
  }

  return listings;
}

function calculateStats(listings: MarketListing[]): MarketResearchResult {
  const prices = listings.map(l => l.price).filter(p => p > 0);
  const kms = listings.map(l => l.km).filter((k): k is number => k !== null && k > 0);

  // Remove outliers (prices outside 2 standard deviations)
  let filteredPrices = prices;
  if (prices.length >= 5) {
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const stdDev = Math.sqrt(prices.reduce((sum, p) => sum + (p - mean) ** 2, 0) / prices.length);
    filteredPrices = prices.filter(p => Math.abs(p - mean) <= 2 * stdDev);
    if (filteredPrices.length < 3) filteredPrices = prices; // fallback
  }

  return {
    listings,
    averagePrice: filteredPrices.length > 0 ? Math.round(filteredPrices.reduce((a, b) => a + b, 0) / filteredPrices.length) : 0,
    minPrice: filteredPrices.length > 0 ? Math.min(...filteredPrices) : 0,
    maxPrice: filteredPrices.length > 0 ? Math.max(...filteredPrices) : 0,
    averageKm: kms.length > 0 ? Math.round(kms.reduce((a, b) => a + b, 0) / kms.length) : null,
    totalFound: listings.length,
    searchQuery: "",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { brand, model, year } = await req.json();

    if (!brand || !model) {
      return new Response(
        JSON.stringify({ error: "Brand and model are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const yearNum = year ? parseInt(year) : undefined;
    const searchQuery = `${brand} ${model}${year ? ` ${year}` : ""}`;

    // Search all sources in parallel
    const [webmotorsListings, olxListings, mlListings] = await Promise.all([
      searchWebmotors(brand, model, yearNum),
      searchOLX(brand, model, yearNum),
      searchMercadoLivre(brand, model, yearNum),
    ]);

    const allListings = [...webmotorsListings, ...olxListings, ...mlListings];
    const result = calculateStats(allListings);
    result.searchQuery = searchQuery;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
