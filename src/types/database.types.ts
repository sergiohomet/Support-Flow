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
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          ticket_id: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          ticket_id: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          ticket_id?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_config: {
        Row: {
          category_id: string
          escalation_enabled: boolean
          id: string
          max_resolution_hours: number
          updated_at: string
        }
        Insert: {
          category_id: string
          escalation_enabled?: boolean
          id?: string
          max_resolution_hours: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          escalation_enabled?: boolean
          id?: string
          max_resolution_hours?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_config_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_assignment_log: {
        Row: {
          changed_at: string
          changed_by: string
          from_agent_id: string | null
          id: string
          ticket_id: string
          to_agent_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          from_agent_id?: string | null
          id?: string
          ticket_id: string
          to_agent_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          from_agent_id?: string | null
          id?: string
          ticket_id?: string
          to_agent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_assignment_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_assignment_log_from_agent_id_fkey"
            columns: ["from_agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_assignment_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_assignment_log_to_agent_id_fkey"
            columns: ["to_agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_status_log: {
        Row: {
          changed_at: string
          changed_by: string
          from_status: Database["public"]["Enums"]["ticket_status"] | null
          id: string
          ticket_id: string
          to_status: Database["public"]["Enums"]["ticket_status"]
        }
        Insert: {
          changed_at?: string
          changed_by: string
          from_status?: Database["public"]["Enums"]["ticket_status"] | null
          id?: string
          ticket_id: string
          to_status: Database["public"]["Enums"]["ticket_status"]
        }
        Update: {
          changed_at?: string
          changed_by?: string
          from_status?: Database["public"]["Enums"]["ticket_status"] | null
          id?: string
          ticket_id?: string
          to_status?: Database["public"]["Enums"]["ticket_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ticket_status_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_status_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          agent_id: string | null
          ai_triage: Json | null
          category_id: string
          client_id: string
          created_at: string
          description: string
          escalated_at: string | null
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          sla_hours_snapshot: number | null
          status: Database["public"]["Enums"]["ticket_status"]
          title: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          ai_triage?: Json | null
          category_id: string
          client_id: string
          created_at?: string
          description: string
          escalated_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          sla_hours_snapshot?: number | null
          status?: Database["public"]["Enums"]["ticket_status"]
          title: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          ai_triage?: Json | null
          category_id?: string
          client_id?: string
          created_at?: string
          description?: string
          escalated_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          sla_hours_snapshot?: number | null
          status?: Database["public"]["Enums"]["ticket_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          category_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          category_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          category_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_ticket_comment: {
        Args: { p_content: string; p_ticket_id: string }
        Returns: {
          content: string
          created_at: string
          id: string
          ticket_id: string
          user_full_name: string
          user_id: string
        }[]
      }
      admin_create_category: {
        Args: { p_description?: string; p_name: string }
        Returns: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          max_resolution_hours: number
          name: string
        }[]
      }
      admin_get_sla_at_risk_tickets: {
        Args: { p_limit?: number }
        Returns: {
          agent_full_name: string
          category_name: string
          id: string
          minutes_remaining: number
          title: string
        }[]
      }
      admin_get_sla_compliance_by_category: {
        Args: { p_date_from?: string; p_date_to?: string }
        Returns: {
          category_id: string
          category_name: string
          compliance_pct: number | null
          max_resolution_hours: number
          resolved_count: number
          total_count: number
        }[]
      }
      admin_get_sla_config: {
        Args: never
        Returns: {
          category_id: string
          category_name: string
          escalation_enabled: boolean
          max_resolution_hours: number
          updated_at: string
        }[]
      }
      admin_get_sla_dashboard: {
        Args: { p_date_from?: string; p_date_to?: string }
        Returns: {
          escalated_count: number
          resolved_in_sla: number
          total_tickets: number
        }[]
      }
      admin_list_categories: {
        Args: never
        Returns: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          max_resolution_hours: number
          name: string
        }[]
      }
      admin_list_users: {
        Args: {
          p_is_active?: boolean
          p_page?: number
          p_page_size?: number
          p_role?: Database["public"]["Enums"]["user_role"]
          p_search?: string
        }
        Returns: {
          avatar_url: string
          category_id: string
          category_name: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          total_count: number
        }[]
      }
      admin_toggle_category_status: {
        Args: { p_id: string }
        Returns: {
          is_active: boolean
        }[]
      }
      admin_toggle_user_status: {
        Args: { p_is_active: boolean; p_user_id: string }
        Returns: undefined
      }
      admin_update_category: {
        Args: { p_description?: string; p_id: string; p_name: string }
        Returns: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          max_resolution_hours: number
          name: string
        }[]
      }
      admin_update_sla_config: {
        Args: {
          p_category_id: string
          p_escalation_enabled: boolean
          p_max_resolution_hours: number
        }
        Returns: {
          category_id: string
          category_name: string
          escalation_enabled: boolean
          max_resolution_hours: number
          updated_at: string
        }[]
      }
      admin_update_user_role: {
        Args: {
          p_category_id?: string
          p_new_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      admin_update_user_specialty: {
        Args: { p_category_id: string; p_user_id: string }
        Returns: undefined
      }
      assign_ticket: {
        Args: { p_agent_id: string; p_ticket_id: string }
        Returns: {
          agent_id: string
          id: string
          status: Database["public"]["Enums"]["ticket_status"]
          updated_at: string
        }[]
      }
      create_ticket: {
        Args: {
          p_category_id: string
          p_description: string
          p_priority?: Database["public"]["Enums"]["ticket_priority"]
          p_title: string
        }
        Returns: {
          created_at: string
          id: string
          status: Database["public"]["Enums"]["ticket_status"]
          title: string
        }[]
      }
      get_agents: {
        Args: never
        Returns: {
          active_ticket_count: number
          category_id: string
          category_name: string
          full_name: string
          id: string
        }[]
      }
      get_categories: {
        Args: never
        Returns: {
          description: string
          id: string
          name: string
        }[]
      }
      get_my_profile: {
        Args: never
        Returns: {
          email: string
          full_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_notifications: {
        Args: { p_filter?: string }
        Returns: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          ticket_id: string
          type: Database["public"]["Enums"]["notification_type"]
        }[]
      }
      get_ticket_comments: {
        Args: { p_ticket_id: string }
        Returns: {
          content: string
          created_at: string
          id: string
          ticket_id: string
          user_full_name: string
          user_id: string
        }[]
      }
      get_ticket_detail: {
        Args: { p_ticket_id: string }
        Returns: {
          agent_full_name: string
          agent_id: string
          ai_triage: Json
          category_id: string
          category_is_active: boolean
          category_name: string
          client_full_name: string
          client_id: string
          created_at: string
          description: string
          escalated_at: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          sla_hours: number
          status: Database["public"]["Enums"]["ticket_status"]
          title: string
          updated_at: string
        }[]
      }
      get_ticket_status_log: {
        Args: { p_ticket_id: string }
        Returns: {
          changed_at: string
          changed_by: string
          changed_by_full_name: string
          from_status: Database["public"]["Enums"]["ticket_status"]
          id: string
          ticket_id: string
          to_status: Database["public"]["Enums"]["ticket_status"]
        }[]
      }
      get_tickets: {
        Args: {
          p_agent_id?: string
          p_category_id?: string
          p_page?: number
          p_page_size?: number
          p_priority?: Database["public"]["Enums"]["ticket_priority"]
          p_status?: Database["public"]["Enums"]["ticket_status"]
        }
        Returns: {
          agent_full_name: string
          agent_id: string
          category_id: string
          category_is_active: boolean
          category_name: string
          client_full_name: string
          client_id: string
          comment_count: number
          created_at: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
          title: string
          total_count: number
          updated_at: string
        }[]
      }
      internal_sync_sla_service_role_secret: {
        Args: { p_value: string }
        Returns: undefined
      }
      mark_all_notifications_read: {
        Args: never
        Returns: {
          updated_count: number
        }[]
      }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: {
          id: string
          is_read: boolean
        }[]
      }
      run_sla_escalation_check: {
        Args: never
        Returns: {
          escalated_count: number
          escalated_ticket_id: string
        }[]
      }
      unassign_ticket: {
        Args: { p_ticket_id: string }
        Returns: {
          agent_id: string
          id: string
          status: Database["public"]["Enums"]["ticket_status"]
          updated_at: string
        }[]
      }
      update_ticket_status: {
        Args: {
          p_new_status: Database["public"]["Enums"]["ticket_status"]
          p_ticket_id: string
        }
        Returns: {
          id: string
          status: Database["public"]["Enums"]["ticket_status"]
          updated_at: string
        }[]
      }
    }
    Enums: {
      notification_type:
        | "status_change"
        | "sla_escalation"
        | "reassignment"
        | "new_comment"
      ticket_priority: "baja" | "media" | "alta" | "critica"
      ticket_status: "abierto" | "en_proceso" | "resuelto" | "reabierto"
      user_role: "client" | "agent" | "admin"
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
    Enums: {
      notification_type: [
        "status_change",
        "sla_escalation",
        "reassignment",
        "new_comment",
      ],
      ticket_priority: ["baja", "media", "alta", "critica"],
      ticket_status: ["abierto", "en_proceso", "resuelto", "reabierto"],
      user_role: ["client", "agent", "admin"],
    },
  },
} as const
