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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          booking_date: string
          booking_time: string
          created_at: string
          email: string
          guests: number
          id: string
          marketing_consent: boolean
          name: string
          notes: string | null
          phone: string
          seating_preference: string
          status: string
          updated_at: string
        }
        Insert: {
          booking_date: string
          booking_time: string
          created_at?: string
          email: string
          guests: number
          id?: string
          marketing_consent?: boolean
          name: string
          notes?: string | null
          phone: string
          seating_preference?: string
          status?: string
          updated_at?: string
        }
        Update: {
          booking_date?: string
          booking_time?: string
          created_at?: string
          email?: string
          guests?: number
          id?: string
          marketing_consent?: boolean
          name?: string
          notes?: string | null
          phone?: string
          seating_preference?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          interaction_count: number
          last_interaction_at: string
          marketing_consent: boolean
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          interaction_count?: number
          last_interaction_at?: string
          marketing_consent?: boolean
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          interaction_count?: number
          last_interaction_at?: string
          marketing_consent?: boolean
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          name: string
          order_id: string
          qty: number
          unit_price: number
        }
        Insert: {
          id?: string
          name: string
          order_id: string
          qty: number
          unit_price: number
        }
        Update: {
          id?: string
          name?: string
          order_id?: string
          qty?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string
          delivery_address: string | null
          delivery_notes: string | null
          email: string
          id: string
          marketing_consent: boolean
          order_no: string
          order_type: string
          phone: string
          requested_time: string | null
          status: string
          table_number: string | null
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          delivery_address?: string | null
          delivery_notes?: string | null
          email: string
          id?: string
          marketing_consent?: boolean
          order_no: string
          order_type: string
          phone: string
          requested_time?: string | null
          status?: string
          table_number?: string | null
          total: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          delivery_address?: string | null
          delivery_notes?: string | null
          email?: string
          id?: string
          marketing_consent?: boolean
          order_no?: string
          order_type?: string
          phone?: string
          requested_time?: string | null
          status?: string
          table_number?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order: {
        Args: {
          p_customer_name: string
          p_delivery_address: string
          p_delivery_notes: string
          p_email: string
          p_items: Json
          p_marketing_consent: boolean
          p_order_no: string
          p_order_type: string
          p_phone: string
          p_requested_time: string
          p_table_number: string
          p_total: number
        }
        Returns: {
          created_at: string
          id: string
          order_no: string
        }[]
      }
      upsert_customer: {
        Args: {
          p_email: string
          p_marketing_consent: boolean
          p_name: string
          p_phone: string
        }
        Returns: undefined
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
