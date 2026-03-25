import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  UserPlus,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  Mail,
  Edit2,
} from "lucide-react";

interface TeamMember {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  created_at: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  owner: { label: "Dono", color: "bg-[#F9FFE6] text-[#6B8A00]", icon: ShieldCheck },
  manager: { label: "Gestor", color: "bg-[#FEF3C7] text-[#D97706]", icon: Shield },
  seller: { label: "Vendedor", color: "bg-[#D1FAE5] text-[#059669]", icon: ShieldAlert },
};

export default function TeamManagement() {
  const { isOwner } = useUserRole();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<string>("seller");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchTeam = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, email, display_name, role, created_at")
        .or(`id.eq.${user.id},owner_id.eq.${user.id}`)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMembers(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar equipe: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword || !newName) {
      toast.error("Preencha todos os campos");
      return;
    }
    setSubmitting(true);

    try {
      const { data, error } = await (supabase as any).rpc("create_team_member", {
        p_email: newEmail,
        p_password: newPassword,
        p_display_name: newName,
        p_role: newRole,
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast.success(`${newName} adicionado(a) como ${ROLE_LABELS[newRole]?.label}! Pode fazer login imediatamente.`);
      setDialogOpen(false);
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewRole("seller");
      fetchTeam();
    } catch (error: any) {
      toast.error("Erro ao cadastrar: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRoleValue: string) => {
    try {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({ role: newRoleValue })
        .eq("id", memberId);

      if (error) throw error;
      toast.success("Função atualizada!");
      fetchTeam();
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Tem certeza que deseja remover ${memberName} da equipe?`)) return;

    try {
      const { error } = await (supabase as any)
        .from("profiles")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
      toast.success(`${memberName} removido(a) da equipe`);
      fetchTeam();
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };

  if (!isOwner) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-[#6B6B8A]">
        Acesso restrito ao proprietário.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl font-bold text-[#1A1A2E] flex items-center gap-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <Users className="w-7 h-7 text-[#A6DD05]" />
            Gestão de Equipe
          </h1>
          <p className="text-sm text-[#6B6B8A] mt-1" style={{ fontFamily: "var(--font-ui)" }}>
            Cadastre e gerencie os membros da sua equipe
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-brand-gradient text-white font-semibold rounded-[12px] shadow-brand btn-press gap-2">
              <UserPlus className="w-4 h-4" />
              Novo Membro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "var(--font-display)" }}>
                Cadastrar Membro
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddMember} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="Nome completo"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="membro@exemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha Inicial</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Senha de acesso"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label>Função</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="rounded-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Gestor</SelectItem>
                    <SelectItem value="seller">Vendedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                className="w-full bg-brand-gradient text-white font-semibold rounded-[12px]"
                disabled={submitting}
              >
                {submitting ? "Cadastrando..." : "Cadastrar Membro"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Members List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#A6DD05] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => {
            const roleInfo = ROLE_LABELS[member.role] || ROLE_LABELS.seller;
            const RoleIcon = roleInfo.icon;
            const isCurrentOwner = member.role === "owner";

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-white rounded-[14px] border border-[#E8E8F0] hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#F9FFE6] flex items-center justify-center text-[#6B8A00] font-bold text-sm uppercase"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {(member.display_name || member.email || "?").charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1A1A2E] text-sm" style={{ fontFamily: "var(--font-display)" }}>
                      {member.display_name || "Sem nome"}
                    </p>
                    <p className="text-xs text-[#94A3B8] flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {member.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Role Badge */}
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${roleInfo.color}`}>
                    <RoleIcon className="w-3.5 h-3.5" />
                    {roleInfo.label}
                  </span>

                  {/* Actions (only for non-owner members) */}
                  {!isCurrentOwner && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        onValueChange={(val) => handleRoleChange(member.id, val)}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs rounded-[8px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">Gestor</SelectItem>
                          <SelectItem value="seller">Vendedor</SelectItem>
                        </SelectContent>
                      </Select>
                      <button
                        onClick={() => handleRemoveMember(member.id, member.display_name || member.email || "")}
                        className="h-8 w-8 flex items-center justify-center rounded-[8px] text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEE2E2] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {isCurrentOwner && (
                    <span className="text-xs text-[#94A3B8] italic">Você</span>
                  )}
                </div>
              </div>
            );
          })}

          {members.length === 0 && (
            <div className="text-center py-16 text-[#94A3B8]">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Nenhum membro cadastrado</p>
              <p className="text-sm">Clique em "Novo Membro" para começar</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
