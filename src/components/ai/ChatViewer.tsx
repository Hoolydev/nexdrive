import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, User, Volume2, MessageSquare } from "lucide-react";
import { useEffect, useRef } from "react";

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
  /** Removes the outer card wrapper for embedded usage */
  embedded?: boolean;
}

export function ChatViewer({ messages, title = "Mensagens", embedded = false }: ChatViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const chatBody = (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
      style={{
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Subtle pattern overlay */}
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-slate-500" />
          </div>
          <p className="text-sm font-medium">Nenhuma mensagem nesta conversa.</p>
          <p className="text-xs text-slate-600">Envie uma mensagem para começar.</p>
        </div>
      ) : (
        messages.map((msg) => {
          const isAssistant = msg.role === "assistant";
          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${isAssistant ? "flex-row" : "flex-row-reverse"}`}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md ${
                  isAssistant
                    ? "bg-gradient-to-br from-blue-500 to-blue-700 text-white"
                    : "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white"
                }`}
              >
                {isAssistant ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>

              {/* Bubble */}
              <div className={`max-w-[75%] ${isAssistant ? "" : "text-right"}`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-md ${
                    isAssistant
                      ? "bg-slate-800 text-slate-100 rounded-tl-md"
                      : "bg-blue-600 text-white rounded-tr-md"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.media_url && (() => {
                    const urls = msg.media_url.split(",").map((u: string) => u.trim()).filter(Boolean);
                    return urls.length > 0 ? (
                      <div className={`mt-3 flex gap-2 overflow-x-auto pb-1 ${urls.length === 1 ? "" : "snap-x snap-mandatory"}`}>
                        {urls.map((url: string, idx: number) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Foto ${idx + 1}`}
                            className="rounded-lg max-h-[200px] w-auto object-cover snap-center border border-white/10 shadow-md"
                            loading="lazy"
                          />
                        ))}
                      </div>
                    ) : null;
                  })()}
                  {msg.audio_url && (
                    <div className="mt-2 flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-blue-300 shrink-0" />
                      <audio controls className="w-full h-8" style={{ filter: "invert(1) hue-rotate(180deg)" }}>
                        <source src={msg.audio_url} />
                      </audio>
                    </div>
                  )}
                </div>
                <span className={`text-[10px] mt-1 block ${isAssistant ? "text-slate-500" : "text-slate-500 text-right"}`}>
                  {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  if (embedded) {
    return chatBody;
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {title && (
        <div className="shrink-0 px-5 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        </div>
      )}
      <div className="flex flex-col" style={{ height: "500px" }}>
        {chatBody}
      </div>
    </div>
  );
}
