import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, FileText } from "lucide-react";

type VehicleCost = {
  id: string;
  description: string;
  amount: number;
  invoice_url: string | null;
  created_at: string;
};

interface VehicleCostsProps {
  productId: string;
}

export default function VehicleCosts({ productId }: VehicleCostsProps) {
  const [costs, setCosts] = useState<VehicleCost[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
  });
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  useEffect(() => {
    loadCosts();
  }, [productId]);

  const loadCosts = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicle_costs")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCosts(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar custos: " + error.message);
    }
  };

  const uploadInvoice = async (userId: string) => {
    if (!invoiceFile) return null;

    const fileExt = invoiceFile.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-invoice.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('vehicle-invoices')
      .upload(fileName, invoiceFile);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('vehicle-invoices')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const invoiceUrl = invoiceFile ? await uploadInvoice(user.id) : null;

      const { error } = await supabase.from("vehicle_costs").insert([{
        product_id: productId,
        user_id: user.id,
        description: formData.description,
        amount: parseFloat(formData.amount),
        invoice_url: invoiceUrl,
      }]);

      if (error) throw error;

      toast.success("Custo adicionado!");
      setFormData({ description: "", amount: "" });
      setInvoiceFile(null);
      loadCosts();
    } catch (error: any) {
      toast.error("Erro ao adicionar custo: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este custo?")) return;

    try {
      const { error } = await supabase
        .from("vehicle_costs")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Custo excluído!");
      loadCosts();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  const totalCosts = costs.reduce((sum, cost) => sum + cost.amount, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Custos do Veículo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="cost-description">Descrição do Custo</Label>
              <Input
                id="cost-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Reparo da lataria"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost-amount">Valor (R$)</Label>
              <Input
                id="cost-amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice">Nota Fiscal (opcional)</Label>
              <Input
                id="invoice"
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
            </div>

            <Button type="submit" size="sm" className="w-full" disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              {loading ? "Adicionando..." : "Adicionar Custo"}
            </Button>
          </form>

          {costs.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold">Custos Registrados</h4>
                <span className="text-sm font-bold text-primary">
                  Total: R$ {totalCosts.toFixed(2)}
                </span>
              </div>
              {costs.map((cost) => (
                <div
                  key={cost.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{cost.description}</p>
                    <p className="text-sm text-muted-foreground">
                      R$ {cost.amount.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {cost.invoice_url && (
                      <a
                        href={cost.invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(cost.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
