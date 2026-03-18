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

async function scrapeWebmotors(brand: string, model: string, yearMin?: number, yearMax?: number): Promise<MarketListing[]> {
  const listings: MarketListing[] = [];

  try {
    const brandSlug = brand.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const modelSlug = model.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    let url = `https://www.webmotors.com.br/api/search/car?url=https://www.webmotors.com.br/carros/${brandSlug}/${modelSlug}&actualPage=1&displayPerPage=20&order=1`;

    if (yearMin) url += `&yearMin=${yearMin}`;
    if (yearMax) url += `&yearMax=${yearMax}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      const searchResults = data?.SearchResults || data?.Vehicles || [];

      for (const item of searchResults.slice(0, 15)) {
        const price = item.Prices?.Price || item.Price || 0;
        if (price <= 0) continue;

        listings.push({
          source: "Webmotors",
          title: `${item.Make?.Name || brand} ${item.Model?.Name || model} ${item.YearFabrication || ""}`.trim(),
          price,
          km: item.KM || item.Km || null,
          year: item.YearFabrication || item.YearModel || null,
          location: item.City ? `${item.City}/${item.State}` : (item.Seller?.City || null),
          url: item.UniqueId ? `https://www.webmotors.com.br/comprar/${brandSlug}/${modelSlug}/2p/${item.UniqueId}` : null,
        });
      }
    }
  } catch (error) {
    console.error("Webmotors scraping error:", error);
  }

  // Fallback: try the search API v2
  if (listings.length === 0) {
    try {
      const searchQuery = `${brand} ${model}${yearMin ? ` ${yearMin}` : ""}`;
      const url = `https://www.webmotors.com.br/api/search/car?url=https://www.webmotors.com.br/carros/estoque?tipoveiculo=carros&marca1=${encodeURIComponent(brand)}&modelo1=${encodeURIComponent(model)}&actualPage=1&displayPerPage=20&order=1`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
      });

      if (response.ok) {
        const text = await response.text();
        // Try to extract price patterns from response
        const priceMatches = text.match(/\"Price\":(\d+\.?\d*)/g);
        const kmMatches = text.match(/\"KM\":(\d+)/g);
        const cityMatches = text.match(/\"City\":\"([^"]+)\"/g);

        if (priceMatches) {
          for (let i = 0; i < Math.min(priceMatches.length, 15); i++) {
            const price = parseFloat(priceMatches[i].replace('"Price":', ""));
            if (price <= 0) continue;

            const km = kmMatches?.[i] ? parseInt(kmMatches[i].replace('"KM":', "")) : null;
            const city = cityMatches?.[i] ? cityMatches[i].replace('"City":"', "").replace('"', "") : null;

            listings.push({
              source: "Webmotors",
              title: `${brand} ${model} ${yearMin || ""}`.trim(),
              price,
              km,
              year: yearMin || null,
              location: city,
              url: null,
            });
          }
        }
      }
    } catch {
      console.error("Webmotors fallback scraping error");
    }
  }

  return listings;
}

async function scrapeOLX(brand: string, model: string, yearMin?: number): Promise<MarketListing[]> {
  const listings: MarketListing[] = [];

  try {
    const query = `${brand} ${model}${yearMin ? ` ${yearMin}` : ""}`;
    const url = `https://www.olx.com.br/autos-e-pecas/carros-vans-e-utilitarios?q=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    if (response.ok) {
      const html = await response.text();

      // Extract JSON data from the page's Next.js data or script tags
      const scriptMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
      if (scriptMatch) {
        try {
          const nextData = JSON.parse(scriptMatch[1]);
          const ads = nextData?.props?.pageProps?.ads || nextData?.props?.pageProps?.searchResult?.ads || [];

          for (const ad of ads.slice(0, 15)) {
            const price = ad.price ? parseInt(ad.price.replace(/\D/g, "")) : 0;
            if (price <= 0) continue;

            const kmProp = ad.properties?.find((p: any) => p.name === "mileage" || p.name === "km");
            const yearProp = ad.properties?.find((p: any) => p.name === "year" || p.name === "regdate");

            listings.push({
              source: "OLX",
              title: ad.subject || ad.title || `${brand} ${model}`,
              price,
              km: kmProp?.value ? parseInt(kmProp.value.replace(/\D/g, "")) : null,
              year: yearProp?.value ? parseInt(yearProp.value) : (yearMin || null),
              location: ad.location ? `${ad.location.municipality}/${ad.location.uf}` : null,
              url: ad.url || null,
            });
          }
        } catch {
          // Parse from regular patterns
        }
      }

      // Fallback regex extraction from HTML
      if (listings.length === 0) {
        const priceRegex = /R\$\s*([\d.]+(?:,\d{2})?)/g;
        const prices: number[] = [];
        let match;

        while ((match = priceRegex.exec(html)) !== null && prices.length < 15) {
          const price = parseFloat(match[1].replace(/\./g, "").replace(",", "."));
          if (price > 5000 && price < 5000000) {
            prices.push(price);
          }
        }

        for (const price of prices) {
          listings.push({
            source: "OLX",
            title: `${brand} ${model}`,
            price,
            km: null,
            year: yearMin || null,
            location: null,
            url: null,
          });
        }
      }
    }
  } catch (error) {
    console.error("OLX scraping error:", error);
  }

  return listings;
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

    // Scrape both sources in parallel
    const [webmotorsListings, olxListings] = await Promise.all([
      scrapeWebmotors(brand, model, yearNum, yearNum),
      scrapeOLX(brand, model, yearNum),
    ]);

    const allListings = [...webmotorsListings, ...olxListings];

    if (allListings.length === 0) {
      return new Response(
        JSON.stringify({
          listings: [],
          averagePrice: 0,
          minPrice: 0,
          maxPrice: 0,
          averageKm: null,
          totalFound: 0,
          searchQuery: `${brand} ${model} ${year || ""}`.trim(),
        } as MarketResearchResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prices = allListings.map((l) => l.price).filter((p) => p > 0);
    const kms = allListings.map((l) => l.km).filter((k): k is number => k !== null && k > 0);

    const result: MarketResearchResult = {
      listings: allListings,
      averagePrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
      averageKm: kms.length > 0 ? Math.round(kms.reduce((a, b) => a + b, 0) / kms.length) : null,
      totalFound: allListings.length,
      searchQuery: `${brand} ${model} ${year || ""}`.trim(),
    };

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
