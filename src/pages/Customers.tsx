import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cpf?: string | null;
  cnpj?: string | null;
  document_type?: 'CPF' | 'CNPJ' | null;
  address?: string | null;
  document_urls?: string[] | null;
};

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    document_type: 'CPF' as 'CPF' | 'CNPJ',
    cpf: "",
    cnpj: "",
    address: "",
  });
  const [documents, setDocuments] = useState<File[]>([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Upload de documentos do cliente
      const documentUrls: string[] = [];
      for (const file of documents) {
        const ext = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('customer-documents')
          .upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('customer-documents')
          .getPublicUrl(fileName);
        documentUrls.push(publicUrl);
      }

      // validação de CPF/CNPJ
      if (formData.document_type === 'CPF') {
        const cpfDigits = formData.cpf.replace(/\D/g, "");
        if (cpfDigits.length !== 11) {
          toast.error("CPF inválido. Informe 11 dígitos.");
          return;
        }
      } else {
        const cnpjDigits = formData.cnpj.replace(/\D/g, "");
        if (cnpjDigits.length !== 14) {
          toast.error("CNPJ inválido. Informe 14 dígitos.");
          return;
        }
      }

      const customerData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        document_type: formData.document_type,
        cpf: formData.document_type === 'CPF' ? formData.cpf : null,
        cnpj: formData.document_type === 'CNPJ' ? formData.cnpj : null,
        address: formData.address,
        document_urls: documentUrls.length > 0 ? documentUrls : null,
        user_id: user.id,
      };

      if (editingCustomer) {
        const { error } = await supabase
          .from("customers")
          .update(customerData)
          .eq("id", editingCustomer.id);
        if (error) throw error;
        toast.success("Cliente atualizado!");
      } else {
        const { error } = await supabase.from("customers").insert([customerData]);
        if (error) throw error;
        toast.success("Cliente criado!");
      }

      setOpen(false);
      setEditingCustomer(null);
      setFormData({ name: "", email: "", phone: "", document_type: 'CPF', cpf: "", cnpj: "", address: "" });
      setDocuments([]);
      loadCustomers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    try {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
      toast.success("Cliente excluído!");
      loadCustomers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone || "",
      document_type: customer.document_type === 'CNPJ' ? 'CNPJ' : 'CPF',
      cpf: customer.cpf || "",
      cnpj: customer.cnpj || "",
      address: customer.address || "",
    });
    setOpen(true);
  };

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Clientes</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingCustomer(null);
              setFormData({ name: "", email: "", phone: "", cpf: "", address: "" });
              setDocuments([]);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? "Editar Cliente" : "Novo Cliente"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="document_type">Tipo de Documento</Label>
                  <select
                    id="document_type"
                    className="border rounded h-10 px-3 w-full"
                    value={formData.document_type}
                    onChange={(e) => {
                      const val = e.target.value === 'CNPJ' ? 'CNPJ' : 'CPF';
                      setFormData({ ...formData, document_type: val, cpf: val === 'CPF' ? formData.cpf : "", cnpj: val === 'CNPJ' ? formData.cnpj : "" });
                    }}
                  >
                    <option value="CPF">CPF (Pessoa Física)</option>
                    <option value="CNPJ">CNPJ (Pessoa Jurídica)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  {formData.document_type === 'CPF' ? (
                    <>
                      <Label htmlFor="cpf">CPF</Label>
                      <Input
                        id="cpf"
                        type="text"
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                        placeholder="Somente números"
                        maxLength={11}
                        required
                      />
                    </>
                  ) : (
                    <>
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        type="text"
                        value={formData.cnpj}
                        onChange={(e) => setFormData({ ...formData, cnpj: e.target.value.replace(/\D/g, "").slice(0, 14) })}
                        placeholder="Somente números"
                        maxLength={14}
                        required
                      />
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_documents">Documentos do Cliente</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById("customer_documents")?.click()}
                >
                  <Input
                    id="customer_documents"
                    type="file"
                    accept="application/pdf,image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setDocuments(files);
                      if (files.length > 0) {
                        toast.success(`${files.length} documento(s) selecionado(s)`);
                      }
                    }}
                    className="hidden"
                  />
                  <p className="text-sm text-muted-foreground">
                    Clique para selecionar documentos (PDF ou imagens)
                  </p>
                  {documents.length > 0 && (
                    <p className="text-xs mt-2">{documents.length} arquivo(s) selecionado(s)</p>
                  )}
                </div>
              </div>
              <Button type="submit" className="w-full">
                {editingCustomer ? "Atualizar" : "Criar"} Cliente
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.phone || "-"}</TableCell>
                  <TableCell>{customer.cpf || customer.cnpj || "-"}</TableCell>
                  <TableCell>{customer.document_type || (customer.cnpj ? 'CNPJ' : 'CPF')}</TableCell>
                  <TableCell>{customer.address || "-"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(customer)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(customer.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {customers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum cliente cadastrado ainda
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
