import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Users2, Plus, Trash2, Search } from "lucide-react";

type Vehicle = {
  id: string;
  brand: string | null;
  model: string | null;
  plate: string | null;
};

type Entity = {
  id: string;
  name: string;
  cpf_cnpj?: string | null;
};

type VehicleOwner = {
  id: string;
  vehicle_id: string;
  entity_id: string;
  equity_percentage: number;
  roi_type: string;
  roi_rate: number;
  deleted_at: string | null;
  entity?: Entity;
};

const ROI_LABELS: Record<string, string> = {
  SPREAD: "Lucro Líquido (Spread)",
  FIXED_MONTHLY: "Retorno Fixo Mensal %",
  REVENUE_SHARE: "Revenue Share (% Bruto)",
};

const ROI_BADGE_COLORS: Record<string, string> = {
  SPREAD: "bg-blue-100 text-blue-800 border-blue-300",
  FIXED_MONTHLY: "bg-green-100 text-green-800 border-green-300",
  REVENUE_SHARE: "bg-purple-100 text-purple-800 border-purple-300",
};

export default function VehicleOwners() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [vehicleSearch, setVehicleSearch] = useState<string>("");
  const [owners, setOwners] = useState<VehicleOwner[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);

  // Add dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [entitySearch, setEntitySearch] = useState("");
  const [entityResults, setEntityResults] = useState<Entity[]>([]);
  const [entitySearchLoading, setEntitySearchLoading] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [newEquity, setNewEquity] = useState<string>("");
  const [newRoiType, setNewRoiType] = useState<string>("SPREAD");
  const [newRoiRate, setNewRoiRate] = useState<string>("0");
  const [saving, setSaving] = useState(false);

  // Load vehicles
  useEffect(() => {
    const loadVehicles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await (supabase as any)
        .from("products")
        .select("id, brand, model, plate")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Erro ao carregar veículos: " + error.message);
      } else {
        setVehicles(data || []);
      }
    };
    loadVehicles();
  }, []);

  const filteredVehicles = vehicles.filter((v) => {
    const q = vehicleSearch.toLowerCase();
    return (
      !q ||
      v.plate?.toLowerCase().includes(q) ||
      v.brand?.toLowerCase().includes(q) ||
      v.model?.toLowerCase().includes(q)
    );
  });

  // Load owners when vehicle changes
  const loadOwners = useCallback(async (vehicleId: string) => {
    if (!vehicleId) { setOwners([]); return; }
    setLoadingOwners(true);
    try {
      const { data, error } = await (supabase as any)
        .from("vehicle_owners")
        .select("*, entity:entities(id, name, cpf_cnpj)")
        .eq("vehicle_id", vehicleId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setOwners(data || []);
    } catch (err: any) {
      toast.error("Erro ao carregar proprietários: " + err.message);
    } finally {
      setLoadingOwners(false);
    }
  }, []);

  useEffect(() => {
    loadOwners(selectedVehicleId);
  }, [selectedVehicleId, loadOwners]);

  // Total allocated
  const totalAllocated = owners.reduce((sum, o) => sum + (o.equity_percentage || 0), 0);
  const isOver = totalAllocated > 100;

  // Entity search
  const searchEntities = async (q: string) => {
    if (q.length < 2) { setEntityResults([]); return; }
    setEntitySearchLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase as any)
        .from("entities")
        .select("id, name, cpf_cnpj")
        .eq("user_id", user.id)
        .or(`name.ilike.%${q}%,cpf_cnpj.ilike.%${q}%`)
        .limit(10);
      setEntityResults(data || []);
    } catch {
      setEntityResults([]);
    } finally {
      setEntitySearchLoading(false);
    }
  };

  const handleAddOwner = async () => {
    if (!selectedVehicleId) { toast.error("Selecione um veículo"); return; }
    if (!selectedEntity) { toast.error("Selecione uma entidade"); return; }
    const equity = parseFloat(newEquity);
    if (isNaN(equity) || equity <= 0 || equity > 100) {
      toast.error("Informe uma cota entre 0 e 100%");
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("vehicle_owners")
        .insert({
          vehicle_id: selectedVehicleId,
          entity_id: selectedEntity.id,
          equity_percentage: equity,
          roi_type: newRoiType,
          roi_rate: parseFloat(newRoiRate) || 0,
        });
      if (error) throw error;
      toast.success("Coproprietário adicionado!");
      setAddOpen(false);
      setSelectedEntity(null);
      setEntitySearch("");
      setEntityResults([]);
      setNewEquity("");
      setNewRoiType("SPREAD");
      setNewRoiRate("0");
      loadOwners(selectedVehicleId);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveOwner = async (ownerId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("vehicle_owners")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", ownerId);
      if (error) throw error;
      toast.success("Coproprietário removido");
      loadOwners(selectedVehicleId);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Users2 className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold">Copropriedade de Veículos</h1>
      </div>

      {/* Vehicle selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Selecionar Veículo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por placa, marca ou modelo..."
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
            {filteredVehicles.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVehicleId(v.id)}
                className={[
                  "text-left px-3 py-2 rounded-lg border text-sm transition-colors",
                  selectedVehicleId === v.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted border-border",
                ].join(" ")}
              >
                <span className="font-medium">{v.brand} {v.model}</span>
                {v.plate && <span className="ml-2 opacity-70">{v.plate}</span>}
              </button>
            ))}
            {filteredVehicles.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full text-center py-4">
                Nenhum veículo encontrado
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Owners panel */}
      {selectedVehicleId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Proprietários — {selectedVehicle?.brand} {selectedVehicle?.model}
                {selectedVehicle?.plate && ` (${selectedVehicle.plate})`}
              </CardTitle>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Coproprietário
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cotas alocadas</span>
                <span className={isOver ? "text-red-600 font-bold" : "font-medium"}>
                  {totalAllocated.toFixed(2)}% / 100%
                </span>
              </div>
              <Progress
                value={Math.min(totalAllocated, 100)}
                className={isOver ? "[&>div]:bg-red-500" : "[&>div]:bg-blue-500"}
              />
              {isOver && (
                <p className="text-xs text-red-600">
                  A soma das cotas excede 100%. Ajuste antes de salvar.
                </p>
              )}
            </div>

            {loadingOwners ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : owners.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">
                Nenhum coproprietário cadastrado para este veículo.
              </p>
            ) : (
              <div className="space-y-2">
                {owners.map((owner) => (
                  <div
                    key={owner.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        {owner.entity?.name || "Entidade desconhecida"}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-primary">
                          {owner.equity_percentage}%
                        </span>
                        <Badge
                          variant="outline"
                          className={ROI_BADGE_COLORS[owner.roi_type] || ""}
                        >
                          {ROI_LABELS[owner.roi_type] || owner.roi_type}
                        </Badge>
                        {owner.roi_rate > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Taxa: {owner.roi_rate}%
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveOwner(owner.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => {
        if (!o) {
          setAddOpen(false);
          setSelectedEntity(null);
          setEntitySearch("");
          setEntityResults([]);
          setNewEquity("");
          setNewRoiType("SPREAD");
          setNewRoiRate("0");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users2 className="h-5 w-5" />
              Adicionar Coproprietário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Entity search */}
            <div className="space-y-1.5">
              <Label>Entidade (nome ou CPF/CNPJ)</Label>
              <div className="relative">
                <Input
                  placeholder="Buscar entidade..."
                  value={entitySearch}
                  onChange={(e) => {
                    setEntitySearch(e.target.value);
                    setSelectedEntity(null);
                    searchEntities(e.target.value);
                  }}
                />
                {entitySearchLoading && (
                  <p className="text-xs text-muted-foreground mt-1">Buscando...</p>
                )}
                {entityResults.length > 0 && !selectedEntity && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {entityResults.map((ent) => (
                      <button
                        key={ent.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                        onClick={() => {
                          setSelectedEntity(ent);
                          setEntitySearch(ent.name);
                          setEntityResults([]);
                        }}
                      >
                        <span className="font-medium">{ent.name}</span>
                        {ent.cpf_cnpj && (
                          <span className="ml-2 text-muted-foreground text-xs">{ent.cpf_cnpj}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedEntity && (
                <p className="text-xs text-green-600">Entidade selecionada: {selectedEntity.name}</p>
              )}
            </div>

            {/* Equity percentage */}
            <div className="space-y-1.5">
              <Label>Cota de Participação (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="Ex: 25"
                value={newEquity}
                onChange={(e) => setNewEquity(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Alocado atualmente: {totalAllocated.toFixed(2)}% — disponível: {Math.max(0, 100 - totalAllocated).toFixed(2)}%
              </p>
            </div>

            {/* ROI type */}
            <div className="space-y-1.5">
              <Label>Tipo de ROI</Label>
              <Select value={newRoiType} onValueChange={setNewRoiType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SPREAD">Lucro Líquido (Spread)</SelectItem>
                  <SelectItem value="FIXED_MONTHLY">Retorno Fixo Mensal %</SelectItem>
                  <SelectItem value="REVENUE_SHARE">Revenue Share (% Bruto)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ROI rate */}
            <div className="space-y-1.5">
              <Label>Taxa de ROI (%)</Label>
              <Input
                type="number"
                min="0"
                max="999.99"
                step="0.01"
                placeholder="Ex: 2.5"
                value={newRoiRate}
                onChange={(e) => setNewRoiRate(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleAddOwner} disabled={saving}>
                {saving ? "Salvando..." : "Adicionar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
