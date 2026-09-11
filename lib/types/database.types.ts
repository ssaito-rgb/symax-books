export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chart_of_accounts: {
        Row: {
          category: string
          code: string
          created_at: string
          default_tax_category_code: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          normal_balance: string
          requires_counterparty: boolean
          subcategory: string | null
          updated_at: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          default_tax_category_code?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          normal_balance: string
          requires_counterparty?: boolean
          subcategory?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          default_tax_category_code?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          normal_balance?: string
          requires_counterparty?: boolean
          subcategory?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_default_tax_category_code_fkey"
            columns: ["default_tax_category_code"]
            isOneToOne: false
            referencedRelation: "tax_categories"
            referencedColumns: ["code"]
          },
        ]
      }
      counterparties: {
        Row: {
          created_at: string
          id: string
          invoice_registration_number: string | null
          is_qualified_invoice_issuer: boolean | null
          kana: string | null
          name: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_registration_number?: string | null
          is_qualified_invoice_issuer?: boolean | null
          kana?: string | null
          name: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          invoice_registration_number?: string | null
          is_qualified_invoice_issuer?: boolean | null
          kana?: string | null
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
      depreciation_schedule_lines: {
        Row: {
          accumulated_depreciation: number
          book_value_end: number
          created_at: string
          depreciation_amount: number
          fiscal_year_id: string
          fixed_asset_id: string
          id: string
          journal_entry_id: string | null
        }
        Insert: {
          accumulated_depreciation: number
          book_value_end: number
          created_at?: string
          depreciation_amount: number
          fiscal_year_id: string
          fixed_asset_id: string
          id?: string
          journal_entry_id?: string | null
        }
        Update: {
          accumulated_depreciation?: number
          book_value_end?: number
          created_at?: string
          depreciation_amount?: number
          fiscal_year_id?: string
          fixed_asset_id?: string
          id?: string
          journal_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "depreciation_schedule_lines_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depreciation_schedule_lines_fixed_asset_id_fkey"
            columns: ["fixed_asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depreciation_schedule_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_years: {
        Row: {
          closed_at: string | null
          created_at: string
          end_date: string
          id: string
          is_closed: boolean
          label: string
          start_date: string
          tax_status: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          end_date: string
          id?: string
          is_closed?: boolean
          label: string
          start_date: string
          tax_status?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          end_date?: string
          id?: string
          is_closed?: boolean
          label?: string
          start_date?: string
          tax_status?: string
        }
        Relationships: []
      }
      fixed_assets: {
        Row: {
          account_id: string
          acquisition_cost: number
          acquisition_date: string
          asset_class_code: string | null
          created_at: string
          depreciation_method: string | null
          disposal_amount: number | null
          disposal_date: string | null
          evidence_url: string | null
          id: string
          is_small_amount_depreciable: boolean | null
          name: string
          notes: string | null
          salvage_value: number | null
          useful_life_years: number | null
        }
        Insert: {
          account_id: string
          acquisition_cost: number
          acquisition_date: string
          asset_class_code?: string | null
          created_at?: string
          depreciation_method?: string | null
          disposal_amount?: number | null
          disposal_date?: string | null
          evidence_url?: string | null
          id?: string
          is_small_amount_depreciable?: boolean | null
          name: string
          notes?: string | null
          salvage_value?: number | null
          useful_life_years?: number | null
        }
        Update: {
          account_id?: string
          acquisition_cost?: number
          acquisition_date?: string
          asset_class_code?: string | null
          created_at?: string
          depreciation_method?: string | null
          disposal_amount?: number | null
          disposal_date?: string | null
          evidence_url?: string | null
          id?: string
          is_small_amount_depreciable?: boolean | null
          name?: string
          notes?: string | null
          salvage_value?: number | null
          useful_life_years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fixed_assets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      google_oauth_tokens: {
        Row: {
          created_at: string
          id: string
          refresh_token: string
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          refresh_token: string
          scope: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          refresh_token?: string
          scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          entry_date: string
          entry_number: string
          evidence_url: string | null
          fiscal_year_id: string
          id: string
          is_voided: boolean
          reversed_by_entry_id: string | null
          reverses_entry_id: string | null
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date: string
          entry_number: string
          evidence_url?: string | null
          fiscal_year_id: string
          id?: string
          is_voided?: boolean
          reversed_by_entry_id?: string | null
          reverses_entry_id?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_number?: string
          evidence_url?: string | null
          fiscal_year_id?: string
          id?: string
          is_voided?: boolean
          reversed_by_entry_id?: string | null
          reverses_entry_id?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reversed_by_entry_id_fkey"
            columns: ["reversed_by_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reverses_entry_id_fkey"
            columns: ["reverses_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          counterparty_id: string | null
          created_at: string
          credit_amount: number
          debit_amount: number
          description: string | null
          entry_id: string
          evidence_url: string | null
          id: string
          line_no: number
          tax_amount: number | null
          tax_category_code: string | null
        }
        Insert: {
          account_id: string
          counterparty_id?: string | null
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          description?: string | null
          entry_id: string
          evidence_url?: string | null
          id?: string
          line_no: number
          tax_amount?: number | null
          tax_category_code?: string | null
        }
        Update: {
          account_id?: string
          counterparty_id?: string | null
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          description?: string | null
          entry_id?: string
          evidence_url?: string | null
          id?: string
          line_no?: number
          tax_amount?: number | null
          tax_category_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_tax_category_code_fkey"
            columns: ["tax_category_code"]
            isOneToOne: false
            referencedRelation: "tax_categories"
            referencedColumns: ["code"]
          },
        ]
      }
      tax_adjustments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          direction: string
          fiscal_year_id: string
          id: string
          item_name: string
          notes: string | null
          related_account_id: string | null
          related_journal_entry_id: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          direction: string
          fiscal_year_id: string
          id?: string
          item_name: string
          notes?: string | null
          related_account_id?: string | null
          related_journal_entry_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          direction?: string
          fiscal_year_id?: string
          id?: string
          item_name?: string
          notes?: string | null
          related_account_id?: string | null
          related_journal_entry_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_adjustments_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_adjustments_related_account_id_fkey"
            columns: ["related_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_adjustments_related_journal_entry_id_fkey"
            columns: ["related_journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_categories: {
        Row: {
          code: string
          direction: string
          is_active: boolean
          name: string
          rate: number
        }
        Insert: {
          code: string
          direction: string
          is_active?: boolean
          name: string
          rate?: number
        }
        Update: {
          code?: string
          direction?: string
          is_active?: boolean
          name?: string
          rate?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_journal_entry: {
        Args: { header: Json; lines: Json }
        Returns: string
      }
      void_journal_entry: {
        Args: { p_entry_id: string; p_new_entry_number: string }
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
