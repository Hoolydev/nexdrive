import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BrainCircuit } from "lucide-react";

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  title?: string;
  description?: string;
}

export function PromptEditor({
  value,
  onChange,
  title = "Prompt do Sistema",
  description = "Configure o comportamento e personalidade do agente de IA. Quanto mais detalhado, melhor será o atendimento.",
}: PromptEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="system-prompt">Instruções do Agente</Label>
          <Textarea
            id="system-prompt"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Exemplo: Você é um assistente de vendas de veículos da loja [Nome da Loja]. Seja cordial e profissional. Responda perguntas sobre veículos disponíveis, preços e condições de pagamento. Sempre que possível, convide o cliente para uma visita presencial.`}
            className="min-h-[200px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {value.length} caracteres
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
