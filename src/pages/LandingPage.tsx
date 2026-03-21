import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronRight, Search, ArrowRight, CheckCircle,
  Phone, Mail, MapPin, Facebook, Instagram, Twitter, Youtube,
  Menu, X, Upload, DollarSign,
  LayoutDashboard, Package, Users as UsersIcon,
  Send, Wallet, Bot, ChevronLeft, ChevronDown,
  Car, BarChart3, MessageSquare, Brain, Store, FileSignature,
  HeartHandshake, TrendingUp, HelpCircle, Star
} from "lucide-react";

/* ─── FEATURES (PRODUCT OWNER COPY) ───────────────────────────────────── */
// Focus on specific Dealership Owner pain points.
const features = [
  { icon: Car,           title: "FIPE e Margem de Lucro em Tempo Real", description: "Esqueça o 'achismo'. Cadastre o carro, consulte a FIPE automaticamente e defina seu preço de venda vendo a margem exata de lucro na mesma tela.", color: "bg-[#DBEAFE]", iconColor: "text-[#2563EB]" },
  { icon: UsersIcon,     title: "CRM para não perder nenhum lead quente", description: "O cliente perguntou o preço e sumiu? Nosso CRM organiza quem são os interessados, quando você deve ligar de volta e em qual carro eles estão de olho.", color: "bg-blue-50", iconColor: "text-blue-600" },
  { icon: DollarSign,    title: "Financeiro Feito para Concessionárias", description: "Contas a pagar, comissões de vendedores e fluxo de caixa diário. Saiba exatamente onde está indo o seu dinheiro sem depender de planilhas complexas.", color: "bg-green-50", iconColor: "text-green-600" },
  { icon: Brain,         title: "Seu Agente de IA Atendendo 24/7", description: "O cliente chamou no WhatsApp sexta à noite? A IA da NexDrive responde, tira dúvidas, explica financiamentos e qualifica o lead para você na segunda-feira.", color: "bg-orange-50", iconColor: "text-orange-600" },
  { icon: Store,         title: "Vitrine Digital Integrada (Seu Site Pronto)", description: "Crie um link exclusivo para a sua garagem em cliques. Compartilhe no Instagram e no WhatsApp. Os clientes veem seu estoque, simulam parcelas e chamam direto.", color: "bg-teal-50", iconColor: "text-teal-600" },
  { icon: FileSignature, title: "Contratos de Compra e Venda Automáticos", description: "Selecionou o carro e o cliente? O sistema gera o contrato em PDF pronto para assinatura. Profissionalismo puro e zero erros de digitação.", color: "bg-indigo-50", iconColor: "text-indigo-600" },
  { icon: BarChart3,     title: "Dashboards de Resultados", description: "Qual vendedor fatura mais? Quais carros têm o melhor giro? Veja seus KPIs na tela e tome decisões blindadas com dados atualizados ao segundo.", color: "bg-red-50", iconColor: "text-red-600" },
  { icon: HeartHandshake,title: "Pós-Venda que Gera Recompra", description: "O sistema te lembra de aniversários de compra e manutenções programadas, para você mandar uma mensagem personalizada e garantir a fidelização do cliente.", color: "bg-pink-50", iconColor: "text-pink-600" },
];

/* ─── FAQ (SEO / GEO STRATEGY) ───────────────────────────────────── */
// Frequently Asked Questions aimed at conversational AI search inputs
const faqs = [
  { q: "A NexDrive serve para lojas de repasse e multimarcas pequenas?", a: "Sim. A NexDrive foi criada exatamente para donos de garagens, lojistas multimarcas e repassadores que precisam organizar o estoque, prever a margem de lucro real e ter um controle financeiro sem a burocracia dos sistemas legados." },
  { q: "O agente de IA no WhatsApp realmente funciona para vender carros?", a: "O Agente de IA (AutoFácil) é treinado com os veículos ativamente cadastrados no seu sistema. Ele não fecha a venda final, mas qualifica o lead: coleta CPF, intenção de compra, se é troca ou financiamento, e entrega o cliente 'quente' para seu vendedor concluir o negócio." },
  { q: "Preciso de conhecimento técnico para usar a plataforma?", a: "O design da NexDrive prioriza a usabilidade. Com a interface simplificada, tanto o dono da garagem quanto os vendedores e o braço financeiro (fechamento de mês, fluxo de caixa) conseguem usar todos os módulos em menos de uma semana." },
  { q: "Consigo emitir laudos e contratos direto do sistema?", a: "Sim. A plataforma vincula o cadastro do cliente (CRM) ao veículo (Estoque) para gerar o PDF do contrato de compra e venda instantaneamente, economizando tempo no preenchimento manual e mitigando riscos contratuais." },
];

const testimonials = [
  { name: "Carlos M.",    role: "Garagem Própria · São Paulo",  avatar: "CM", text: "Antes eu fechava o mês sem saber o lucro real pelas despesas com manutenção e comissões. Agora vejo a margem de cada carro na hora da precificação. Transformou minha empresa." },
  { name: "Fernanda L.",  role: "Auto Curitiba · Curitiba",     avatar: "FL", text: "O agente de IA responde clientes às 23h de domingo. Na segunda-feira, temos leads com telefone e orçamento qualificados só esperando o fechamento." },
  { name: "Ricardo S.",   role: "RS Multimarcas · Campinas",    avatar: "RS", text: "Estoque atualizado e loja virtual online. Em vez de mandar as fotos soltas no WhatsApp, mando o link da vitrine que me deixa com cara de concessionária premium." },
  { name: "Amanda C.",    role: "Grupo Motorcar · BH",          avatar: "AC", text: "Acabou vendedor perdendo venda porque esqueceu de ligar. O funil e o CRM cobram todo mundo do time para fazer os follow-ups agendados." },
];

/* ─── NEW PLATFORM MOCKUP (AUTOFLOW UI) ────────────────────────────── */
function PlatformMockup() {
  return (
    <div className="w-full rounded-[24px] overflow-hidden bg-[#F8FAFC] border border-[#E8E8F0]" style={{ boxShadow: "var(--shadow-brand)", fontFamily: "var(--font-ui)" }}>
      {/* Fake Browser header */}
      <div className="bg-white border-b border-[#E8E8F0] px-4 py-3 flex items-center gap-3">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
          <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
          <div className="w-3 h-3 rounded-full bg-[#22C55E]" />
        </div>
        <div className="flex-1 bg-[#F8FAFC] rounded-full px-4 py-1.5 text-[11px] text-[#94A3B8] font-medium flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#22C55E]" /> app.nexdrive.com.br
        </div>
      </div>
      <div className="flex h-[480px]">
        {/* Sidebar */}
        <div className="w-16 bg-[#0F172A] flex flex-col items-center py-5 gap-6">
          <div className="w-9 h-9 bg-gradient-to-br from-[#2563EB] to-[#3B82F6] rounded-[10px] flex items-center justify-center shadow-lg">
            <span className="text-white text-[10px] font-black tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>ND</span>
          </div>
          <div className="flex flex-col gap-5 mt-2">
            {[{ icon: LayoutDashboard, active: false },{ icon: Package, active: true },{ icon: UsersIcon, active: false },{ icon: Wallet, active: false },{ icon: Send, active: false },{ icon: Bot, active: false }].map(({ icon: Icon, active }, i) => (
              <div key={i} className={`w-10 h-10 rounded-[12px] flex items-center justify-center transition-all ${active ? "bg-[#2563EB] shadow-md shadow-[#2563EB]/30" : "hover:bg-white/10"}`}>
                <Icon className={`w-5 h-5 ${active ? "text-white" : "text-[#94A3B8]"}`} strokeWidth={1.5} />
              </div>
            ))}
          </div>
        </div>
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Header */}
          <div className="flex justify-between items-center bg-white p-5 rounded-[20px] shadow-sm">
            <div>
              <h3 className="text-[15px] font-bold text-[#1A1A2E]" style={{ fontFamily: "var(--font-display)" }}>Cadastrar Novo Veículo</h3>
              <p className="text-[12px] text-[#6B6B8A]">Adicione as fotos e defina as margens de lucro</p>
            </div>
            <div className="flex gap-2">
              <button className="text-[12px] px-4 py-2 border border-[#E8E8F0] rounded-[10px] text-[#6B6B8A] font-medium">Cancelar</button>
              <button className="text-[12px] px-4 py-2 bg-gradient-to-br from-[#2563EB] to-[#3B82F6] text-white rounded-[10px] font-semibold shadow-md shadow-[#2563EB]/20">Publicar Venda</button>
            </div>
          </div>
          
          <div className="grid grid-cols-5 gap-5">
            <div className="col-span-3 space-y-5">
              {/* Form Card 1 */}
              <div className="bg-white rounded-[20px] shadow-sm p-5 border border-[#E8E8F0]">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-[8px] bg-[#DBEAFE] flex items-center justify-center">
                    <Car className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <span className="text-[13px] font-bold text-[#1A1A2E]">Ficha Técnica</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[["Marca","Volkswagen"],["Modelo","Polo GTS 250 TSI"],["Ano","2024 / 2024"],["Placa","ABC-1D23"]].map(([l, v], i) => (
                    <div key={i}>
                      <label className="text-[11px] text-[#6B6B8A] mb-1.5 block font-medium">{l}</label>
                      <div className="border border-[#E8E8F0] rounded-[10px] px-3 py-2.5 text-[12px] text-[#1A1A2E] bg-gray-50">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Pricing Card */}
              <div className="bg-white rounded-[20px] shadow-sm p-5 border border-[#E8E8F0]">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-[8px] bg-green-50 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-[13px] font-bold text-[#1A1A2E]">Precificação & FIPE</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-[#6B6B8A] mb-1.5 block font-medium">Custo Total</label>
                    <div className="border border-[#E8E8F0] rounded-[10px] px-3 py-2.5 text-[13px] font-semibold text-[#6B6B8A] bg-gray-50">R$ 102.000</div>
                  </div>
                  <div>
                    <label className="text-[11px] text-[#6B6B8A] mb-1.5 block font-medium">FIPE Atual</label>
                    <div className="border border-[#E8E8F0] rounded-[10px] px-3 py-2.5 text-[13px] font-semibold text-blue-600 bg-blue-50">R$ 115.490</div>
                  </div>
                  <div>
                    <label className="text-[11px] text-[#2563EB] mb-1.5 block font-bold">Preço de Venda</label>
                    <div className="border-2 border-[#2563EB] rounded-[10px] px-3 py-2.5 text-[14px] font-bold text-[#2563EB] bg-white ring-4 ring-[#2563EB]/10">R$ 118.990</div>
                  </div>
                </div>
                {/* Result Bar */}
                <div className="mt-4 pt-4 border-t border-[#E8E8F0] flex justify-between items-center">
                  <span className="text-[12px] font-medium text-[#6B6B8A]">Margem Bruta Estimada:</span>
                  <span className="text-[14px] font-bold text-green-600 bg-green-50 px-3 py-1 rounded-[8px]">+ 14.3% (R$ 16.990)</span>
                </div>
              </div>
            </div>
            
            <div className="col-span-2 space-y-5">
              {/* Media Card */}
              <div className="bg-white rounded-[20px] shadow-sm p-5 border border-[#E8E8F0]">
                <div className="text-[13px] font-bold text-[#1A1A2E] mb-3">Mídia Principal</div>
                <div className="rounded-[12px] overflow-hidden mb-3 aspect-video relative group">
                  <img src="https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=600&q=80" alt="Car" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-[6px]">Foto Capa</div>
                </div>
                <button className="w-full py-2.5 border-2 border-dashed border-[#E8E8F0] rounded-[12px] text-[12px] font-medium text-[#2563EB] bg-gray-50 hover:bg-[#DBEAFE] transition-colors flex items-center justify-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" /> Enviar Galeria (0/10)
                </button>
              </div>

              {/* Toggle Status Card */}
              <div className="bg-gradient-to-br from-[#2563EB] to-[#3B82F6] rounded-[20px] shadow-brand p-5 text-white">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <div className="text-[13px] font-bold">Vitrine Online</div>
                    <div className="text-[10px] text-white/70">Visível publicamente</div>
                  </div>
                  <div className="w-10 h-5 bg-white rounded-full relative p-0.5">
                    <div className="w-4 h-4 bg-[#2563EB] rounded-full translate-x-5 shadow-sm" />
                  </div>
                </div>
                <label className="text-[11px] font-medium text-white/90">Status de Venda</label>
                <select className="w-full mt-1.5 bg-white/10 border border-white/20 text-white rounded-[10px] px-3 py-2 text-[12px] outline-none">
                  <option>Disponível do Estoque</option>
                  <option>Reservado</option>
                  <option>Vendido</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN LANDING PAGE ───────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white text-[#1A1A2E] overflow-x-hidden selection:bg-[#2563EB] selection:text-white" style={{ fontFamily: "var(--font-body)" }}>
      {/* ── SEO: Semantic Header ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-[#E8E8F0]" : "bg-transparent"}`}>
        <div className="max-w-[1440px] mx-auto px-6 h-[72px] flex items-center justify-between">
          {/* Logo with AUTOFLOW font block */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-brand-gradient rounded-[10px] flex items-center justify-center shadow-brand shrink-0">
              <span className="text-white text-lg font-black tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>N</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-[#1A1A2E] hidden sm:block" style={{ fontFamily: "var(--font-display)" }}>
              Nex<span className="text-brand-gradient">Drive</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[14px] font-semibold text-[#6B6B8A]" style={{ fontFamily: "var(--font-ui)" }}>
            {[["Benefícios","#beneficios"],["Plataforma","#plataforma"],["Depoimentos","#depoimentos"],["FAQ","#faq"]].map(([label, href]) => (
              <a key={String(label)} href={String(href)} className="hover:text-[#2563EB] transition-colors">{label}</a>
            ))}
            <Link to="/marketplace" className="text-[#2563EB] border border-[#2563EB]/30 bg-[#DBEAFE] px-3 py-1.5 rounded-[8px] hover:bg-[#2563EB] hover:text-white transition-colors">
              Ver Estoque Público
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/auth")} className="flex items-center gap-2 text-[#1A1A2E] text-[14px] font-bold hover:text-[#2563EB] transition-colors hidden sm:flex">
              Fazer Login
            </button>
            <button onClick={() => navigate("/auth")} className="bg-brand-gradient text-white text-[14px] font-bold px-6 py-2.5 rounded-[12px] shadow-brand btn-press flex items-center gap-1.5">
              Começar Agora <ChevronRight className="w-4 h-4" />
            </button>
            <button className="md:hidden p-2 text-[#1A1A2E]" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {mobileMenu && (
          <div className="md:hidden bg-white border-b border-[#E8E8F0] px-6 py-5 flex flex-col gap-4 shadow-lg absolute top-[72px] left-0 right-0">
            {["Benefícios","Plataforma","Depoimentos","FAQ"].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-base font-semibold text-[#6B6B8A] hover:text-[#2563EB]" onClick={() => setMobileMenu(false)}>{item}</a>
            ))}
            <Link to="/auth" className="text-[#2563EB] font-bold text-base mt-2" onClick={() => setMobileMenu(false)}>Entrar no Sistema</Link>
          </div>
        )}
      </header>

      {/* ── SEO: Semantic Main Content ── */}
      <main>
        {/* ── HERO SECTION ── */}
        <section className="relative pt-[120px] pb-20 lg:pt-[160px] lg:pb-32 bg-[#F8FAFC] overflow-hidden">
          {/* Background Elements */}
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#2563EB]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-[1440px] mx-auto px-6 relative z-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* Value Proposition */}
            <div className="lg:w-[45%] text-center lg:text-left pt-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#DBEAFE] text-[#2563EB] text-[12px] font-bold mb-6" style={{ fontFamily: "var(--font-ui)" }}>
                <TrendingUp className="w-3.5 h-3.5" /> Desenvolvido para Concessionárias e Garagens
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#1A1A2E] leading-[1.15] tracking-tight mb-6" style={{ fontFamily: "var(--font-display)" }}>
                Chega de perder dinheiro na precificação. <br className="hidden sm:block"/>
                <span className="text-brand-gradient">Venda mais com IA.</span>
              </h1>
              <p className="text-lg text-[#6B6B8A] mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                A única plataforma focada no lucro real do lojista: controle seu estoque em tempo real, capture leads no WhatsApp 24h por dia e automatize contratos com apenas 1 clique.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <button onClick={() => navigate("/auth")} className="w-full sm:w-auto bg-brand-gradient hover:opacity-90 text-white font-bold text-base px-8 py-4 rounded-[14px] shadow-brand btn-press flex items-center justify-center gap-2 transition-all">
                  Criar minha conta gratuita <ArrowRight className="w-5 h-5" />
                </button>
                <button onClick={() => document.getElementById("plataforma")?.scrollIntoView({ behavior: "smooth" })} className="w-full sm:w-auto bg-white hover:bg-gray-50 text-[#1A1A2E] font-bold text-base px-8 py-4 rounded-[14px] border border-[#E8E8F0] shadow-sm btn-press transition-all flex items-center justify-center gap-2">
                  Ver como funciona por dentro
                </button>
              </div>
              
              <div className="mt-10 flex items-center justify-center lg:justify-start gap-6 text-[13px] font-medium text-[#94A3B8]" style={{ fontFamily: "var(--font-ui)" }}>
                <div className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-[#22C55E]" /> Sem cartão de crédito</div>
                <div className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-[#22C55E]" /> Cancela a qualquer momento</div>
              </div>
            </div>

            {/* Visual Hook - Mockup Preview */}
            <div className="lg:w-[55%] relative w-full perspective-[1000px]">
              <div className="relative rotate-y-[-5deg] rotate-x-[2deg] hover:rotate-0 transition-transform duration-700 ease-out">
                {/* Decorative floating cards */}
                <div className="absolute -top-6 -right-6 bg-white p-4 rounded-[16px] shadow-xl border border-[#E8E8F0] z-20 animate-slide-up" style={{ animationDelay: "200ms" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle className="text-green-600 w-5 h-5" /></div>
                    <div>
                      <p className="text-[11px] text-[#94A3B8] font-bold">Venda Concluída</p>
                      <p className="text-[14px] font-black text-[#1A1A2E]">R$ 15.400 de lucro</p>
                    </div>
                  </div>
                </div>
                
                <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-[16px] shadow-xl border border-[#E8E8F0] z-20 animate-slide-up" style={{ animationDelay: "400ms" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center"><MessageSquare className="text-orange-600 w-5 h-5" /></div>
                    <div>
                      <p className="text-[11px] text-[#94A3B8] font-bold">IA NexDrive</p>
                      <p className="text-[14px] font-black text-[#1A1A2E]">Novo Lead Capturado</p>
                    </div>
                  </div>
                </div>

                {/* Main Mockup */}
                <div className="shadow-2xl rounded-[24px]">
                  <PlatformMockup />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF BAR ── */}
        <section className="py-10 bg-white border-b border-[#E8E8F0]">
          <div className="max-w-[1440px] mx-auto px-6">
            <div className="flex flex-wrap items-center justify-center lg:justify-between gap-8 md:gap-12">
              <p className="text-[14px] font-bold text-[#94A3B8]" style={{ fontFamily: "var(--font-ui)" }}>Lojistas experientes já confiam na plataforma:</p>
              <div className="flex flex-wrap gap-12 text-center items-center justify-center">
                {[
                  { v: "R$ 45M+", l: "Processados mensalmente" },
                  { v: "3.200+",  l: "Veículos em estoque vivo" },
                  { v: "12m",     l: "Tempo salvo por venda" },
                ].map((stat, i) => (
                  <div key={i}>
                    <div className="text-3xl font-black text-[#1A1A2E]" style={{ fontFamily: "var(--font-display)" }}>{stat.v}</div>
                    <div className="text-[12px] font-semibold text-[#6B6B8A] mt-1">{stat.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES SECTION ── */}
        <section id="beneficios" className="py-24 bg-white relative">
          <div className="max-w-[1440px] mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-[#2563EB] font-bold text-[13px] tracking-widest uppercase mb-3 block" style={{ fontFamily: "var(--font-ui)" }}>Solução Completa</span>
              <h2 className="text-3xl sm:text-4xl font-black text-[#1A1A2E] leading-tight mb-4" style={{ fontFamily: "var(--font-display)" }}>
                Não é só um sistema de gestão. É uma <br className="hidden sm:block"/> máquina de previsibilidade e lucro.
              </h2>
              <p className="text-lg text-[#6B6B8A]">
                Construído especificamente pelas dores reportadas por mais de 50 donos de garagens e lojistas multimarcas no Brasil.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f, idx) => {
                const Icon = f.icon;
                return (
                  <div key={idx} className="bg-white rounded-[20px] border border-[#E8E8F0] p-7 hover-lift shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className={`w-12 h-12 rounded-[12px] ${f.color} flex items-center justify-center mb-6`}>
                      <Icon className={`w-6 h-6 ${f.iconColor}`} />
                    </div>
                    <h3 className="text-[18px] font-bold text-[#1A1A2E] leading-snug mb-3" style={{ fontFamily: "var(--font-display)" }}>{f.title}</h3>
                    <p className="text-[14px] text-[#6B6B8A] leading-relaxed">{f.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── PLATFORM DEEP DIVE ── */}
        <section id="plataforma" className="py-24 bg-[#1A1A2E] text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#2563EB] opacity-20 blur-[100px]" />
          <div className="max-w-[1440px] mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 leading-tight" style={{ fontFamily: "var(--font-display)" }}>
                  Controle total do pátio, ao financeiro, em uma só tela.
                </h2>
                <p className="text-[#94A3B8] text-lg mb-8 leading-relaxed">
                  O painel inteligente cruza os dados do seu estoque com suas despesas. A NexDrive avisa instantaneamente se um carro está há muito tempo parado consumindo capital, ou qual o valor mínimo que seu vendedor pode aceitar sem dar prejuízo em uma negociação.
                </p>
                
                <ul className="space-y-6 mb-10">
                  {[
                    "Margem de Lucro por Veículo Calculada automaticamente contra custos fixos.",
                    "CRM Visual (Kanban) rastreando qual cliente vai test-drive amanhã.",
                    "Exportação nativa das tabelas DRE para seu contador não perder tempo.",
                  ].map((item, i) => (
                    <li key={i} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-[#2563EB]/20 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-4 h-4 text-[#3B82F6]" />
                      </div>
                      <p className="text-white/90 font-medium" style={{ fontFamily: "var(--font-ui)" }}>{item}</p>
                    </li>
                  ))}
                </ul>
                
                <button onClick={() => navigate("/auth")} className="bg-brand-gradient hover:shadow-brand text-white font-bold text-base px-8 py-4 rounded-[14px] transition-all flex items-center gap-2">
                  Acessar Painel Financeiro <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E] via-transparent to-transparent z-10 block lg:hidden" />
                <PlatformMockup />
              </div>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS (AUTOFLOW STYLED) ── */}
        <section id="depoimentos" className="py-24 bg-[#F8FAFC]">
          <div className="max-w-[1440px] mx-auto px-6">
            <div className="text-center mb-16">
              <span className="text-[#2563EB] font-bold text-[13px] tracking-widest uppercase mb-3 block" style={{ fontFamily: "var(--font-ui)" }}>Casos de Sucesso</span>
              <h2 className="text-3xl sm:text-4xl font-black text-[#1A1A2E] leading-tight" style={{ fontFamily: "var(--font-display)" }}>
                Validado pelas maiores garagens da região
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {testimonials.map((t, idx) => (
                <div key={idx} className="bg-white p-7 rounded-[20px] shadow-sm hover:shadow-md transition-shadow border border-[#E8E8F0] flex flex-col h-full">
                  <div className="flex gap-1 mb-4">
                    {[1,2,3,4,5].map(star => <Star key={star} className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />)}
                  </div>
                  <p className="text-[#6B6B8A] text-[15px] leading-relaxed flex-1 italic mb-6">"{t.text}"</p>
                  <div className="flex items-center gap-4 pt-4 border-t border-[#E8E8F0]">
                    <div className="w-10 h-10 rounded-full bg-[#DBEAFE] text-[#2563EB] font-bold flex items-center justify-center text-[12px]" style={{ fontFamily: "var(--font-display)" }}>{t.avatar}</div>
                    <div>
                      <p className="font-bold text-[#1A1A2E] text-[13px]" style={{ fontFamily: "var(--font-ui)" }}>{t.name}</p>
                      <p className="text-[12px] text-[#94A3B8]" style={{ fontFamily: "var(--font-body)" }}>{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ (SEO / GEO DRIVEN) ── */}
        <section id="faq" className="py-24 bg-white border-y border-[#E8E8F0]">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black text-[#1A1A2E] mb-4" style={{ fontFamily: "var(--font-display)" }}>Perguntas Frequentes</h2>
              <p className="text-[#6B6B8A]">As principais dúvidas dos concessionários antes de automatizar seus estoques com a NexDrive.</p>
            </div>
            
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <details key={idx} className="group bg-[#F8FAFC] rounded-[16px] border border-[#E8E8F0] overflow-hidden">
                  <summary className="flex items-center justify-between p-6 cursor-pointer font-bold text-[#1A1A2E] text-[16px] list-none" style={{ fontFamily: "var(--font-ui)" }}>
                    {faq.q}
                    <ChevronDown className="w-5 h-5 text-[#94A3B8] group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-6 pb-6 text-[#6B6B8A] text-[15px] leading-relaxed">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER (SEMANTIC) ── */}
      <footer className="bg-[#1A1A2E] text-white pt-16 pb-8 border-t-4 border-[#2563EB]">
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-1 md:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-brand-gradient rounded-[8px] flex items-center justify-center">
                  <span className="text-white text-base font-black tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>N</span>
                </div>
                <span className="text-xl font-bold tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>NexDrive</span>
              </div>
              <p className="text-[#94A3B8] text-[14px] leading-relaxed mb-6">
                Acelere as vendas da sua garagem e tenha lucro real com a primeira plataforma all-in-one guiada por Inteligência Artificial no mercado automotivo.
              </p>
            </div>
            
            {[
              ["Soluções", ["Dashboard Financeiro","Vitrine Online","Agentes IA (WhatsApp)","Gestão de Contratos"]],
              ["Contato", ["suporte@nexdrive.com.br", "(11) 99999-0000", "São Paulo, SP"]],
              ["Termos", ["Políticas de Privacidade", "Termos de Serviço", "Cookies"]],
            ].map(([title, links]) => (
              <div key={String(title)}>
                <h4 className="font-bold text-[15px] mb-4 text-white" style={{ fontFamily: "var(--font-ui)" }}>{title}</h4>
                <ul className="space-y-3">
                  {(links as string[]).map((link) => (
                    <li key={link} className="text-[13px] text-[#94A3B8] hover:text-white transition-colors cursor-pointer">{link}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-[12px] text-[#6B6B8A]">
            <p>© {new Date().getFullYear()} NexDrive Systems. Todos os direitos reservados.</p>
            <div className="flex items-center gap-4">
               {/* Social Icons Placeholder */}
               <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#2563EB] hover:text-white cursor-pointer transition-colors"><Instagram className="w-4 h-4" /></div>
               <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#2563EB] hover:text-white cursor-pointer transition-colors"><Facebook className="w-4 h-4" /></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
