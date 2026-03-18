import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Conversation {
  id: string;
  phone_number: string;
  contact_name: string | null;
  last_message_at: string;
  created_at: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Conversas
          <Badge variant="secondary">{conversations.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          {conversations.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">
              Nenhuma conversa ainda.
            </p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`w-full text-left p-4 border-b hover:bg-accent transition-colors ${
                  selectedId === conv.id ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {conv.contact_name || conv.phone_number}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(conv.last_message_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
                {conv.contact_name && (
                  <span className="text-xs text-muted-foreground">{conv.phone_number}</span>
                )}
              </button>
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
