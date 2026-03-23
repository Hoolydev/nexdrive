import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIPE_API_URL = "https://fipe.parallelum.com.br/api/v2";

// OpenAI function definitions for the store assistant
const tools = [
  {
    type: "function",
    function: {
      name: "list_vehicles",
      description: "Lista todos os veículos em estoque (não vendidos). Retorna marca, modelo, ano, preço de compra, preço FIPE, km e placa.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_vehicle_details",
      description: "Busca detalhes completos de um veículo específico, incluindo custos associados. Pode buscar por placa, marca/modelo, ou ID.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Placa, marca/modelo ou ID do veículo" },
        },
        required: ["search"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_vehicle",
      description: "Adiciona um novo veículo ao estoque. Requer marca, modelo e preço de compra. Opcionalmente aceita placa, km, ano de fabricação e ano do modelo.",
      parameters: {
        type: "object",
        properties: {
          brand: { type: "string", description: "Marca do veículo" },
          model: { type: "string", description: "Modelo do veículo" },
          purchase_price: { type: "number", description: "Preço de compra em reais" },
          plate: { type: "string", description: "Placa do veículo" },
          current_km: { type: "number", description: "Quilometragem atual" },
          manufacturing_year: { type: "number", description: "Ano de fabricação" },
          model_year: { type: "number", description: "Ano do modelo" },
        },
        required: ["brand", "model", "purchase_price"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_fipe",
      description: "Busca o preço FIPE de um veículo pela marca e modelo. Retorna o valor de referência da tabela FIPE.",
      parameters: {
        type: "object",
        properties: {
          brand_name: { type: "string", description: "Nome da marca (ex: Chevrolet, Fiat, Volkswagen)" },
          model_name: { type: "string", description: "Nome do modelo (ex: Onix, Argo, Gol)" },
        },
        required: ["brand_name", "model_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_stock_summary",
      description: "Retorna um resumo do estoque: total de veículos, valor total investido, valor FIPE total, veículo mais caro e mais barato.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_min_sale_price",
      description: "Calcula o preço mínimo de venda de um veículo considerando o preço de compra + custos + margem mínima de 10%.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Placa, marca/modelo ou ID do veículo" },
        },
        required: ["search"],
      },
    },
  },
];

async function executeFunction(
  functionName: string,
  args: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string> {
  switch (functionName) {
    case "list_vehicles": {
      const { data: vehicles } = await supabase
        .from("products")
        .select("id, brand, model, manufacturing_year, model_year, purchase_price, fipe_price, current_km, plate, price")
        .eq("user_id", userId)
        .eq("sold", false)
        .order("created_at", { ascending: false });

      if (!vehicles || vehicles.length === 0) return "Nenhum veículo em estoque no momento.";

      const list = vehicles.map((v: any, i: number) =>
        `${i + 1}. ${v.brand} ${v.model} ${v.model_year || ""} - Placa: ${v.plate || "N/I"} - Compra: R$ ${v.purchase_price?.toLocaleString("pt-BR") || "N/I"} - FIPE: R$ ${v.fipe_price?.toLocaleString("pt-BR") || "N/I"} - KM: ${v.current_km?.toLocaleString("pt-BR") || "N/I"}`
      ).join("\n");

      return `Estoque atual (${vehicles.length} veículos):\n${list}`;
    }

    case "get_vehicle_details": {
      const search = (args.search as string).toLowerCase();
      const { data: vehicles } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", userId)
        .eq("sold", false);

      const vehicle = vehicles?.find((v: any) =>
        v.plate?.toLowerCase() === search ||
        v.id === search ||
        `${v.brand} ${v.model}`.toLowerCase().includes(search)
      );

      if (!vehicle) return "Veículo não encontrado no estoque.";

      const { data: costs } = await supabase
        .from("vehicle_costs")
        .select("description, amount")
        .eq("product_id", vehicle.id);

      const totalCosts = costs?.reduce((sum: number, c: any) => sum + c.amount, 0) || 0;
      const costsList = costs?.map((c: any) => `  - ${c.description}: R$ ${c.amount.toLocaleString("pt-BR")}`).join("\n") || "  Nenhum custo registrado";

      return `Detalhes do veículo:
Marca: ${vehicle.brand}
Modelo: ${vehicle.model}
Ano: ${vehicle.manufacturing_year}/${vehicle.model_year}
Placa: ${vehicle.plate || "N/I"}
KM: ${vehicle.current_km?.toLocaleString("pt-BR") || "N/I"}
Preço de Compra: R$ ${vehicle.purchase_price?.toLocaleString("pt-BR") || "N/I"}
Preço FIPE: R$ ${vehicle.fipe_price?.toLocaleString("pt-BR") || "N/I"}
Preço de Venda: R$ ${vehicle.price?.toLocaleString("pt-BR") || "Não definido"}
Custos (R$ ${totalCosts.toLocaleString("pt-BR")}):
${costsList}
Total Investido: R$ ${((vehicle.purchase_price || 0) + totalCosts).toLocaleString("pt-BR")}`;
    }

    case "add_vehicle": {
      const { brand, model, purchase_price, plate, current_km, manufacturing_year, model_year } = args as any;

      if (typeof brand !== "string" || typeof model !== "string" || typeof purchase_price !== "number") {
        return "Erro de validação: 'brand' e 'model' devem ser texto, e 'purchase_price' deve ser um número válido.";
      }

      const { data, error } = await supabase
        .from("products")
        .insert({
          user_id: userId,
          brand,
          model,
          title: `${brand} ${model}`,
          purchase_price,
          plate: plate || null,
          current_km: current_km || null,
          manufacturing_year: manufacturing_year || null,
          model_year: model_year || null,
          stock_entry_date: new Date().toISOString(),
          sold: false,
        })
        .select()
        .single();

      if (error) return `Erro ao adicionar veículo: ${error.message}`;
      return `Veículo adicionado com sucesso! ${brand} ${model} - ID: ${data.id}. Preço de compra: R$ ${purchase_price.toLocaleString("pt-BR")}`;
    }

    case "search_fipe": {
      const { brand_name, model_name } = args as any;
      try {
        const brandsRes = await fetch(`${FIPE_API_URL}/cars/brands`);
        const brands = await brandsRes.json();
        const brand = brands.find((b: any) => b.name.toLowerCase().includes(brand_name.toLowerCase()));
        if (!brand) return `Marca "${brand_name}" não encontrada na tabela FIPE.`;

        const modelsRes = await fetch(`${FIPE_API_URL}/cars/brands/${brand.code}/models`);
        const models = await modelsRes.json();
        const model = models.find((m: any) => m.name.toLowerCase().includes(model_name.toLowerCase()));
        if (!model) return `Modelo "${model_name}" não encontrado para a marca ${brand.name}.`;

        const yearsRes = await fetch(`${FIPE_API_URL}/cars/brands/${brand.code}/models/${model.code}/years`);
        const years = await yearsRes.json();
        if (!years.length) return "Nenhum ano disponível para este modelo.";

        const priceRes = await fetch(`${FIPE_API_URL}/cars/brands/${brand.code}/models/${model.code}/years/${years[0].code}`);
        const priceData = await priceRes.json();

        return `Tabela FIPE - ${priceData.brand} ${priceData.model}:
Preço: ${priceData.price}
Ano Modelo: ${priceData.modelYear}
Combustível: ${priceData.fuel}
Referência: ${priceData.reference}
Código FIPE: ${priceData.codeFipe}`;
      } catch {
        return "Erro ao consultar a tabela FIPE. Tente novamente.";
      }
    }

    case "get_stock_summary": {
      const { data: vehicles } = await supabase
        .from("products")
        .select("brand, model, purchase_price, fipe_price, price")
        .eq("user_id", userId)
        .eq("sold", false);

      if (!vehicles || vehicles.length === 0) return "Estoque vazio. Nenhum veículo cadastrado.";

      const totalInvested = vehicles.reduce((sum: number, v: any) => sum + (v.purchase_price || 0), 0);
      const totalFipe = vehicles.reduce((sum: number, v: any) => sum + (v.fipe_price || 0), 0);
      const mostExpensive = vehicles.reduce((max: any, v: any) => (v.purchase_price || 0) > (max.purchase_price || 0) ? v : max, vehicles[0]);
      const cheapest = vehicles.reduce((min: any, v: any) => (v.purchase_price || 0) < (min.purchase_price || 0) ? v : min, vehicles[0]);

      return `Resumo do Estoque:
Total de veículos: ${vehicles.length}
Valor total investido: R$ ${totalInvested.toLocaleString("pt-BR")}
Valor FIPE total: R$ ${totalFipe.toLocaleString("pt-BR")}
Mais caro: ${mostExpensive.brand} ${mostExpensive.model} - R$ ${mostExpensive.purchase_price?.toLocaleString("pt-BR")}
Mais barato: ${cheapest.brand} ${cheapest.model} - R$ ${cheapest.purchase_price?.toLocaleString("pt-BR")}`;
    }

    case "calculate_min_sale_price": {
      const search = (args.search as string).toLowerCase();
      const { data: vehicles } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", userId)
        .eq("sold", false);

      const vehicle = vehicles?.find((v: any) =>
        v.plate?.toLowerCase() === search ||
        v.id === search ||
        `${v.brand} ${v.model}`.toLowerCase().includes(search)
      );

      if (!vehicle) return "Veículo não encontrado.";

      const { data: costs } = await supabase
        .from("vehicle_costs")
        .select("amount")
        .eq("product_id", vehicle.id);

      const totalCosts = costs?.reduce((sum: number, c: any) => sum + c.amount, 0) || 0;
      const totalInvested = (vehicle.purchase_price || 0) + totalCosts;
      const minPrice = totalInvested * 1.1; // 10% margem mínima

      return `Cálculo de preço mínimo - ${vehicle.brand} ${vehicle.model}:
Preço de compra: R$ ${(vehicle.purchase_price || 0).toLocaleString("pt-BR")}
Custos totais: R$ ${totalCosts.toLocaleString("pt-BR")}
Total investido: R$ ${totalInvested.toLocaleString("pt-BR")}
Margem mínima (10%): R$ ${(totalInvested * 0.1).toLocaleString("pt-BR")}
Preço mínimo de venda: R$ ${minPrice.toLocaleString("pt-BR")}
Preço FIPE: R$ ${(vehicle.fipe_price || 0).toLocaleString("pt-BR")}`;
    }

    default:
      return "Função não reconhecida.";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
    const url = new URL(req.url);
    const secretParam = url.searchParams.get("secret");
    const authHeader = req.headers.get("Authorization");
    
    // Validate Webhook Secret if configured
    if (webhookSecret && secretParam !== webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid webhook secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    // Webhook from UAZAPI - incoming WhatsApp message
    const phone = body.phone || body.from || body.sender;
    const messageText = body.message?.text || body.text || body.body || "";
    const mediaUrl = body.message?.image || body.image || null;

    if (!phone || !messageText) {
      return new Response(JSON.stringify({ error: "No message content" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the store assistant settings by owner phone
    const { data: settingsData } = await supabase
      .from("ai_settings")
      .select("*")
      .eq("agent_type", "store_assistant")
      .eq("owner_phone", phone.replace(/\D/g, ""))
      .eq("enabled", true)
      .single();

    if (!settingsData) {
      return new Response(JSON.stringify({ error: "No settings found for this phone" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = settingsData.user_id;
    const openaiApiKey = settingsData.openai_api_key;

    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create conversation
    let { data: conversation } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", userId)
      .eq("agent_type", "store_assistant")
      .eq("phone_number", phone)
      .single();

    if (!conversation) {
      const { data: newConv } = await supabase
        .from("ai_conversations")
        .insert({
          user_id: userId,
          agent_type: "store_assistant",
          phone_number: phone,
          contact_name: "Dono da Loja",
        })
        .select()
        .single();
      conversation = newConv;
    }

    // Save user message
    await supabase.from("ai_messages").insert({
      conversation_id: conversation.id,
      role: "user",
      content: messageText,
      media_url: mediaUrl,
    });

    // Get recent conversation history
    const { data: recentMessages } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const chatHistory = (recentMessages || []).reverse().map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    // Call OpenAI with function calling
    const systemPrompt = `Você é o assistente de gestão de estoque da loja de veículos. Você ajuda o dono a:
- Consultar veículos em estoque
- Adicionar novos veículos
- Ver detalhes e custos de cada veículo
- Consultar preços na tabela FIPE
- Calcular preço mínimo de venda
- Ver resumo do estoque

Seja direto e objetivo nas respostas. Use formatação simples compatível com WhatsApp (*negrito*, _itálico_). Valores monetários devem ser formatados em Reais (R$).`;

    let openaiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...chatHistory,
    ];

    let assistantResponse = "";
    let maxIterations = 5;

    while (maxIterations > 0) {
      maxIterations--;

      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: openaiMessages,
          tools,
          tool_choice: "auto",
          max_tokens: 1000,
        }),
      });

      const openaiData = await openaiRes.json();
      const choice = openaiData.choices?.[0];

      if (!choice) break;

      const message = choice.message;
      openaiMessages.push(message);

      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          const fnName = toolCall.function.name;
          const fnArgs = JSON.parse(toolCall.function.arguments);
          const result = await executeFunction(fnName, fnArgs, supabase, userId);
          openaiMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result,
          });
        }
      } else {
        assistantResponse = message.content || "";
        break;
      }
    }

    // Save assistant response
    await supabase.from("ai_messages").insert({
      conversation_id: conversation.id,
      role: "assistant",
      content: assistantResponse,
    });

    // Update conversation timestamp
    await supabase
      .from("ai_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation.id);

    // Send response via UAZAPI
    if (settingsData.uazapi_instance_url && settingsData.uazapi_token) {
      await fetch(`${settingsData.uazapi_instance_url}/message/text`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settingsData.uazapi_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, message: assistantResponse }),
      });
    }

    return new Response(JSON.stringify({ success: true, response: assistantResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
