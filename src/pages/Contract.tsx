import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Printer, Plus, FileText, Eye, Save, Download } from "lucide-react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ContractType = "CONSIGNMENT_IN" | "PURCHASE_IN" | "SALE_OUT" | "SERVICE_ORDER";

type StoreInfo = {
  store_name: string;
  cnpj?: string;
  address?: string;
  phone?: string;
  whatsapp_number?: string;
  email?: string;
};

type Vehicle = {
  id: string;
  title: string | null;
  brand: string | null;
  model: string | null;
  plate: string | null;
  renavan: string | null;
  chassis?: string | null;
  manufacturing_year: number | null;
  model_year: number | null;
  current_km: number | null;
  actual_sale_price: number | null;
  purchase_price: number | null;
  price: number | null;
  fipe_price: number | null;
};

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  cnpj: string | null;
  document_type: string | null;
  address: string | null;
};

type Entity = {
  id: string;
  name: string;
  document_num: string | null;
  address: string | null;
  city: string | null;
  rg: string | null;
  cnh: string | null;
  pix_key: string | null;
  phone: string | null;
  email: string | null;
};

type ContractTemplate = {
  id: string;
  name: string;
  contract_type: ContractType;
  body: string;
  is_default: boolean;
};

type TradeIn = {
  brand: string;
  model: string;
  plate: string;
  renavan: string;
  chassis: string;
  motor: string;
  combustivel: string;
  km_entrega: string;
  cor: string;
  value: string;
};

type PaymentMethod = {
  type: "financiamento" | "avista" | "cartao" | "pix" | "boleto" | "troca" | "outro";
  description: string;
  value: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  CONSIGNMENT_IN: "Entrada por Consignacao",
  PURCHASE_IN: "Compra de Veiculo",
  SALE_OUT: "Venda de Veiculo",
  SERVICE_ORDER: "Ordem de Servico",
};

const CONTRACT_TYPES: ContractType[] = [
  "CONSIGNMENT_IN",
  "PURCHASE_IN",
  "SALE_OUT",
  "SERVICE_ORDER",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (value: number | string | null) => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!num || isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
};

const formatDate = (date: Date) =>
  date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

/**
 * Simple string-replace preview — no mustache lib required.
 */
const fillTemplate = (
  body: string,
  entity: Entity | null,
  vehicle: Vehicle | null,
  financial: {
    total_value: string;
    down_payment: string;
    payment_method: string;
    installments: string;
  }
): string => {
  const signDate = new Date().toLocaleDateString("pt-BR");
  const replacements: Record<string, string> = {
    "{{entity.name}}": entity?.name ?? "",
    "{{entity.document_num}}": entity?.document_num ?? "",
    "{{entity.address}}": entity?.address ?? "",
    "{{entity.city}}": entity?.city ?? "",
    "{{entity.rg}}": entity?.rg ?? "",
    "{{entity.cnh}}": entity?.cnh ?? "",
    "{{entity.pix_key}}": entity?.pix_key ?? "",
    "{{vehicle.title}}": vehicle?.title ?? `${vehicle?.brand ?? ""} ${vehicle?.model ?? ""}`.trim(),
    "{{vehicle.plate}}": vehicle?.plate ?? "",
    "{{vehicle.chassis}}": vehicle?.chassis ?? "",
    "{{vehicle.renavam}}": vehicle?.renavan ?? "",
    "{{vehicle.brand}}": vehicle?.brand ?? "",
    "{{vehicle.model}}": vehicle?.model ?? "",
    "{{vehicle.year}}": vehicle
      ? `${vehicle.manufacturing_year ?? ""}/${vehicle.model_year ?? ""}`
      : "",
    "{{contract.total_value}}": financial.total_value
      ? formatCurrency(parseFloat(financial.total_value))
      : "",
    "{{contract.down_payment}}": financial.down_payment
      ? formatCurrency(parseFloat(financial.down_payment))
      : "",
    "{{contract.sign_date}}": signDate,
    "{{contract.payment_method}}": financial.payment_method,
    "{{contract.installments}}": financial.installments,
  };

  let result = body;
  for (const [key, val] of Object.entries(replacements)) {
    result = result.split(key).join(val);
  }
  return result;
};

// ---------------------------------------------------------------------------
// Combobox-like search input for entity / vehicle selection
// ---------------------------------------------------------------------------

function SearchSelect<T extends { id: string }>({
  label,
  placeholder,
  items,
  displayFn,
  subFn,
  selected,
  onSelect,
}: {
  label: string;
  placeholder: string;
  items: T[];
  displayFn: (item: T) => string;
  subFn: (item: T) => string;
  selected: T | null;
  onSelect: (item: T) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = items.filter((item) =>
    displayFn(item).toLowerCase().includes(query.toLowerCase()) ||
    subFn(item).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-2 relative">
      <Label>{label}</Label>
      <Input
        placeholder={placeholder}
        value={query || (selected ? displayFn(selected) : "")}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filtered.slice(0, 20).map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
              onMouseDown={() => {
                onSelect(item);
                setQuery("");
                setOpen(false);
              }}
            >
              <p className="text-sm font-medium">{displayFn(item)}</p>
              <p className="text-xs text-muted-foreground">{subFn(item)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Contract() {
  const [searchParams] = useSearchParams();
  const vehicleIdParam = searchParams.get("vehicle");
  const customerIdParam = searchParams.get("customer");

  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [contractType, setContractType] = useState<ContractType>("SALE_OUT");

  const [loading, setLoading] = useState(true);
  const [showContract, setShowContract] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Trade-in
  const [hasTradeIn, setHasTradeIn] = useState(false);
  const [tradeIn, setTradeIn] = useState<TradeIn>({
    brand: "",
    model: "",
    plate: "",
    renavan: "",
    chassis: "",
    motor: "",
    combustivel: "",
    km_entrega: "",
    cor: "",
    value: "",
  });

  // Payments (legacy)
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [salePrice, setSalePrice] = useState("");

  // New financial fields
  const [totalValue, setTotalValue] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [paymentMethodField, setPaymentMethodField] = useState("");
  const [installments, setInstallments] = useState("");

  // Warranty
  const [warrantyMonths, setWarrantyMonths] = useState("3");
  const [warrantyKm, setWarrantyKm] = useState("3000");

  useEffect(() => {
    loadData();
  }, []);

  // When contract type changes, auto-select default template
  useEffect(() => {
    const defaultTpl = templates.find(
      (t) => t.contract_type === contractType && t.is_default
    );
    if (defaultTpl) {
      setSelectedTemplate(defaultTpl);
    } else {
      const firstMatch = templates.find((t) => t.contract_type === contractType);
      setSelectedTemplate(firstMatch ?? null);
    }
  }, [contractType, templates]);

  const loadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [storeRes, vehiclesRes, customersRes, entitiesRes, templatesRes] =
        await Promise.all([
          supabase
            .from("store_settings")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("products")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("customers")
            .select("*")
            .eq("user_id", user.id)
            .order("name"),
          (supabase as any)
            .from("entities")
            .select("id, name, document_num, address, city, rg, cnh, pix_key, phone, email")
            .eq("user_id", user.id)
            .order("name"),
          (supabase as any)
            .from("contract_templates")
            .select("id, name, contract_type, body, is_default")
            .eq("user_id", user.id)
            .eq("active", true)
            .order("contract_type")
            .order("name"),
        ]);

      if (storeRes.data) {
        setStoreInfo({
          store_name: storeRes.data.store_name || "Minha Loja",
          address: storeRes.data.address || "",
          phone: storeRes.data.phone || storeRes.data.whatsapp_number || "",
          email: storeRes.data.email || "",
        });
      }

      setVehicles(vehiclesRes.data || []);
      setCustomers(customersRes.data || []);
      setEntities(entitiesRes.data || []);
      setTemplates(templatesRes.data || []);

      // Pre-select if params provided
      if (vehicleIdParam) {
        const v = vehiclesRes.data?.find((x: Vehicle) => x.id === vehicleIdParam);
        if (v) {
          setSelectedVehicle(v);
          setSalePrice(String(v.actual_sale_price || v.price || ""));
          setTotalValue(String(v.actual_sale_price || v.price || ""));
        }
      }
      if (customerIdParam) {
        const c = customersRes.data?.find((x: Customer) => x.id === customerIdParam);
        if (c) setSelectedCustomer(c);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVehicle = (vehicleId: string) => {
    const v = vehicles.find((x) => x.id === vehicleId);
    if (v) {
      setSelectedVehicle(v);
      const price = String(v.actual_sale_price || v.price || "");
      setSalePrice(price);
      setTotalValue(price);
    }
  };

  const handleSelectCustomer = (customerId: string) => {
    const c = customers.find((x) => x.id === customerId);
    if (c) setSelectedCustomer(c);
  };

  const addPayment = () => {
    setPayments([...payments, { type: "financiamento", description: "", value: "" }]);
  };

  const updatePayment = (index: number, field: keyof PaymentMethod, value: string) => {
    const updated = [...payments];
    (updated[index] as any)[field] = value;
    setPayments(updated);
  };

  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const generateContract = () => {
    if (!selectedVehicle || !selectedCustomer) {
      toast.error("Selecione um veiculo e um cliente");
      return;
    }
    if (!salePrice) {
      toast.error("Informe o valor de venda");
      return;
    }
    setShowContract(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const exportPDF = async () => {
    const element = document.getElementById('contract-preview');
    if (!element) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`contrato-${contractType}-${Date.now()}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShowPreview = () => {
    if (!selectedTemplate) {
      toast.error("Selecione um template para pre-visualizar");
      return;
    }
    setPreviewOpen(true);
  };

  // ---------------------------------------------------------------------------
  // §7.2 Contract Cascade Automation
  // ---------------------------------------------------------------------------

  async function executeCascade(
    contractType: ContractType,
    entityId: string | null,
    vehicleId: string | null,
    totalValue: number,
    registeredContractId: string
  ) {
    const user_id = (await supabase.auth.getUser()).data.user?.id;

    if (contractType === 'CONSIGNMENT_IN') {
      if (vehicleId) {
        await (supabase as any).from('products').update({
          status: 'quarantine',
          notes: `Consignado via contrato ${registeredContractId}`
        }).eq('id', vehicleId);
      }
    }

    if (contractType === 'PURCHASE_IN') {
      if (vehicleId && entityId) {
        await (supabase as any).from('financial_transactions').insert({
          user_id,
          type: 'expense',
          amount: totalValue,
          description: `Compra de veiculo — contrato ${registeredContractId}`,
          status: 'open',
          due_date: new Date().toISOString().split('T')[0],
          entity_id: entityId,
          vehicle_id: vehicleId,
          dre_mapping_key: 'CMV_VEICULO',
        });
        await (supabase as any).from('products').update({ status: 'active' }).eq('id', vehicleId);
      }
    }

    if (contractType === 'SALE_OUT') {
      if (vehicleId && entityId) {
        await (supabase as any).from('financial_transactions').insert({
          user_id,
          type: 'income',
          amount: totalValue,
          description: `Venda de veiculo — contrato ${registeredContractId}`,
          status: 'open',
          due_date: new Date().toISOString().split('T')[0],
          entity_id: entityId,
          vehicle_id: vehicleId,
          dre_mapping_key: 'RECEITA_BRUTA_VENDA',
        });
        await (supabase as any).from('products').update({
          status: 'sold',
          sold: true,
          actual_sale_price: totalValue,
          sale_date: new Date().toISOString().split('T')[0],
        }).eq('id', vehicleId);
      }
    }

    if (contractType === 'SERVICE_ORDER') {
      if (entityId) {
        await (supabase as any).from('financial_transactions').insert({
          user_id,
          type: 'expense',
          amount: totalValue,
          description: `Ordem de servico — contrato ${registeredContractId}`,
          status: 'open',
          due_date: new Date().toISOString().split('T')[0],
          entity_id: entityId,
          vehicle_id: vehicleId ?? null,
          dre_mapping_key: 'DESPESA_VAR_MANUTENCAO',
        });
      }
    }
  }

  const CASCADE_SUCCESS_MESSAGES: Record<ContractType, string> = {
    CONSIGNMENT_IN: "Veiculo registrado em Consignacao",
    PURCHASE_IN: "Compra registrada — veiculo ativado no estoque",
    SALE_OUT: "Venda registrada — financeiro lancado automaticamente",
    SERVICE_ORDER: "Ordem de servico registrada no financeiro",
  };

  const handleRegisterContract = async () => {
    if (!selectedVehicle) {
      toast.error("Selecione um veiculo");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Nao autenticado");

      const payload: Record<string, any> = {
        user_id: user.id,
        contract_type: contractType,
        product_id: selectedVehicle.id,
        template_id: selectedTemplate?.id ?? null,
        seller_entity_id: selectedEntity?.id ?? null,
        description: `Contrato de ${CONTRACT_TYPE_LABELS[contractType]} - ${
          selectedVehicle.title || `${selectedVehicle.brand} ${selectedVehicle.model}`
        }`,
        notes: selectedTemplate
          ? fillTemplate(selectedTemplate.body, selectedEntity, selectedVehicle, {
              total_value: totalValue,
              down_payment: downPayment,
              payment_method: paymentMethodField,
              installments,
            })
          : null,
      };

      // Map financial fields if columns exist
      if (totalValue) payload.total_value = parseFloat(totalValue);
      if (downPayment) payload.down_payment = parseFloat(downPayment);
      if (paymentMethodField) payload.payment_method = paymentMethodField;
      if (installments) payload.installments = parseInt(installments, 10);

      const { data: insertedRows, error } = await (supabase as any)
        .from("contracts")
        .insert(payload)
        .select("id");

      if (error) throw error;

      const registeredContractId: string = insertedRows?.[0]?.id ?? "unknown";
      const entityId = selectedEntity?.id ?? null;
      const vehicleId = selectedVehicle?.id ?? null;
      const totalValueNum = parseFloat(totalValue) || 0;

      // §7.2 — Cascade side-effects
      await executeCascade(contractType, entityId, vehicleId, totalValueNum, registeredContractId);

      // Auto-arquivar referencia no GED
      await (supabase as any).from('attachments').insert({
        user_id: user.id,
        entity_type: vehicleId ? 'vehicle' : 'entity',
        entity_id: vehicleId ?? entityId,
        file_name: `contrato-${contractType}-${registeredContractId}.pdf`,
        file_url: `contracts/${registeredContractId}`,
        file_type: 'application/pdf',
        description: `Contrato ${CONTRACT_TYPE_LABELS[contractType]} — gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')}`,
        uploaded_by: user.id,
      });

      toast.success(CASCADE_SUCCESS_MESSAGES[contractType]);
    } catch (err: any) {
      toast.error("Erro ao registrar contrato: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const today = new Date();
  const tradeInValue = parseFloat(tradeIn.value) || 0;
  const salePriceNum = parseFloat(salePrice) || 0;

  const paymentLabel: Record<string, string> = {
    financiamento: "Financiamento",
    avista: "A Vista",
    cartao: "Cartao",
    pix: "PIX",
    boleto: "Boleto",
    troca: "Troca",
    outro: "Outro",
  };

  const templatesForType = templates.filter((t) => t.contract_type === contractType);
  const previewText = selectedTemplate
    ? fillTemplate(selectedTemplate.body, selectedEntity, selectedVehicle, {
        total_value: totalValue,
        down_payment: downPayment,
        payment_method: paymentMethodField,
        installments,
      })
    : "";

  if (loading) return <div className="p-6">Carregando...</div>;

  // ---- CONTRACT FORM ----
  if (!showContract) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Gerar Contrato</h1>
        </div>

        {/* Contract Type + Template Selection */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-bold text-lg">Tipo de Contrato e Template</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo de contrato</Label>
                <Select
                  value={contractType}
                  onValueChange={(v) => setContractType(v as ContractType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {CONTRACT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                {templatesForType.length === 0 ? (
                  <p className="text-sm text-muted-foreground pt-2">
                    Nenhum template para este tipo.{" "}
                    <a
                      href="/financeiro/contrato-templates"
                      className="underline text-primary"
                    >
                      Criar template
                    </a>
                  </p>
                ) : (
                  <Select
                    value={selectedTemplate?.id ?? ""}
                    onValueChange={(v) => {
                      const tpl = templates.find((t) => t.id === v);
                      setSelectedTemplate(tpl ?? null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templatesForType.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                          {t.is_default && " (padrao)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            {selectedTemplate && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleShowPreview}>
                  <Eye className="h-4 w-4 mr-1" />
                  Pre-visualizar template preenchido
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Veiculo */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-bold text-lg">Veiculo</h2>
              <SearchSelect
                label="Selecione o veiculo"
                placeholder="Buscar veiculo por nome ou placa..."
                items={vehicles}
                displayFn={(v) => v.title || `${v.brand} ${v.model}`}
                subFn={(v) => v.plate || "Sem placa"}
                selected={selectedVehicle}
                onSelect={(v) => handleSelectVehicle(v.id)}
              />
              {selectedVehicle && (
                <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
                  <p>
                    <strong>Veiculo:</strong>{" "}
                    {selectedVehicle.title ||
                      `${selectedVehicle.brand} ${selectedVehicle.model}`}
                  </p>
                  <p>
                    <strong>Placa:</strong> {selectedVehicle.plate || "-"}
                  </p>
                  <p>
                    <strong>Ano:</strong> {selectedVehicle.manufacturing_year}/
                    {selectedVehicle.model_year}
                  </p>
                  <p>
                    <strong>RENAVAM:</strong> {selectedVehicle.renavan || "-"}
                  </p>
                  <p>
                    <strong>KM:</strong>{" "}
                    {selectedVehicle.current_km?.toLocaleString() || "-"}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Valor de Venda (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={salePrice}
                  onChange={(e) => {
                    setSalePrice(e.target.value);
                    setTotalValue(e.target.value);
                  }}
                  placeholder="0.00"
                />
              </div>
            </CardContent>
          </Card>

          {/* Cliente */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-bold text-lg">Cliente</h2>
              <div className="space-y-2">
                <Label>Selecione o cliente</Label>
                <Select
                  value={selectedCustomer?.id || ""}
                  onValueChange={handleSelectCustomer}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} - {c.cpf || c.cnpj || c.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedCustomer && (
                <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
                  <p>
                    <strong>Nome:</strong> {selectedCustomer.name}
                  </p>
                  <p>
                    <strong>CPF/CNPJ:</strong>{" "}
                    {selectedCustomer.cpf || selectedCustomer.cnpj || "-"}
                  </p>
                  <p>
                    <strong>Email:</strong> {selectedCustomer.email}
                  </p>
                  <p>
                    <strong>Telefone:</strong> {selectedCustomer.phone || "-"}
                  </p>
                  <p>
                    <strong>Endereco:</strong> {selectedCustomer.address || "-"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Entity Selector (for template variables) */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="font-bold text-lg">Entidade do Contrato</h2>
              <p className="text-sm text-muted-foreground">
                Entidade usada para preencher as variaveis do template ({"{{entity.name}}"} etc)
              </p>
            </div>
            <SearchSelect
              label="Buscar entidade"
              placeholder="Buscar por nome ou documento..."
              items={entities}
              displayFn={(e) => e.name}
              subFn={(e) => e.document_num || e.email || ""}
              selected={selectedEntity}
              onSelect={(e) => setSelectedEntity(e)}
            />
            {selectedEntity && (
              <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
                <p>
                  <strong>Nome:</strong> {selectedEntity.name}
                </p>
                {selectedEntity.document_num && (
                  <p>
                    <strong>Documento:</strong> {selectedEntity.document_num}
                  </p>
                )}
                {selectedEntity.address && (
                  <p>
                    <strong>Endereco:</strong> {selectedEntity.address}
                    {selectedEntity.city ? `, ${selectedEntity.city}` : ""}
                  </p>
                )}
                {selectedEntity.phone && (
                  <p>
                    <strong>Telefone:</strong> {selectedEntity.phone}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Fields */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-bold text-lg">Dados Financeiros do Contrato</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Valor Total (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={totalValue}
                  onChange={(e) => {
                    setTotalValue(e.target.value);
                    setSalePrice(e.target.value);
                  }}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Entrada / Sinal (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={downPayment}
                  onChange={(e) => setDownPayment(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select
                  value={paymentMethodField}
                  onValueChange={setPaymentMethodField}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Financiamento">Financiamento</SelectItem>
                    <SelectItem value="A Vista">A Vista</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Cartao">Cartao</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Consorcio">Consorcio</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Input
                  type="number"
                  min="1"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  placeholder="Ex: 48"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Troca */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <h2 className="font-bold text-lg">Veiculo de Troca</h2>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasTradeIn}
                  onChange={(e) => setHasTradeIn(e.target.checked)}
                  className="rounded"
                />
                Tem troca
              </label>
            </div>
            {hasTradeIn && (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Input
                    value={tradeIn.brand}
                    onChange={(e) => setTradeIn({ ...tradeIn, brand: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Input
                    value={tradeIn.model}
                    onChange={(e) => setTradeIn({ ...tradeIn, model: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Placa</Label>
                  <Input
                    value={tradeIn.plate}
                    onChange={(e) => setTradeIn({ ...tradeIn, plate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>RENAVAM</Label>
                  <Input
                    value={tradeIn.renavan}
                    onChange={(e) => setTradeIn({ ...tradeIn, renavan: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Chassis</Label>
                  <Input
                    value={tradeIn.chassis}
                    onChange={(e) => setTradeIn({ ...tradeIn, chassis: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Motor</Label>
                  <Input
                    value={tradeIn.motor}
                    onChange={(e) => setTradeIn({ ...tradeIn, motor: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Combustivel</Label>
                  <Input
                    value={tradeIn.combustivel}
                    onChange={(e) =>
                      setTradeIn({ ...tradeIn, combustivel: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>KM</Label>
                  <Input
                    value={tradeIn.km_entrega}
                    onChange={(e) =>
                      setTradeIn({ ...tradeIn, km_entrega: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Input
                    value={tradeIn.cor}
                    onChange={(e) => setTradeIn({ ...tradeIn, cor: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor da Troca (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={tradeIn.value}
                    onChange={(e) => setTradeIn({ ...tradeIn, value: e.target.value })}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formas de Pagamento */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Formas de Pagamento (detalhes)</h2>
              <Button variant="outline" size="sm" onClick={addPayment}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
            {payments.map((payment, i) => (
              <div
                key={i}
                className="grid gap-4 md:grid-cols-4 items-end border-b pb-4"
              >
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={payment.type}
                    onValueChange={(v) => updatePayment(i, "type", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="financiamento">Financiamento</SelectItem>
                      <SelectItem value="avista">A Vista</SelectItem>
                      <SelectItem value="cartao">Cartao</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="troca">Troca</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Descricao</Label>
                  <Input
                    value={payment.description}
                    onChange={(e) => updatePayment(i, "description", e.target.value)}
                    placeholder="Ex: Financiado pelo Banco X"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={payment.value}
                      onChange={(e) => updatePayment(i, "value", e.target.value)}
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="mt-auto"
                    onClick={() => removePayment(i)}
                  >
                    X
                  </Button>
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">
                Nenhuma forma de pagamento adicionada
              </p>
            )}
          </CardContent>
        </Card>

        {/* Garantia */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-bold text-lg">Garantia</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Periodo (meses)</Label>
                <Select value={warrantyMonths} onValueChange={setWarrantyMonths}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sem garantia</SelectItem>
                    <SelectItem value="1">1 mes</SelectItem>
                    <SelectItem value="3">3 meses</SelectItem>
                    <SelectItem value="6">6 meses</SelectItem>
                    <SelectItem value="12">12 meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>KM limite</Label>
                <Input
                  type="number"
                  value={warrantyKm}
                  onChange={(e) => setWarrantyKm(e.target.value)}
                  placeholder="3000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            size="lg"
            variant="outline"
            className="flex-1"
            onClick={handleRegisterContract}
            disabled={saving || !selectedVehicle}
          >
            <Save className="h-5 w-5 mr-2" />
            {saving ? "Registrando..." : "Registrar Contrato"}
          </Button>
          <Button size="lg" className="flex-1" onClick={generateContract}>
            <FileText className="h-5 w-5 mr-2" />
            Gerar Contrato Imprimivel
          </Button>
        </div>

        {/* Template Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pre-visualizacao: {selectedTemplate?.name}</DialogTitle>
              <DialogDescription>
                Template preenchido com os dados selecionados
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <Badge variant="outline" className="mb-3">
                {selectedTemplate
                  ? CONTRACT_TYPE_LABELS[selectedTemplate.contract_type]
                  : ""}
              </Badge>
              <Textarea
                readOnly
                value={previewText}
                className="min-h-[400px] font-mono text-sm bg-muted"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ---- CONTRACT PRINT VIEW ----
  const store = storeInfo || {
    store_name: "NOME DA EMPRESA",
    cnpj: "",
    address: "",
    phone: "",
    email: "",
  };

  return (
    <div className="p-6">
      <div className="print:hidden mb-4 flex gap-4 justify-end">
        <Button variant="outline" onClick={() => setShowContract(false)}>
          Voltar
        </Button>
        <Button variant="outline" onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" /> Imprimir
        </Button>
        <Button onClick={exportPDF} disabled={isExporting} className="gap-2">
          <Download className="h-4 w-4" /> {isExporting ? "Exportando..." : "Exportar PDF"}
        </Button>
      </div>

      <div id="contract-preview">
      <Card className="max-w-4xl mx-auto print:shadow-none print:border-0">
        <CardContent className="p-8 print:p-12 space-y-6 text-sm">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold uppercase">{store.store_name}</h1>
              {store.cnpj && <p className="text-muted-foreground">CNPJ: {store.cnpj}</p>}
              {store.address && <p className="text-muted-foreground">{store.address}</p>}
              {store.phone && <p className="text-muted-foreground">Tel: {store.phone}</p>}
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">
                CONTRATO DE{" "}
                {contractType === "SALE_OUT"
                  ? hasTradeIn
                    ? "VENDA COM TROCA"
                    : "VENDA"
                  : CONTRACT_TYPE_LABELS[contractType].toUpperCase()}
              </p>
              <p className="mt-2">{formatDate(today)}</p>
            </div>
          </div>

          {/* Template body (if selected) */}
          {selectedTemplate && previewText && (
            <div className="border rounded-lg p-4">
              <h2 className="font-bold mb-3">CONTRATO</h2>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {previewText}
              </pre>
            </div>
          )}

          {/* Client Data */}
          <div className="border rounded-lg p-4">
            <h2 className="font-bold mb-3">DADOS DO CLIENTE</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="font-semibold">NOME</p>
                <p>{selectedCustomer!.name}</p>
              </div>
              <div>
                <p className="font-semibold">
                  {selectedCustomer!.document_type === "CNPJ" ? "CNPJ" : "CPF"}
                </p>
                <p>{selectedCustomer!.cpf || selectedCustomer!.cnpj || "-"}</p>
              </div>
              <div>
                <p className="font-semibold">TELEFONE</p>
                <p>{selectedCustomer!.phone || "-"}</p>
              </div>
            </div>
            <div className="mt-2">
              <p className="font-semibold">EMAIL</p>
              <p>{selectedCustomer!.email}</p>
            </div>
            <div className="mt-2">
              <p className="font-semibold">ENDERECO</p>
              <p>{selectedCustomer!.address || "-"}</p>
            </div>
          </div>

          {/* Entity Data (if selected) */}
          {selectedEntity && (
            <div className="border rounded-lg p-4">
              <h2 className="font-bold mb-3">ENTIDADE CONTRATADA</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="font-semibold">NOME</p>
                  <p>{selectedEntity.name}</p>
                </div>
                <div>
                  <p className="font-semibold">DOCUMENTO</p>
                  <p>{selectedEntity.document_num || "-"}</p>
                </div>
                <div>
                  <p className="font-semibold">TELEFONE</p>
                  <p>{selectedEntity.phone || "-"}</p>
                </div>
              </div>
              {selectedEntity.address && (
                <div className="mt-2">
                  <p className="font-semibold">ENDERECO</p>
                  <p>
                    {selectedEntity.address}
                    {selectedEntity.city ? `, ${selectedEntity.city}` : ""}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Sale Vehicle */}
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <h2 className="font-bold">VEICULO</h2>
              <div className="bg-gray-700 text-white px-4 py-2 rounded">
                <p>VALOR: {formatCurrency(salePrice)}</p>
              </div>
            </div>
            <p className="mb-3">
              {contractType === "SALE_OUT"
                ? `Vendido pela ${store.store_name} ao cliente`
                : contractType === "PURCHASE_IN"
                ? `Comprado de ${selectedEntity?.name || "vendedor"} pela ${store.store_name}`
                : contractType === "CONSIGNMENT_IN"
                ? `Recebido em consignacao de ${selectedEntity?.name || "proprietario"}`
                : `Veiculo para ordem de servico`}
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="font-semibold">VEICULO</p>
                <p>
                  {selectedVehicle!.title ||
                    `${selectedVehicle!.brand} ${selectedVehicle!.model}`}
                </p>
              </div>
              <div>
                <p className="font-semibold">PLACA</p>
                <p>{selectedVehicle!.plate || "-"}</p>
              </div>
              <div>
                <p className="font-semibold">ANO</p>
                <p>
                  {selectedVehicle!.manufacturing_year}/{selectedVehicle!.model_year}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div>
                <p className="font-semibold">RENAVAM</p>
                <p>{selectedVehicle!.renavan || "-"}</p>
              </div>
              <div>
                <p className="font-semibold">KM</p>
                <p>{selectedVehicle!.current_km?.toLocaleString() || "-"}</p>
              </div>
              <div></div>
            </div>
          </div>

          {/* Financial */}
          {(totalValue || downPayment || paymentMethodField) && (
            <div className="border rounded-lg p-4">
              <h2 className="font-bold mb-3">CONDICOES FINANCEIRAS</h2>
              <div className="space-y-2">
                {totalValue && (
                  <div className="flex justify-between border-b pb-2">
                    <span>Valor Total</span>
                    <span className="font-semibold">{formatCurrency(totalValue)}</span>
                  </div>
                )}
                {downPayment && parseFloat(downPayment) > 0 && (
                  <div className="flex justify-between border-b pb-2">
                    <span>Entrada / Sinal</span>
                    <span className="font-semibold">{formatCurrency(downPayment)}</span>
                  </div>
                )}
                {paymentMethodField && (
                  <div className="flex justify-between border-b pb-2">
                    <span>Forma de Pagamento</span>
                    <span className="font-semibold">{paymentMethodField}</span>
                  </div>
                )}
                {installments && parseInt(installments) > 1 && (
                  <div className="flex justify-between pb-2">
                    <span>Parcelas</span>
                    <span className="font-semibold">{installments}x</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Trade-in Vehicle */}
          {hasTradeIn && tradeIn.brand && (
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <h2 className="font-bold">VEICULO DE TROCA</h2>
                <div className="bg-gray-700 text-white px-4 py-2 rounded">
                  <p>VALOR: {formatCurrency(tradeIn.value)}</p>
                </div>
              </div>
              <p className="mb-3">Vendido pelo cliente a {store.store_name}</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="font-semibold">VEICULO</p>
                  <p>
                    {tradeIn.brand} {tradeIn.model}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">PLACA</p>
                  <p>{tradeIn.plate || "-"}</p>
                </div>
                <div>
                  <p className="font-semibold">COR</p>
                  <p>{tradeIn.cor || "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div>
                  <p className="font-semibold">CHASSIS</p>
                  <p>{tradeIn.chassis || "-"}</p>
                </div>
                <div>
                  <p className="font-semibold">RENAVAM</p>
                  <p>{tradeIn.renavan || "-"}</p>
                </div>
                <div>
                  <p className="font-semibold">KM</p>
                  <p>{tradeIn.km_entrega || "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div>
                  <p className="font-semibold">MOTOR</p>
                  <p>{tradeIn.motor || "-"}</p>
                </div>
                <div>
                  <p className="font-semibold">COMBUSTIVEL</p>
                  <p>{tradeIn.combustivel || "-"}</p>
                </div>
                <div></div>
              </div>
            </div>
          )}

          {/* Financial Settlement (legacy payments) */}
          {(payments.length > 0 || salePrice) && (
            <div className="border rounded-lg p-4">
              <h2 className="font-bold mb-3">ACERTO FINANCEIRO</h2>
              <div className="space-y-2">
                <div className="flex justify-between border-b pb-2">
                  <span>Valor de Venda</span>
                  <span className="font-semibold">{formatCurrency(salePrice)}</span>
                </div>
                {hasTradeIn && tradeInValue > 0 && (
                  <div className="flex justify-between border-b pb-2">
                    <span>(-) Valor da Troca</span>
                    <span className="font-semibold text-red-600">
                      - {formatCurrency(tradeIn.value)}
                    </span>
                  </div>
                )}
                {payments.map((p, i) => (
                  <div key={i} className="flex justify-between border-b pb-2">
                    <span>
                      {paymentLabel[p.type]}
                      {p.description ? `: ${p.description}` : ""}
                    </span>
                    <span className="font-semibold">{formatCurrency(p.value)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 text-lg font-bold">
                  <span>VALOR FINAL A PAGAR</span>
                  <span>{formatCurrency(salePriceNum - tradeInValue)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Warranty */}
          {parseInt(warrantyMonths) > 0 && (
            <div className="border rounded-lg p-4">
              <h2 className="font-bold mb-3">CERTIFICADO DE GARANTIA</h2>
              <p className="mb-2">
                <strong>Periodo:</strong> {warrantyMonths}{" "}
                {parseInt(warrantyMonths) === 1 ? "mes" : "meses"} ou{" "}
                {parseInt(warrantyKm).toLocaleString()} km (o que ocorrer primeiro)
              </p>
              <p className="leading-relaxed">
                Tem o presente certificado a finalidade de formalizar as condicoes de garantia do
                veiculo descrito e identificado neste documento. A garantia refere-se a vicios e
                inadequacoes do motor (MOTOR e CAMBIO) e a parte eletrica (CENTRAL ELETRONICA e
                MODULO DE INJECAO), que venham a apresentar defeitos de fabricacao. Durante o
                periodo, nao estao sujeitos a garantia os itens de desgaste natural: direcao,
                polias, bicos e mangueiras, juntas e aneis de vedacao, correias, valvulas, bateria,
                velas, luzes, rolamentos, amortecedores, buchas, bandejas, pivos, terminais, coifas,
                retentores, discos e pastilhas de freio, tambores e lonas, embreagem. NAO estao
                dentro desta garantia qualquer defeito causado por acidentes, colisoes, uso
                inadequado, negligencia, modificacoes, alteracoes, reparos improprios, instalacao de
                pecas nao genuinas. Caso o veiculo apresente algum vicio dentro do prazo
                estabelecido, devera ser comunicado por escrito a revenda no maximo em 24 (vinte e
                quatro) horas apos ter sido detectado.
              </p>
            </div>
          )}

          {/* Delivery Receipt */}
          <div className="border rounded-lg p-4">
            <h2 className="font-bold mb-3">RECIBO DE ENTREGA DO VEICULO</h2>
            <p className="leading-relaxed">
              Declaro para os devidos fins que recebi nesta data o veiculo descrito nesta
              negociacao, bem como as suas chaves e documentos, no estado em que se encontra.
              Declaro ainda ter vistoriado o veiculo, estando o mesmo em perfeito estado de
              funcionamento, inclusive com todos os acessorios originais.
            </p>
          </div>

          {/* Responsibility Term */}
          <div className="border rounded-lg p-4">
            <h2 className="font-bold mb-3">TERMO DE RESPONSABILIDADE</h2>
            <p className="leading-relaxed">
              Declaro estar ciente da minha responsabilidade quanto ao veiculo ora negociado, no
              que tange a questao civil, criminal e eventuais multas no transito, IPVA, alienacao e
              qualquer outro direito legal que incida sobre o veiculo, a partir desta data ate a
              data da efetiva transferencia junto ao Departamento de Transito, me comprometendo a
              quitar os mesmos.
            </p>
          </div>

          {/* Signatures */}
          <div className="mt-12">
            <p className="text-center mb-8">DE ACORDO</p>
            <p className="text-center mb-8">{formatDate(today)}</p>
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center">
                <div className="border-t border-black pt-2 mt-16">
                  <p className="font-bold">{selectedCustomer!.name}</p>
                  <p>
                    {selectedCustomer!.document_type === "CNPJ" ? "CNPJ" : "CPF"}:{" "}
                    {selectedCustomer!.cpf || selectedCustomer!.cnpj || "-"}
                  </p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-black pt-2 mt-16">
                  <p className="font-bold uppercase">{store.store_name}</p>
                  {store.cnpj && <p>CNPJ: {store.cnpj}</p>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8 mt-12">
              <div className="text-center">
                <p className="font-bold mb-4">TESTEMUNHA 1</p>
                <div className="border-t border-black pt-2 mt-8">
                  <p>Nome: ___________________________</p>
                  <p>CPF: ____________________________</p>
                </div>
              </div>
              <div className="text-center">
                <p className="font-bold mb-4">TESTEMUNHA 2</p>
                <div className="border-t border-black pt-2 mt-8">
                  <p>Nome: ___________________________</p>
                  <p>CPF: ____________________________</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
