import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { hapticFeedback } from "@/utils/haptic";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Wrench, DollarSign, Search, ChevronsUpDown, Check, Filter, ArrowRight, ShoppingCart, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import VehicleCosts from "@/components/VehicleCosts";
import { MarketResearch } from "@/components/MarketResearch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { fipeApi, type FipeBrand, type FipeModel, type FipeYear } from "@/integrations/fipe/client";
import { VehicleImageCarousel } from "@/components/VehicleImageCarousel";
import { GedAttachments } from "@/components/GedAttachments";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  title: string | null;
  description: string | null;
  price: number | null;
  image_url: string | null;
  brand: string | null;
  model: string | null;
  plate: string | null;
  renavan: string | null;
  chassis: string | null;
  color: string | null;
  fuel: string | null;
  transmission: string | null;
  doors: number | null;
  is_marketplace_visible: boolean;
  manufacturing_year: number | null;
  model_year: number | null;
  fipe_price: number | null;
  current_km: number | null;
  purchase_price: number | null;
  actual_sale_price: number | null;
  report_url: string | null;
  vehicle_images: string[];
  stock_entry_date: string;
  sale_date: string | null;
  sold: boolean;
  status: string | null;
  show_in_store: boolean;
  fiscal_grace_until?: string;
};

export default function Products() {
  const { isSeller } = useUserRole();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [customers, setCustomers] = useState<{ id: string; name: string; email: string; phone: string | null; }[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    brand: "",
    model: "",
    plate: "",
    renavan: "",
    chassis: "",
    color: "",
    fuel: "",
    transmission: "",
    doors: "",
    is_marketplace_visible: true,
    manufacturing_year: "",
    model_year: "",
    description: "",
    price: "",
    fipe_price: "",
    current_km: "",
    purchase_price: "",
    actual_sale_price: "",
    stock_entry_date: new Date().toISOString().split('T')[0],
    sold: false,
    sale_date: "",
    customerId: "",
    status: "active",
  });
  const [vehicleImages, setVehicleImages] = useState<File[]>([]);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [vehicleCostsMap, setVehicleCostsMap] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  // UI states for currency fields
  const [uiFipePrice, setUiFipePrice] = useState<string>("");
  const [uiPurchasePrice, setUiPurchasePrice] = useState<string>("");
  const [uiPrice, setUiPrice] = useState<string>("");
  const [uiActualSalePrice, setUiActualSalePrice] = useState<string>("");
  const [focusedField, setFocusedField] = useState<"fipe_price" | "purchase_price" | "price" | "actual_sale_price" | null>(null);

  // FIPE Integration
  const [brands, setBrands] = useState<FipeBrand[]>([]);
  const [models, setModels] = useState<FipeModel[]>([]);
  const [years, setYears] = useState<FipeYear[]>([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [loadingFipe, setLoadingFipe] = useState(false);

  // Combobox open states
  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

  // Market Research modal
  const [marketOpen, setMarketOpen] = useState(false);

  // Status filter
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Status transition state
  const [sellDialogProduct, setSellDialogProduct] = useState<Product | null>(null);
  const [sellForm, setSellForm] = useState({
    actual_sale_price: "",
    buyerQuery: "",
    buyerId: "",
  });
  const [fiscalGraceActive, setFiscalGraceActive] = useState(false);
  const [entitySearchResults, setEntitySearchResults] = useState<{ id: string; name: string }[]>([]);
  const [entitySearchLoading, setEntitySearchLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Reverter Venda (Super_Admin)
  const [revertDialogProduct, setRevertDialogProduct] = useState<Product | null>(null);
  const [revertConfirmText, setRevertConfirmText] = useState("");
  const [revertLoading, setRevertLoading] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // AI Pricing state
  type PricingData = {
    avg_price: number | null;
    min_price: number | null;
    max_price: number | null;
    sample_count: number | null;
    source: string | null;
    scraped_at: string | null;
  };
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingVehicleTitle, setPricingVehicleTitle] = useState("");

  const VEHICLE_STATUS_OPTIONS = [
    { value: "shadow_inventory", label: "Pré-estoque", color: "bg-gray-500" },
    { value: "quarantine", label: "Quarentena", color: "bg-yellow-500" },
    { value: "active", label: "Em Estoque", color: "bg-green-500" },
    { value: "sold", label: "Vendido", color: "bg-blue-500" },
    { value: "archived", label: "Concluído", color: "bg-slate-400" },
  ] as const;

  const STATUS_FILTER_TABS = [
    { value: "all", label: "Todos" },
    { value: "active", label: "Em Estoque" },
    { value: "quarantine", label: "Quarentena" },
    { value: "sold", label: "Vendido" },
    { value: "archived", label: "Concluído" },
  ] as const;

  const getStatusBadge = (status: string | null) => {
    const opt = VEHICLE_STATUS_OPTIONS.find(o => o.value === status);
    if (!opt) return <Badge variant="outline">Indefinido</Badge>;
    return (
      <Badge className={`${opt.color} text-white hover:${opt.color}`}>
        {opt.label}
      </Badge>
    );
  };

  const filteredProducts = statusFilter === "all"
    ? products
    : products.filter(p => p.status === statusFilter);

  const loadBrands = async () => {
    try {
      const data = await fipeApi.getBrands();
      setBrands(data);
    } catch (error: any) {
      toast.error("Erro ao carregar marcas: " + error.message);
    }
  };

  const loadAllVehicleCosts = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicle_costs")
        .select("product_id, amount");
      if (error) throw error;
      const costsMap: Record<string, number> = {};
      (data || []).forEach((cost: any) => {
        costsMap[cost.product_id] = (costsMap[cost.product_id] || 0) + cost.amount;
      });
      setVehicleCostsMap(costsMap);
    } catch (error: any) {
      console.error("Erro ao carregar custos:", error.message);
    }
  };

  useEffect(() => {
    loadProducts();
    loadCustomers();
    loadBrands();
    loadAllVehicleCosts();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        const role = user.app_metadata?.role as string | undefined;
        setIsSuperAdmin(role === 'Super_Admin' || role === 'super_admin');
      }
    });
  }, []);

  const handleBrandChange = async (brandId: string) => {
    setSelectedBrand(brandId);
    setSelectedModel("");
    setSelectedYear("");
    setModels([]);
    setYears([]);
    setBrandOpen(false);
    const brandName = brands.find(b => b.code === brandId)?.name || "";
    setFormData(prev => ({ ...prev, brand: brandName }));

    if (!brandId) return;

    try {
      setLoadingFipe(true);
      const data = await fipeApi.getModels(brandId);
      setModels(data);
    } catch (error: any) {
      toast.error("Erro ao carregar modelos: " + error.message);
    } finally {
      setLoadingFipe(false);
    }
  };

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId);
    setSelectedYear("");
    setYears([]);
    setModelOpen(false);
    const modelName = models.find(m => m.code === modelId)?.name || "";
    setFormData(prev => ({ ...prev, model: modelName }));

    if (!modelId || !selectedBrand) return;

    try {
      setLoadingFipe(true);
      const data = await fipeApi.getYears(selectedBrand, modelId);
      setYears(data);
    } catch (error: any) {
      toast.error("Erro ao carregar anos: " + error.message);
    } finally {
      setLoadingFipe(false);
    }
  };

  const handleYearChange = async (yearId: string) => {
    setSelectedYear(yearId);

    if (!yearId || !selectedBrand || !selectedModel) return;

    try {
      setLoadingFipe(true);
      const price = await fipeApi.getPrice(selectedBrand, selectedModel, yearId);
      const fipeNumber = parseFloat(
        price.price.replace("R$ ", "").replace(/\./g, "").replace(",", ".")
      );
      const fipeDigits = isNaN(fipeNumber) ? "" : Math.round(fipeNumber).toString();
      const yearInfo = years.find(y => y.code === yearId)?.name.split(" ")[0];
      const modelYear = yearInfo ? parseInt(yearInfo) : null;

      setFormData(prev => ({
        ...prev,
        fipe_price: fipeDigits,
        model_year: modelYear?.toString() || "",
        manufacturing_year: modelYear?.toString() || "",
      }));

      toast.success("Preço FIPE carregado!");
    } catch (error: any) {
      toast.error("Erro ao carregar preço: " + error.message);
    } finally {
      setLoadingFipe(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const formattedData = (data || []).map(product => ({
        ...product,
        show_in_store: product.show_in_store ?? true,
        vehicle_images: (Array.isArray(product.vehicle_images) ? product.vehicle_images : []) as string[]
      }));
      setProducts(formattedData as Product[]);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id,name,email,phone")
        .order("name", { ascending: true });
      if (error) throw error;
      setCustomers((data || []) as any);
    } catch (error: any) {
      console.error(error);
    }
  };

  const uploadVehicleImages = async (userId: string) => {
    const uploadedUrls: string[] = [];
    for (const file of vehicleImages) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('vehicle-images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('vehicle-images').getPublicUrl(fileName);
      uploadedUrls.push(publicUrl);
    }
    return uploadedUrls;
  };

  const uploadReport = async (userId: string) => {
    if (!reportFile) return null;
    const fileExt = reportFile.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-report.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('vehicle-reports').upload(fileName, reportFile);
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from('vehicle-reports').getPublicUrl(fileName);
    return publicUrl;
  };

  const formatCurrency = (value: string | number | null) => {
    if (!value) return "";
    const number = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(number);
  };

  const toDigits = (v: string) => v.replace(/\D/g, "");

  useEffect(() => {
    if (focusedField !== "fipe_price") setUiFipePrice(formData.fipe_price ? formatCurrency(formData.fipe_price) : "");
  }, [formData.fipe_price, focusedField]);

  useEffect(() => {
    if (focusedField !== "purchase_price") setUiPurchasePrice(formData.purchase_price ? formatCurrency(formData.purchase_price) : "");
  }, [formData.purchase_price, focusedField]);

  useEffect(() => {
    if (focusedField !== "price") setUiPrice(formData.price ? formatCurrency(formData.price) : "");
  }, [formData.price, focusedField]);

  useEffect(() => {
    if (focusedField !== "actual_sale_price") setUiActualSalePrice(formData.actual_sale_price ? formatCurrency(formData.actual_sale_price) : "");
  }, [formData.actual_sale_price, focusedField]);

  const resetForm = () => {
    setFormData({
      title: "", brand: "", model: "", plate: "", renavan: "",
      chassis: "", color: "", fuel: "", transmission: "", doors: "",
      is_marketplace_visible: true,
      manufacturing_year: "", model_year: "", description: "",
      price: "", fipe_price: "", current_km: "", purchase_price: "",
      actual_sale_price: "", stock_entry_date: new Date().toISOString().split('T')[0],
      sold: false, sale_date: "", customerId: "", status: "active",
    });
    setVehicleImages([]);
    setReportFile(null);
    setSelectedBrand("");
    setSelectedModel("");
    setSelectedYear("");
    setModels([]);
    setYears([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.plate) {
      toast.error("A placa do veículo é obrigatória");
      return;
    }

    setUploadingImages(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (vehicleImages.length === 0 && !editingProduct?.vehicle_images?.length) {
        toast.error("É necessário adicionar pelo menos uma imagem do veículo");
        setUploadingImages(false);
        return;
      }

      const imageUrls = vehicleImages.length > 0 ? await uploadVehicleImages(user.id) : [];
      const reportUrl = reportFile ? await uploadReport(user.id) : null;

      const productData = {
        title: formData.title || null,
        brand: formData.brand || null,
        model: formData.model || null,
        plate: formData.plate || null,
        renavan: formData.renavan || null,
        chassis: formData.chassis || null,
        color: formData.color || null,
        fuel: formData.fuel || null,
        transmission: formData.transmission || null,
        doors: formData.doors ? parseInt(formData.doors) : null,
        is_marketplace_visible: formData.is_marketplace_visible,
        manufacturing_year: formData.manufacturing_year ? parseInt(formData.manufacturing_year) : null,
        model_year: formData.model_year ? parseInt(formData.model_year) : null,
        description: formData.description || null,
        price: formData.price ? parseFloat(formData.price) : null,
        fipe_price: formData.fipe_price ? parseFloat(formData.fipe_price) : null,
        current_km: formData.current_km ? parseInt(formData.current_km) : null,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        actual_sale_price: formData.actual_sale_price ? parseFloat(formData.actual_sale_price) : null,
        stock_entry_date: formData.stock_entry_date,
        sold: formData.sold,
        status: formData.status || 'active',
        sale_date: formData.sold ? (formData.sale_date || new Date().toISOString().split('T')[0]) : null,
        vehicle_images: imageUrls.length > 0 ? imageUrls : (editingProduct?.vehicle_images || []),
        report_url: reportUrl || (editingProduct?.report_url || null),
        user_id: user.id,
      };

      if (editingProduct) {
        const { error } = await supabase.from("products").update(productData).eq("id", editingProduct.id);
        if (error) throw error;
        toast.success("Veículo atualizado!");
        if (formData.sold && formData.customerId) {
          navigate(`/contract?vehicle=${editingProduct.id}&customer=${formData.customerId}`);
        }
      } else {
        const { data: inserted, error } = await supabase.from("products").insert([productData]).select("id").single();
        if (error) throw error;
        toast.success("Veículo cadastrado!");
        if (formData.sold && formData.customerId && inserted?.id) {
          navigate(`/contract?vehicle=${inserted.id}&customer=${formData.customerId}`);
        }
      }

      setOpen(false);
      setEditingProduct(null);
      resetForm();
      loadProducts();
      loadAllVehicleCosts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      toast.success("Produto excluído!");
      loadProducts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      title: product.title || "",
      brand: product.brand || "",
      model: product.model || "",
      plate: product.plate || "",
      renavan: product.renavan || "",
      chassis: product.chassis || "",
      color: product.color || "",
      fuel: product.fuel || "",
      transmission: product.transmission || "",
      doors: product.doors?.toString() || "",
      is_marketplace_visible: product.is_marketplace_visible !== false,
      manufacturing_year: product.manufacturing_year?.toString() || "",
      model_year: product.model_year?.toString() || "",
      description: product.description || "",
      price: product.price?.toString() || "",
      fipe_price: product.fipe_price?.toString() || "",
      current_km: product.current_km?.toString() || "",
      purchase_price: product.purchase_price?.toString() || "",
      actual_sale_price: product.actual_sale_price?.toString() || "",
      stock_entry_date: product.stock_entry_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      sold: product.sold || false,
      sale_date: product.sale_date?.split('T')[0] || "",
      customerId: "",
      status: product.status || "active",
    });
    setVehicleImages([]);
    setReportFile(null);
    setSelectedBrand("");
    setSelectedModel("");
    setSelectedYear("");
    setModels([]);
    setYears([]);
    setOpen(true);
  };

  const updateVehicleStatus = async (vehicleId: string, newStatus: string, extraData?: Record<string, unknown>) => {
    setStatusUpdating(vehicleId);
    try {
      const updatePayload: Record<string, unknown> = { status: newStatus, ...extraData };
      if (newStatus === "sold") {
        updatePayload.sold = true;
        updatePayload.sale_date = new Date().toISOString().split("T")[0];
      } else {
        updatePayload.sold = false;
        if (newStatus === "active") {
          updatePayload.sale_date = null;
        }
      }
      const { error } = await (supabase as any)
        .from("products")
        .update(updatePayload)
        .eq("id", vehicleId);
      if (error) throw error;
      toast.success("Status atualizado!");
      loadProducts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleToggleStoreVisibility = async (productId: string, show: boolean) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ show_in_store: show })
        .eq("id", productId);
        
      if (error) throw error;
      setProducts(products.map(p => p.id === productId ? { ...p, show_in_store: show } : p));
      toast.success(show ? "Veículo visível na loja pública" : "Veículo oculto da loja pública");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const searchEntities = async (query: string) => {
    if (query.length < 2) { setEntitySearchResults([]); return; }
    setEntitySearchLoading(true);
    try {
      const { data } = await (supabase as any)
        .from("entities")
        .select("id, name")
        .ilike("name", `%${query}%`)
        .limit(10);
      setEntitySearchResults(data || []);
    } catch {
      setEntitySearchResults([]);
    } finally {
      setEntitySearchLoading(false);
    }
  };

  const handleConfirmSell = async () => {
    if (!sellDialogProduct) return;
    if (!sellForm.actual_sale_price) {
      toast.error("Informe o valor de venda");
      return;
    }
    const salePrice = parseFloat(sellForm.actual_sale_price.replace(/\D/g, "")) || 0;
    const extraFields: Record<string, unknown> = { actual_sale_price: salePrice };
    if (fiscalGraceActive) {
      extraFields.fiscal_grace_until = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
    }
    await updateVehicleStatus(sellDialogProduct.id, "sold", extraFields);
    hapticFeedback('heavy');
    setSellDialogProduct(null);
    setSellForm({ actual_sale_price: "", buyerQuery: "", buyerId: "" });
    setFiscalGraceActive(false);
    setEntitySearchResults([]);
  };

  const handleRevertSale = async () => {
    if (!revertDialogProduct) return;
    if (revertConfirmText !== "REVERTER") {
      toast.error("Digite REVERTER para confirmar");
      return;
    }
    setRevertLoading(true);
    try {
      // 1. Volta veículo para quarentena
      const { error: productError } = await (supabase as any)
        .from("products")
        .update({
          status: "quarantine",
          sold: false,
          actual_sale_price: null,
          sale_date: null,
        })
        .eq("id", revertDialogProduct.id);
      if (productError) throw productError;

      // 2. Cancela transações financeiras abertas do veículo
      await (supabase as any)
        .from("financial_transactions")
        .update({ status: "cancelled" })
        .eq("vehicle_id", revertDialogProduct.id)
        .in("status", ["open", "overdue"]);

      toast.error("Venda revertida — Veículo retornou para Quarentena. Transações canceladas.", {
        duration: 6000,
      });
      setRevertDialogProduct(null);
      setRevertConfirmText("");
      loadProducts();
    } catch (error: any) {
      toast.error("Erro ao reverter venda: " + error.message);
    } finally {
      setRevertLoading(false);
    }
  };

  const handleAIPricing = async (product: Product) => {
    setPricingVehicleTitle(
      product.title || `${product.brand ?? ""} ${product.model ?? ""}`.trim()
    );
    setPricingData(null);
    setPricingDialogOpen(true);
    setPricingLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("pricing_intelligence_cache")
        .select("avg_price, min_price, max_price, sample_count, source, scraped_at")
        .eq("brand", product.brand)
        .eq("model", product.model)
        .eq("year_model", product.model_year)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPricingData(data);
      } else {
        setPricingDialogOpen(false);
        toast.info(
          "Dados de precificação não disponíveis para este modelo. Atualize via pesquisa de mercado."
        );
      }
    } catch {
      setPricingDialogOpen(false);
      toast.error("Erro ao buscar dados de precificação.");
    } finally {
      setPricingLoading(false);
    }
  };

  const getStatusTransitionButtons = (product: Product) => {
    const isUpdating = statusUpdating === product.id;
    const status = product.status;
    const buttons: React.ReactNode[] = [];

    if (status === "shadow_inventory") {
      buttons.push(
        <Button
          key="to-quarantine"
          size="sm"
          variant="outline"
          className="text-xs h-7 gap-1"
          disabled={isUpdating}
          onClick={() => updateVehicleStatus(product.id, "quarantine")}
        >
          <ArrowRight className="h-3 w-3" />
          Mover p/ Quarentena
        </Button>
      );
      buttons.push(
        <Button
          key="to-active"
          size="sm"
          variant="outline"
          className="text-xs h-7 gap-1 text-blue-700 border-blue-300 hover:bg-blue-50"
          disabled={isUpdating}
          onClick={() => updateVehicleStatus(product.id, "active")}
        >
          <ArrowRight className="h-3 w-3" />
          Ativar
        </Button>
      );
    } else if (status === "quarantine") {
      buttons.push(
        <Button
          key="to-active"
          size="sm"
          variant="outline"
          className="text-xs h-7 gap-1 text-blue-700 border-blue-300 hover:bg-blue-50"
          disabled={isUpdating}
          onClick={() => updateVehicleStatus(product.id, "active")}
        >
          <ArrowRight className="h-3 w-3" />
          Ativar
        </Button>
      );
      buttons.push(
        <Button
          key="to-shadow"
          size="sm"
          variant="outline"
          className="text-xs h-7 gap-1"
          disabled={isUpdating}
          onClick={() => updateVehicleStatus(product.id, "shadow_inventory")}
        >
          Voltar p/ Sombra
        </Button>
      );
    } else if (status === "active") {
      buttons.push(
        <Button
          key="to-sold"
          size="sm"
          variant="outline"
          className="text-xs h-7 gap-1 text-green-700 border-green-300 hover:bg-green-50"
          disabled={isUpdating}
          onClick={() => {
            setSellDialogProduct(product);
            setSellForm({ actual_sale_price: product.actual_sale_price?.toString() || "", buyerQuery: "", buyerId: "" });
            setFiscalGraceActive(false);
          }}
        >
          <ShoppingCart className="h-3 w-3" />
          Marcar Vendido
        </Button>
      );
    } else if (status === "sold") {
      buttons.push(
        <Button
          key="to-archived"
          size="sm"
          variant="outline"
          className="text-xs h-7 gap-1"
          disabled={isUpdating}
          onClick={() => updateVehicleStatus(product.id, "archived")}
        >
          Arquivar
        </Button>
      );
      buttons.push(
        <Button
          key="to-active-revert"
          size="sm"
          variant="outline"
          className="text-xs h-7 gap-1 text-blue-700 border-blue-300 hover:bg-blue-50"
          disabled={isUpdating}
          onClick={() => updateVehicleStatus(product.id, "active")}
        >
          Reverter p/ Ativo
        </Button>
      );
      if (isSuperAdmin) {
        buttons.push(
          <Button
            key="revert-sale"
            size="sm"
            variant="outline"
            className="text-xs h-7 gap-1 text-red-700 border-red-300 hover:bg-red-50"
            disabled={isUpdating}
            onClick={() => {
              setRevertDialogProduct(product);
              setRevertConfirmText("");
            }}
          >
            ↩ Reverter Venda
          </Button>
        );
      }
    }

    return buttons;
  };

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Veículos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingProduct(null); resetForm(); }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Veículo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Editar Veículo" : "Novo Veículo"}
              </DialogTitle>
              <DialogDescription>
                {editingProduct ? "Atualize as informações do veículo" : "Preencha as informações para cadastrar um novo veículo"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Marca - Combobox com busca */}
              <div className="space-y-2">
                <Label>Marca</Label>
                <Popover open={brandOpen} onOpenChange={setBrandOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={brandOpen}
                      className="w-full justify-between font-normal"
                      disabled={loadingFipe}
                    >
                      {formData.brand || "Digite ou selecione a marca..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar marca..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma marca encontrada.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-y-auto">
                          {brands.map((brand) => (
                            <CommandItem
                              key={brand.code}
                              value={brand.name}
                              onSelect={() => handleBrandChange(brand.code)}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedBrand === brand.code ? "opacity-100" : "opacity-0")} />
                              {brand.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Modelo - Combobox com busca */}
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Popover open={modelOpen} onOpenChange={setModelOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={modelOpen}
                      className="w-full justify-between font-normal"
                      disabled={!selectedBrand || loadingFipe}
                    >
                      {formData.model || (selectedBrand ? "Digite ou selecione o modelo..." : "Selecione uma marca primeiro")}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar modelo..." />
                      <CommandList>
                        <CommandEmpty>Nenhum modelo encontrado.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-y-auto">
                          {models.map((model) => (
                            <CommandItem
                              key={model.code}
                              value={model.name}
                              onSelect={() => handleModelChange(model.code)}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedModel === model.code ? "opacity-100" : "opacity-0")} />
                              {model.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Ano */}
              <div className="space-y-2">
                <Label>Ano</Label>
                <Select value={selectedYear} onValueChange={handleYearChange} disabled={!selectedModel || loadingFipe}>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedModel ? "Selecione o ano" : "Selecione um modelo primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year.code} value={year.code}>{year.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Placa, Renavan e Chassi */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plate">Placa</Label>
                  <Input
                    id="plate"
                    value={formData.plate}
                    onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                    placeholder="ABC1234"
                    maxLength={7}
                    required
                    className={!formData.plate ? "border-red-500" : ""}
                  />
                  {!formData.plate && <p className="text-xs text-red-500">A placa é obrigatória</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="renavan">Renavan</Label>
                  <Input
                    id="renavan"
                    value={formData.renavan}
                    onChange={(e) => setFormData({ ...formData, renavan: e.target.value })}
                    placeholder="00000000000"
                    maxLength={11}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chassis">Chassi (VIN)</Label>
                  <Input
                    id="chassis"
                    value={formData.chassis}
                    onChange={(e) => setFormData({ ...formData, chassis: e.target.value.toUpperCase() })}
                    placeholder="9BWZZZ377VT004251"
                    maxLength={17}
                  />
                </div>
              </div>

              {/* Combustível, Cor, Câmbio e Portas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fuel">Combustível</Label>
                  <Select value={formData.fuel} onValueChange={(val) => setFormData({ ...formData, fuel: val })}>
                    <SelectTrigger id="fuel">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flex">Flex</SelectItem>
                      <SelectItem value="gasolina">Gasolina</SelectItem>
                      <SelectItem value="etanol">Etanol</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="eletrico">Elétrico</SelectItem>
                      <SelectItem value="hibrido">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Cor</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="Prata"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transmission">Câmbio</Label>
                  <Select value={formData.transmission} onValueChange={(val) => setFormData({ ...formData, transmission: val })}>
                    <SelectTrigger id="transmission">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="automatico">Automático</SelectItem>
                      <SelectItem value="cvt">CVT</SelectItem>
                      <SelectItem value="semi-automatico">Semi-automático</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doors">Portas</Label>
                  <Select value={formData.doors} onValueChange={(val) => setFormData({ ...formData, doors: val })}>
                    <SelectTrigger id="doors">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="title">Nome/Título (Opcional)</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Corolla XEI 2020"
                />
              </div>

              {/* FIPE e KM */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fipe_price">Preço FIPE (R$)</Label>
                  <Input
                    id="fipe_price"
                    type="text"
                    value={uiFipePrice}
                    onFocus={() => { setFocusedField("fipe_price"); setUiFipePrice(toDigits(uiFipePrice || (formData.fipe_price?.toString() || ""))); }}
                    onChange={(e) => { const d = toDigits(e.target.value); setUiFipePrice(d); setFormData({ ...formData, fipe_price: d }); }}
                    onBlur={() => { setFocusedField(null); setUiFipePrice(formData.fipe_price ? formatCurrency(formData.fipe_price) : ""); }}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current_km">KM Atual</Label>
                  <Input
                    id="current_km"
                    type="number"
                    value={formData.current_km}
                    onChange={(e) => setFormData({ ...formData, current_km: e.target.value })}
                    placeholder="50000"
                  />
                </div>
              </div>

              {/* Compra e Venda */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchase_price">Valor de Compra (R$)</Label>
                  <Input
                    id="purchase_price"
                    type="text"
                    value={uiPurchasePrice}
                    onFocus={() => { setFocusedField("purchase_price"); setUiPurchasePrice(toDigits(uiPurchasePrice || (formData.purchase_price?.toString() || ""))); }}
                    onChange={(e) => { const d = toDigits(e.target.value); setUiPurchasePrice(d); setFormData({ ...formData, purchase_price: d }); }}
                    onBlur={() => { setFocusedField(null); setUiPurchasePrice(formData.purchase_price ? formatCurrency(formData.purchase_price) : ""); }}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Preço de Venda (R$)</Label>
                  <Input
                    id="price"
                    type="text"
                    value={uiPrice}
                    onFocus={() => { setFocusedField("price"); setUiPrice(toDigits(uiPrice || (formData.price?.toString() || ""))); }}
                    onChange={(e) => { const d = toDigits(e.target.value); setUiPrice(d); setFormData({ ...formData, price: d }); }}
                    onBlur={() => { setFocusedField(null); setUiPrice(formData.price ? formatCurrency(formData.price) : ""); }}
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>

              {/* Valor real de venda */}
              <div className="space-y-2">
                <Label htmlFor="actual_sale_price">Valor Real de Venda (R$)</Label>
                <Input
                  id="actual_sale_price"
                  type="text"
                  value={uiActualSalePrice}
                  onFocus={() => { setFocusedField("actual_sale_price"); setUiActualSalePrice(toDigits(uiActualSalePrice || (formData.actual_sale_price?.toString() || ""))); }}
                  onChange={(e) => { const d = toDigits(e.target.value); setUiActualSalePrice(d); setFormData({ ...formData, actual_sale_price: d }); }}
                  onBlur={() => { setFocusedField(null); setUiActualSalePrice(formData.actual_sale_price ? formatCurrency(formData.actual_sale_price) : ""); }}
                  placeholder="R$ 0,00"
                />
              </div>

              {/* Botão Pesquisa de Mercado */}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setMarketOpen(true)}
                disabled={!formData.brand || !formData.model}
              >
                <Search className="h-4 w-4 mr-2" />
                Pesquisar Preços no Mercado (Webmotors / OLX)
              </Button>

              {/* Data entrada */}
              <div className="space-y-2">
                <Label htmlFor="stock_entry_date">Data de Entrada no Estoque</Label>
                <Input
                  id="stock_entry_date"
                  type="date"
                  value={formData.stock_entry_date}
                  onChange={(e) => setFormData({ ...formData, stock_entry_date: e.target.value })}
                />
              </div>

              {/* Imagens */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Imagens do Veículo</Label>
                  <div
                    className="border-2 border-dashed rounded-lg p-6 hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => document.getElementById("vehicle_images")?.click()}
                  >
                    <Input
                      id="vehicle_images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          setVehicleImages(files);
                          toast.success(`${files.length} imagens selecionadas`);
                        }
                      }}
                      className="hidden"
                    />
                    <div className="text-center">
                      <p className="text-muted-foreground mb-1">Clique para selecionar ou arraste as imagens aqui</p>
                      <p className="text-xs text-muted-foreground">Aceita múltiplas imagens</p>
                    </div>
                  </div>
                </div>

                {(vehicleImages.length > 0 || editingProduct?.vehicle_images?.length) && (
                  <div className="space-y-2">
                    <Label>Imagens Selecionadas</Label>
                    <div className="grid grid-cols-2 gap-4">
                      {vehicleImages.map((file, index) => (
                        <div key={index} className="relative group">
                          <img src={URL.createObjectURL(file)} alt={`Imagem ${index + 1}`} className="w-full aspect-[4/3] object-cover rounded-lg" />
                          <button type="button" onClick={() => { const n = [...vehicleImages]; n.splice(index, 1); setVehicleImages(n); }}
                            className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {editingProduct?.vehicle_images?.map((url, index) => (
                        <div key={`existing-${index}`} className="relative group">
                          <img src={url} alt={`Imagem ${index + 1}`} className="w-full aspect-[4/3] object-cover rounded-lg" />
                          <button type="button" onClick={() => {
                            const n = [...(editingProduct.vehicle_images || [])]; n.splice(index, 1);
                            setEditingProduct({ ...editingProduct, vehicle_images: n });
                          }}
                            className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Laudo */}
              <div className="space-y-2">
                <Label htmlFor="report">Laudo (PDF ou Imagem)</Label>
                <Input id="report" type="file" accept=".pdf,image/*" onChange={(e) => setReportFile(e.target.files?.[0] || null)} className="cursor-pointer" />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição detalhada do veículo"
                  rows={3}
                />
              </div>

              {/* Custos do Veículo - inline quando editando */}
              {editingProduct && (
                <>
                  <Separator />
                  <VehicleCosts productId={editingProduct.id} />
                </>
              )}

              <Separator />

              {/* Vendido */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sold"
                  checked={formData.sold}
                  onChange={(e) => setFormData({ ...formData, sold: e.target.checked, sale_date: e.target.checked ? new Date().toISOString().split('T')[0] : "" })}
                  className="h-4 w-4"
                />
                <Label htmlFor="sold" className="cursor-pointer">Veículo vendido</Label>
              </div>

              {formData.sold && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select value={formData.customerId} onValueChange={(val) => setFormData({ ...formData, customerId: val })}>
                      <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name} {c.phone ? `- ${c.phone}` : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data da Venda</Label>
                    <Input type="date" value={formData.sale_date} onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })} />
                  </div>
                </div>
              )}

              {/* Visível na Vitrine Pública */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_marketplace_visible"
                  checked={formData.is_marketplace_visible}
                  onCheckedChange={(v) => setFormData({ ...formData, is_marketplace_visible: v })}
                />
                <Label htmlFor="is_marketplace_visible" className="cursor-pointer">Visível na Vitrine Pública</Label>
              </div>

              <Button type="submit" className="w-full" disabled={uploadingImages}>
                {uploadingImages ? "Enviando..." : editingProduct ? "Atualizar Veículo" : "Cadastrar Veículo"}
              </Button>
            </form>

            {editingProduct && currentUserId && (
              <>
                <Separator className="my-4" />
                <GedAttachments
                  attachableType="vehicle"
                  attachableId={editingProduct.id}
                  userId={currentUserId}
                />
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Modal Pesquisa de Mercado */}
      <Dialog open={marketOpen} onOpenChange={setMarketOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Pesquisa de Mercado
            </DialogTitle>
            <DialogDescription>
              {formData.brand && formData.model
                ? `Buscando preços para ${formData.brand} ${formData.model} ${formData.model_year || ""}`
                : "Selecione marca e modelo primeiro"}
            </DialogDescription>
          </DialogHeader>
          <MarketResearch
            brand={formData.brand}
            model={formData.model}
            year={formData.model_year}
            purchasePrice={formData.purchase_price ? parseFloat(formData.purchase_price) : undefined}
            onSuggestPrice={(price) => {
              const digits = Math.round(price).toString();
              setFormData((prev) => ({ ...prev, price: digits }));
              setMarketOpen(false);
              toast.success("Preço sugerido aplicado ao campo de venda!");
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Marcar Vendido Dialog */}
      <Dialog open={!!sellDialogProduct} onOpenChange={(o) => { if (!o) { setSellDialogProduct(null); setEntitySearchResults([]); setFiscalGraceActive(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-green-600" />
              Marcar Veiculo como Vendido
            </DialogTitle>
            <DialogDescription>
              {sellDialogProduct
                ? `${sellDialogProduct.brand || ""} ${sellDialogProduct.model || ""} — ${sellDialogProduct.plate || ""}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Valor de Venda (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 45000"
                value={sellForm.actual_sale_price}
                onChange={(e) => setSellForm({ ...sellForm, actual_sale_price: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Comprador (Entidade)</Label>
              <div className="relative">
                <Input
                  placeholder="Buscar entidade pelo nome..."
                  value={sellForm.buyerQuery}
                  onChange={(e) => {
                    setSellForm({ ...sellForm, buyerQuery: e.target.value, buyerId: "" });
                    searchEntities(e.target.value);
                  }}
                />
                {entitySearchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {entitySearchResults.map((entity) => (
                      <button
                        key={entity.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                        onClick={() => {
                          setSellForm({ ...sellForm, buyerQuery: entity.name, buyerId: entity.id });
                          setEntitySearchResults([]);
                        }}
                      >
                        {entity.name}
                      </button>
                    ))}
                  </div>
                )}
                {entitySearchLoading && (
                  <p className="text-xs text-muted-foreground mt-1">Buscando...</p>
                )}
              </div>
              {sellForm.buyerId && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Entidade selecionada
                </p>
              )}
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 bg-yellow-50 border-yellow-200">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Registrar Trava Fiscal (15 dias)</Label>
                <p className="text-xs text-muted-foreground">
                  Bloqueia saída fiscal por 15 dias a partir da venda.
                </p>
              </div>
              <Switch
                checked={fiscalGraceActive}
                onCheckedChange={setFiscalGraceActive}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setSellDialogProduct(null); setEntitySearchResults([]); setFiscalGraceActive(false); }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleConfirmSell}
                disabled={!sellForm.actual_sale_price || statusUpdating === sellDialogProduct?.id}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Confirmar Venda
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reverter Venda Dialog (Super_Admin only) */}
      <Dialog
        open={!!revertDialogProduct}
        onOpenChange={(o) => { if (!o) { setRevertDialogProduct(null); setRevertConfirmText(""); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              ↩ Reverter Venda
            </DialogTitle>
            <DialogDescription>
              {revertDialogProduct
                ? `${revertDialogProduct.brand || ""} ${revertDialogProduct.model || ""} — ${revertDialogProduct.plate || ""}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 space-y-2">
              <p className="font-semibold">⚠️ Ação Administrativa</p>
              <p>
                Esta ação é irreversível no sentido contábil. Você está revertendo a venda deste veículo.
                Todas as transações financeiras vinculadas serão marcadas como &quot;cancelled&quot; e o veículo
                retornará para Quarentena.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="revert-confirm">
                Digite <strong>REVERTER</strong> para confirmar
              </Label>
              <Input
                id="revert-confirm"
                value={revertConfirmText}
                onChange={(e) => setRevertConfirmText(e.target.value)}
                placeholder="REVERTER"
                className="font-mono"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setRevertDialogProduct(null); setRevertConfirmText(""); }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleRevertSale}
                disabled={revertConfirmText !== "REVERTER" || revertLoading}
              >
                {revertLoading ? "Revertendo..." : "↩ Confirmar Reversão"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTER_TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={statusFilter === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
            {tab.value === "all"
              ? ` (${products.length})`
              : ` (${products.filter(p => p.status === tab.value).length})`}
          </Button>
        ))}
      </div>

      {/* AI Pricing Dialog */}
      <Dialog open={pricingDialogOpen} onOpenChange={setPricingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Precificação com IA
            </DialogTitle>
            <DialogDescription>{pricingVehicleTitle}</DialogDescription>
          </DialogHeader>
          {pricingLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : pricingData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Mínimo</p>
                  <p className="font-bold text-red-600">
                    {pricingData.min_price
                      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(pricingData.min_price)
                      : "—"}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-200">
                  <p className="text-xs text-muted-foreground">Média</p>
                  <p className="font-bold text-blue-700 text-lg">
                    {pricingData.avg_price
                      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(pricingData.avg_price)
                      : "—"}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Máximo</p>
                  <p className="font-bold text-green-600">
                    {pricingData.max_price
                      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(pricingData.max_price)
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                {pricingData.sample_count && (
                  <p>Baseado em <strong>{pricingData.sample_count}</strong> anúncios</p>
                )}
                {pricingData.source && <p>Fonte: <strong>{pricingData.source}</strong></p>}
                {pricingData.scraped_at && (
                  <p>
                    Atualizado em:{" "}
                    <strong>
                      {new Date(pricingData.scraped_at).toLocaleDateString("pt-BR")}
                    </strong>
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Grid de Veículos */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <Card key={product.id} className={product.status === "sold" || product.status === "archived" ? "opacity-60" : ""}>
            <CardHeader>
              <VehicleImageCarousel images={product.vehicle_images || []} className="mb-4" />
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {product.brand} {product.model}
                  </CardTitle>
                  {getStatusBadge(product.status)}
                </div>
                {!isSeller && (
                  <div className="flex items-center space-x-2 bg-slate-50 border border-slate-100 p-2 rounded-md">
                    <Switch
                      checked={product.show_in_store}
                      onCheckedChange={(checked) => handleToggleStoreVisibility(product.id, checked)}
                    />
                    <Label className="text-xs text-muted-foreground mr-1">Visível na Loja</Label>
                  </div>
                )}
              </div>
              {product.fiscal_grace_until && new Date(product.fiscal_grace_until) > new Date() && (() => {
                const graceDays = Math.ceil((new Date(product.fiscal_grace_until).getTime() - Date.now()) / 86400000);
                return (
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 border">
                    ⚠️ Trava Fiscal: {graceDays}d restantes
                  </Badge>
                );
              })()}
            </CardHeader>
            <CardContent className="space-y-3">
              {product.title && <p className="text-sm font-medium">{product.title}</p>}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {product.fipe_price && (
                  <div>
                    <span className="text-muted-foreground">FIPE:</span>
                    <p className="font-semibold">{formatCurrency(product.fipe_price)}</p>
                  </div>
                )}
                {product.current_km && (
                  <div>
                    <span className="text-muted-foreground">KM:</span>
                    <p className="font-semibold">{product.current_km.toLocaleString()}</p>
                  </div>
                )}
              </div>

              {/* Custos e Valor Investido */}
              {(() => {
                const costs = vehicleCostsMap[product.id] || 0;
                const totalInvested = (product.purchase_price || 0) + costs;
                return (
                  <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />Compra:
                      </span>
                      <span className="font-medium">{formatCurrency(product.purchase_price || 0)}</span>
                    </div>
                    {costs > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Wrench className="h-3 w-3" />Custos/Reparos:
                        </span>
                        <span className="font-medium text-orange-600">{formatCurrency(costs)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-1 mt-1">
                      <span className="font-semibold">Total Investido:</span>
                      <span className="font-bold">{formatCurrency(totalInvested)}</span>
                    </div>
                  </div>
                );
              })()}

              {product.price && (
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-primary">{formatCurrency(product.price)}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={() => handleAIPricing(product)}
                    title="Precificar com IA"
                  >
                    <TrendingUp className="h-3 w-3" />
                    Precificar com IA
                  </Button>
                </div>
              )}
              {product.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
              )}
              <div className="flex gap-2 pt-2">
                {!isSeller && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(product.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              {/* Status Transition Buttons */}
              {(() => {
                const transitionBtns = getStatusTransitionButtons(product);
                if (transitionBtns.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-2 pt-1 border-t mt-1">
                    {transitionBtns}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum veículo cadastrado ainda
        </div>
      )}
    </div>
  );
}
