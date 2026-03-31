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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_usage_logs: {
        Row: {
          action_type: string
          analysis_id: string | null
          audio_seconds: number | null
          created_at: string
          empresa_id: string | null
          error_message: string | null
          estimated_cost_usd: number | null
          id: string
          input_tokens: number | null
          metadata: Json | null
          model: string
          output_tokens: number | null
          provider: string
          status: string
          training_id: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          analysis_id?: string | null
          audio_seconds?: number | null
          created_at?: string
          empresa_id?: string | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model: string
          output_tokens?: number | null
          provider: string
          status?: string
          training_id?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          analysis_id?: string | null
          audio_seconds?: number | null
          created_at?: string
          empresa_id?: string | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model?: string
          output_tokens?: number | null
          provider?: string
          status?: string
          training_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      analyses: {
        Row: {
          aida_acao: Json | null
          aida_atencao: Json | null
          aida_desejo: Json | null
          aida_interesse: Json | null
          aida_objecao: Json | null
          audio_urls: string[] | null
          canal: string
          capacidade_percebida: number | null
          carteira: string
          categoria_erro: string | null
          categoria_objecao: string | null
          chance_pagamento: number | null
          conformidade: string | null
          created_at: string
          custo_estimado: number | null
          duracao_audio_total: number | null
          empresa_id: string
          erro_principal: string | null
          feedback_diagnostico: string | null
          feedback_exemplo: string | null
          feedback_exercicio: string | null
          feedback_orientacao: string | null
          firmeza_compromisso: number | null
          id: string
          intencao_cliente: number | null
          justificativa_conformidade: string | null
          marcacoes_transcricao: Json | null
          mensagem_ideal: string | null
          modelo_usado: string | null
          nivel_habilidade: string | null
          nota_qa: number | null
          objecao: string | null
          operador: string
          oportunidades_fechamento_perdidas: number
          pontos_fortes: string[] | null
          pontos_melhorar: string[] | null
          resumo: string | null
          risco_quebra: number | null
          score: number | null
          sugestoes: string[] | null
          tecnica_usada: string | null
          tempo_resposta: number | null
          tokens_prompt: number | null
          tokens_resposta: number | null
          tokens_total: number | null
          tom_operador: string | null
          transcricao: string | null
          user_id: string
        }
        Insert: {
          aida_acao?: Json | null
          aida_atencao?: Json | null
          aida_desejo?: Json | null
          aida_interesse?: Json | null
          aida_objecao?: Json | null
          audio_urls?: string[] | null
          canal: string
          capacidade_percebida?: number | null
          carteira: string
          categoria_erro?: string | null
          categoria_objecao?: string | null
          chance_pagamento?: number | null
          conformidade?: string | null
          created_at?: string
          custo_estimado?: number | null
          duracao_audio_total?: number | null
          empresa_id: string
          erro_principal?: string | null
          feedback_diagnostico?: string | null
          feedback_exemplo?: string | null
          feedback_exercicio?: string | null
          feedback_orientacao?: string | null
          firmeza_compromisso?: number | null
          id?: string
          intencao_cliente?: number | null
          justificativa_conformidade?: string | null
          marcacoes_transcricao?: Json | null
          mensagem_ideal?: string | null
          modelo_usado?: string | null
          nivel_habilidade?: string | null
          nota_qa?: number | null
          objecao?: string | null
          operador: string
          oportunidades_fechamento_perdidas?: number
          pontos_fortes?: string[] | null
          pontos_melhorar?: string[] | null
          resumo?: string | null
          risco_quebra?: number | null
          score?: number | null
          sugestoes?: string[] | null
          tecnica_usada?: string | null
          tempo_resposta?: number | null
          tokens_prompt?: number | null
          tokens_resposta?: number | null
          tokens_total?: number | null
          tom_operador?: string | null
          transcricao?: string | null
          user_id: string
        }
        Update: {
          aida_acao?: Json | null
          aida_atencao?: Json | null
          aida_desejo?: Json | null
          aida_interesse?: Json | null
          aida_objecao?: Json | null
          audio_urls?: string[] | null
          canal?: string
          capacidade_percebida?: number | null
          carteira?: string
          categoria_erro?: string | null
          categoria_objecao?: string | null
          chance_pagamento?: number | null
          conformidade?: string | null
          created_at?: string
          custo_estimado?: number | null
          duracao_audio_total?: number | null
          empresa_id?: string
          erro_principal?: string | null
          feedback_diagnostico?: string | null
          feedback_exemplo?: string | null
          feedback_exercicio?: string | null
          feedback_orientacao?: string | null
          firmeza_compromisso?: number | null
          id?: string
          intencao_cliente?: number | null
          justificativa_conformidade?: string | null
          marcacoes_transcricao?: Json | null
          mensagem_ideal?: string | null
          modelo_usado?: string | null
          nivel_habilidade?: string | null
          nota_qa?: number | null
          objecao?: string | null
          operador?: string
          oportunidades_fechamento_perdidas?: number
          pontos_fortes?: string[] | null
          pontos_melhorar?: string[] | null
          resumo?: string | null
          risco_quebra?: number | null
          score?: number | null
          sugestoes?: string[] | null
          tecnica_usada?: string | null
          tempo_resposta?: number | null
          tokens_prompt?: number | null
          tokens_resposta?: number | null
          tokens_total?: number | null
          tom_operador?: string | null
          transcricao?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_reanalyses: {
        Row: {
          analysis_id: string
          created_at: string
          custo_estimado: number | null
          id: string
          mode: string
          model: string
          provider: string
          tempo_resposta: number | null
          tokens_prompt: number | null
          tokens_resposta: number | null
          user_id: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          custo_estimado?: number | null
          id?: string
          mode?: string
          model: string
          provider: string
          tempo_resposta?: number | null
          tokens_prompt?: number | null
          tokens_resposta?: number | null
          user_id: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          custo_estimado?: number | null
          id?: string
          mode?: string
          model?: string
          provider?: string
          tempo_resposta?: number | null
          tokens_prompt?: number | null
          tokens_resposta?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_reanalyses_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          nome_empresa: string
          plano: string
          slug: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome_empresa: string
          plano?: string
          slug?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome_empresa?: string
          plano?: string
          slug?: string | null
          status?: string
        }
        Relationships: []
      }
      company_carteiras: {
        Row: {
          comissao_recebida_periodo: number | null
          created_at: string
          created_by: string | null
          empresa_id: string
          id: string
          nome: string
          periodo_referencia: string | null
          quantidade_pagamentos_periodo: number | null
          status: string
        }
        Insert: {
          comissao_recebida_periodo?: number | null
          created_at?: string
          created_by?: string | null
          empresa_id: string
          id?: string
          nome: string
          periodo_referencia?: string | null
          quantidade_pagamentos_periodo?: number | null
          status?: string
        }
        Update: {
          comissao_recebida_periodo?: number | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          periodo_referencia?: string | null
          quantidade_pagamentos_periodo?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_carteiras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_memberships: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_cycles: {
        Row: {
          analysis_ids: string[]
          avaliacao_evolucao: string | null
          avaliacao_geral: string | null
          chance_media_pagamento: number | null
          ciclo_numero: number
          comparacao_com_ciclo_anterior: Json | null
          created_at: string
          data_fim: string | null
          data_inicio: string
          empresa_id: string
          id: string
          numero_negociacoes: number
          operador: string
          padrao_tom: string | null
          plano_desenvolvimento: string | null
          pontos_de_melhoria: string[] | null
          pontos_fortes_recorrentes: string[] | null
          principais_erros: string[] | null
          principais_objecoes: string[] | null
          risco_medio_quebra: number | null
          score_medio: number | null
          status: string
        }
        Insert: {
          analysis_ids?: string[]
          avaliacao_evolucao?: string | null
          avaliacao_geral?: string | null
          chance_media_pagamento?: number | null
          ciclo_numero?: number
          comparacao_com_ciclo_anterior?: Json | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          empresa_id: string
          id?: string
          numero_negociacoes?: number
          operador: string
          padrao_tom?: string | null
          plano_desenvolvimento?: string | null
          pontos_de_melhoria?: string[] | null
          pontos_fortes_recorrentes?: string[] | null
          principais_erros?: string[] | null
          principais_objecoes?: string[] | null
          risco_medio_quebra?: number | null
          score_medio?: number | null
          status?: string
        }
        Update: {
          analysis_ids?: string[]
          avaliacao_evolucao?: string | null
          avaliacao_geral?: string | null
          chance_media_pagamento?: number | null
          ciclo_numero?: number
          comparacao_com_ciclo_anterior?: Json | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          empresa_id?: string
          id?: string
          numero_negociacoes?: number
          operador?: string
          padrao_tom?: string | null
          plano_desenvolvimento?: string | null
          pontos_de_melhoria?: string[] | null
          pontos_fortes_recorrentes?: string[] | null
          principais_erros?: string[] | null
          principais_objecoes?: string[] | null
          risco_medio_quebra?: number | null
          score_medio?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_cycles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_name_mappings: {
        Row: {
          carteira: string | null
          created_at: string
          created_by: string
          empresa_id: string
          id: string
          nome_arquivo: string
          operador_cobramind: string
        }
        Insert: {
          carteira?: string | null
          created_at?: string
          created_by: string
          empresa_id: string
          id?: string
          nome_arquivo: string
          operador_cobramind: string
        }
        Update: {
          carteira?: string | null
          created_at?: string
          created_by?: string
          empresa_id?: string
          id?: string
          nome_arquivo?: string
          operador_cobramind?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_name_mappings_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          carteira: string
          created_at: string
          created_by: string | null
          empresa_id: string
          id: string
          nome: string
          periodo_referencia: string | null
          status: string
          valor_pago_periodo: number | null
        }
        Insert: {
          carteira: string
          created_at?: string
          created_by?: string | null
          empresa_id: string
          id?: string
          nome: string
          periodo_referencia?: string | null
          status?: string
          valor_pago_periodo?: number | null
        }
        Update: {
          carteira?: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          periodo_referencia?: string | null
          status?: string
          valor_pago_periodo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "operators_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_negotiation_rules: {
        Row: {
          approach_objective: string | null
          can_close_on_first_contact: boolean
          can_confirm_payment_date: boolean
          can_discuss_reactivation: boolean
          can_generate_boleto: boolean
          can_offer_discount: boolean
          can_offer_installments: boolean
          can_promise_plan_maintenance: boolean
          carteira: string
          created_at: string
          created_by: string | null
          empresa_id: string
          evaluation_criteria: Json | null
          exclude_from_score_conditions: string | null
          forbidden_terms: string | null
          id: string
          is_active: boolean
          mandatory_guidelines: string | null
          negotiation_possible_conditions: string | null
          non_negotiable_cases: string | null
          observations: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approach_objective?: string | null
          can_close_on_first_contact?: boolean
          can_confirm_payment_date?: boolean
          can_discuss_reactivation?: boolean
          can_generate_boleto?: boolean
          can_offer_discount?: boolean
          can_offer_installments?: boolean
          can_promise_plan_maintenance?: boolean
          carteira: string
          created_at?: string
          created_by?: string | null
          empresa_id: string
          evaluation_criteria?: Json | null
          exclude_from_score_conditions?: string | null
          forbidden_terms?: string | null
          id?: string
          is_active?: boolean
          mandatory_guidelines?: string | null
          negotiation_possible_conditions?: string | null
          non_negotiable_cases?: string | null
          observations?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approach_objective?: string | null
          can_close_on_first_contact?: boolean
          can_confirm_payment_date?: boolean
          can_discuss_reactivation?: boolean
          can_generate_boleto?: boolean
          can_offer_discount?: boolean
          can_offer_installments?: boolean
          can_promise_plan_maintenance?: boolean
          carteira?: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          evaluation_criteria?: Json | null
          exclude_from_score_conditions?: string | null
          forbidden_terms?: string | null
          id?: string
          is_active?: boolean
          mandatory_guidelines?: string | null
          negotiation_possible_conditions?: string | null
          non_negotiable_cases?: string | null
          observations?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_negotiation_rules_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          empresa_id: string | null
          id: string
          nome: string
          onboarding_completed: boolean
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          empresa_id?: string | null
          id: string
          nome?: string
          onboarding_completed?: boolean
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          empresa_id?: string | null
          id?: string
          nome?: string
          onboarding_completed?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          acerto_decisao: boolean | null
          acerto_interpretacao: boolean | null
          analysis_id: string
          auto_analysis_hash: string | null
          auto_analysis_ids: string[] | null
          avaliacao_ia: Json | null
          carteira: string
          coerencia: string | null
          created_at: string
          empresa_id: string
          entendimento: string | null
          expires_at: string
          id: string
          nivel_aprendizado: string | null
          nota_final: number | null
          operador: string
          origem: Database["public"]["Enums"]["training_origem"]
          qualidade_resposta: string | null
          reflexao_operador: string | null
          responded_at: string | null
          resposta_decisao: string | null
          resposta_interpretacao: string | null
          resposta_operador: string | null
          status: string
          supervisor_id: string
          supervisor_nome: string
          token: string
          training_content: Json
        }
        Insert: {
          acerto_decisao?: boolean | null
          acerto_interpretacao?: boolean | null
          analysis_id: string
          auto_analysis_hash?: string | null
          auto_analysis_ids?: string[] | null
          avaliacao_ia?: Json | null
          carteira?: string
          coerencia?: string | null
          created_at?: string
          empresa_id: string
          entendimento?: string | null
          expires_at?: string
          id?: string
          nivel_aprendizado?: string | null
          nota_final?: number | null
          operador: string
          origem?: Database["public"]["Enums"]["training_origem"]
          qualidade_resposta?: string | null
          reflexao_operador?: string | null
          responded_at?: string | null
          resposta_decisao?: string | null
          resposta_interpretacao?: string | null
          resposta_operador?: string | null
          status?: string
          supervisor_id: string
          supervisor_nome?: string
          token?: string
          training_content: Json
        }
        Update: {
          acerto_decisao?: boolean | null
          acerto_interpretacao?: boolean | null
          analysis_id?: string
          auto_analysis_hash?: string | null
          auto_analysis_ids?: string[] | null
          avaliacao_ia?: Json | null
          carteira?: string
          coerencia?: string | null
          created_at?: string
          empresa_id?: string
          entendimento?: string | null
          expires_at?: string
          id?: string
          nivel_aprendizado?: string | null
          nota_final?: number | null
          operador?: string
          origem?: Database["public"]["Enums"]["training_origem"]
          qualidade_resposta?: string | null
          reflexao_operador?: string | null
          responded_at?: string | null
          resposta_decisao?: string | null
          resposta_interpretacao?: string | null
          resposta_operador?: string | null
          status?: string
          supervisor_id?: string
          supervisor_nome?: string
          token?: string
          training_content?: Json
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_portfolios: {
        Row: {
          carteira: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          carteira: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          carteira?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          analysis_ids: string[]
          avaliacao_geral: string | null
          chance_pagamento_media: number | null
          classificacao_evolucao: string | null
          comparacao_com_semana_anterior: Json | null
          created_at: string
          data_fim_semana: string
          data_inicio_semana: string
          empresa_id: string
          id: string
          numero_negociacoes: number
          operador: string
          padrao_tom: string | null
          plano_desenvolvimento: string | null
          pontos_de_melhoria: string[] | null
          pontos_fortes_recorrentes: string[] | null
          principais_erros: string[] | null
          principais_objecoes: string[] | null
          risco_quebra_medio: number | null
          score_medio: number | null
          semana_numero: number
          status: string
        }
        Insert: {
          analysis_ids?: string[]
          avaliacao_geral?: string | null
          chance_pagamento_media?: number | null
          classificacao_evolucao?: string | null
          comparacao_com_semana_anterior?: Json | null
          created_at?: string
          data_fim_semana: string
          data_inicio_semana: string
          empresa_id: string
          id?: string
          numero_negociacoes?: number
          operador: string
          padrao_tom?: string | null
          plano_desenvolvimento?: string | null
          pontos_de_melhoria?: string[] | null
          pontos_fortes_recorrentes?: string[] | null
          principais_erros?: string[] | null
          principais_objecoes?: string[] | null
          risco_quebra_medio?: number | null
          score_medio?: number | null
          semana_numero?: number
          status?: string
        }
        Update: {
          analysis_ids?: string[]
          avaliacao_geral?: string | null
          chance_pagamento_media?: number | null
          classificacao_evolucao?: string | null
          comparacao_com_semana_anterior?: Json | null
          created_at?: string
          data_fim_semana?: string
          data_inicio_semana?: string
          empresa_id?: string
          id?: string
          numero_negociacoes?: number
          operador?: string
          padrao_tom?: string | null
          plano_desenvolvimento?: string | null
          pontos_de_melhoria?: string[] | null
          pontos_fortes_recorrentes?: string[] | null
          principais_erros?: string[] | null
          principais_objecoes?: string[] | null
          risco_quebra_medio?: number | null
          score_medio?: number | null
          semana_numero?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reports_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_onboarding: {
        Args: { _nome_empresa: string }
        Returns: undefined
      }
      get_training_by_token: {
        Args: { p_token: string }
        Returns: {
          avaliacao_ia: Json
          carteira: string
          expires_at: string
          id: string
          operador: string
          origem: Database["public"]["Enums"]["training_origem"]
          reflexao_operador: string
          resposta_decisao: string
          resposta_interpretacao: string
          resposta_operador: string
          status: string
          supervisor_nome: string
          token: string
          training_content: Json
        }[]
      }
      get_user_companies: { Args: { _user_id: string }; Returns: string[] }
      get_user_empresa_id: { Args: { _user_id: string }; Returns: string }
      get_user_role_in_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_coordinator: { Args: { _user_id: string }; Returns: boolean }
      set_onboarding_role: {
        Args: { _role?: Database["public"]["Enums"]["app_role"] }
        Returns: undefined
      }
      user_belongs_to_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_carteira_access: {
        Args: { _carteira: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "supervisor" | "gestor" | "founder"
      training_origem: "manual" | "automatico" | "pontual" | "completo"
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
      app_role: ["admin", "supervisor", "gestor", "founder"],
      training_origem: ["manual", "automatico", "pontual", "completo"],
    },
  },
} as const
