import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/AuthForm";
import { CheckCircle, ArrowLeft } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex min-h-screen bg-white" style={{ fontFamily: "var(--font-body)" }}>
      {/* ── Left Panel (Brand / Social Proof) ── */}
      <div className="hidden lg:flex w-[45%] bg-[#0C0E12] relative flex-col justify-between p-12 overflow-hidden text-white">
        {/* Background Decorative Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#E0FF74] opacity-5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-[#A6DD05] opacity-10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 w-fit hover:opacity-80 transition-opacity mb-16">
            <img 
              src="/nexdrive-logo.png" 
              alt="NexDrive Logo" 
              className="h-10 w-auto object-contain"
            />
            <span className="text-2xl font-bold tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>
              Nex<span className="text-[#E0FF74]">Drive</span>
            </span>
          </Link>

          <h1 className="text-4xl font-black leading-tight mb-6" style={{ fontFamily: "var(--font-display)" }}>
            O seu estoque, financeiro e equipe jogando no mesmo time.
          </h1>
          <p className="text-white/60 text-lg leading-relaxed max-w-md">
            Acelere os processos da sua garagem ou concessionária com a única plataforma all-in-one que entrega previsibilidade e lucro real.
          </p>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-5 rounded-[20px] border border-white/10">
            <div className="w-12 h-12 rounded-full bg-[#E0FF74] text-[#213201] font-bold flex flex-shrink-0 items-center justify-center text-[14px]" style={{ fontFamily: "var(--font-display)" }}>FL</div>
            <div>
              <p className="text-sm italic text-white/70 leading-relaxed">
                "O agente de IA responde clientes 23h de domingo. Segunda, temos leads quentes esperando."
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-bold text-white text-[13px]" style={{ fontFamily: "var(--font-ui)" }}>Fernanda L.</span>
                <span className="text-[11px] text-white/40">Auto Curitiba</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-[13px] font-medium text-white/60" style={{ fontFamily: "var(--font-ui)" }}>
            <div className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-[#A6DD05]" /> Sem cartão exigido</div>
            <div className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-[#A6DD05]" /> Suporte humano</div>
          </div>
        </div>
      </div>

      {/* ── Right Panel (Auth Form) ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative bg-[#F8FAFC] lg:bg-white shadow-[-20px_0_40px_rgba(0,0,0,0.02)] z-10">
        
        {/* Mobile Logo Top */}
        <div className="absolute top-8 left-8 lg:hidden">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/nexdrive-logo.png" 
              alt="NexDrive Logo" 
              className="h-8 w-auto object-contain"
            />
            <span className="text-xl font-bold tracking-tight text-[#1A1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              Nex<span className="text-[#A6DD05]">Drive</span>
            </span>
          </Link>
        </div>

        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-[24px] shadow-sm border border-[#E8E8F0] lg:border-none lg:shadow-none lg:bg-transparent lg:p-0">
          
          <Link to="/" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#6B6B8A] hover:text-[#A6DD05] transition-colors mb-8" style={{ fontFamily: "var(--font-ui)" }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao site
          </Link>

          <div className="mb-8">
            <h2 className="text-3xl font-black text-[#1A1A2E] mb-2" style={{ fontFamily: "var(--font-display)" }}>Bem-vindo(a)</h2>
            <p className="text-[#6B6B8A] text-[15px]">Faça login na sua conta NexDrive para gerenciar sua garagem.</p>
          </div>
          
          <div className="w-full">
            <AuthForm />
          </div>
        </div>
      </div>
    </div>
  );
}
