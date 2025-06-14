export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          details: Json | null
          event_type: Database["public"]["Enums"]["audit_event_type"]
          id: string
          ip_address: unknown | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          session_id: string | null
          tenant_id: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          details?: Json | null
          event_type: Database["public"]["Enums"]["audit_event_type"]
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          tenant_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          details?: Json | null
          event_type?: Database["public"]["Enums"]["audit_event_type"]
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          tenant_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          hash: string
          id: string
          name: string
          script: string
          version: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          hash: string
          id?: string
          name: string
          script: string
          version: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          hash?: string
          id?: string
          name?: string
          script?: string
          version?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: Database["public"]["Enums"]["permission_action"]
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          name: string
          resource: string
          tenant_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["permission_action"]
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          resource: string
          tenant_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["permission_action"]
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          resource?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          permission_id: string
          role_id: string
          tenant_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          permission_id: string
          role_id: string
          tenant_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          permission_id?: string
          role_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system_role: boolean | null
          metadata: Json | null
          name: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_role?: boolean | null
          metadata?: Json | null
          name: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_role?: boolean | null
          metadata?: Json | null
          name?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_configuration_history: {
        Row: {
          change_description: string | null
          change_type: string
          configuration_snapshot: Json
          configuration_type: string
          created_at: string | null
          created_by: string | null
          id: string
          previous_values: Json | null
          related_audit_log_id: string | null
          tenant_id: string
        }
        Insert: {
          change_description?: string | null
          change_type: string
          configuration_snapshot: Json
          configuration_type: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          previous_values?: Json | null
          related_audit_log_id?: string | null
          tenant_id: string
        }
        Update: {
          change_description?: string | null
          change_type?: string
          configuration_snapshot?: Json
          configuration_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          previous_values?: Json | null
          related_audit_log_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_configuration_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_customizations: {
        Row: {
          created_at: string | null
          created_by: string | null
          customization_key: string
          customization_type: string
          customization_value: Json
          id: string
          inheritance_source: string | null
          is_inherited: boolean | null
          priority: number | null
          tenant_id: string
          updated_at: string | null
          validation_schema: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customization_key: string
          customization_type: string
          customization_value: Json
          id?: string
          inheritance_source?: string | null
          is_inherited?: boolean | null
          priority?: number | null
          tenant_id: string
          updated_at?: string | null
          validation_schema?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customization_key?: string
          customization_type?: string
          customization_value?: Json
          id?: string
          inheritance_source?: string | null
          is_inherited?: boolean | null
          priority?: number | null
          tenant_id?: string
          updated_at?: string | null
          validation_schema?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_customizations_inheritance_source_fkey"
            columns: ["inheritance_source"]
            isOneToOne: false
            referencedRelation: "tenant_customizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_customizations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_resource_quotas: {
        Row: {
          created_at: string | null
          created_by: string | null
          effective_from: string | null
          effective_until: string | null
          hard_limit: boolean | null
          id: string
          quota_limit: number
          reset_period: string | null
          resource_type: string
          tenant_id: string
          warning_threshold: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          effective_from?: string | null
          effective_until?: string | null
          hard_limit?: boolean | null
          id?: string
          quota_limit: number
          reset_period?: string | null
          resource_type: string
          tenant_id: string
          warning_threshold?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          effective_from?: string | null
          effective_until?: string | null
          hard_limit?: boolean | null
          id?: string
          quota_limit?: number
          reset_period?: string | null
          resource_type?: string
          tenant_id?: string
          warning_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_resource_quotas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_resource_usage: {
        Row: {
          current_usage: number | null
          id: string
          last_updated: string | null
          metadata: Json | null
          period_end: string | null
          period_start: string | null
          resource_type: string
          tenant_id: string
        }
        Insert: {
          current_usage?: number | null
          id?: string
          last_updated?: string | null
          metadata?: Json | null
          period_end?: string | null
          period_start?: string | null
          resource_type: string
          tenant_id: string
        }
        Update: {
          current_usage?: number | null
          id?: string
          last_updated?: string | null
          metadata?: Json | null
          period_end?: string | null
          period_start?: string | null
          resource_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_resource_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_workflows: {
        Row: {
          conditions: Json
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          tenant_id: string
          trigger_events: Json
          updated_at: string | null
          version: number | null
          workflow_config: Json
          workflow_name: string
          workflow_steps: Json
          workflow_type: string
        }
        Insert: {
          conditions?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          tenant_id: string
          trigger_events?: Json
          updated_at?: string | null
          version?: number | null
          workflow_config?: Json
          workflow_name: string
          workflow_steps?: Json
          workflow_type: string
        }
        Update: {
          conditions?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          tenant_id?: string
          trigger_events?: Json
          updated_at?: string | null
          version?: number | null
          workflow_config?: Json
          workflow_name?: string
          workflow_steps?: Json
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_workflows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          created_by: string | null
          domain: string | null
          id: string
          name: string
          settings: Json | null
          slug: string
          status: Database["public"]["Enums"]["user_status"] | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          domain?: string | null
          id?: string
          name: string
          settings?: Json | null
          slug: string
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          domain?: string | null
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          permission_id: string
          resource_id: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id: string
          resource_id?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id?: string
          resource_id?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          expires_at: string | null
          id: string
          role_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          expires_at?: string | null
          id?: string
          role_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          expires_at?: string | null
          id?: string
          role_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown | null
          is_active: boolean | null
          last_accessed_at: string | null
          tenant_id: string
          token_hash: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_accessed_at?: string | null
          tenant_id: string
          token_hash: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_accessed_at?: string | null
          tenant_id?: string
          token_hash?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sync_audit_logs: {
        Row: {
          created_at: string | null
          created_by: string | null
          details: Json | null
          id: string
          operation: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          details?: Json | null
          id?: string
          operation: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          details?: Json | null
          id?: string
          operation?: string
          user_id?: string
        }
        Relationships: []
      }
      user_tenants: {
        Row: {
          id: string
          is_primary: boolean | null
          joined_at: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_primary?: boolean | null
          joined_at?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_primary?: boolean | null
          joined_at?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tenants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          email_verified_at: string | null
          failed_login_attempts: number | null
          first_name: string | null
          id: string
          last_login_at: string | null
          last_name: string | null
          locked_until: string | null
          metadata: Json | null
          password_hash: string
          status: Database["public"]["Enums"]["user_status"] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          email_verified_at?: string | null
          failed_login_attempts?: number | null
          first_name?: string | null
          id?: string
          last_login_at?: string | null
          last_name?: string | null
          locked_until?: string | null
          metadata?: Json | null
          password_hash: string
          status?: Database["public"]["Enums"]["user_status"] | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          email_verified_at?: string | null
          failed_login_attempts?: number | null
          first_name?: string | null
          id?: string
          last_login_at?: string | null
          last_name?: string | null
          locked_until?: string | null
          metadata?: Json | null
          password_hash?: string
          status?: Database["public"]["Enums"]["user_status"] | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      backfill_users_from_auth: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      backup_tenant_configuration: {
        Args: { p_tenant_id: string; p_backup_description?: string }
        Returns: string
      }
      check_trigger_exists: {
        Args: { trigger_name: string; table_name: string; schema_name?: string }
        Returns: boolean
      }
      check_user_permission: {
        Args: {
          p_user_id: string
          p_action: string
          p_resource: string
          p_resource_id?: string
        }
        Returns: boolean
      }
      current_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      execute_tenant_workflow: {
        Args: {
          p_tenant_id: string
          p_workflow_name: string
          p_trigger_data?: Json
        }
        Returns: string
      }
      force_sync_all_users: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      force_sync_user: {
        Args: { user_id: string }
        Returns: boolean
      }
      get_tenant_configuration: {
        Args: {
          p_tenant_id: string
          p_config_type: string
          p_config_key: string
        }
        Returns: Json
      }
      get_user_permissions: {
        Args: { p_user_id: string }
        Returns: {
          permission_name: string
          resource: string
          action: string
          resource_id: string
          source: string
        }[]
      }
      is_current_user_superadmin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_event_type: Database["public"]["Enums"]["audit_event_type"]
          p_action: string
          p_resource_type?: string
          p_resource_id?: string
          p_details?: Json
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: string
      }
      manually_sync_user: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      set_tenant_context: {
        Args: { tenant_id: string }
        Returns: undefined
      }
      set_user_context: {
        Args: { user_id: string }
        Returns: undefined
      }
      switch_tenant_context: {
        Args: { p_user_id: string; p_tenant_id: string }
        Returns: boolean
      }
      update_task_progress: {
        Args: {
          p_phase: string
          p_task_id: string
          p_status: string
          p_completion_percentage?: number
          p_evidence?: Json
        }
        Returns: string
      }
      validate_and_update_quota: {
        Args: {
          p_tenant_id: string
          p_resource_type: string
          p_increment?: number
          p_check_only?: boolean
        }
        Returns: Json
      }
      validate_tenant_access: {
        Args: { p_user_id: string; p_tenant_id: string }
        Returns: boolean
      }
    }
    Enums: {
      audit_event_type:
        | "authentication"
        | "authorization"
        | "data_access"
        | "data_modification"
        | "system_event"
        | "security_event"
      permission_action:
        | "create"
        | "read"
        | "update"
        | "delete"
        | "manage"
        | "view"
        | "edit"
      user_status: "active" | "inactive" | "suspended" | "pending_verification"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      audit_event_type: [
        "authentication",
        "authorization",
        "data_access",
        "data_modification",
        "system_event",
        "security_event",
      ],
      permission_action: [
        "create",
        "read",
        "update",
        "delete",
        "manage",
        "view",
        "edit",
      ],
      user_status: ["active", "inactive", "suspended", "pending_verification"],
    },
  },
} as const
