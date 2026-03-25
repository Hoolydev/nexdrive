import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronDown, ChevronRight, ArrowRight, Play,
  Menu, X, User, Globe, BarChart3, MessageSquare,
  Zap, Layers, Brain, Settings, Plug,
  Car, DollarSign, FileSignature, Bot, Store,
  Phone, Mail, MapPin, Instagram, Facebook, Youtube
} from "lucide-react";
import { Player } from "@remotion/player";
import { LandingVideo } from "@/remotion/LandingVideo";

/* ═══════════════════════════════════════════════════════════════
   SOLUTIONS DATA
   ═══════════════════════════════════════════════════════════════ */
const solutions = [
  {
    id: "estoque",
    label: "Gestão de Estoque",
    icon: Car,
    heading: "Controle total do seu pátio com inteligência",
    description: "Gerencie seu estoque de veículos com consulta FIPE automática, precificação inteligente e margem de lucro em tempo real.",
    detail: "Cadastro completo com ficha técnica, galeria de fotos, status de venda e integração direta com sua vitrine digital para publicação instantânea.",
    cta: "Conheça a Gestão de Estoque",
    ctaHref: "#contato",
  },
  {
    id: "crm",
    label: "CRM de Vendas",
    icon: BarChart3,
    heading: "Nunca mais perca um lead quente",
    description: "Funil visual estilo Kanban para acompanhar cada oportunidade de venda do primeiro contato ao fechamento.",
    detail: "Distribuição automática de leads, follow-ups programados, histórico completo de interações e métricas de conversão por vendedor.",
    cta: "Conheça o CRM de Vendas",
    ctaHref: "#contato",
  },
  {
    id: "chat",
    label: "Agente IA WhatsApp",
    icon: Bot,
    heading: "Atendimento 24/7 que qualifica seus leads",
    description: "Inteligência artificial treinada com seu estoque real para responder clientes, tirar dúvidas e qualificar oportunidades automaticamente.",
    detail: "O agente coleta CPF, intenção de compra, preferência de financiamento e entrega o lead pronto para seu vendedor fechar o negócio.",
    cta: "Descubra o Agente IA WhatsApp",
    ctaHref: "#contato",
  },
  {
    id: "ia_loja",
    label: "Agente IA Assistente de Loja",
    icon: Brain,
    heading: "Inteligência Artificial que apoia sua equipe de vendas",
    description: "Um assistente inteligente interno para sugerir negociações, consultar tabela FIPE e auxiliar vendedores na argumentação e insights.",
    detail: "Reduza o tempo de qualificação e permita que seus vendedores tenham respostas imediatas sobre o estoque, histórico de clientes e margens de lucro recomendadas pelo assistente.",
    cta: "Conheça o Assistente Interno",
    ctaHref: "#contato",
  },
  {
    id: "vitrine",
    label: "Site Vitrine Automotivo",
    icon: Store,
    heading: "A concessionária digital que nunca fecha",
    description: "Um site próprio com a sua identidade visual, configurado em minutos, para exibir todo o seu estoque diretamente aos clientes na internet.",
    detail: "Link exclusivo da sua garagem com galeria de fotos em alta resolução, ficha técnica, e integração de conversão imediata pelo Agente IA no WhatsApp.",
    cta: "Criar minha Vitrine Digital",
    ctaHref: "#contato",
  },
  {
    id: "financeiro",
    label: "Módulo Financeiro",
    icon: DollarSign,
    heading: "Saiba exatamente para onde vai cada centavo",
    description: "Contas a pagar e receber, comissões de vendedores, fluxo de caixa diário e DRE automático para seu contador.",
    detail: "Controle completo das despesas por veículo, margem bruta real e relatórios prontos para tomada de decisão rápida.",
    cta: "Explore o Financeiro",
    ctaHref: "#contato",
  },
];

/* ═══════════════════════════════════════════════════════════════
   FEATURES
   ═══════════════════════════════════════════════════════════════ */
const features = [
  {
    heading: "Integrações nativas com portais e montadoras",
    description: "Conecte seu estoque aos principais portais automotivos e receba leads de múltiplas fontes em um único funil.",
  },
  {
    heading: "Insights e decisões baseadas em dados",
    description: "Dashboards com métricas de desempenho, relatórios de vendas e inteligência artificial para prever tendências do mercado.",
  },
  {
    heading: "Vitrine digital de alta conversão",
    description: "Link exclusivo da sua garagem para compartilhar no Instagram e WhatsApp. Clientes veem estoque, simulam parcelas e chamam direto.",
  },
  {
    heading: "Contratos automáticos em 1 clique",
    description: "Selecione o veículo e o cliente — o sistema gera o contrato de compra e venda em PDF pronto para assinatura.",
  },
];

/* ═══════════════════════════════════════════════════════════════
   BLOG POSTS
   ═══════════════════════════════════════════════════════════════ */
const posts = [
  {
    title: "Pós-vendas: fidelizando clientes e aumentando receita",
    excerpt: "O pós-venda é uma etapa crucial que vai além da transação inicial. Trata-se de todas as interações que uma empresa mantém com seus clientes após a compra.",
    href: "#",
  },
  {
    title: "A importância do CRM para concessionárias de veículos",
    excerpt: "O CRM é uma estratégia essencial que permite às concessionárias gerenciar o relacionamento com seus clientes de forma eficaz.",
    href: "#",
  },
  {
    title: "Como precificar veículos usados com base na tabela FIPE",
    excerpt: "Aprenda a usar a tabela FIPE como referência para definir preços competitivos e maximizar suas margens de lucro.",
    href: "#",
  },
];

/* ═══════════════════════════════════════════════════════════════
   BRAND LOGOS (montadoras)
   ═══════════════════════════════════════════════════════════════ */
const brands = [
  { name: "GWM", logo: "https://dealerspace.ai/wp-content/uploads/2025/03/gwm-1-logo.svg" },
  { name: "Mercedes", logo: "https://dealerspace.ai/wp-content/uploads/2025/03/Mercedes-logo.svg" },
  { name: "Toyota", logo: "https://dealerspace.ai/wp-content/uploads/2025/03/toyota-logo.svg" },
  { name: "RAM", logo: "https://dealerspace.ai/wp-content/uploads/2025/03/ram-logo.svg" },
  { name: "Chevrolet", logo: "https://dealerspace.ai/wp-content/uploads/2025/03/Chevrolet-logo.svg" },
  { name: "Hyundai", logo: "https://dealerspace.ai/wp-content/uploads/2025/03/Hyundai_logo-logo.svg" },
  { name: "Peugeot", logo: "https://dealerspace.ai/wp-content/uploads/2025/03/peugeot-logo.svg" },
  { name: "Honda", logo: "https://dealerspace.ai/wp-content/uploads/2025/03/honda-logo.svg" },
  { name: "Ford", logo: "https://dealerspace.ai/wp-content/uploads/2025/03/Ford-logo.svg" },
  { name: "Renault", logo: "https://dealerspace.ai/wp-content/uploads/2025/03/Renault-logo.svg" },
  { name: "Kia", logo: "https://dealerspace.ai/wp-content/uploads/2025/03/Kia-logo.svg" },
  { name: "BYD", logo: "https://dealerspace.ai/wp-content/uploads/2025/03/byd-auto-logo-1-logo.svg" },
  { name: "Volkswagen", logo: "https://dealerspace.ai/wp-content/uploads/2025/03/Volkswagen-logo.svg" },
  { name: "Triumph", logo: "https://dealerspace.ai/wp-content/uploads/2025/03/Triumph-logo.svg" },
  { name: "Stellantis", logo: "https://dealerspace.ai/wp-content/uploads/2025/03/Stellantis-logo.svg" },
  { name: "Kawasaki", logo: "https://dealerspace.ai/wp-content/uploads/2025/03/Kawasaki-logo.svg" },
];

/* ═══════════════════════════════════════════════════════════════
   NAV PRODUCT LINKS
   ═══════════════════════════════════════════════════════════════ */
const productLinks = [
  { label: "Gestão de Estoque", icon: Car },
  { label: "CRM Vendas e Pós-vendas", icon: BarChart3 },
  { label: "Agente IA WhatsApp", icon: Bot },
  { label: "Agente IA Assistente de Loja", icon: Brain },
  { label: "Site Vitrine Automotivo", icon: Store },
  { label: "Módulo Financeiro", icon: DollarSign },
  { label: "Contratos Automáticos", icon: FileSignature },
  { label: "Integrações", icon: Plug },
];

/* ═══════════════════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════════════════ */
function Navbar({ scrolled, mobileMenu, setMobileMenu, onLogin }: {
  scrolled: boolean;
  mobileMenu: boolean;
  setMobileMenu: (v: boolean) => void;
  onLogin: () => void;
}) {
  const [productsOpen, setProductsOpen] = useState(false);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100" : "bg-white"}`}>
      <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between gap-8">
        {/* Logo */}
        <Link to="/" className="flex-shrink-0 flex items-center gap-2">
          <img
            src="/nexdrive-logo.png"
            alt="NexDrive Logo"
            className="w-9 h-auto object-contain shrink-0"
          />
          <span className="text-xl font-bold tracking-tight text-black hidden sm:block">
            Nex<span className="text-[#A6DD05]">Drive</span>
          </span>
        </Link>

        {/* Nav Links */}
        <nav className="hidden lg:flex items-center gap-8">
          {/* Produtos dropdown */}
          <div className="relative">
            <button
              onClick={() => setProductsOpen(!productsOpen)}
              className="flex items-center gap-1 text-[15px] font-medium text-gray-800 hover:text-black transition-colors"
            >
              Soluções
              <ChevronDown className={`w-4 h-4 transition-transform ${productsOpen ? "rotate-180" : ""}`} />
            </button>

            {productsOpen && (
              <div className="absolute top-full left-0 mt-2 w-[280px] bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                {productLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={() => setProductsOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group w-full text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#E0FF74] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-[#213201]" />
                      </div>
                      <span className="text-[14px] font-medium text-gray-700 group-hover:text-black">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <a href="#beneficios" className="text-[15px] font-medium text-gray-800 hover:text-black transition-colors">Benefícios</a>
          <a href="#plataforma" className="text-[15px] font-medium text-gray-800 hover:text-black transition-colors">Plataforma</a>
          <Link to="/marketplace" className="text-[15px] font-medium text-gray-800 hover:text-black transition-colors">Marketplace</Link>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={onLogin}
            className="hidden md:flex items-center gap-2 text-[15px] font-medium text-gray-700 hover:text-black transition-colors"
          >
            <User className="w-4 h-4" />
            Entrar
          </button>
          <a
            href="#contato"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#E0FF74] text-[#213201] text-[15px] font-semibold rounded-lg hover:bg-[#A6DD05] transition-colors"
          >
            Solicite uma demonstração
            <ArrowRight className="w-4 h-4" />
          </a>
          <button className="lg:hidden p-2 text-gray-800" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenu && (
        <div className="lg:hidden bg-white border-b border-gray-100 px-6 py-5 flex flex-col gap-4 shadow-lg absolute top-[72px] left-0 right-0">
          {["Soluções", "Benefícios", "Plataforma"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-base font-semibold text-gray-600 hover:text-black" onClick={() => setMobileMenu(false)}>{item}</a>
          ))}
          <Link to="/marketplace" className="text-base font-semibold text-gray-600 hover:text-black" onClick={() => setMobileMenu(false)}>Marketplace</Link>
          <button onClick={() => { onLogin(); setMobileMenu(false); }} className="text-[#A6DD05] font-bold text-base mt-2 text-left">Entrar no Sistema</button>
        </div>
      )}

      {/* Backdrop */}
      {productsOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setProductsOpen(false)} />
      )}
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HERO SECTION
   ═══════════════════════════════════════════════════════════════ */
function HeroSection() {
  return (
    <section className="pt-[72px] min-h-screen flex flex-col items-center justify-start bg-white overflow-hidden">
      <div className="w-full max-w-5xl mx-auto px-6 pt-20 pb-0 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 border border-gray-200 rounded-full px-4 py-1.5 mb-8">
          <span className="w-2 h-2 rounded-full bg-[#A6DD05] inline-block" />
          <span className="text-[14px] font-medium text-gray-500">Novidade</span>
          <span className="text-[14px] font-medium text-black flex items-center gap-1">
            Agente IA para WhatsApp disponível
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-[48px] md:text-[62px] font-bold leading-[1.15] tracking-tight text-black max-w-4xl mb-6">
          A plataforma de gestão e vendas mais completa para concessionárias no Brasil
        </h1>

        {/* Subtitle */}
        <p className="text-[17px] text-[#535862] max-w-2xl mb-10 leading-relaxed">
          Solução all-in-one para conectar e integrar toda a jornada de compra dos seus clientes, do marketing ao pós-vendas, com inteligência artificial embarcada.
        </p>

        {/* CTA */}
        <a
          href="#contato"
          className="inline-flex items-center gap-2 px-7 py-4 bg-[#E0FF74] text-[#213201] text-[16px] font-semibold rounded-lg hover:bg-[#A6DD05] transition-colors mb-16"
        >
          Solicite uma demonstração
          <ArrowRight className="w-4 h-4" />
        </a>

        {/* Dashboard mockup */}
        <div className="relative w-full max-w-4xl mx-auto">
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
          <div className="w-full rounded-xl shadow-2xl overflow-hidden bg-[#F8FAFC] border border-[#E8E8F0]">
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
            {/* Dashboard content */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Veículos em Estoque", value: "127", color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Leads Ativos", value: "84", color: "text-green-600", bg: "bg-green-50" },
                  { label: "Vendas do Mês", value: "23", color: "text-orange-600", bg: "bg-orange-50" },
                  { label: "Faturamento", value: "R$ 2.4M", color: "text-emerald-600", bg: "bg-emerald-50" },
                ].map((card, i) => (
                  <div key={i} className={`${card.bg} rounded-xl p-4`}>
                    <p className="text-[11px] text-gray-500 font-medium">{card.label}</p>
                    <p className={`text-[22px] font-bold ${card.color} mt-1`}>{card.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-4 h-[180px]">
                  <p className="text-[12px] font-semibold text-gray-700 mb-3">Vendas Mensais</p>
                  <div className="flex items-end gap-2 h-[120px]">
                    {[40, 65, 50, 80, 60, 90, 75, 95, 70, 85, 100, 88].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-[#A6DD05] to-[#E0FF74] rounded-t-sm" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <p className="text-[12px] font-semibold text-gray-700 mb-3">Top Vendedores</p>
                  <div className="space-y-3">
                    {["Carlos M.", "Ana P.", "Pedro S."].map((name, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#E0FF74] flex items-center justify-center text-[10px] font-bold text-[#213201]">{name.split(" ").map(n => n[0]).join("")}</div>
                        <div>
                          <p className="text-[11px] font-semibold text-gray-800">{name}</p>
                          <p className="text-[10px] text-gray-400">{[8, 6, 5][i]} vendas</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BRAND MARQUEE
   ═══════════════════════════════════════════════════════════════ */
function BrandMarquee() {
  return (
    <section className="py-12 border-y border-gray-100 bg-white overflow-hidden">
      <p className="text-center text-[13px] font-medium text-[#535862] uppercase tracking-widest mb-8">
        Preparado para as principais montadoras do mercado
      </p>
      <div className="relative flex overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        <div className="flex animate-marquee whitespace-nowrap gap-12 items-center">
          {[...brands, ...brands].map((brand, i) => (
            <div key={i} className="flex-shrink-0 flex items-center justify-center h-10 w-24 grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all">
              <img
                src={brand.logo}
                alt={brand.name}
                className="max-h-8 max-w-[80px] object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SOLUTIONS SECTION
   ═══════════════════════════════════════════════════════════════ */
function SolutionsSection() {
  const [active, setActive] = useState("estoque");
  const current = solutions.find(s => s.id === active)!;

  return (
    <section id="solucoes" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 border border-gray-200 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#A6DD05] inline-block" />
            <span className="text-[14px] font-medium text-gray-600">Nossas soluções</span>
          </div>
          <h2 className="text-[40px] font-bold text-black leading-tight max-w-3xl mx-auto mb-4">
            Otimize cada etapa da jornada de venda com serviços unificados
          </h2>
          <p className="text-[16px] text-[#535862] max-w-2xl mx-auto mb-8">
            Conte com todo o poder de inovação e I.A. embarcada da NexDrive para maximizar os resultados operacionais da sua concessionária.
          </p>
          <a
            href="#contato"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#E0FF74] text-[#213201] text-[15px] font-semibold rounded-lg hover:bg-[#A6DD05] transition-colors"
          >
            Solicite uma demonstração <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Tabs + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-12 items-start">
          {/* Left: tab list */}
          <div className="flex flex-col gap-2">
            {solutions.map((sol) => {
              const Icon = sol.icon;
              return (
                <button
                  key={sol.id}
                  onClick={() => setActive(sol.id)}
                  className={`flex items-center gap-3 px-5 py-4 rounded-xl text-left transition-all border ${
                    active === sol.id
                      ? "border-[#E0FF74] bg-[#F9FFE6] shadow-sm"
                      : "border-transparent hover:bg-gray-50"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    active === sol.id ? "bg-[#E0FF74]" : "bg-gray-100"
                  }`}>
                    <Icon className={`w-5 h-5 ${active === sol.id ? "text-[#213201]" : "text-gray-500"}`} />
                  </div>
                  <span className={`text-[15px] font-semibold ${active === sol.id ? "text-black" : "text-[#535862]"}`}>
                    {sol.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: panel */}
          <div className="bg-[#F5F6F7] rounded-2xl p-8 lg:p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-[#E0FF74] flex items-center justify-center">
                {(() => { const Icon = current.icon; return <Icon className="w-5 h-5 text-[#213201]" />; })()}
              </div>
              <span className="text-[14px] font-semibold text-[#535862] uppercase tracking-wide">{current.label}</span>
            </div>
            <h3 className="text-[28px] font-bold text-black leading-tight mb-4">{current.heading}</h3>
            <p className="text-[15px] text-[#535862] mb-3 leading-relaxed">{current.description}</p>
            <p className="text-[15px] text-[#535862] mb-8 leading-relaxed">{current.detail}</p>
            <a
              href={current.ctaHref}
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#E0FF74] text-[#213201] text-[15px] font-semibold rounded-lg hover:bg-[#A6DD05] transition-colors mb-8"
            >
              {current.cta} <ArrowRight className="w-4 h-4" />
            </a>
            {/* Solution visual mockup */}
            <div className="w-full rounded-xl bg-white border border-gray-200 p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#E0FF74]/30 flex items-center justify-center">
                  {(() => { const Icon = current.icon; return <Icon className="w-4 h-4 text-[#213201]" />; })()}
                </div>
                <span className="text-[14px] font-bold text-gray-800">{current.label}</span>
                <span className="ml-auto text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Ativo</span>
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-3 bg-gray-100 rounded-full" style={{ width: `${70 + i * 10}%` }} />
                    <span className="text-[10px] text-gray-400 w-10 text-right">{`${60 + i * 12}%`}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   VIDEO SECTION
   ═══════════════════════════════════════════════════════════════ */
function VideoSection() {
  const [playing, setPlaying] = useState(false);

  return (
    <section
      id="plataforma"
      className="relative w-full bg-[#0C0E12] overflow-hidden"
    >
      <div className="relative aspect-video max-h-[600px] w-full">
        {!playing ? (
          <>
            {/* Dark gradient + content */}
            <div className="w-full h-full bg-gradient-to-br from-[#0C0E12] via-[#1a1f2e] to-[#0C0E12] flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-white text-[36px] md:text-[48px] font-bold mb-4 max-w-2xl mx-auto px-6 leading-tight">
                  Veja a NexDrive em ação
                </h2>
                <p className="text-white/60 text-[16px] mb-8 max-w-lg mx-auto px-6">
                  Descubra como nossa plataforma transforma a gestão da sua concessionária
                </p>
                <button
                  onClick={() => setPlaying(true)}
                  className="w-20 h-20 rounded-full bg-[#E0FF74] flex items-center justify-center shadow-xl hover:scale-110 transition-transform mx-auto"
                  aria-label="Play video"
                >
                  <Play className="w-8 h-8 text-[#213201] fill-[#213201] ml-1" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-[#0C0E12] flex items-center justify-center">
            <Player
              component={LandingVideo}
              durationInFrames={510}
              compositionWidth={1920}
              compositionHeight={1080}
              fps={30}
              style={{ width: "100%", height: "100%", borderRadius: "16px" }}
              controls
              autoPlay
            />
          </div>
        )}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FEATURES GRID
   ═══════════════════════════════════════════════════════════════ */
function FeaturesGrid() {
  const featureIcons = [Plug, Brain, Store, FileSignature];
  return (
    <section id="beneficios" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-16">
          <h2 className="text-[36px] lg:text-[44px] font-bold text-black leading-tight max-w-2xl mb-4">
            Revolucione a gestão de marketing e vendas da sua concessionária
          </h2>
          <p className="text-[16px] text-[#535862] max-w-xl">
            Veja como as soluções NexDrive asseguram melhores práticas e alta performance em vendas no setor:
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = featureIcons[index];
            return (
              <div
                key={index}
                className="bg-[#F5F6F7] rounded-2xl p-8 flex flex-col gap-6 hover:shadow-md transition-shadow group"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#E0FF74] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-[#213201]" />
                  </div>
                  <h3 className="text-[20px] font-bold text-black mb-3">{feature.heading}</h3>
                  <p className="text-[15px] text-[#535862] leading-relaxed">{feature.description}</p>
                </div>
                <div className="mt-auto rounded-xl overflow-hidden bg-white border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4 text-[#A6DD05]" />
                    <span className="text-[12px] font-semibold text-gray-700">{feature.heading.split(" ").slice(0, 3).join(" ")}</span>
                  </div>
                  <div className="space-y-2">
                    {[85, 72, 93, 68].map((w, i) => (
                      <div key={i} className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#A6DD05] to-[#E0FF74]" style={{ width: `${w}%` }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BLOG SECTION
   ═══════════════════════════════════════════════════════════════ */
function BlogSection() {
  const blogColors = ["from-[#E0FF74]/20 to-[#A6DD05]/10", "from-blue-50 to-indigo-50", "from-orange-50 to-yellow-50"];
  return (
    <section className="py-24 bg-[#F5F6F7]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="inline-flex items-center gap-2 border border-gray-200 rounded-full px-4 py-1.5 mb-6 bg-white">
              <span className="w-2 h-2 rounded-full bg-[#A6DD05] inline-block" />
              <span className="text-[14px] font-medium text-gray-600">Blog & Conteúdo</span>
            </div>
            <h2 className="text-[36px] font-bold text-black leading-tight">
              Insights para o mercado automotivo
            </h2>
          </div>
          <a href="#" className="hidden md:flex items-center gap-2 text-[15px] font-semibold text-[#535862] hover:text-black transition-colors">
            Ver todos os artigos <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map((post, index) => (
            <a key={index} href={post.href} className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow group">
              {/* Image placeholder */}
              <div className={`h-48 bg-gradient-to-br ${blogColors[index]} flex items-center justify-center`}>
                <div className="w-16 h-16 rounded-2xl bg-white/80 flex items-center justify-center shadow-sm">
                  <Car className="w-8 h-8 text-[#A6DD05]" />
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-[18px] font-bold text-black mb-3 leading-snug group-hover:text-[#A6DD05] transition-colors">{post.title}</h3>
                <p className="text-[14px] text-[#535862] leading-relaxed line-clamp-3">{post.excerpt}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CTA BANNER
   ═══════════════════════════════════════════════════════════════ */
function CTABanner() {
  return (
    <section id="contato" className="relative w-full bg-[#0C0E12] overflow-hidden py-24">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#E0FF74] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#A6DD05] rounded-full blur-[150px]" />
      </div>
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-[36px] md:text-[48px] font-bold text-white leading-tight mb-6">
          Pronto para revolucionar a gestão da sua concessionária?
        </h2>
        <p className="text-white/60 text-[17px] mb-10 max-w-2xl mx-auto leading-relaxed">
          Agende uma demonstração gratuita e descubra como a NexDrive pode aumentar suas vendas, organizar seu estoque e automatizar seu atendimento.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://wa.me/5562982683262?text=Ol%C3%A1%2C%20gostaria%20de%20conhecer%20a%20NexDrive"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-8 py-4 bg-[#E0FF74] text-[#213201] text-[16px] font-semibold rounded-lg hover:bg-[#A6DD05] transition-colors"
          >
            Falar com Especialista
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="mailto:contato@nexdrive.com.br"
            className="flex items-center gap-2 px-8 py-4 bg-white/10 text-white text-[16px] font-semibold rounded-lg hover:bg-white/20 transition-colors border border-white/20"
          >
            <Mail className="w-4 h-4" />
            Enviar e-mail
          </a>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="bg-[#0C0E12] text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img
                src="/nexdrive-logo.png"
                alt="NexDrive Logo"
                className="w-8 h-auto object-contain"
              />
              <span className="text-xl font-bold tracking-tight text-white">
                Nex<span className="text-[#E0FF74]">Drive</span>
              </span>
            </div>
            <p className="text-gray-400 text-[14px] leading-relaxed mb-6">
              Acelere as vendas da sua garagem e tenha lucro real com a plataforma all-in-one guiada por Inteligência Artificial para o mercado automotivo.
            </p>
          </div>

          {/* Links */}
          {[
            ["Soluções", ["Gestão de Estoque", "CRM de Vendas", "Agente IA", "Módulo Financeiro", "Vitrine Digital", "Contratos"]],
            ["Contato", ["contato@nexdrive.com.br", "(62) 982683262", "Goiânia-GO"]],
            ["Legal", ["Políticas de Privacidade", "Termos de Serviço", "Cookies"]],
          ].map(([title, links]) => (
            <div key={String(title)}>
              <h4 className="font-bold text-[15px] mb-4 text-white">{title}</h4>
              <ul className="space-y-3">
                {(links as string[]).map((link) => (
                  <li key={link} className="text-[13px] text-gray-400 hover:text-white transition-colors cursor-pointer">{link}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col items-center justify-center text-[12px] text-gray-500">
          <p>© {new Date().getFullYear()} Alpha Builders Systems. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════════════════════ */
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
    <div className="landing-page min-h-screen bg-white text-[#363636] overflow-x-hidden selection:bg-[#E0FF74] selection:text-[#213201]">
      <Navbar
        scrolled={scrolled}
        mobileMenu={mobileMenu}
        setMobileMenu={setMobileMenu}
        onLogin={() => navigate("/auth")}
      />
      <main>
        <HeroSection />
        <BrandMarquee />
        <SolutionsSection />
        <VideoSection />
        <FeaturesGrid />
        <BlogSection />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
}
