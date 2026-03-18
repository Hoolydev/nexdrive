import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, User } from "lucide-react";

interface Message {
  id: string;
  role: string;
  content: string;
  media_url: string | null;
  audio_url: string | null;
  created_at: string;
}

interface ChatViewerProps {
  messages: Message[];
  title?: string;
}

export function ChatViewer({ messages, title = "Mensagens" }: ChatViewerProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma mensagem nesta conversa.
            </p>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === "assistant" ? "flex-row" : "flex-row-reverse"}`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    {msg.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-[70%] ${msg.role === "assistant" ? "" : "text-right"}`}>
                    <div className={`rounded-lg p-3 text-sm ${
                      msg.role === "assistant"
                        ? "bg-muted"
                        : "bg-primary text-primary-foreground"
                    }`}>
                      {msg.content}
                      {msg.media_url && (
                        <img src={msg.media_url} alt="Mídia" className="mt-2 rounded max-w-full" />
                      )}
                      {msg.audio_url && (
                        <audio controls className="mt-2 w-full">
                          <source src={msg.audio_url} />
                        </audio>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      {format(new Date(msg.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
