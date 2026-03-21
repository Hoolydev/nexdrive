import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProfileType = "compra_venda" | "consignacao" | "misto";

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------

function Stepper({ currentStep }: { currentStep: number }) {
  const steps = ["Dados da Garagem", "Configurações", "Tudo pronto!"];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, idx) => {
        const stepNum = idx + 1;
        const isCompleted = currentStep > stepNum;
        const isActive = currentStep === stepNum;
        return (
          <div key={label} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isActive
                    ? "bg-white text-blue-900"
                    : "bg-white/30 text-white/60"
                }`}
              >
                {isCompleted ? "✓" : stepNum}
              </div>
              <span
                className={`mt-1 text-xs font-medium transition-colors ${
                  isActive ? "text-white" : "text-white/50"
                }`}
              >
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-0.5 w-8 -mt-4 transition-colors ${
                  isCompleted ? "bg-green-400" : "bg-white/20"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1: Dados da Garagem
// ---------------------------------------------------------------------------

function Step1({
  onNext,
}: {
  onNext: (data: { store_name: string; whatsapp: string; city: string }) => void;
}) {
  const [storeName, setStoreName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);

  const handleNext = async () => {
    if (!storeName.trim() || !whatsapp.trim() || !city.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await (supabase as any)
        .from("store_settings")
        .upsert(
          {
            user_id: user.id,
            store_name: storeName.trim(),
            whatsapp_number: whatsapp.trim(),
            city: city.trim(),
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;

      // Seed chart of accounts
      await (supabase as any).rpc("seed_chart_of_accounts", {
        p_user_id: user.id,
      });

      onNext({ store_name: storeName, whatsapp, city });
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err?.message ?? "Tente novamente."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Dados da Garagem</h2>
        <p className="text-sm text-gray-500 mt-1">
          Informe os dados básicos do seu negócio para começar.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="store_name">
            Nome da Garagem <span className="text-red-500">*</span>
          </Label>
          <Input
            id="store_name"
            placeholder="Ex: Garagem do João"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="whatsapp">
            WhatsApp <span className="text-red-500">*</span>
          </Label>
          <Input
            id="whatsapp"
            placeholder="Ex: 11999998888"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="city">
            Cidade <span className="text-red-500">*</span>
          </Label>
          <Input
            id="city"
            placeholder="Ex: São Paulo"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
      </div>

      <Button
        className="w-full"
        onClick={handleNext}
        disabled={saving}
      >
        {saving ? "Salvando..." : "Próximo →"}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Configurações iniciais
// ---------------------------------------------------------------------------

function Step2({ onNext }: { onNext: (profile: ProfileType) => void }) {
  const [selected, setSelected] = useState<ProfileType | null>(null);

  const profiles: { value: ProfileType; label: string; description: string; emoji: string }[] = [
    {
      value: "compra_venda",
      label: "Compra e Venda",
      description: "Compro veículos e vendo para clientes finais.",
      emoji: "🤝",
    },
    {
      value: "consignacao",
      label: "Consignação",
      description: "Vendo veículos de terceiros recebendo comissão.",
      emoji: "📋",
    },
    {
      value: "misto",
      label: "Misto",
      description: "Trabalho com compra, venda e consignação.",
      emoji: "⚡",
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Configurações iniciais</h2>
        <p className="text-sm text-gray-500 mt-1">
          Qual é o perfil do seu negócio?
        </p>
      </div>

      <div className="space-y-3">
        {profiles.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setSelected(p.value)}
            className={`w-full text-left border-2 rounded-xl p-4 transition-all ${
              selected === p.value
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{p.emoji}</span>
              <div>
                <p className="font-semibold text-gray-900">{p.label}</p>
                <p className="text-sm text-gray-500">{p.description}</p>
              </div>
              {selected === p.value && (
                <span className="ml-auto text-blue-600 font-bold">✓</span>
              )}
            </div>
          </button>
        ))}
      </div>

      <Button
        className="w-full"
        disabled={!selected}
        onClick={() => selected && onNext(selected)}
      >
        Próximo →
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Tudo pronto!
// ---------------------------------------------------------------------------

function Step3() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center text-4xl">
          🚀
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tudo pronto!</h2>
          <p className="text-sm text-gray-500 mt-2">
            Sua garagem está configurada. Agora você pode começar a gerenciar
            seus veículos, clientes e vendas.
          </p>
        </div>
      </div>

      <Button
        className="w-full h-12 text-base font-semibold"
        onClick={() => navigate("/dashboard")}
      >
        Entrar no sistema →
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Onboarding
// ---------------------------------------------------------------------------

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const goToStep = (nextStep: number) => {
    setDirection(nextStep > step ? "forward" : "back");
    setAnimating(true);
    setTimeout(() => {
      setStep(nextStep);
      setAnimating(false);
    }, 250);
  };

  const slideClass = animating
    ? direction === "forward"
      ? "opacity-0 translate-x-4"
      : "opacity-0 -translate-x-4"
    : "opacity-100 translate-x-0";

  return (
    <div className="min-h-screen bg-blue-900 flex flex-col items-center justify-center px-4 py-10">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-lg">
          <span className="text-blue-900 font-extrabold text-xl">N</span>
        </div>
        <span className="text-white text-lg font-bold tracking-wide">NexDrive</span>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Stepper */}
        <div className="bg-blue-900 -mx-8 -mt-8 px-8 pt-6 pb-4 rounded-t-2xl mb-6">
          <Stepper currentStep={step} />
        </div>

        {/* Step content */}
        <div
          className={`transition-all duration-250 ease-in-out ${slideClass}`}
        >
          {step === 1 && (
            <Step1 onNext={() => goToStep(2)} />
          )}
          {step === 2 && (
            <Step2 onNext={() => goToStep(3)} />
          )}
          {step === 3 && <Step3 />}
        </div>
      </div>
    </div>
  );
}
