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
      checkins: {
        Row: {
          id: string
          minutes: number | null
          squad_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          minutes?: number | null
          squad_id: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          minutes?: number | null
          squad_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          custom_amounts: Json
          expense_type: string
          id: string
          meeting_id: string | null
          name: string
          paid_by: string
          settled_users: string[]
          split_with: string[]
          squad_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          custom_amounts?: Json
          expense_type?: string
          id?: string
          meeting_id?: string | null
          name: string
          paid_by: string
          settled_users?: string[]
          split_with?: string[]
          squad_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          custom_amounts?: Json
          expense_type?: string
          id?: string
          meeting_id?: string | null
          name?: string
          paid_by?: string
          settled_users?: string[]
          split_with?: string[]
          squad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      late_events: {
        Row: {
          created_at: string
          created_by: string
          event_name: string
          id: string
          minutes: number
          note: string | null
          squad_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          event_name: string
          id?: string
          minutes: number
          note?: string | null
          squad_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          event_name?: string
          id?: string
          minutes?: number
          note?: string | null
          squad_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "late_events_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      live_locations: {
        Row: {
          accuracy: number | null
          event_id: string | null
          heading: number | null
          is_sharing: boolean
          last_updated: string
          latitude: number
          longitude: number
          speed: number | null
          squad_id: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          event_id?: string | null
          heading?: number | null
          is_sharing?: boolean
          last_updated?: string
          latitude: number
          longitude: number
          speed?: number | null
          squad_id: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          event_id?: string | null
          heading?: number | null
          is_sharing?: boolean
          last_updated?: string
          latitude?: number
          longitude?: number
          speed?: number | null
          squad_id?: string
          user_id?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          created_at: string
          created_by: string
          date: string | null
          description: string | null
          event_members: string[]
          event_name: string
          id: string
          kicked_members: string[]
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          meeting_time: string | null
          notifications: Json
          seen_by: string[]
          squad_id: string
          status: string
          summaries_seen: string[]
        }
        Insert: {
          created_at?: string
          created_by: string
          date?: string | null
          description?: string | null
          event_members?: string[]
          event_name: string
          id?: string
          kicked_members?: string[]
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          meeting_time?: string | null
          notifications?: Json
          seen_by?: string[]
          squad_id: string
          status?: string
          summaries_seen?: string[]
        }
        Update: {
          created_at?: string
          created_by?: string
          date?: string | null
          description?: string | null
          event_members?: string[]
          event_name?: string
          id?: string
          kicked_members?: string[]
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          meeting_time?: string | null
          notifications?: Json
          seen_by?: string[]
          squad_id?: string
          status?: string
          summaries_seen?: string[]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_choice: string | null
          bio: string | null
          created_at: string
          id: string
          name: string
          squad_id: string | null
        }
        Insert: {
          age?: number | null
          avatar_choice?: string | null
          bio?: string | null
          created_at?: string
          id: string
          name: string
          squad_id?: string | null
        }
        Update: {
          age?: number | null
          avatar_choice?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          name?: string
          squad_id?: string | null
        }
        Relationships: []
      }
      squads: {
        Row: {
          created_at: string
          created_by: string
          emoji: string
          id: string
          invite_code: string
          members: string[]
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          emoji: string
          id?: string
          invite_code: string
          members?: string[]
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          emoji?: string
          id?: string
          invite_code?: string
          members?: string[]
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      join_squad: { Args: { _code: string }; Returns: string }
      join_squad_by_id: { Args: { _squad_id: string }; Returns: string }
      user_squad: { Args: { _user: string }; Returns: string }
    }
    Enums: {
      squad_role: "owner" | "member"
      status_kind: "idle" | "here" | "otw" | "late" | "not_coming"
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
      squad_role: ["owner", "member"],
      status_kind: ["idle", "here", "otw", "late", "not_coming"],
    },
  },
} as const
