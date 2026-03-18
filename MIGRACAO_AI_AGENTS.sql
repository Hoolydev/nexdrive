-- =============================================
-- MIGRAÇÃO: Agentes de IA (Assistente Loja + Atendimento)
-- Idempotente: pode executar várias vezes sem erro
-- =============================================

-- Tabela de configurações dos agentes IA
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('store_assistant', 'customer_service')),
  openai_api_key TEXT,
  uazapi_instance_url TEXT,
  uazapi_token TEXT,
  elevenlabs_api_key TEXT,
  elevenlabs_voice_id TEXT,
  system_prompt TEXT,
  whatsapp_connected BOOLEAN DEFAULT false,
  whatsapp_qr_code TEXT,
  owner_phone TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, agent_type)
);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ai_settings" ON public.ai_settings;
CREATE POLICY "Users can view own ai_settings"
  ON public.ai_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ai_settings" ON public.ai_settings;
CREATE POLICY "Users can insert own ai_settings"
  ON public.ai_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ai_settings" ON public.ai_settings;
CREATE POLICY "Users can update own ai_settings"
  ON public.ai_settings FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own ai_settings" ON public.ai_settings;
CREATE POLICY "Users can delete own ai_settings"
  ON public.ai_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Tabela de conversas dos agentes IA
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('store_assistant', 'customer_service')),
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ai_conversations" ON public.ai_conversations;
CREATE POLICY "Users can view own ai_conversations"
  ON public.ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ai_conversations" ON public.ai_conversations;
CREATE POLICY "Users can insert own ai_conversations"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ai_conversations" ON public.ai_conversations;
CREATE POLICY "Users can update own ai_conversations"
  ON public.ai_conversations FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own ai_conversations" ON public.ai_conversations;
CREATE POLICY "Users can delete own ai_conversations"
  ON public.ai_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Tabela de mensagens dos agentes IA
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  media_url TEXT,
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ai_messages" ON public.ai_messages;
CREATE POLICY "Users can view own ai_messages"
  ON public.ai_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own ai_messages" ON public.ai_messages;
CREATE POLICY "Users can insert own ai_messages"
  ON public.ai_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE ai_conversations.id = conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own ai_messages" ON public.ai_messages;
CREATE POLICY "Users can delete own ai_messages"
  ON public.ai_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

-- Trigger para updated_at em ai_settings
DROP TRIGGER IF EXISTS update_ai_settings_updated_at ON public.ai_settings;
CREATE TRIGGER update_ai_settings_updated_at
  BEFORE UPDATE ON public.ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
