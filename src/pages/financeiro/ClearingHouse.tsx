import { useState } from "react";
import { hapticFeedback } from "@/utils/haptic";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  Car,
  Building2,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Calendar,
  Search,
  RefreshCw,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Vehicle {
  id: string;
  title: string | null;
  plate: string | null;
  brand: string | null;
  model: string | null;
  price: number | null;
  actual_sale_price: number | null;
}

interface Entity {
  id: string;
  name: string;
  document_num: string | null;
}

interface TradeInData {
  plate: string;
  brand: string;
  model: string;
  year: string;
  value: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const today = () => new Date().toISOString().split("T")[0];

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEPS = [
  "Veículo Vendido",
  "Comprador",
  "Dados da Venda",
  "Veículo de Entrada",
  "Revisão",
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
      {STEPS.map((step, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 ${
            i < currentStep
              ? "text-green-600"
              : i === currentStep
              ? "text-blue-600 font-semibold"
              : "text-gray-400"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 shrink-0 ${
              i < currentStep
                ? "bg-green-100 border-green-500"
                : i === currentStep
                ? "bg-blue-100 border-blue-500"
                : "bg-gray-100 border-gray-300"
            }`}
          >
            {i < currentStep ? "✓" : i + 1}
          </div>
          <span className="text-sm hidden sm:block whitespace-nowrap">{step}</span>
          {i < STEPS.length - 1 && (
            <div className="w-8 h-px bg-gray-300 mx-1 shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ClearingHouse() {
  const queryClient = useQueryClient();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1 – vehicle selection
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Step 2 – buyer selection
  const [buyerSearch, setBuyerSearch] = useState("");
  const [selectedBuyer, setSelectedBuyer] = useState<Entity | null>(null);

  // Step 3 – sale data
  const [salePrice, setSalePrice] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "transfer">("pix");

  // Step 4 – trade-in vehicle
  const [tradeIn, setTradeIn] = useState<TradeInData>({
    plate: "",
    brand: "",
    model: "",
    year: "",
    value: "",
  });

  // Confirmation loading
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["active-vehicles"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, title, plate, brand, model, price, actual_sale_price")
        .eq("user_id", user.id)
        .eq("sold", false)
        .eq("status", "active");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: entities = [] } = useQuery<Entity[]>({
    queryKey: ["entities"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("entities")
        .select("id, name, document_num")
        .eq("user_id", user.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const salePriceNum = parseFloat(salePrice.replace(",", ".")) || 0;
  const cashAmountNum = parseFloat(cashAmount.replace(",", ".")) || 0;
  const tradeInValueNum = parseFloat(tradeIn.value.replace(",", ".")) || 0;
  const tradeInCoverage = salePriceNum - cashAmountNum;

  const filteredVehicles = vehicles.filter((v) => {
    const q = vehicleSearch.toLowerCase();
    return (
      v.plate?.toLowerCase().includes(q) ||
      v.title?.toLowerCase().includes(q) ||
      v.brand?.toLowerCase().includes(q) ||
      v.model?.toLowerCase().includes(q)
    );
  });

  const filteredEntities = entities.filter((e) => {
    const q = buyerSearch.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      e.document_num?.toLowerCase().includes(q)
    );
  });

  // ---------------------------------------------------------------------------
  // ACID transaction
  // ---------------------------------------------------------------------------

  const runPermuta = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      if (!selectedVehicle) throw new Error("Veículo vendido não selecionado");
      if (!selectedBuyer) throw new Error("Comprador não selecionado");

      const uid = user.id;

      // 1) Get income category
      const { data: catData } = await (supabase as any)
        .from("chart_of_accounts")
        .select("id")
        .eq("user_id", uid)
        .eq("dre_mapping_key", "RECEITA_BRUTA_VENDA")
        .limit(1);
      const incomeCategoryId = catData?.[0]?.id ?? null;

      // 2) Get consignment owner (if any)
      const { data: ownerData } = await (supabase as any)
        .from("vehicle_owners")
        .select("entity_id, equity_percentage")
        .eq("vehicle_id", selectedVehicle.id)
        .eq("ownership_type", "consigned")
        .is("exit_date", null);
      const consignmentOwner = ownerData?.[0] ?? null;

      // 3) Get refundable costs
      let refundableSum = 0;
      if (consignmentOwner) {
        const { data: costsData } = await (supabase as any)
          .from("financial_transactions")
          .select("amount")
          .eq("vehicle_id", selectedVehicle.id)
          .eq("is_refundable", true)
          .is("deleted_at", null);
        refundableSum = (costsData ?? []).reduce(
          (acc: number, r: { amount: number }) => acc + (r.amount ?? 0),
          0
        );
      }

      // -----------------------------------------------------------------------
      // Sequential writes – if any fails we throw and show error
      // -----------------------------------------------------------------------

      // Step A: Update sold vehicle
      const { error: updateErr } = await supabase
        .from("products")
        .update({
          sold: true,
          status: "sold",
          actual_sale_price: salePriceNum,
          sale_date: today(),
        } as any)
        .eq("id", selectedVehicle.id);
      if (updateErr) throw new Error("Erro ao atualizar veículo vendido: " + updateErr.message);

      // Step B: Insert trade-in vehicle
      const tradeInTitle = `${tradeIn.brand} ${tradeIn.model} ${tradeIn.year}`.trim();
      const { data: newVehicleData, error: insertVehicleErr } = await supabase
        .from("products")
        .insert({
          user_id: uid,
          plate: tradeIn.plate.toUpperCase(),
          brand: tradeIn.brand,
          model: tradeIn.model,
          year: parseInt(tradeIn.year) || null,
          purchase_price: tradeInValueNum,
          status: "active",
          sold: false,
          title: tradeInTitle,
          notes: JSON.stringify({ fiscal_grace_days_remaining: 15, permuta_origem: selectedVehicle.id }),
        } as any)
        .select("id")
        .single();
      if (insertVehicleErr)
        throw new Error("Erro ao inserir veículo de entrada: " + insertVehicleErr.message);

      // Step C: Insert income transaction (cash portion)
      if (cashAmountNum > 0) {
        const { error: incomeErr } = await (supabase as any)
          .from("financial_transactions")
          .insert({
            user_id: uid,
            vehicle_id: selectedVehicle.id,
            entity_id: selectedBuyer.id,
            type: "income",
            amount: cashAmountNum,
            status: "open",
            due_date: today(),
            payment_method: paymentMethod,
            description: "Venda - " + (selectedVehicle.title ?? selectedVehicle.plate),
            account_category_id: incomeCategoryId,
          });
        if (incomeErr)
          throw new Error("Erro ao inserir receita: " + incomeErr.message);
      }

      // Step D: Insert consignment payout (expense/payable) if applicable
      if (consignmentOwner && salePriceNum > 0) {
        const equity = (consignmentOwner.equity_percentage ?? 100) / 100;
        const payout = salePriceNum * equity - refundableSum;
        if (payout > 0) {
          const { error: expErr } = await (supabase as any)
            .from("financial_transactions")
            .insert({
              user_id: uid,
              vehicle_id: selectedVehicle.id,
              entity_id: consignmentOwner.entity_id,
              type: "expense",
              amount: payout,
              status: "open",
              due_date: today(),
              description:
                "Repasse consignante - " +
                (selectedVehicle.title ?? selectedVehicle.plate),
              account_category_id: null,
            });
          if (expErr)
            throw new Error(
              "Erro ao inserir repasse consignante: " + expErr.message
            );
        }
      }

      return { newVehicleId: newVehicleData?.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-vehicles"] });
      setIsDone(true);
      hapticFeedback('success');
      toast.success("Permuta registrada com sucesso!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao registrar permuta. Contate o suporte.");
    },
  });

  // ---------------------------------------------------------------------------
  // Step navigation helpers
  // ---------------------------------------------------------------------------

  const canProceed = () => {
    if (currentStep === 0) return !!selectedVehicle;
    if (currentStep === 1) return !!selectedBuyer;
    if (currentStep === 2)
      return salePriceNum > 0 && cashAmountNum >= 0 && tradeInCoverage >= 0;
    if (currentStep === 3)
      return (
        tradeIn.plate.trim() !== "" &&
        tradeIn.brand.trim() !== "" &&
        tradeIn.model.trim() !== "" &&
        tradeIn.year.trim() !== "" &&
        tradeInValueNum > 0
      );
    return true;
  };

  const next = () => {
    if (canProceed()) setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setCurrentStep((s) => Math.max(s - 1, 0));

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  const resetAll = () => {
    setCurrentStep(0);
    setSelectedVehicle(null);
    setSelectedBuyer(null);
    setSalePrice("");
    setCashAmount("");
    setPaymentMethod("pix");
    setTradeIn({ plate: "", brand: "", model: "", year: "", value: "" });
    setVehicleSearch("");
    setBuyerSearch("");
    setIsDone(false);
  };

  // ---------------------------------------------------------------------------
  // Render: success screen
  // ---------------------------------------------------------------------------

  if (isDone) {
    return (
      <div className="p-6">
        <div className="max-w-xl mx-auto mt-12 text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold text-green-700">Permuta Concluída!</h2>
          <p className="text-muted-foreground">
            Todas as operações foram registradas com sucesso.
          </p>
          <Button onClick={resetAll} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Nova Permuta
          </Button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: wizard
  // ---------------------------------------------------------------------------

  return (
    <div className="p-6">

      <div className="flex items-center gap-3 mb-6">
        <ArrowLeftRight className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Clearing House (Permuta)</h1>
          <p className="text-muted-foreground text-sm">
            Operação triangular: venda + troca de veículo + geração de lançamentos
          </p>
        </div>
      </div>

      <StepIndicator currentStep={currentStep} />

      {/* ------------------------------------------------------------------ */}
      {/* Step 0: Select vehicle to sell                                      */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" /> Selecionar Veículo Vendido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por placa, marca ou modelo..."
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
              />
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {filteredVehicles.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum veículo ativo encontrado.
                </p>
              )}
              {filteredVehicles.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVehicle(v)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selectedVehicle?.id === v.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{v.title ?? `${v.brand} ${v.model}`}</span>
                      {v.plate && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {v.plate}
                        </Badge>
                      )}
                    </div>
                    {v.price != null && (
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(v.price)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 1: Select buyer entity                                          */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Selecionar Comprador
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nome ou CPF/CNPJ..."
                value={buyerSearch}
                onChange={(e) => setBuyerSearch(e.target.value)}
              />
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {filteredEntities.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhuma entidade encontrada.
                </p>
              )}
              {filteredEntities.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelectedBuyer(e)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selectedBuyer?.id === e.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <div className="font-medium">{e.name}</div>
                  {e.document_num && (
                    <div className="text-xs text-muted-foreground">{e.document_num}</div>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 2: Sale data                                                    */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> Dados da Venda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Preço Total da Venda (R$)</Label>
                <Input
                  placeholder="Ex: 45000"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Valor em Dinheiro (Pix/Transferência)</Label>
                <Input
                  placeholder="Ex: 15000"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Forma de Pagamento do Dinheiro</Label>
              <div className="flex gap-3">
                {(["pix", "transfer"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                      paymentMethod === m
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {m === "pix" ? "PIX" : "Transferência"}
                  </button>
                ))}
              </div>
            </div>

            {salePriceNum > 0 && (
              <div className="rounded-lg bg-muted p-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preço total:</span>
                  <span className="font-medium">{formatCurrency(salePriceNum)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parte em dinheiro:</span>
                  <span className="font-medium">{formatCurrency(cashAmountNum)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="text-muted-foreground">Cobertura pela troca:</span>
                  <span className={`font-semibold ${tradeInCoverage < 0 ? "text-red-600" : "text-blue-600"}`}>
                    {formatCurrency(tradeInCoverage)}
                  </span>
                </div>
              </div>
            )}

            {tradeInCoverage < 0 && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-md p-3">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                O valor em dinheiro excede o preço total da venda.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 3: Trade-in vehicle                                             */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" /> Veículo de Entrada (Troca)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Placa</Label>
                <Input
                  placeholder="ABC-1234"
                  value={tradeIn.plate}
                  onChange={(e) =>
                    setTradeIn((prev) => ({ ...prev, plate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Marca</Label>
                <Input
                  placeholder="Ex: Toyota"
                  value={tradeIn.brand}
                  onChange={(e) =>
                    setTradeIn((prev) => ({ ...prev, brand: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Modelo</Label>
                <Input
                  placeholder="Ex: Corolla"
                  value={tradeIn.model}
                  onChange={(e) =>
                    setTradeIn((prev) => ({ ...prev, model: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Ano</Label>
                <Input
                  placeholder="Ex: 2020"
                  value={tradeIn.year}
                  onChange={(e) =>
                    setTradeIn((prev) => ({ ...prev, year: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Valor da Troca (R$)</Label>
                <Input
                  placeholder="Ex: 30000"
                  value={tradeIn.value}
                  onChange={(e) =>
                    setTradeIn((prev) => ({ ...prev, value: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2 p-3 rounded-lg border border-yellow-300 bg-yellow-50">
              <Calendar className="h-5 w-5 text-yellow-600 shrink-0" />
              <div className="text-sm">
                <span className="font-semibold text-yellow-700">Trava Fiscal – </span>
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 ml-1">
                  15 dias de carência
                </Badge>
                <p className="text-yellow-700 mt-0.5">
                  O veículo de entrada terá 15 dias para regularização fiscal dos documentos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 4: Review & confirm                                             */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> Revisão e Confirmação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sold vehicle */}
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Veículo Vendido
              </h3>
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-red-500" />
                <span className="font-medium">{selectedVehicle?.title}</span>
                {selectedVehicle?.plate && (
                  <Badge variant="outline">{selectedVehicle.plate}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Status será alterado para <strong>Vendido</strong>
              </p>
            </div>

            {/* Buyer */}
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Comprador
              </h3>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{selectedBuyer?.name}</span>
              </div>
            </div>

            {/* Financial summary */}
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Resumo Financeiro
              </h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preço de venda:</span>
                  <span className="font-semibold">{formatCurrency(salePriceNum)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Entrada em dinheiro ({paymentMethod === "pix" ? "PIX" : "Transferência"}):
                  </span>
                  <span>{formatCurrency(cashAmountNum)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cobertura pela troca:</span>
                  <span>{formatCurrency(tradeInCoverage)}</span>
                </div>
              </div>
            </div>

            {/* Trade-in vehicle */}
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                Veículo de Entrada
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs normal-case">
                  Trava Fiscal 15 dias
                </Badge>
              </h3>
              <div className="grid grid-cols-2 gap-1 text-sm">
                <span className="text-muted-foreground">Placa:</span>
                <span className="font-medium">{tradeIn.plate.toUpperCase()}</span>
                <span className="text-muted-foreground">Veículo:</span>
                <span>
                  {tradeIn.brand} {tradeIn.model} {tradeIn.year}
                </span>
                <span className="text-muted-foreground">Valor atribuído:</span>
                <span className="font-semibold">{formatCurrency(tradeInValueNum)}</span>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3 border border-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Esta operação é <strong>irreversível</strong>. Todos os lançamentos financeiros
                e atualizações de estoque serão registrados. Em caso de erro, contate o suporte.
              </p>
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={runPermuta.isPending || isProcessing}
              onClick={() => {
                setIsProcessing(true);
                runPermuta.mutate(undefined, {
                  onSettled: () => setIsProcessing(false),
                });
              }}
            >
              {runPermuta.isPending || isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmar Permuta
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Navigation buttons                                                   */}
      {/* ------------------------------------------------------------------ */}
      {currentStep < STEPS.length - 1 && (
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={back} disabled={currentStep === 0}>
            Voltar
          </Button>
          <Button onClick={next} disabled={!canProceed()}>
            Próximo
          </Button>
        </div>
      )}
      {currentStep === STEPS.length - 1 && (
        <div className="mt-4">
          <Button variant="outline" onClick={back}>
            Voltar
          </Button>
        </div>
      )}
    </div>
  );
}
