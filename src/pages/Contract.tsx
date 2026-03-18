import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

type ContractData = {
  vehicle: {
    title: string | null;
    brand: string | null;
    model: string | null;
    plate: string | null;
    renavan: string | null;
    manufacturing_year: number | null;
    model_year: number | null;
    current_km: number | null;
    actual_sale_price: number | null;
    chassis?: string | null;
    motor?: string | null;
    combustivel?: string | null;
    km_entrega?: number | null;
    cor?: string | null;
    entrega?: string | null;
  } | null;
  customer: {
    name: string;
    email: string;
    phone: string | null;
    address?: string | null;
    cpf?: string | null;
    rg?: string | null;
    cnh?: string | null;
  } | null;
  trade_in?: {
    brand: string | null;
    model: string | null;
    plate: string | null;
    renavan: string | null;
    chassis: string | null;
    motor: string | null;
    combustivel: string | null;
    km_entrega: number | null;
    cor: string | null;
    entrega: string | null;
    value: number | null;
  } | null;
};

export default function Contract() {
  const [searchParams] = useSearchParams();
  const vehicleId = searchParams.get("vehicle");
  const customerId = searchParams.get("customer");
  
  const [contractData, setContractData] = useState<ContractData>({
    vehicle: null,
    customer: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (vehicleId && customerId) {
      loadContractData();
    } else {
      // Dados mockados para exemplo
      setContractData({
        vehicle: {
          title: "Renault Logan Expression 1.6 16V SCe (Flex)",
          brand: "Renault",
          model: "Logan",
          plate: "ABC1234",
          renavan: "112212400",
          manufacturing_year: 2022,
          model_year: 2023,
          current_km: 58000,
          actual_sale_price: 44833.00,
          chassis: "93Y4SRFH4JJ874878",
          motor: "K7M",
          combustivel: "Flex (Gasolina/Etanol)",
          entrega: "12/03/2025 17:18",
          cor: "Branco",
        },
        customer: {
          name: "João da Silva",
          email: "joao@email.com",
          phone: "(85) 99999-9999",
          address: "Rua Principal, 123, Centro",
          cpf: "123.456.789-00",
          rg: "2000099",
          cnh: "12345678900",
        },
        trade_in: {
          brand: "Honda",
          model: "CG 150 Titan ESD (Mix)",
          plate: "OCF2A63",
          renavan: "00337982357",
          chassis: "9C2KC1550BR545655",
          motor: "KC15E5",
          combustivel: "Flex (Gasolina/Etanol)",
          km_entrega: 45000,
          cor: "Preto",
          entrega: "12/03/2025 17:17",
          value: 9000.00,
        },
      });
      setLoading(false);
    }
  }, [vehicleId, customerId]);

  const loadContractData = async () => {
    try {
      const [vehicleResult, customerResult] = await Promise.all([
        supabase.from("products").select("*").eq("id", vehicleId).single(),
        supabase.from("customers").select("*").eq("id", customerId).single(),
      ]);

      if (vehicleResult.data && customerResult.data) {
        setContractData({
          vehicle: vehicleResult.data,
          customer: customerResult.data,
        });
      }
    } catch (error) {
      console.error("Error loading contract data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return <div className="p-6">Carregando contrato...</div>;
  }

  const { vehicle, customer, trade_in } = contractData;
  const today = new Date();
  const contractNumber = "179"; // Exemplo - pode ser gerado dinamicamente

  return (
    <div className="p-6">
      <div className="print:hidden mb-4 flex justify-end">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimir Contrato
        </Button>
      </div>

      <Card className="max-w-4xl mx-auto print:shadow-none print:border-0">
        <CardContent className="p-8 print:p-12 space-y-6">
          {/* Cabeçalho */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold">NOME DA EMPRESA</h1>
              <p className="text-sm text-muted-foreground">CNPJ: XX.XXX.XXX/0001-XX</p>
              <p className="text-sm text-muted-foreground">ENDEREÇO COMPLETO DA EMPRESA</p>
              <p className="text-sm text-muted-foreground">Tel: (XX) XXXX-XXXX</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">CONTRATO Nº {contractNumber}</p>
              <p className="text-sm">VENDA COM TROCA</p>
              <div className="mt-2 text-sm">
                <p>EMITIDO: {formatDate(today)}</p>
                <p>CONCRETIZADO: {vehicle?.entrega || formatDate(today)}</p>
              </div>
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="border rounded-lg p-4">
            <h2 className="font-bold mb-4">DADOS DO CLIENTE</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-semibold">NOME</p>
                <p className="text-sm">{customer?.name}</p>
              </div>
              <div>
                <p className="text-sm font-semibold">CPF</p>
                <p className="text-sm">{customer?.cpf || "-"}</p>
              </div>
              <div>
                <p className="text-sm font-semibold">RG</p>
                <p className="text-sm">{customer?.rg || "-"}</p>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-sm font-semibold">E-MAIL</p>
              <p className="text-sm">{customer?.email}</p>
            </div>
            <div className="mt-2">
              <p className="text-sm font-semibold">ENDEREÇO</p>
              <p className="text-sm">{customer?.address || "-"}</p>
            </div>
          </div>

          {/* Veículo de Venda */}
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-bold">VEÍCULO DE VENDA</h2>
              <div className="bg-gray-700 text-white px-4 py-2 rounded">
                <p className="text-sm">VALOR DE VENDA {formatCurrency(vehicle?.actual_sale_price)}</p>
                <p className="text-xs">(valor por extenso)</p>
              </div>
            </div>
            <p className="text-sm mb-4">VENDIDO PELA NOME DA EMPRESA AO CLIENTE</p>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-semibold">VEÍCULO</p>
                <p className="text-sm">{vehicle?.title}</p>
              </div>
              <div>
                <p className="text-sm font-semibold">PLACA</p>
                <p className="text-sm">{vehicle?.plate}</p>
              </div>
              <div>
                <p className="text-sm font-semibold">ANO</p>
                <p className="text-sm">{vehicle?.manufacturing_year}/{vehicle?.model_year}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-sm font-semibold">CHASSIS</p>
                <p className="text-sm">{vehicle?.chassis}</p>
              </div>
              <div>
                <p className="text-sm font-semibold">COMBUSTÍVEL</p>
                <p className="text-sm">{vehicle?.combustivel}</p>
              </div>
              <div>
                <p className="text-sm font-semibold">MOTOR</p>
                <p className="text-sm">{vehicle?.motor}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-sm font-semibold">RENAVAM</p>
                <p className="text-sm">{vehicle?.renavan}</p>
              </div>
              <div>
                <p className="text-sm font-semibold">ENTREGA</p>
                <p className="text-sm">{vehicle?.entrega}</p>
              </div>
              <div>
                <p className="text-sm font-semibold">KM Entrega</p>
                <p className="text-sm">{vehicle?.km_entrega?.toLocaleString() || vehicle?.current_km?.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Veículo de Troca */}
          {trade_in && (
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <h2 className="font-bold">VEÍCULO DE TROCA</h2>
                <div className="bg-gray-700 text-white px-4 py-2 rounded">
                  <p className="text-sm">VALOR DE COMPRA {formatCurrency(trade_in.value)}</p>
                  <p className="text-xs">(valor por extenso)</p>
                </div>
              </div>
              <p className="text-sm mb-4">VENDIDO PELO CLIENTE À NOME DA EMPRESA</p>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-semibold">VEÍCULO</p>
                  <p className="text-sm">{trade_in.brand} {trade_in.model}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">PLACA</p>
                  <p className="text-sm">{trade_in.plate}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">COR</p>
                  <p className="text-sm">{trade_in.cor}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="text-sm font-semibold">CHASSIS</p>
                  <p className="text-sm">{trade_in.chassis}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">COMBUSTÍVEL</p>
                  <p className="text-sm">{trade_in.combustivel}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">MOTOR</p>
                  <p className="text-sm">{trade_in.motor}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="text-sm font-semibold">RENAVAM</p>
                  <p className="text-sm">{trade_in.renavan}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">ENTREGA</p>
                  <p className="text-sm">{trade_in.entrega}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">KM Entrega</p>
                  <p className="text-sm">{trade_in.km_entrega?.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Acerto Financeiro */}
          <div className="border rounded-lg p-4">
            <h2 className="font-bold mb-4">ACERTO FINANCEIRO RECEBIDO</h2>
            <p className="text-sm mb-4">VALORES RECEBIDOS PELA NOME DA EMPRESA PAGOS PELO CLIENTE</p>
            
            <div className="border rounded p-4 mb-4">
              <p className="text-sm">
                Descrição: {formatCurrency(vehicle?.actual_sale_price)} VALOR FINANCIADO PELO BANCO
                {trade_in && ` + ${formatCurrency(trade_in.value)} VALOR DA AVALIAÇÃO DO VEÍCULO NA TROCA`}
              </p>
              <p className="text-right font-bold mt-2">
                {formatCurrency((vehicle?.actual_sale_price || 0) + (trade_in?.value || 0))}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700 text-white p-4 rounded">
                <h3 className="font-bold mb-2">VALOR TOTAL VENDA</h3>
                <p className="text-xl">{formatCurrency(vehicle?.actual_sale_price)}</p>
                <p className="text-xs">(valor por extenso)</p>
                
                <h3 className="font-bold mt-4 mb-2">PRODUTOS & SERVIÇOS</h3>
                <p className="text-xl">{formatCurrency(0)}</p>
                <p className="text-xs">(zero reais)</p>

                {trade_in && (
                  <>
                    <h3 className="font-bold mt-4 mb-2">VALOR TOTAL TROCA</h3>
                    <p className="text-xl">{formatCurrency(trade_in.value)}</p>
                    <p className="text-xs">(valor por extenso)</p>
                  </>
                )}
              </div>

              <div className="bg-gray-700 text-white p-4 rounded">
                <h3 className="font-bold mb-2">TOTAL</h3>
                <p className="text-xl">
                  {formatCurrency((vehicle?.actual_sale_price || 0) - (trade_in?.value || 0))}
                </p>
                <p className="text-xs">(valor por extenso)</p>
              </div>
            </div>
          </div>

          {/* Certificado de Garantia */}
          <div className="border rounded-lg p-4">
            <h2 className="font-bold mb-4">CERTIFICADO DE GARANTIA</h2>
            <p className="text-sm leading-relaxed">
              Tem o presente certificado a finalidade de formalizar as condições de garantia do veículo descrito e identificado
              neste documento. A garantia refere-se a vícios e inadequações do motor (MOTOR e CÂMBIO) e a parte elétrica
              (CENTRAL ELETRÔNICA e MÓDULO DE INJEÇÃO), que venham a apresentar defeitos de fabricação. Durante o
              período, não estão sujeitos a garantia os itens: direção de manutenção e polia, bicos e mangueiras, juntas e anéis
              de vedação, correias de distribuição, correção de válvulas, bateria, velas, luzes, eixo carredam, rolamentos,
              amortecedores, buchas, bandejas, pivôs, terminais, coifas, retentores, discos e pastilhas de freio, tambores e lonas,
              embreagem, juntas do motor (quando envolvidas em reparos). Os dâmetros seguros: todos os componentes
              internos exceto conjunto de embreagem. NÃO estão dentro desta garantia qualquer defeito causado por acidentes,
              colisões, uso inadequado, negligência, modificações, alterações, reparos impróprios, instalação de peças não
              genuínas que tenham surgido da má utilização pelo COMPRADOR. Esta garantia, também não cobre danos
              causados por perda de óleo por negligência, uso de combustível inadequado, falta de manutenção, ou
              manutenção de mecânica preventiva não autorizada. Esta garantia perderá efeito, caso o veículo seja lavado ou
              higienizado em estabelecimentos não autorizados. Caso o veículo apresente algum vício que o cliente venha
              apresentar dentro dos prazos estabelecidos acima, deverá ser comunicado por escrito ao termo inequívoca a
              REVENDA, no máximo em 24 (vinte e quatro) horas após ter sido detectado.
            </p>
          </div>

          {/* Recibo de Entrega */}
          <div className="border rounded-lg p-4">
            <h2 className="font-bold mb-4">RECIBO DE ENTREGA DO VEÍCULO</h2>
            <p className="text-sm leading-relaxed">
              Declaro para os devidos fins que recebi nesta data o veículo descrito nesta negociação, bem como as suas chaves e
              documentos, no estado em que se encontra.
              Declaro ainda ter vistoriado o veículo descrito nesta negociação, estando o mesmo em perfeito estado de
              funcionamento, inclusive portanto todas as acessórios originários, marcas, através de nota visual, tangível e
              exterior do mesmo.
            </p>
          </div>

          {/* Termos de Responsabilidade */}
          <div className="border rounded-lg p-4">
            <h2 className="font-bold mb-4">TERMO DE RESPONSABILIDADE CIVIL, CRIMINAL E MULTAS DE TRÂNSITO</h2>
            <p className="text-sm leading-relaxed mb-4">
              Declaro estar ciente da minha responsabilidade quanto ao veículo ora negociado, no que tange a questão civil,
              criminal e eventuais multas no trânsito, sendo referentes a IPVA, alienação e qualquer outro direito legal que incida
              sobre o veículo, referente ao período a partir desta data até a data da efetiva transferência junto ao Departamento
              de Trânsito, me comprometendo a quitar os mesmos.
            </p>
            
            <h2 className="font-bold mb-4">TERMO DE RESPONSABILIDADE CIVIL, CRIMINAL E MULTAS DE TRÂNSITO (VENDA)</h2>
            <p className="text-sm leading-relaxed">
              Declaro estar ciente da minha responsabilidade quanto ao veículo ora negociado, no que tange a questão civil,
              criminal e eventuais multas no trânsito, sendo referentes a IPVA, alienação e qualquer outro direito legal que incida
              sobre o veículo, referente ao período a partir desta data até a data da efetiva transferência junto ao Departamento
              de Trânsito, me comprometendo a quitar os mesmos.
            </p>
          </div>

          {/* Assinaturas */}
          <div className="mt-12">
            <p className="text-center mb-8">DE ACORDO</p>
            <p className="text-center mb-8">Fortaleza/CE, ___ de _____________ de _______</p>

            <div className="grid grid-cols-2 gap-8">
              <div className="text-center">
                <div className="border-t border-black pt-2">
                  <p className="font-bold">{customer?.name}</p>
                  <p className="text-sm">CPF: {customer?.cpf}</p>
                </div>
              </div>
              
              <div className="text-center">
                <div className="border-t border-black pt-2">
                  <p className="font-bold">NOME DA EMPRESA</p>
                  <p className="text-sm">CNPJ: XX.XXX.XXX/0001-XX</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mt-12">
              <div className="text-center">
                <p className="font-bold mb-4">TESTEMUNHA 1</p>
                <div className="border-t border-black pt-2">
                  <p className="text-sm">Nome:</p>
                  <p className="text-sm">CPF:</p>
                </div>
              </div>
              
              <div className="text-center">
                <p className="font-bold mb-4">TESTEMUNHA 2</p>
                <div className="border-t border-black pt-2">
                  <p className="text-sm">Nome:</p>
                  <p className="text-sm">CPF:</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
