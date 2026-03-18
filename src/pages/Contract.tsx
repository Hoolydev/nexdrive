import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Printer, Plus, FileText } from "lucide-react";
import { toast } from "sonner";

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

export default function Contract() {
  const [searchParams] = useSearchParams();
  const vehicleIdParam = searchParams.get("vehicle");
  const customerIdParam = searchParams.get("customer");

  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContract, setShowContract] = useState(false);

  // Trade-in
  const [hasTradeIn, setHasTradeIn] = useState(false);
  const [tradeIn, setTradeIn] = useState<TradeIn>({
    brand: "", model: "", plate: "", renavan: "", chassis: "",
    motor: "", combustivel: "", km_entrega: "", cor: "", value: "",
  });

  // Payments
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [salePrice, setSalePrice] = useState("");

  // Warranty
  const [warrantyMonths, setWarrantyMonths] = useState("3");
  const [warrantyKm, setWarrantyKm] = useState("3000");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [storeRes, vehiclesRes, customersRes] = await Promise.all([
        supabase.from("store_settings").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("products").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("customers").select("*").eq("user_id", user.id).order("name"),
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

      // Pre-select if params provided
      if (vehicleIdParam) {
        const v = vehiclesRes.data?.find((x: Vehicle) => x.id === vehicleIdParam);
        if (v) {
          setSelectedVehicle(v);
          setSalePrice(String(v.actual_sale_price || v.price || ""));
        }
      }
      if (customerIdParam) {
        const c = customersRes.data?.find((x: Customer) => x.id === customerIdParam);
        if (c) setSelectedCustomer(c);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVehicle = (vehicleId: string) => {
    const v = vehicles.find(x => x.id === vehicleId);
    if (v) {
      setSelectedVehicle(v);
      setSalePrice(String(v.actual_sale_price || v.price || ""));
    }
  };

  const handleSelectCustomer = (customerId: string) => {
    const c = customers.find(x => x.id === customerId);
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

  const formatCurrency = (value: number | string | null) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (!num || isNaN(num)) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const today = new Date();
  const tradeInValue = parseFloat(tradeIn.value) || 0;
  const salePriceNum = parseFloat(salePrice) || 0;
  const totalPayments = payments.reduce((s, p) => s + (parseFloat(p.value) || 0), 0);
  const paymentLabel: Record<string, string> = {
    financiamento: "Financiamento", avista: "A Vista", cartao: "Cartao",
    pix: "PIX", boleto: "Boleto", troca: "Troca", outro: "Outro",
  };

  if (loading) return <div className="p-6">Carregando...</div>;

  // --- CONTRACT FORM ---
  if (!showContract) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Gerar Contrato</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Veiculo */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-bold text-lg">Veiculo</h2>
              <div className="space-y-2">
                <Label>Selecione o veiculo</Label>
                <Select value={selectedVehicle?.id || ""} onValueChange={handleSelectVehicle}>
                  <SelectTrigger><SelectValue placeholder="Escolha um veiculo..." /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.title || `${v.brand} ${v.model}`} - {v.plate || "Sem placa"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedVehicle && (
                <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
                  <p><strong>Veiculo:</strong> {selectedVehicle.title || `${selectedVehicle.brand} ${selectedVehicle.model}`}</p>
                  <p><strong>Placa:</strong> {selectedVehicle.plate || "-"}</p>
                  <p><strong>Ano:</strong> {selectedVehicle.manufacturing_year}/{selectedVehicle.model_year}</p>
                  <p><strong>RENAVAM:</strong> {selectedVehicle.renavan || "-"}</p>
                  <p><strong>KM:</strong> {selectedVehicle.current_km?.toLocaleString() || "-"}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Valor de Venda (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={salePrice}
                  onChange={e => setSalePrice(e.target.value)}
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
                <Select value={selectedCustomer?.id || ""} onValueChange={handleSelectCustomer}>
                  <SelectTrigger><SelectValue placeholder="Escolha um cliente..." /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} - {c.cpf || c.cnpj || c.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedCustomer && (
                <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
                  <p><strong>Nome:</strong> {selectedCustomer.name}</p>
                  <p><strong>CPF/CNPJ:</strong> {selectedCustomer.cpf || selectedCustomer.cnpj || "-"}</p>
                  <p><strong>Email:</strong> {selectedCustomer.email}</p>
                  <p><strong>Telefone:</strong> {selectedCustomer.phone || "-"}</p>
                  <p><strong>Endereco:</strong> {selectedCustomer.address || "-"}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Troca */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <h2 className="font-bold text-lg">Veiculo de Troca</h2>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasTradeIn}
                  onChange={e => setHasTradeIn(e.target.checked)}
                  className="rounded"
                />
                Tem troca
              </label>
            </div>
            {hasTradeIn && (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Input value={tradeIn.brand} onChange={e => setTradeIn({ ...tradeIn, brand: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Input value={tradeIn.model} onChange={e => setTradeIn({ ...tradeIn, model: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Placa</Label>
                  <Input value={tradeIn.plate} onChange={e => setTradeIn({ ...tradeIn, plate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>RENAVAM</Label>
                  <Input value={tradeIn.renavan} onChange={e => setTradeIn({ ...tradeIn, renavan: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Chassis</Label>
                  <Input value={tradeIn.chassis} onChange={e => setTradeIn({ ...tradeIn, chassis: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Motor</Label>
                  <Input value={tradeIn.motor} onChange={e => setTradeIn({ ...tradeIn, motor: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Combustivel</Label>
                  <Input value={tradeIn.combustivel} onChange={e => setTradeIn({ ...tradeIn, combustivel: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>KM</Label>
                  <Input value={tradeIn.km_entrega} onChange={e => setTradeIn({ ...tradeIn, km_entrega: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Input value={tradeIn.cor} onChange={e => setTradeIn({ ...tradeIn, cor: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Valor da Troca (R$)</Label>
                  <Input type="number" step="0.01" value={tradeIn.value} onChange={e => setTradeIn({ ...tradeIn, value: e.target.value })} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formas de Pagamento */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Formas de Pagamento</h2>
              <Button variant="outline" size="sm" onClick={addPayment}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
            {payments.map((payment, i) => (
              <div key={i} className="grid gap-4 md:grid-cols-4 items-end border-b pb-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={payment.type} onValueChange={v => updatePayment(i, "type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                    onChange={e => updatePayment(i, "description", e.target.value)}
                    placeholder="Ex: Financiado pelo Banco X"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input type="number" step="0.01" value={payment.value} onChange={e => updatePayment(i, "value", e.target.value)} />
                  </div>
                  <Button variant="destructive" size="sm" className="mt-auto" onClick={() => removePayment(i)}>X</Button>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Input type="number" value={warrantyKm} onChange={e => setWarrantyKm(e.target.value)} placeholder="3000" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button size="lg" className="w-full" onClick={generateContract}>
          <FileText className="h-5 w-5 mr-2" />
          Gerar Contrato
        </Button>
      </div>
    );
  }

  // --- CONTRACT PRINT VIEW ---
  const store = storeInfo || { store_name: "NOME DA EMPRESA", cnpj: "", address: "", phone: "", email: "" };

  return (
    <div className="p-6">
      <div className="print:hidden mb-4 flex gap-4 justify-end">
        <Button variant="outline" onClick={() => setShowContract(false)}>Voltar</Button>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" /> Imprimir Contrato
        </Button>
      </div>

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
              <p className="text-lg font-bold">CONTRATO DE {hasTradeIn ? "VENDA COM TROCA" : "VENDA"}</p>
              <p className="mt-2">{formatDate(today)}</p>
            </div>
          </div>

          {/* Client Data */}
          <div className="border rounded-lg p-4">
            <h2 className="font-bold mb-3">DADOS DO CLIENTE</h2>
            <div className="grid grid-cols-3 gap-4">
              <div><p className="font-semibold">NOME</p><p>{selectedCustomer!.name}</p></div>
              <div>
                <p className="font-semibold">{selectedCustomer!.document_type === "CNPJ" ? "CNPJ" : "CPF"}</p>
                <p>{selectedCustomer!.cpf || selectedCustomer!.cnpj || "-"}</p>
              </div>
              <div><p className="font-semibold">TELEFONE</p><p>{selectedCustomer!.phone || "-"}</p></div>
            </div>
            <div className="mt-2"><p className="font-semibold">EMAIL</p><p>{selectedCustomer!.email}</p></div>
            <div className="mt-2"><p className="font-semibold">ENDERECO</p><p>{selectedCustomer!.address || "-"}</p></div>
          </div>

          {/* Sale Vehicle */}
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <h2 className="font-bold">VEICULO DE VENDA</h2>
              <div className="bg-gray-700 text-white px-4 py-2 rounded">
                <p>VALOR: {formatCurrency(salePrice)}</p>
              </div>
            </div>
            <p className="mb-3">Vendido pela {store.store_name} ao cliente</p>
            <div className="grid grid-cols-3 gap-4">
              <div><p className="font-semibold">VEICULO</p><p>{selectedVehicle!.title || `${selectedVehicle!.brand} ${selectedVehicle!.model}`}</p></div>
              <div><p className="font-semibold">PLACA</p><p>{selectedVehicle!.plate || "-"}</p></div>
              <div><p className="font-semibold">ANO</p><p>{selectedVehicle!.manufacturing_year}/{selectedVehicle!.model_year}</p></div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div><p className="font-semibold">RENAVAM</p><p>{selectedVehicle!.renavan || "-"}</p></div>
              <div><p className="font-semibold">KM</p><p>{selectedVehicle!.current_km?.toLocaleString() || "-"}</p></div>
              <div></div>
            </div>
          </div>

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
                <div><p className="font-semibold">VEICULO</p><p>{tradeIn.brand} {tradeIn.model}</p></div>
                <div><p className="font-semibold">PLACA</p><p>{tradeIn.plate || "-"}</p></div>
                <div><p className="font-semibold">COR</p><p>{tradeIn.cor || "-"}</p></div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div><p className="font-semibold">CHASSIS</p><p>{tradeIn.chassis || "-"}</p></div>
                <div><p className="font-semibold">RENAVAM</p><p>{tradeIn.renavan || "-"}</p></div>
                <div><p className="font-semibold">KM</p><p>{tradeIn.km_entrega || "-"}</p></div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div><p className="font-semibold">MOTOR</p><p>{tradeIn.motor || "-"}</p></div>
                <div><p className="font-semibold">COMBUSTIVEL</p><p>{tradeIn.combustivel || "-"}</p></div>
                <div></div>
              </div>
            </div>
          )}

          {/* Financial Settlement */}
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
                  <span className="font-semibold text-red-600">- {formatCurrency(tradeIn.value)}</span>
                </div>
              )}
              {payments.map((p, i) => (
                <div key={i} className="flex justify-between border-b pb-2">
                  <span>{paymentLabel[p.type]}{p.description ? `: ${p.description}` : ""}</span>
                  <span className="font-semibold">{formatCurrency(p.value)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 text-lg font-bold">
                <span>VALOR FINAL A PAGAR</span>
                <span>{formatCurrency(salePriceNum - tradeInValue)}</span>
              </div>
            </div>
          </div>

          {/* Warranty */}
          {parseInt(warrantyMonths) > 0 && (
            <div className="border rounded-lg p-4">
              <h2 className="font-bold mb-3">CERTIFICADO DE GARANTIA</h2>
              <p className="mb-2">
                <strong>Periodo:</strong> {warrantyMonths} {parseInt(warrantyMonths) === 1 ? "mes" : "meses"} ou {parseInt(warrantyKm).toLocaleString()} km (o que ocorrer primeiro)
              </p>
              <p className="leading-relaxed">
                Tem o presente certificado a finalidade de formalizar as condicoes de garantia do veiculo descrito e identificado
                neste documento. A garantia refere-se a vicios e inadequacoes do motor (MOTOR e CAMBIO) e a parte eletrica
                (CENTRAL ELETRONICA e MODULO DE INJECAO), que venham a apresentar defeitos de fabricacao. Durante o
                periodo, nao estao sujeitos a garantia os itens de desgaste natural: direcao, polias, bicos e mangueiras, juntas e aneis
                de vedacao, correias, valvulas, bateria, velas, luzes, rolamentos, amortecedores, buchas, bandejas, pivos, terminais,
                coifas, retentores, discos e pastilhas de freio, tambores e lonas, embreagem.
                NAO estao dentro desta garantia qualquer defeito causado por acidentes, colisoes, uso inadequado, negligencia,
                modificacoes, alteracoes, reparos improprios, instalacao de pecas nao genuinas.
                Caso o veiculo apresente algum vicio dentro do prazo estabelecido, devera ser comunicado por escrito a
                revenda no maximo em 24 (vinte e quatro) horas apos ter sido detectado.
              </p>
            </div>
          )}

          {/* Delivery Receipt */}
          <div className="border rounded-lg p-4">
            <h2 className="font-bold mb-3">RECIBO DE ENTREGA DO VEICULO</h2>
            <p className="leading-relaxed">
              Declaro para os devidos fins que recebi nesta data o veiculo descrito nesta negociacao, bem como as suas chaves e
              documentos, no estado em que se encontra. Declaro ainda ter vistoriado o veiculo, estando o mesmo em perfeito
              estado de funcionamento, inclusive com todos os acessorios originais.
            </p>
          </div>

          {/* Responsibility Term */}
          <div className="border rounded-lg p-4">
            <h2 className="font-bold mb-3">TERMO DE RESPONSABILIDADE</h2>
            <p className="leading-relaxed">
              Declaro estar ciente da minha responsabilidade quanto ao veiculo ora negociado, no que tange a questao civil,
              criminal e eventuais multas no transito, IPVA, alienacao e qualquer outro direito legal que incida sobre o veiculo,
              a partir desta data ate a data da efetiva transferencia junto ao Departamento de Transito, me comprometendo a
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
                  <p>{selectedCustomer!.document_type === "CNPJ" ? "CNPJ" : "CPF"}: {selectedCustomer!.cpf || selectedCustomer!.cnpj || "-"}</p>
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
  );
}
