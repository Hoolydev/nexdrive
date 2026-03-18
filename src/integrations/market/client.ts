import { supabase } from "@/integrations/supabase/client";

export interface MarketListing {
  source: string;
  title: string;
  price: number;
  km: number | null;
  year: number | null;
  location: string | null;
  url: string | null;
}

export interface MarketResearchResult {
  listings: MarketListing[];
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  averageKm: number | null;
  totalFound: number;
  searchQuery: string;
}

export async function searchMarketPrices(brand: string, model: string, year?: string): Promise<MarketResearchResult> {
  const { data, error } = await supabase.functions.invoke("market-research", {
    body: { brand, model, year },
  });

  if (error) {
    console.error("Market research edge function error:", error);
    throw new Error("Erro ao pesquisar mercado");
  }

  return data as MarketResearchResult;
}
