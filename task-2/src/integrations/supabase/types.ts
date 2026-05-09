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
      check_ins: {
        Row: {
          checked_in_at: string
          checked_in_by: string | null
          event_id: string
          id: string
          rsvp_id: string
          undone_at: string | null
        }
        Insert: {
          checked_in_at?: string
          checked_in_by?: string | null
          event_id: string
          id?: string
          rsvp_id: string
          undone_at?: string | null
        }
        Update: {
          checked_in_at?: string
          checked_in_by?: string | null
          event_id?: string
          id?: string
          rsvp_id?: string
          undone_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_rsvp_id_fkey"
            columns: ["rsvp_id"]
            isOneToOne: true
            referencedRelation: "rsvps"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number
          cover_image_url: string | null
          created_at: string
          description: string | null
          end_at: string
          hidden: boolean
          host_id: string
          id: string
          is_paid: boolean
          location_type: Database["public"]["Enums"]["location_type"]
          online_link: string | null
          slug: string
          start_at: string
          status: Database["public"]["Enums"]["event_status"]
          timezone: string
          title: string
          updated_at: string
          venue_address: string | null
          visibility: Database["public"]["Enums"]["event_visibility"]
        }
        Insert: {
          capacity: number
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          end_at: string
          hidden?: boolean
          host_id: string
          id?: string
          is_paid?: boolean
          location_type: Database["public"]["Enums"]["location_type"]
          online_link?: string | null
          slug: string
          start_at: string
          status?: Database["public"]["Enums"]["event_status"]
          timezone: string
          title: string
          updated_at?: string
          venue_address?: string | null
          visibility?: Database["public"]["Enums"]["event_visibility"]
        }
        Update: {
          capacity?: number
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          end_at?: string
          hidden?: boolean
          host_id?: string
          id?: string
          is_paid?: boolean
          location_type?: Database["public"]["Enums"]["location_type"]
          online_link?: string | null
          slug?: string
          start_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          timezone?: string
          title?: string
          updated_at?: string
          venue_address?: string | null
          visibility?: Database["public"]["Enums"]["event_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "events_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          comment: string | null
          created_at: string
          event_id: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          event_id: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          event_id?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_photos: {
        Row: {
          created_at: string
          event_id: string
          hidden: boolean
          id: string
          image_url: string
          status: Database["public"]["Enums"]["moderation_status"]
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          hidden?: boolean
          id?: string
          image_url: string
          status?: Database["public"]["Enums"]["moderation_status"]
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          hidden?: boolean
          id?: string
          image_url?: string
          status?: Database["public"]["Enums"]["moderation_status"]
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      host_invites: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          host_id: string
          id: string
          role: Database["public"]["Enums"]["host_role"]
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          host_id: string
          id?: string
          role: Database["public"]["Enums"]["host_role"]
          token: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          host_id?: string
          id?: string
          role?: Database["public"]["Enums"]["host_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "host_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "host_invites_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      host_members: {
        Row: {
          created_at: string
          host_id: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["host_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          host_id: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["host_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          host_id?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["host_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "host_members_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "host_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "host_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hosts: {
        Row: {
          bio: string | null
          contact_email: string
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_user_id: string | null
          slug: string
        }
        Insert: {
          bio?: string | null
          contact_email: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_user_id?: string | null
          slug: string
        }
        Update: {
          bio?: string | null
          contact_email?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_user_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "hosts_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_user_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target_type"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvps: {
        Row: {
          canceled_at: string | null
          created_at: string
          event_id: string
          id: string
          promoted_at: string | null
          qr_payload: string
          status: Database["public"]["Enums"]["rsvp_status"]
          ticket_code: string
          user_id: string
          waitlist_position: number | null
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          promoted_at?: string | null
          qr_payload: string
          status: Database["public"]["Enums"]["rsvp_status"]
          ticket_code: string
          user_id: string
          waitlist_position?: number | null
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          promoted_at?: string | null
          qr_payload?: string
          status?: Database["public"]["Enums"]["rsvp_status"]
          ticket_code?: string
          user_id?: string
          waitlist_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_host_invite: { Args: { _token: string }; Returns: Json }
      cancel_rsvp: {
        Args: { _rsvp_id: string }
        Returns: {
          canceled_at: string | null
          created_at: string
          event_id: string
          id: string
          promoted_at: string | null
          qr_payload: string
          status: Database["public"]["Enums"]["rsvp_status"]
          ticket_code: string
          user_id: string
          waitlist_position: number | null
        }
        SetofOptions: {
          from: "*"
          to: "rsvps"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_in_ticket: {
        Args: { _event_id: string; _ticket_code: string }
        Returns: Json
      }
      create_or_update_rsvp: {
        Args: { _event_id: string }
        Returns: {
          canceled_at: string | null
          created_at: string
          event_id: string
          id: string
          promoted_at: string | null
          qr_payload: string
          status: Database["public"]["Enums"]["rsvp_status"]
          ticket_code: string
          user_id: string
          waitlist_position: number | null
        }
        SetofOptions: {
          from: "*"
          to: "rsvps"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      event_host_id: { Args: { _event_id: string }; Returns: string }
      export_event_rsvps: {
        Args: { _event_id: string }
        Returns: {
          check_in_time: string
          email: string
          name: string
          rsvp_status: string
        }[]
      }
      get_event_feedback_summary: { Args: { _event_id: string }; Returns: Json }
      has_checker_or_host_role: {
        Args: { _host_id: string; _user_id: string }
        Returns: boolean
      }
      has_host_role: {
        Args: { _host_id: string; _user_id: string }
        Returns: boolean
      }
      is_host_member: {
        Args: { _host_id: string; _user_id: string }
        Returns: boolean
      }
      photo_event_id: { Args: { _photo_id: string }; Returns: string }
      review_report: {
        Args: { _new_status: string; _report_id: string }
        Returns: {
          created_at: string
          id: string
          reason: string
          reporter_user_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        SetofOptions: {
          from: "*"
          to: "reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_event_feedback: {
        Args: { _comment: string; _event_id: string; _rating: number }
        Returns: {
          comment: string | null
          created_at: string
          event_id: string
          id: string
          rating: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "feedback"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      undo_check_in: {
        Args: { _check_in_id: string }
        Returns: {
          checked_in_at: string
          checked_in_by: string | null
          event_id: string
          id: string
          rsvp_id: string
          undone_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "check_ins"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      event_status: "draft" | "published"
      event_visibility: "public" | "unlisted"
      host_role: "host" | "checker"
      location_type: "venue" | "online"
      moderation_status: "pending" | "approved" | "rejected"
      report_status: "open" | "reviewed" | "hidden"
      report_target_type: "event" | "photo"
      rsvp_status: "going" | "waitlisted" | "canceled"
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
      event_status: ["draft", "published"],
      event_visibility: ["public", "unlisted"],
      host_role: ["host", "checker"],
      location_type: ["venue", "online"],
      moderation_status: ["pending", "approved", "rejected"],
      report_status: ["open", "reviewed", "hidden"],
      report_target_type: ["event", "photo"],
      rsvp_status: ["going", "waitlisted", "canceled"],
    },
  },
} as const
