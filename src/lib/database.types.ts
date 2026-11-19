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
          customer_id: string | null
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
          customer_id?: string | null
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
          customer_id?: string | null
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
      staff_push_subscriptions: {
        Row: { endpoint: string; user_id: string; p256dh: string; auth: string; created_at: string }
        Insert: { endpoint: string; user_id?: string; p256dh: string; auth: string; created_at?: string }
        Update: { endpoint?: string; user_id?: string; p256dh?: string; auth?: string; created_at?: string }
        Relationships: []
      }
      staff: {
        Row: { user_id: string; email: string; role: string; created_at: string }
        Insert: { user_id: string; email: string; role?: string; created_at?: string }
        Update: { user_id?: string; email?: string; role?: string; created_at?: string }
        Relationships: []
      }
      orders: {
        Row: {
          payment_status: string
          paid_at: string | null
          payment_expires_at: string | null
          provider_payment_id: string | null
          payment_review_required: boolean
          refund_amount: number
          eta: string | null
          delivery_fee: number
          delivery_suburb: string | null
          created_at: string
          customer_id: string | null
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
          payment_status?: string
          paid_at?: string | null
          payment_expires_at?: string | null
          provider_payment_id?: string | null
          payment_review_required?: boolean
          refund_amount?: number
          eta?: string | null
          delivery_fee?: number
          delivery_suburb?: string | null
          created_at?: string
          customer_id?: string | null
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
          payment_status?: string
          paid_at?: string | null
          payment_expires_at?: string | null
          provider_payment_id?: string | null
          payment_review_required?: boolean
          refund_amount?: number
          eta?: string | null
          delivery_fee?: number
          delivery_suburb?: string | null
          created_at?: string
          customer_id?: string | null
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
      ordering_state: { Args: Record<PropertyKey, never>; Returns: Json }
      set_ordering_paused: { Args: { p_paused: boolean }; Returns: undefined }
      set_menu_item_available: { Args: { p_name: string; p_available: boolean }; Returns: undefined }
      begin_payment: {
        Args: { p_reference: string; p_contact: string; p_restaurant: string; p_mode: string }
        Returns: Json
      }
      mark_order_paid: {
        Args: { p_reference: string; p_transaction: string; p_status: string; p_amount: number; p_raw: Json }
        Returns: Json
      }
      record_payment_refund: {
        Args: { p_reference: string; p_refund_id: string; p_amount: number; p_confirmed: boolean; p_reviewer: string }
        Returns: undefined
      }
      collection_commission_report: {
        Args: Record<PropertyKey, never>
        Returns: { reference: string; month: string; food_subtotal: number; delivery: number; refunds: number; payment_state: string; fulfilment_state: string; commission_base: number }[]
      }
      mark_delivery_failed: { Args: { p_order_id: string }; Returns: undefined }
      add_guest_push: {
        Args: { p_reference: string; p_email: string; p_endpoint: string; p_p256dh: string; p_auth: string }
        Returns: boolean
      }
      remove_guest_push: { Args: { p_reference: string; p_email: string; p_endpoint: string }; Returns: undefined }
      create_delivery_order: {
        Args: {
          p_order_no: string
          p_customer_name: string
          p_email: string
          p_phone: string
          p_delivery_address: string
          p_delivery_notes: string
          p_requested_time: string
          p_total: number
          p_marketing_consent: boolean
          p_items: Json
          p_delivery_suburb: string
        }
        Returns: { id: string; order_no: string; created_at: string }[]
      }
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
      lookup_request: {
        Args: {
          p_contact: string
          p_reference: string
        }
        Returns: Json
      }
      upsert_customer: {
        Args: {
          p_email: string
          p_marketing_consent: boolean
          p_name: string
          p_phone: string
        }
        Returns: string
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
