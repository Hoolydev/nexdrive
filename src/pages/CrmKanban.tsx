import React, { useState, useEffect, useCallback, useMemo } from "react";
import { hapticFeedback } from "@/utils/haptic";
import { supabase } from "@/integrations/supabase/client";
import { getEffectiveUserId } from "@/lib/getEffectiveUserId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Phone, User, Plus, Car, Settings, Filter, Search, Trash2, Edit2
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CrmLead, CrmFunnel, CrmFunnelStage } from "@/integrations/supabase/types-prd";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface LeadWithRelations extends CrmLead {
  vehicle_title?: string | null;
  seller_name?: string | null;
}

const ORIGIN_LABELS: Record<string, string> = {
  marketplace: "Marketplace",
  whatsapp: "WhatsApp",
  phone: "Telefone",
  walk_in: "Walk-in",
  website: "Website",
  referral: "Indicação",
  other: "Outro",
};

const ORIGIN_COLORS: Record<string, string> = {
  marketplace: "bg-blue-50 text-blue-700 border-blue-200",
  whatsapp: "bg-green-50 text-green-700 border-green-200",
  phone: "bg-yellow-50 text-yellow-700 border-yellow-200",
  walk_in: "bg-purple-50 text-purple-700 border-purple-200",
  website: "bg-cyan-50 text-cyan-700 border-cyan-200",
  referral: "bg-orange-50 text-orange-700 border-orange-200",
  other: "bg-slate-50 text-slate-700 border-slate-200",
};

const COLOR_OPTIONS = [
  { value: "bg-slate-100 text-slate-800", label: "Cinza (Padrão)", class: "bg-slate-100 text-slate-800" },
  { value: "bg-blue-100 text-blue-800", label: "Azul", class: "bg-blue-100 text-blue-800" },
  { value: "bg-yellow-100 text-yellow-800", label: "Amarelo", class: "bg-yellow-100 text-yellow-800" },
  { value: "bg-cyan-100 text-cyan-800", label: "Ciano", class: "bg-cyan-100 text-cyan-800" },
  { value: "bg-orange-100 text-orange-800", label: "Laranja", class: "bg-orange-100 text-orange-800" },
  { value: "bg-purple-100 text-purple-800", label: "Roxo", class: "bg-purple-100 text-purple-800" },
  { value: "bg-green-100 text-green-800", label: "Verde", class: "bg-green-100 text-green-800" },
  { value: "bg-red-100 text-red-800", label: "Vermelho", class: "bg-red-100 text-red-800" },
];

// ---------------------------------------------------------------------------
// DroppableColumn Component
// ---------------------------------------------------------------------------
function DroppableColumn({ stage, columnLeads, activeDragId, children }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div
      ref={setNodeRef}
      className={`min-w-[320px] w-[320px] h-full flex flex-col bg-slate-50 border-r border-slate-200 transition-colors ${
        isOver ? "bg-blue-50/50" : ""
      }`}
    >
      <div className={`shrink-0 px-4 py-3 flex items-center justify-between border-b border-slate-200 ${stage.color_theme}`}>
        <span className="font-semibold text-sm truncate">{stage.name}</span>
        <Badge variant="secondary" className="text-xs font-bold bg-white/60 text-current">
          {columnLeads.length}
        </Badge>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {columnLeads.length === 0 && !activeDragId && (
          <div className="text-center py-8 text-sm text-slate-400">
            Arraste leads para cá
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DraggableCard Component
// ---------------------------------------------------------------------------
function DraggableCard({ lead, activeDragId, children }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
    
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all ${
        isDragging ? "opacity-50 z-50 ring-2 ring-blue-400 scale-[1.02] shadow-lg" : "opacity-100 cursor-pointer"
      }`}
    >
      <div {...listeners} className="cursor-grab active:cursor-grabbing w-full h-3 -mt-2 -mx-2 mb-1 flex items-center justify-center touch-none">
        <div className="w-8 h-1 rounded-full bg-slate-200 hover:bg-slate-300 transition-colors" />
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN KANBAN COMPONENT
// ---------------------------------------------------------------------------

export default function CrmKanban() {
  const [needsMigration, setNeedsMigration] = useState(false);
  const [loading, setLoading] = useState(true);

  // Schema state
  const [funnels, setFunnels] = useState<CrmFunnel[]>([]);
  const [stages, setStages] = useState<CrmFunnelStage[]>([]);
  const [activeFunnelId, setActiveFunnelId] = useState<string | null>(null);

  // Data state
  const [leads, setLeads] = useState<LeadWithRelations[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);

  // Filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeller, setFilterSeller] = useState("all");

  // Dragging state
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Settings Modal State
  const [configOpen, setConfigOpen] = useState(false);
  const [configTab, setConfigTab] = useState<"funnel" | "stages">("funnel");
  
  const [newFunnelName, setNewFunnelName] = useState("");
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState(COLOR_OPTIONS[0].value);

  // ---------------------------------------------------------------------------
  // Load initial data
  // ---------------------------------------------------------------------------
  const loadConfiguration = useCallback(async () => {
    try {
      const effectiveId = await getEffectiveUserId();
      if (!effectiveId) return;

      const { data: userFunnels, error: funnelsError } = await (supabase as any)
        .from("crm_funnels")
        .select("*")
        .eq("user_id", effectiveId)
        .order("created_at", { ascending: true });

      if (funnelsError) {
        if (funnelsError.message.includes("relation \"public.crm_funnels\" does not exist")) setNeedsMigration(true);
        throw funnelsError;
      }

      setFunnels(userFunnels || []);
      
      const defaultFunnelId = userFunnels?.[0]?.id || null;
      if (defaultFunnelId && !activeFunnelId) {
        setActiveFunnelId(defaultFunnelId);
      }
      
      const funnelIdToFetch = activeFunnelId || defaultFunnelId;

      if (funnelIdToFetch) {
        const { data: funnelStages, error: stagesError } = await (supabase as any)
          .from("crm_funnel_stages")
          .select("*")
          .eq("funnel_id", funnelIdToFetch)
          .order("stage_order", { ascending: true });
          
        if (stagesError) throw stagesError;
        setStages(funnelStages || []);
      }
    } catch (error: any) {
      console.error("Configuration load error:", error);
    }
  }, [activeFunnelId]);

  const loadLeads = useCallback(async () => {
    if (!activeFunnelId) return;
    try {
      const effectiveId = await getEffectiveUserId();
      if (!effectiveId) return;

      const { data, error } = await (supabase as any)
        .from("crm_leads")
        .select("*")
        .eq("user_id", effectiveId)
        .eq("funnel_id", activeFunnelId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error && !error.message.includes("does not exist")) throw error;

      const leadsRaw = (data || []) as CrmLead[];
      
      // Load relations internally
      const vehicleIds = leadsRaw.map(l => l.vehicle_interest_id).filter(Boolean) as string[];
      const sellerIds = leadsRaw.map(l => l.assigned_seller_id).filter(Boolean) as string[];

      let vehicleMap: Record<string, string> = {};
      let sellerMap: Record<string, string> = {};

      if (vehicleIds.length > 0) {
        const { data: vehicles } = await supabase.from("products").select("id, title, brand, model").in("id", vehicleIds);
        (vehicles || []).forEach((v: any) => vehicleMap[v.id] = v.title || `${v.brand || ""} ${v.model || ""}`.trim() || "Veículo");
      }
      if (sellerIds.length > 0) {
        const { data: sellerEntities } = await (supabase as any).from("entities").select("id, name").in("id", sellerIds);
        (sellerEntities || []).forEach((s: any) => sellerMap[s.id] = s.name);
      }

      const enriched: LeadWithRelations[] = leadsRaw.map((l) => ({
        ...l,
        vehicle_title: l.vehicle_interest_id ? vehicleMap[l.vehicle_interest_id] || null : null,
        seller_name: l.assigned_seller_id ? sellerMap[l.assigned_seller_id] || null : null,
      }));

      setLeads(enriched);
    } catch (error: any) {
      console.error("Leads load error", error);
    }
  }, [activeFunnelId]);

  const loadResources = useCallback(async () => {
    try {
      const { data: sData } = await (supabase as any).from("entities").select("id, name").eq("is_seller", true).is("deleted_at", null);
      setSellers((sData || []) as any);
    } catch (error: any) {}
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    await loadConfiguration();
    await loadResources();
    setLoading(false);
  }, [loadConfiguration, loadResources]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (activeFunnelId) {
      loadConfiguration();
      loadLeads();
    }
  }, [activeFunnelId, loadConfiguration, loadLeads]);

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------
  const handleSeedDefault = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // @ts-ignore
      const { error } = await supabase.rpc('seed_default_crm_funnel', { p_user_id: user.id });
      if (error) throw error;
      toast.success("Funil padrão criado com sucesso!");
      await bootstrap();
    } catch(err: any){
      toast.error("Erro ao criar funil: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const createFunnel = async () => {
    if (!newFunnelName.trim()) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await (supabase as any)
        .from("crm_funnels")
        .insert([{ user_id: user.id, name: newFunnelName.trim() }])
        .select()
        .single();
      if (error) throw error;
      setNewFunnelName("");
      toast.success("Funil criado!");
      await loadConfiguration();
      setActiveFunnelId(data.id);
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const createStage = async () => {
    if (!newStageName.trim() || !activeFunnelId) return;
    try {
      const order = stages.length + 1;
      const { error } = await (supabase as any)
        .from("crm_funnel_stages")
        .insert([{ funnel_id: activeFunnelId, name: newStageName.trim(), color_theme: newStageColor, stage_order: order }]);
      if (error) throw error;
      setNewStageName("");
      toast.success("Etapa criada!");
      await loadConfiguration();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const deleteStage = async (id: string) => {
    if(!window.confirm("Certez que deseja excluir esta etapa? Os leads nela poderão ficar sem etapa.")) return;
    try {
      const { error } = await (supabase as any).from("crm_funnel_stages").delete().eq("id", id);
      if (error) throw error;
      toast.success("Etapa excluída.");
      await loadConfiguration();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragId(e.active.id as string);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over) return;

    const leadId = active.id as string;
    const targetStageId = over.id as string;
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.stage_id === targetStageId) return;

    // Optimistic Update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage_id: targetStageId } : l));

    try {
      const { error } = await (supabase as any).from("crm_leads").update({ stage_id: targetStageId }).eq("id", leadId);
      if (error) throw error;
      hapticFeedback('success');
    } catch (error: any) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage_id: lead.stage_id } : l));
      toast.error("Erro ao mover lead");
    }
  };

  // ---------------------------------------------------------------------------
  // Filters mapped 
  // ---------------------------------------------------------------------------
  const leadsByStage = useMemo(() => {
    const map: Record<string, LeadWithRelations[]> = {};
    stages.forEach(s => map[s.id] = []);
    
    leads.filter(l => {
      const s = !searchQuery || l.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) || l.phone?.includes(searchQuery) || l.email?.includes(searchQuery);
      const sel = filterSeller === "all" || l.assigned_seller_id === filterSeller;
      return s && sel;
    }).forEach(lead => {
      const target = lead.stage_id || stages[0]?.id;
      if (target && map[target]) {
        map[target].push(lead);
      }
    });
    return map;
  }, [leads, stages, searchQuery, filterSeller]);

  // ---------------------------------------------------------------------------
  // UI States
  // ---------------------------------------------------------------------------
  
  if (needsMigration) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-[calc(100vh-64px)]">
        <h2 className="text-2xl font-black mb-4">Migração Executada Novamente</h2>
        <p className="text-slate-500 max-w-lg mx-auto mb-8">Execute o script SQL recém fornecido no seu Supabase.</p>
        <Button onClick={() => window.location.reload()}>Já rodei a migração</Button>
      </div>
    );
  }

  if (loading) return <div className="p-6">Carregando CRM...</div>;

  // Empty State
  if (funnels.length === 0) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)] items-center justify-center p-6 text-center bg-[#F8FAFC]">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
          <Filter className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Bem-vindo ao Pipeline Customizável</h2>
        <p className="text-slate-500 max-w-md mb-8">
          Você não possui nenhum funil de vendas ativo. Pressione o botão abaixo para criar seu primeiro funil padrão de veículos.
        </p>
        <Button onClick={handleSeedDefault} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 px-8 rounded-xl shadow-md">
          Gerar Funil Padrão Automaticamente
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-white overflow-hidden">
      {/* ── Fixed Header (Single Row) ── */}
      <div className="shrink-0 bg-white border-b border-slate-200 shadow-sm z-10 px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black text-slate-900 tracking-tight whitespace-nowrap">Pipeline</h1>
          <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-slate-50">
            <Select value={activeFunnelId || ""} onValueChange={setActiveFunnelId}>
              <SelectTrigger className="w-[180px] h-8 text-sm font-bold border-none bg-transparent shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {funnels.map(f => <SelectItem key={f.id} value={f.id} className="font-semibold">{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <button onClick={() => setConfigOpen(true)} className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Filters & Actions ── */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar lead, contato..." 
              className="h-9 pl-9 bg-slate-50 border-slate-200 focus:bg-white text-sm"
            />
          </div>
          <Select value={filterSeller} onValueChange={setFilterSeller}>
            <SelectTrigger className="w-[180px] h-9 border-slate-200 bg-slate-50 font-medium text-slate-600">
              <User className="w-4 h-4 mr-2 text-slate-400"/>
              <SelectValue placeholder="Vendedores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Ver Todos</SelectItem>
              {sellers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="w-px h-6 bg-slate-200 mx-1"></div>

          <Button className="bg-blue-600 hover:bg-blue-700 font-bold shadow-md rounded-lg h-9 px-4 whitespace-nowrap">
            <Plus className="mr-2 h-4 w-4" /> Novo Lead
          </Button>
        </div>
      </div>

      {/* ── Kanban Board ── */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-white custom-scrollbar flex">
        <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex h-full items-start">
            {stages.map((stage) => {
              const columnLeads = leadsByStage[stage.id] || [];
              return (
                <DroppableColumn key={stage.id} stage={stage} columnLeads={columnLeads} activeDragId={activeDragId}>
                  {columnLeads.map((lead) => (
                    <DraggableCard key={lead.id} lead={lead} activeDragId={activeDragId}>
                      <div className="font-bold text-sm text-slate-900 leading-tight mb-2 truncate">
                        {lead.contact_name}
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                          <Phone className="w-3 h-3 text-slate-400" /> {lead.phone}
                        </div>
                      )}
                      {lead.origin && (
                        <div className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded inline-block border bg-slate-50 text-slate-600 border-slate-200">
                          {ORIGIN_LABELS[lead.origin] || lead.origin}
                        </div>
                      )}
                      
                      {lead.vehicle_title && (
                        <div className="mt-2 bg-slate-50 px-2 py-1.5 rounded-md border border-slate-200 flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="text-[11px] font-medium text-slate-700 truncate">{lead.vehicle_title}</span>
                        </div>
                      )}
                    </DraggableCard>
                  ))}
                </DroppableColumn>
              );
            })}
            
            {stages.length === 0 && (
              <div className="w-full flex justify-center pt-20">
                <Button variant="outline" onClick={() => setConfigOpen(true)}>Adicionar Etapas a este funil</Button>
              </div>
            )}
            
            {/* Blank block to ensure right edge scrolling buffer */}
            <div className="w-8 shrink-0 h-full bg-slate-50 border-r border-slate-200" />
          </div>
        </DndContext>
      </div>

      {/* ── CONFIG MODAL ── */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden">
          <div className="p-6 pb-2 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-black text-slate-900">Configurações de Funil</h2>
            <div className="flex gap-4 mt-4">
              <button 
                onClick={() => setConfigTab("funnel")}
                className={`py-2 text-sm font-bold border-b-2 transition-colors ${configTab === "funnel" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              >
                Funis Disponíveis
              </button>
              <button 
                onClick={() => setConfigTab("stages")}
                className={`py-2 text-sm font-bold border-b-2 transition-colors ${configTab === "stages" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              >
                Etapas do Funil Selecionado
              </button>
            </div>
          </div>
          
          <div className="p-6 bg-white min-h-[300px]">
            {configTab === "funnel" && (
              <div className="space-y-6">
                <div className="flex gap-2">
                  <Input value={newFunnelName} onChange={e => setNewFunnelName(e.target.value)} placeholder="Nome do novo funil (ex: Oficina)" />
                  <Button onClick={createFunnel} className="bg-slate-900 hover:bg-slate-800">Criar Funil</Button>
                </div>
                <div className="space-y-2">
                  <p className="font-bold text-sm text-slate-500">Seus Funis</p>
                  {funnels.map(f => (
                    <div key={f.id} className="flex items-center justify-between border border-slate-200 rounded-lg p-3">
                      <span className="font-semibold text-slate-800">{f.name}</span>
                      {f.id === activeFunnelId && <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Ativo</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {configTab === "stages" && (
              <div className="space-y-6">
                <div className="flex gap-2">
                  <Input value={newStageName} onChange={e => setNewStageName(e.target.value)} placeholder="Nova etapa (ex: Negociação)" className="flex-1"/>
                  <Select value={newStageColor} onValueChange={setNewStageColor}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{COLOR_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button onClick={createStage} className="bg-slate-900 hover:bg-slate-800"><Plus className="w-4 h-4 ml-1" /></Button>
                </div>
                
                <div className="space-y-2">
                  <p className="font-bold text-sm text-slate-500">Ordem das Etapas (Arraste para reordenar via painel em breve)</p>
                  {stages.map((s, index) => (
                    <div key={s.id} className="flex items-center justify-between border border-slate-200 rounded-lg p-2 bg-slate-50">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-bold w-4">{index + 1}</span>
                        <div className={`px-2 py-1 rounded text-xs font-bold ${s.color_theme}`}>{s.name}</div>
                      </div>
                      <button onClick={() => deleteStage(s.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
