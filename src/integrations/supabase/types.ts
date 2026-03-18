export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_settings: {
        Row: {
          id: string
          user_id: string
          agent_type: string
          openai_api_key: string | null
          uazapi_instance_url: string | null
          uazapi_token: string | null
          elevenlabs_api_key: string | null
          elevenlabs_voice_id: string | null
          system_prompt: string | null
          whatsapp_connected: boolean | null
          whatsapp_qr_code: string | null
          owner_phone: string | null
          enabled: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          agent_type: string
          openai_api_key?: string | null
          uazapi_instance_url?: string | null
          uazapi_token?: string | null
          elevenlabs_api_key?: string | null
          elevenlabs_voice_id?: string | null
          system_prompt?: string | null
          whatsapp_connected?: boolean | null
          whatsapp_qr_code?: string | null
          owner_phone?: string | null
          enabled?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          agent_type?: string
          openai_api_key?: string | null
          uazapi_instance_url?: string | null
          uazapi_token?: string | null
          elevenlabs_api_key?: string | null
          elevenlabs_voice_id?: string | null
          system_prompt?: string | null
          whatsapp_connected?: boolean | null
          whatsapp_qr_code?: string | null
          owner_phone?: string | null
          enabled?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          id: string
          user_id: string
          agent_type: string
          phone_number: string
          contact_name: string | null
          last_message_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          agent_type: string
          phone_number: string
          contact_name?: string | null
          last_message_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          agent_type?: string
          phone_number?: string
          contact_name?: string | null
          last_message_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          id: string
          conversation_id: string
          role: string
          content: string
          media_url: string | null
          audio_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: string
          content: string
          media_url?: string | null
          audio_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: string
          content?: string
          media_url?: string | null
          audio_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          id: string
          recipient_count: number | null
          sent_at: string
          subject: string
          user_id: string
        }
        Insert: {
          content: string
          id?: string
          recipient_count?: number | null
          sent_at?: string
          subject: string
          user_id: string
        }
        Update: {
          content?: string
          id?: string
          recipient_count?: number | null
          sent_at?: string
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          actual_sale_price: number | null
          brand: string | null
          created_at: string
          current_km: number | null
          description: string | null
          fipe_price: number | null
          id: string
          image_url: string | null
          manufacturing_year: number | null
          model: string | null
          model_year: number | null
          plate: string | null
          price: number | null
          purchase_price: number | null
          renavan: string | null
          report_url: string | null
          sale_date: string | null
          sold: boolean | null
          stock_entry_date: string | null
          title: string | null
          updated_at: string
          user_id: string
          vehicle_images: Json | null
        }
        Insert: {
          actual_sale_price?: number | null
          brand?: string | null
          created_at?: string
          current_km?: number | null
          description?: string | null
          fipe_price?: number | null
          id?: string
          image_url?: string | null
          manufacturing_year?: number | null
          model?: string | null
          model_year?: number | null
          plate?: string | null
          price?: number | null
          purchase_price?: number | null
          renavan?: string | null
          report_url?: string | null
          sale_date?: string | null
          sold?: boolean | null
          stock_entry_date?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          vehicle_images?: Json | null
        }
        Update: {
          actual_sale_price?: number | null
          brand?: string | null
          created_at?: string
          current_km?: number | null
          description?: string | null
          fipe_price?: number | null
          id?: string
          image_url?: string | null
          manufacturing_year?: number | null
          model?: string | null
          model_year?: number | null
          plate?: string | null
          price?: number | null
          purchase_price?: number | null
          renavan?: string | null
          report_url?: string | null
          sale_date?: string | null
          sold?: boolean | null
          stock_entry_date?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          vehicle_images?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      salespeople: {
        Row: {
          id: string
          user_id: string
          name: string
          phone: string | null
          email: string | null
          cpf: string | null
          commission_rate: number | null
          active: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          phone?: string | null
          email?: string | null
          cpf?: string | null
          commission_rate?: number | null
          active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          phone?: string | null
          email?: string | null
          cpf?: string | null
          commission_rate?: number | null
          active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salespeople_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          id: string
          user_id: string
          product_id: string
          salesperson_id: string
          customer_id: string | null
          commission_type: string
          commission_value: number
          calculated_amount: number
          status: string
          payment_date: string | null
          sale_date: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          salesperson_id: string
          customer_id?: string | null
          commission_type: string
          commission_value: number
          calculated_amount: number
          status?: string
          payment_date?: string | null
          sale_date: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          salesperson_id?: string
          customer_id?: string | null
          commission_type?: string
          commission_value?: number
          calculated_amount?: number
          status?: string
          payment_date?: string | null
          sale_date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "salespeople"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_payable: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          description: string
          amount: number
          due_date: string
          payment_date: string | null
          status: string
          is_recurring: boolean | null
          recurrence_interval: string | null
          recurrence_end_date: string | null
          parent_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          description: string
          amount: number
          due_date: string
          payment_date?: string | null
          status?: string
          is_recurring?: boolean | null
          recurrence_interval?: string | null
          recurrence_end_date?: string | null
          parent_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          description?: string
          amount?: number
          due_date?: string
          payment_date?: string | null
          status?: string
          is_recurring?: boolean | null
          recurrence_interval?: string | null
          recurrence_end_date?: string | null
          parent_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts_payable"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_receivable: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          product_id: string | null
          customer_id: string | null
          description: string
          total_amount: number
          installments: number | null
          payment_method: string | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          product_id?: string | null
          customer_id?: string | null
          description: string
          total_amount: number
          installments?: number | null
          payment_method?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          product_id?: string | null
          customer_id?: string | null
          description?: string
          total_amount?: number
          installments?: number | null
          payment_method?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      receivable_installments: {
        Row: {
          id: string
          receivable_id: string
          installment_number: number
          amount: number
          due_date: string
          payment_date: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          receivable_id: string
          installment_number: number
          amount: number
          due_date: string
          payment_date?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          receivable_id?: string
          installment_number?: number
          amount?: number
          due_date?: string
          payment_date?: string | null
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivable_installments_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "accounts_receivable"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          id: string
          user_id: string
          store_name: string
          slug: string | null
          logo_url: string | null
          banner_url: string | null
          primary_color: string | null
          secondary_color: string | null
          whatsapp_number: string | null
          phone: string | null
          email: string | null
          address: string | null
          instagram_url: string | null
          facebook_url: string | null
          description: string | null
          active: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          store_name?: string
          slug?: string | null
          logo_url?: string | null
          banner_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          whatsapp_number?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          instagram_url?: string | null
          facebook_url?: string | null
          description?: string | null
          active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          store_name?: string
          slug?: string | null
          logo_url?: string | null
          banner_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          whatsapp_number?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          instagram_url?: string | null
          facebook_url?: string | null
          description?: string | null
          active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_costs: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_url: string | null
          product_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          invoice_url?: string | null
          product_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_url?: string | null
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_costs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
