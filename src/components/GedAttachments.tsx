import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, FileText, Image, Loader2, Paperclip } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GedAttachmentsProps {
  attachableType: "entity" | "vehicle" | "transaction";
  attachableId: string;
  userId: string;
  readonly?: boolean;
}

interface Attachment {
  id: string;
  file_type: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  notes: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Constants – allowed file types per context
// ---------------------------------------------------------------------------

const FILE_TYPES: Record<GedAttachmentsProps["attachableType"], { value: string; label: string }[]> = {
  entity: [
    { value: "cnh", label: "CNH" },
    { value: "rg", label: "RG" },
    { value: "cartao_cnpj", label: "Cartão CNPJ" },
    { value: "contrato_social", label: "Contrato Social" },
    { value: "comprovante_residencia", label: "Comprovante de Residência" },
  ],
  vehicle: [
    { value: "crlv", label: "CRLV" },
    { value: "fotos", label: "Fotos" },
    { value: "laudo_cautelar", label: "Laudo Cautelar" },
    { value: "atpv_e", label: "ATPV-e" },
    { value: "contrato_compra_venda", label: "Contrato Compra/Venda" },
  ],
  transaction: [
    { value: "comprovante_pix", label: "Comprovante PIX" },
    { value: "boleto", label: "Boleto" },
    { value: "nota_fiscal", label: "Nota Fiscal" },
    { value: "xml_nf", label: "XML NF" },
  ],
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  cnh: "bg-blue-100 text-blue-700",
  rg: "bg-purple-100 text-purple-700",
  cartao_cnpj: "bg-green-100 text-green-700",
  contrato_social: "bg-amber-100 text-amber-700",
  comprovante_residencia: "bg-pink-100 text-pink-700",
  crlv: "bg-blue-100 text-blue-700",
  fotos: "bg-emerald-100 text-emerald-700",
  laudo_cautelar: "bg-orange-100 text-orange-700",
  atpv_e: "bg-cyan-100 text-cyan-700",
  contrato_compra_venda: "bg-violet-100 text-violet-700",
  comprovante_pix: "bg-teal-100 text-teal-700",
  boleto: "bg-yellow-100 text-yellow-700",
  nota_fiscal: "bg-red-100 text-red-700",
  xml_nf: "bg-gray-100 text-gray-700",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getFileTypeLabelFromValue(value: string, types: { value: string; label: string }[]): string {
  return types.find((t) => t.value === value)?.label ?? value;
}

function isImageMime(mime: string | null): boolean {
  return !!mime && mime.startsWith("image/");
}

// ---------------------------------------------------------------------------
// Upload Dialog
// ---------------------------------------------------------------------------

function UploadDialog({
  attachableType,
  attachableId,
  userId,
  onUploaded,
}: {
  attachableType: GedAttachmentsProps["attachableType"];
  attachableId: string;
  userId: string;
  onUploaded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [fileType, setFileType] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const allowedTypes = FILE_TYPES[attachableType];

  const reset = () => {
    setFileType("");
    setNotes("");
    setFile(null);
    setUploading(false);
  };

  const handleUpload = async () => {
    if (!file || !fileType) {
      toast.error("Selecione o tipo do documento e um arquivo.");
      return;
    }

    setUploading(true);
    try {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${userId}/${attachableType}/${attachableId}/${timestamp}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("attachments")
        .getPublicUrl(storagePath);

      const fileUrl = publicData.publicUrl;

      const { error: dbError } = await (supabase as any)
        .from("attachments")
        .insert([
          {
            attachable_type: attachableType,
            attachable_id: attachableId,
            user_id: userId,
            file_type: fileType,
            file_url: fileUrl,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type || null,
            notes: notes.trim() || null,
            storage_path: storagePath,
          },
        ]);

      if (dbError) throw dbError;

      toast.success("Documento anexado com sucesso!");
      reset();
      setOpen(false);
      onUploaded();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao fazer upload do arquivo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
          <Plus className="h-4 w-4 mr-1.5" />
          Adicionar Documento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Anexar Documento</DialogTitle>
          <DialogDescription>
            Selecione o tipo do documento e faça o upload do arquivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* File type selector */}
          <div className="space-y-2">
            <Label>Tipo de Documento *</Label>
            <Select value={fileType} onValueChange={setFileType}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione o tipo..." />
              </SelectTrigger>
              <SelectContent>
                {allowedTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File input */}
          <div className="space-y-2">
            <Label>Arquivo *</Label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-blue-400 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                  {file.type.startsWith("image/") ? (
                    <Image className="h-4 w-4 text-blue-500" />
                  ) : (
                    <FileText className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                  <span className="text-gray-400">({formatFileSize(file.size)})</span>
                </div>
              ) : (
                <div className="text-sm text-gray-400">
                  <Paperclip className="h-5 w-5 mx-auto mb-1 text-gray-300" />
                  Clique para selecionar (imagem ou PDF)
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações opcionais..."
              className="rounded-xl resize-none"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => { setOpen(false); reset(); }}
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Attachment Card
// ---------------------------------------------------------------------------

function AttachmentCard({
  attachment,
  attachableType,
  onDeleted,
  readonly,
}: {
  attachment: Attachment;
  attachableType: GedAttachmentsProps["attachableType"];
  onDeleted: () => void;
  readonly?: boolean;
}) {
  const [deleting, setDeleting] = useState(false);
  const allowedTypes = FILE_TYPES[attachableType];
  const typeLabel = getFileTypeLabelFromValue(attachment.file_type, allowedTypes);
  const badgeClass = TYPE_BADGE_COLORS[attachment.file_type] ?? "bg-gray-100 text-gray-700";
  const isImage = isImageMime(attachment.mime_type);

  const handleDelete = async () => {
    if (!window.confirm(`Excluir "${attachment.file_name}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    try {
      // Try to delete from storage using stored path (reconstruct from URL if needed)
      // The storage path is embedded in the URL: .../attachments/{path}
      const url = attachment.file_url;
      const marker = "/attachments/";
      const markerIdx = url.indexOf(marker);
      if (markerIdx !== -1) {
        const storagePath = decodeURIComponent(url.slice(markerIdx + marker.length).split("?")[0]);
        await supabase.storage.from("attachments").remove([storagePath]);
      }

      const { error } = await (supabase as any)
        .from("attachments")
        .delete()
        .eq("id", attachment.id);

      if (error) throw error;

      toast.success("Documento excluído.");
      onDeleted();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao excluir documento.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      {/* Thumbnail / placeholder */}
      <div className="h-28 bg-gray-50 flex items-center justify-center border-b border-gray-100">
        {isImage ? (
          <img
            src={attachment.file_url}
            alt={attachment.file_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-gray-300">
            <FileText className="h-10 w-10" />
            <span className="text-xs text-gray-400 font-medium">PDF</span>
          </div>
        )}
      </div>

      <CardContent className="p-3 space-y-2">
        {/* Badge + type */}
        <Badge className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
          {typeLabel}
        </Badge>

        {/* File name */}
        <p className="text-sm font-medium text-gray-800 truncate leading-tight" title={attachment.file_name}>
          {attachment.file_name}
        </p>

        {/* Size + date */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          {attachment.file_size ? <span>{formatFileSize(attachment.file_size)}</span> : <span />}
          <span>{formatDate(attachment.created_at)}</span>
        </div>

        {/* Notes */}
        {attachment.notes && (
          <p className="text-xs text-gray-500 italic line-clamp-2">{attachment.notes}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs rounded-lg h-7"
            onClick={() => window.open(attachment.file_url, "_blank")}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Visualizar
          </Button>
          {!readonly && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 rounded-lg"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function GedAttachments({ attachableType, attachableId, userId, readonly }: GedAttachmentsProps) {
  const queryClient = useQueryClient();
  const queryKey = ["attachments", attachableType, attachableId, userId];

  const { data: attachments = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("attachments")
        .select("id, file_type, file_url, file_name, file_size, mime_type, notes, created_at")
        .eq("attachable_type", attachableType)
        .eq("attachable_id", attachableId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Attachment[];
    },
    enabled: !!attachableId && !!userId,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Documentos Anexados</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {attachments.length === 0
              ? "Nenhum documento cadastrado."
              : `${attachments.length} documento${attachments.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {!readonly && (
          <UploadDialog
            attachableType={attachableType}
            attachableId={attachableId}
            userId={userId}
            onUploaded={refresh}
          />
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Carregando documentos...</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && attachments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
          <Paperclip className="h-8 w-8 text-gray-200 mb-2" />
          <p className="text-sm text-gray-400 font-medium">Nenhum documento anexado</p>
          <p className="text-xs text-gray-300 mt-0.5">
            {readonly ? "Sem documentos para exibir." : "Clique em \"Adicionar Documento\" para começar."}
          </p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && attachments.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {attachments.map((att) => (
            <AttachmentCard
              key={att.id}
              attachment={att}
              attachableType={attachableType}
              onDeleted={refresh}
              readonly={readonly}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default GedAttachments;
