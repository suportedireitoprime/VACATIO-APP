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
      admin_alertas: {
        Row: {
          created_at: string
          erro: string | null
          id: string
          payload: Json
          sent_at: string | null
          status: string
          tipo: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          erro?: string | null
          id?: string
          payload?: Json
          sent_at?: string | null
          status?: string
          tipo: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          erro?: string | null
          id?: string
          payload?: Json
          sent_at?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      agenda_eventos: {
        Row: {
          checklist: Json | null
          concluido: boolean
          cor: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          id: string
          tipo: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checklist?: Json | null
          concluido?: boolean
          cor?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          descricao?: string | null
          id?: string
          tipo?: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checklist?: Json | null
          concluido?: boolean
          cor?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          id?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          cost_usd: number
          created_at: string
          duration_ms: number | null
          error: string | null
          function_name: string
          id: string
          input_units: number
          kind: string
          model: string
          output_units: number
          ref_id: string | null
          success: boolean
          trigger_type: string
          user_id: string | null
        }
        Insert: {
          cost_usd?: number
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          function_name: string
          id?: string
          input_units?: number
          kind: string
          model: string
          output_units?: number
          ref_id?: string | null
          success?: boolean
          trigger_type?: string
          user_id?: string | null
        }
        Update: {
          cost_usd?: number
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          function_name?: string
          id?: string
          input_units?: number
          kind?: string
          model?: string
          output_units?: number
          ref_id?: string | null
          success?: boolean
          trigger_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_events: {
        Row: {
          created_at: string
          email: string | null
          event_name: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_name: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          event_name?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_feedback: {
        Row: {
          comentario: string
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_premium: boolean
          photo_url: string | null
          platform: string | null
          tag: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          comentario: string
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_premium?: boolean
          photo_url?: string | null
          platform?: string | null
          tag?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          comentario?: string
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_premium?: boolean
          photo_url?: string | null
          platform?: string | null
          tag?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      apple_csr_storage: {
        Row: {
          app_store_connect_issuer_id: string | null
          app_store_connect_key_id: string | null
          app_store_connect_p8_base64: string | null
          common_name: string
          country: string
          created_at: string
          csr_pem: string
          email: string
          id: string
          key_pem: string
          p12_base64: string | null
          p12_password: string | null
          p12_updated_at: string | null
          provisioning_profile_base64: string | null
          provisioning_profile_updated_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_store_connect_issuer_id?: string | null
          app_store_connect_key_id?: string | null
          app_store_connect_p8_base64?: string | null
          common_name: string
          country?: string
          created_at?: string
          csr_pem: string
          email: string
          id?: string
          key_pem: string
          p12_base64?: string | null
          p12_password?: string | null
          p12_updated_at?: string | null
          provisioning_profile_base64?: string | null
          provisioning_profile_updated_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_store_connect_issuer_id?: string | null
          app_store_connect_key_id?: string | null
          app_store_connect_p8_base64?: string | null
          common_name?: string
          country?: string
          created_at?: string
          csr_pem?: string
          email?: string
          id?: string
          key_pem?: string
          p12_base64?: string | null
          p12_password?: string | null
          p12_updated_at?: string | null
          provisioning_profile_base64?: string | null
          provisioning_profile_updated_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      apple_subscriptions: {
        Row: {
          auto_renewing: boolean
          bundle_id: string | null
          cancel_reason: string | null
          created_at: string
          environment: string | null
          expires_at: string | null
          id: string
          latest_notification_at: string | null
          latest_notification_subtype: string | null
          latest_notification_type: string | null
          latest_transaction_id: string | null
          original_transaction_id: string
          product_id: string
          raw_payload: Json | null
          start_time: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renewing?: boolean
          bundle_id?: string | null
          cancel_reason?: string | null
          created_at?: string
          environment?: string | null
          expires_at?: string | null
          id?: string
          latest_notification_at?: string | null
          latest_notification_subtype?: string | null
          latest_notification_type?: string | null
          latest_transaction_id?: string | null
          original_transaction_id: string
          product_id: string
          raw_payload?: Json | null
          start_time?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renewing?: boolean
          bundle_id?: string | null
          cancel_reason?: string | null
          created_at?: string
          environment?: string | null
          expires_at?: string | null
          id?: string
          latest_notification_at?: string | null
          latest_notification_subtype?: string | null
          latest_notification_type?: string | null
          latest_transaction_id?: string | null
          original_transaction_id?: string
          product_id?: string
          raw_payload?: Json | null
          start_time?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      aprender_areas: {
        Row: {
          cor: string | null
          created_at: string
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          ordem: number
          slug: string
          updated_at: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          ordem?: number
          slug: string
          updated_at?: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      aprender_aulas: {
        Row: {
          capitulo_ref: Json | null
          created_at: string
          duracao_est_min: number
          fontes_web: Json | null
          gerada_em: string | null
          id: string
          livro_origem_id: string | null
          modelo_ia: string | null
          modulo_id: string
          objetivo: string | null
          ordem: number
          resumo_origem_id: string | null
          slug: string
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          capitulo_ref?: Json | null
          created_at?: string
          duracao_est_min?: number
          fontes_web?: Json | null
          gerada_em?: string | null
          id?: string
          livro_origem_id?: string | null
          modelo_ia?: string | null
          modulo_id: string
          objetivo?: string | null
          ordem?: number
          resumo_origem_id?: string | null
          slug: string
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          capitulo_ref?: Json | null
          created_at?: string
          duracao_est_min?: number
          fontes_web?: Json | null
          gerada_em?: string | null
          id?: string
          livro_origem_id?: string | null
          modelo_ia?: string | null
          modulo_id?: string
          objetivo?: string | null
          ordem?: number
          resumo_origem_id?: string | null
          slug?: string
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aprender_aulas_livro_origem_id_fkey"
            columns: ["livro_origem_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_leitura_nativa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aprender_aulas_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "aprender_modulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aprender_aulas_resumo_origem_id_fkey"
            columns: ["resumo_origem_id"]
            isOneToOne: false
            referencedRelation: "resumos_juridicos"
            referencedColumns: ["id"]
          },
        ]
      }
      aprender_blocos: {
        Row: {
          aula_id: string
          created_at: string
          id: string
          markdown: string | null
          ordem: number
          payload: Json
          resposta_correta: Json | null
          tipo: string
        }
        Insert: {
          aula_id: string
          created_at?: string
          id?: string
          markdown?: string | null
          ordem: number
          payload?: Json
          resposta_correta?: Json | null
          tipo: string
        }
        Update: {
          aula_id?: string
          created_at?: string
          id?: string
          markdown?: string | null
          ordem?: number
          payload?: Json
          resposta_correta?: Json | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "aprender_blocos_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aprender_aulas"
            referencedColumns: ["id"]
          },
        ]
      }
      aprender_dominio_area: {
        Row: {
          area_id: string
          atualizado_em: string
          id: string
          score: number
          user_id: string
        }
        Insert: {
          area_id: string
          atualizado_em?: string
          id?: string
          score?: number
          user_id: string
        }
        Update: {
          area_id?: string
          atualizado_em?: string
          id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aprender_dominio_area_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "aprender_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      aprender_livro_pesquisa_cache: {
        Row: {
          created_at: string
          expires_at: string
          fonte: string | null
          id: string
          query: string
          query_hash: string
          resultado: Json
        }
        Insert: {
          created_at?: string
          expires_at?: string
          fonte?: string | null
          id?: string
          query: string
          query_hash: string
          resultado: Json
        }
        Update: {
          created_at?: string
          expires_at?: string
          fonte?: string | null
          id?: string
          query?: string
          query_hash?: string
          resultado?: Json
        }
        Relationships: []
      }
      aprender_modulos: {
        Row: {
          area_id: string
          created_at: string
          id: string
          ordem: number
          resumo: string | null
          slug: string
          titulo: string
          updated_at: string
        }
        Insert: {
          area_id: string
          created_at?: string
          id?: string
          ordem?: number
          resumo?: string | null
          slug: string
          titulo: string
          updated_at?: string
        }
        Update: {
          area_id?: string
          created_at?: string
          id?: string
          ordem?: number
          resumo?: string | null
          slug?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aprender_modulos_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "aprender_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      aprender_progresso_aula: {
        Row: {
          acertos: number
          aula_id: string
          blocos_concluidos: number
          concluida_em: string | null
          id: string
          tempo_ms: number
          total_perguntas: number
          updated_at: string
          user_id: string
        }
        Insert: {
          acertos?: number
          aula_id: string
          blocos_concluidos?: number
          concluida_em?: string | null
          id?: string
          tempo_ms?: number
          total_perguntas?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          acertos?: number
          aula_id?: string
          blocos_concluidos?: number
          concluida_em?: string | null
          id?: string
          tempo_ms?: number
          total_perguntas?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aprender_progresso_aula_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aprender_aulas"
            referencedColumns: ["id"]
          },
        ]
      }
      aprender_progresso_bloco: {
        Row: {
          acertou: boolean | null
          bloco_id: string
          id: string
          proxima_revisao_em: string | null
          resposta: Json | null
          tentativas: number
          updated_at: string
          user_id: string
        }
        Insert: {
          acertou?: boolean | null
          bloco_id: string
          id?: string
          proxima_revisao_em?: string | null
          resposta?: Json | null
          tentativas?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          acertou?: boolean | null
          bloco_id?: string
          id?: string
          proxima_revisao_em?: string | null
          resposta?: Json | null
          tentativas?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aprender_progresso_bloco_bloco_id_fkey"
            columns: ["bloco_id"]
            isOneToOne: false
            referencedRelation: "aprender_blocos"
            referencedColumns: ["id"]
          },
        ]
      }
      aprender_sumario_sugerido: {
        Row: {
          aprovado: boolean
          area_id: string | null
          aula_id: string | null
          capitulo_ref: Json | null
          created_at: string
          id: string
          livro_id: string
          ordem: number
          resumo_capitulo: string | null
          titulo_melhorado: string
          titulo_original: string | null
          updated_at: string
        }
        Insert: {
          aprovado?: boolean
          area_id?: string | null
          aula_id?: string | null
          capitulo_ref?: Json | null
          created_at?: string
          id?: string
          livro_id: string
          ordem?: number
          resumo_capitulo?: string | null
          titulo_melhorado: string
          titulo_original?: string | null
          updated_at?: string
        }
        Update: {
          aprovado?: boolean
          area_id?: string | null
          aula_id?: string | null
          capitulo_ref?: Json | null
          created_at?: string
          id?: string
          livro_id?: string
          ordem?: number
          resumo_capitulo?: string | null
          titulo_melhorado?: string
          titulo_original?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aprender_sumario_sugerido_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "aprender_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aprender_sumario_sugerido_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aprender_aulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aprender_sumario_sugerido_livro_id_fkey"
            columns: ["livro_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_leitura_nativa"
            referencedColumns: ["id"]
          },
        ]
      }
      aprender_tema_respostas: {
        Row: {
          acertou: boolean
          bloco_id: string
          escolha: string | null
          id: string
          respondida_em: string
          tema_id: string
          user_id: string
        }
        Insert: {
          acertou: boolean
          bloco_id: string
          escolha?: string | null
          id?: string
          respondida_em?: string
          tema_id: string
          user_id: string
        }
        Update: {
          acertou?: boolean
          bloco_id?: string
          escolha?: string | null
          id?: string
          respondida_em?: string
          tema_id?: string
          user_id?: string
        }
        Relationships: []
      }
      apresentacao_comentarios: {
        Row: {
          apresentacao_id: string
          created_at: string
          id: string
          texto: string
          updated_at: string
          user_id: string
        }
        Insert: {
          apresentacao_id: string
          created_at?: string
          id?: string
          texto: string
          updated_at?: string
          user_id: string
        }
        Update: {
          apresentacao_id?: string
          created_at?: string
          id?: string
          texto?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apresentacao_comentarios_apresentacao_id_fkey"
            columns: ["apresentacao_id"]
            isOneToOne: false
            referencedRelation: "apresentacoes_narradas"
            referencedColumns: ["id"]
          },
        ]
      }
      apresentacao_favoritos: {
        Row: {
          apresentacao_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          apresentacao_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          apresentacao_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apresentacao_favoritos_apresentacao_id_fkey"
            columns: ["apresentacao_id"]
            isOneToOne: false
            referencedRelation: "apresentacoes_narradas"
            referencedColumns: ["id"]
          },
        ]
      }
      apresentacao_likes: {
        Row: {
          apresentacao_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          apresentacao_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          apresentacao_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apresentacao_likes_apresentacao_id_fkey"
            columns: ["apresentacao_id"]
            isOneToOne: false
            referencedRelation: "apresentacoes_narradas"
            referencedColumns: ["id"]
          },
        ]
      }
      apresentacao_slides: {
        Row: {
          apresentacao_id: string
          audio_path: string | null
          audio_url: string | null
          created_at: string
          duracao_segundos: number | null
          erro: string | null
          id: string
          imagem_path: string | null
          imagem_url: string | null
          roteiro: string | null
          slide_index: number
          status: string
          texto_extraido: string | null
          updated_at: string
        }
        Insert: {
          apresentacao_id: string
          audio_path?: string | null
          audio_url?: string | null
          created_at?: string
          duracao_segundos?: number | null
          erro?: string | null
          id?: string
          imagem_path?: string | null
          imagem_url?: string | null
          roteiro?: string | null
          slide_index: number
          status?: string
          texto_extraido?: string | null
          updated_at?: string
        }
        Update: {
          apresentacao_id?: string
          audio_path?: string | null
          audio_url?: string | null
          created_at?: string
          duracao_segundos?: number | null
          erro?: string | null
          id?: string
          imagem_path?: string | null
          imagem_url?: string | null
          roteiro?: string | null
          slide_index?: number
          status?: string
          texto_extraido?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apresentacao_slides_apresentacao_id_fkey"
            columns: ["apresentacao_id"]
            isOneToOne: false
            referencedRelation: "apresentacoes_narradas"
            referencedColumns: ["id"]
          },
        ]
      }
      apresentacoes_narradas: {
        Row: {
          capa_url: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          livro_id: string
          livro_tabela: string
          publicada: boolean
          status: string
          titulo: string
          total_slides: number
          updated_at: string
          voz: string
        }
        Insert: {
          capa_url?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          livro_id: string
          livro_tabela: string
          publicada?: boolean
          status?: string
          titulo: string
          total_slides?: number
          updated_at?: string
          voz?: string
        }
        Update: {
          capa_url?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          livro_id?: string
          livro_tabela?: string
          publicada?: boolean
          status?: string
          titulo?: string
          total_slides?: number
          updated_at?: string
          voz?: string
        }
        Relationships: []
      }
      article_time_reminders: {
        Row: {
          active: boolean
          artigo_ref: string
          artigo_titulo: string
          channel: string
          created_at: string
          days_of_week: number[]
          id: string
          label: string
          last_fired_at: string | null
          message: string
          next_fire_at: string | null
          time_of_day: string
          timezone: string
          triggered_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          artigo_ref: string
          artigo_titulo: string
          channel?: string
          created_at?: string
          days_of_week?: number[]
          id?: string
          label: string
          last_fired_at?: string | null
          message?: string
          next_fire_at?: string | null
          time_of_day: string
          timezone?: string
          triggered_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          artigo_ref?: string
          artigo_titulo?: string
          channel?: string
          created_at?: string
          days_of_week?: number[]
          id?: string
          label?: string
          last_fired_at?: string | null
          message?: string
          next_fire_at?: string | null
          time_of_day?: string
          timezone?: string
          triggered_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      artigo_ai_cache: {
        Row: {
          conteudo: Json
          created_at: string
          id: string
          numero_artigo: string
          tabela_codigo: string
          tipo: string
          updated_at: string
        }
        Insert: {
          conteudo: Json
          created_at?: string
          id?: string
          numero_artigo: string
          tabela_codigo: string
          tipo: string
          updated_at?: string
        }
        Update: {
          conteudo?: Json
          created_at?: string
          id?: string
          numero_artigo?: string
          tabela_codigo?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      artigo_educacional_cache: {
        Row: {
          conteudo_md: string | null
          created_at: string
          fontes: Json | null
          id: string
          slug: string
          updated_at: string
        }
        Insert: {
          conteudo_md?: string | null
          created_at?: string
          fontes?: Json | null
          id?: string
          slug: string
          updated_at?: string
        }
        Update: {
          conteudo_md?: string | null
          created_at?: string
          fontes?: Json | null
          id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      artigo_videoaulas_cache: {
        Row: {
          created_at: string
          fetched_at: string
          id: string
          numero_artigo: string
          tabela_codigo: string
          updated_at: string
          videos: Json
        }
        Insert: {
          created_at?: string
          fetched_at?: string
          id?: string
          numero_artigo: string
          tabela_codigo: string
          updated_at?: string
          videos?: Json
        }
        Update: {
          created_at?: string
          fetched_at?: string
          id?: string
          numero_artigo?: string
          tabela_codigo?: string
          updated_at?: string
          videos?: Json
        }
        Relationships: []
      }
      artigos_anotacoes: {
        Row: {
          anotacao: string | null
          artigo_id: string
          audio_duration_ms: number | null
          audio_transcript: string | null
          audio_url: string | null
          created_at: string
          id: string
          numero_artigo: string
          tabela_codigo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anotacao?: string | null
          artigo_id: string
          audio_duration_ms?: number | null
          audio_transcript?: string | null
          audio_url?: string | null
          created_at?: string
          id?: string
          numero_artigo: string
          tabela_codigo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anotacao?: string | null
          artigo_id?: string
          audio_duration_ms?: number | null
          audio_transcript?: string | null
          audio_url?: string | null
          created_at?: string
          id?: string
          numero_artigo?: string
          tabela_codigo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      artigos_favoritos: {
        Row: {
          artigo_id: string
          conteudo_preview: string | null
          created_at: string
          id: string
          numero_artigo: string
          tabela_codigo: string
          user_id: string
        }
        Insert: {
          artigo_id: string
          conteudo_preview?: string | null
          created_at?: string
          id?: string
          numero_artigo: string
          tabela_codigo: string
          user_id: string
        }
        Update: {
          artigo_id?: string
          conteudo_preview?: string | null
          created_at?: string
          id?: string
          numero_artigo?: string
          tabela_codigo?: string
          user_id?: string
        }
        Relationships: []
      }
      artigos_grifos: {
        Row: {
          artigo_id: string
          created_at: string
          highlights: Json
          id: string
          numero_artigo: string
          tabela_codigo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          artigo_id: string
          created_at?: string
          highlights?: Json
          id?: string
          numero_artigo: string
          tabela_codigo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          artigo_id?: string
          created_at?: string
          highlights?: Json
          id?: string
          numero_artigo?: string
          tabela_codigo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      artigos_visualizacoes: {
        Row: {
          id: string
          numero_artigo: string
          origem: string | null
          tabela_codigo: string
          user_id: string | null
          visualizado_em: string
        }
        Insert: {
          id?: string
          numero_artigo: string
          origem?: string | null
          tabela_codigo: string
          user_id?: string | null
          visualizado_em?: string
        }
        Update: {
          id?: string
          numero_artigo?: string
          origem?: string | null
          tabela_codigo?: string
          user_id?: string | null
          visualizado_em?: string
        }
        Relationships: []
      }
      assinatura_cancelamentos: {
        Row: {
          canceled_at: string
          motivo: string | null
          user_id: string
        }
        Insert: {
          canceled_at?: string
          motivo?: string | null
          user_id: string
        }
        Update: {
          canceled_at?: string
          motivo?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audio_recordings: {
        Row: {
          chunks_count: number
          created_at: string
          duration_ms: number
          file_path: string | null
          id: string
          local_path: string | null
          mode: string
          source: string
          status: string
          summary: Json | null
          tags: string[] | null
          title: string
          transcript: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chunks_count?: number
          created_at?: string
          duration_ms?: number
          file_path?: string | null
          id?: string
          local_path?: string | null
          mode?: string
          source?: string
          status?: string
          summary?: Json | null
          tags?: string[] | null
          title?: string
          transcript?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chunks_count?: number
          created_at?: string
          duration_ms?: number
          file_path?: string | null
          id?: string
          local_path?: string | null
          mode?: string
          source?: string
          status?: string
          summary?: Json | null
          tags?: string[] | null
          title?: string
          transcript?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      avisos: {
        Row: {
          ativo: boolean
          avisar_em: string
          created_at: string
          disparado_em: string | null
          id: string
          mensagem: string | null
          recorrencia: string | null
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          avisar_em: string
          created_at?: string
          disparado_em?: string | null
          id?: string
          mensagem?: string | null
          recorrencia?: string | null
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          avisar_em?: string
          created_at?: string
          disparado_em?: string | null
          id?: string
          mensagem?: string | null
          recorrencia?: string | null
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      biblioteca_capa_feedback: {
        Row: {
          autor: string | null
          capa_url: string | null
          created_at: string
          id: string
          livro_id: string
          prompt_used: string | null
          rating: number
          tabela: string
          titulo: string | null
        }
        Insert: {
          autor?: string | null
          capa_url?: string | null
          created_at?: string
          id?: string
          livro_id: string
          prompt_used?: string | null
          rating: number
          tabela: string
          titulo?: string | null
        }
        Update: {
          autor?: string | null
          capa_url?: string | null
          created_at?: string
          id?: string
          livro_id?: string
          prompt_used?: string | null
          rating?: number
          tabela?: string
          titulo?: string | null
        }
        Relationships: []
      }
      biblioteca_classicos: {
        Row: {
          analise_detalhada: string | null
          ano_lancamento: string | null
          area: string | null
          autor: string | null
          capa_horizontal: string | null
          created_at: string
          curiosidades: Json | null
          download: string | null
          editora: string | null
          id: number
          imagem: string | null
          link: string | null
          livro: string | null
          sobre: string | null
        }
        Insert: {
          analise_detalhada?: string | null
          ano_lancamento?: string | null
          area?: string | null
          autor?: string | null
          capa_horizontal?: string | null
          created_at?: string
          curiosidades?: Json | null
          download?: string | null
          editora?: string | null
          id: number
          imagem?: string | null
          link?: string | null
          livro?: string | null
          sobre?: string | null
        }
        Update: {
          analise_detalhada?: string | null
          ano_lancamento?: string | null
          area?: string | null
          autor?: string | null
          capa_horizontal?: string | null
          created_at?: string
          curiosidades?: Json | null
          download?: string | null
          editora?: string | null
          id?: number
          imagem?: string | null
          link?: string | null
          livro?: string | null
          sobre?: string | null
        }
        Relationships: []
      }
      biblioteca_estudos: {
        Row: {
          analise_detalhada: string | null
          ano_lancamento: string | null
          area: string | null
          capa_horizontal: string | null
          capa_livro: string | null
          created_at: string
          curiosidades: Json | null
          download: string | null
          editora: string | null
          id: number
          link: string | null
          ordem: number | null
          sobre: string | null
          tema: string | null
        }
        Insert: {
          analise_detalhada?: string | null
          ano_lancamento?: string | null
          area?: string | null
          capa_horizontal?: string | null
          capa_livro?: string | null
          created_at?: string
          curiosidades?: Json | null
          download?: string | null
          editora?: string | null
          id: number
          link?: string | null
          ordem?: number | null
          sobre?: string | null
          tema?: string | null
        }
        Update: {
          analise_detalhada?: string | null
          ano_lancamento?: string | null
          area?: string | null
          capa_horizontal?: string | null
          capa_livro?: string | null
          created_at?: string
          curiosidades?: Json | null
          download?: string | null
          editora?: string | null
          id?: number
          link?: string | null
          ordem?: number | null
          sobre?: string | null
          tema?: string | null
        }
        Relationships: []
      }
      biblioteca_favoritos: {
        Row: {
          categoria: string | null
          created_at: string
          id: string
          livro_key: string
          user_id: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          id?: string
          livro_key: string
          user_id: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          id?: string
          livro_key?: string
          user_id?: string
        }
        Relationships: []
      }
      biblioteca_fora_da_toga: {
        Row: {
          analise_detalhada: string | null
          ano_lancamento: string | null
          area: string | null
          autor: string | null
          capa_horizontal: string | null
          capa_livro: string | null
          created_at: string
          curiosidades: Json | null
          download: string | null
          editora: string | null
          id: number
          link: string | null
          livro: string | null
          sobre: string | null
        }
        Insert: {
          analise_detalhada?: string | null
          ano_lancamento?: string | null
          area?: string | null
          autor?: string | null
          capa_horizontal?: string | null
          capa_livro?: string | null
          created_at?: string
          curiosidades?: Json | null
          download?: string | null
          editora?: string | null
          id: number
          link?: string | null
          livro?: string | null
          sobre?: string | null
        }
        Update: {
          analise_detalhada?: string | null
          ano_lancamento?: string | null
          area?: string | null
          autor?: string | null
          capa_horizontal?: string | null
          capa_livro?: string | null
          created_at?: string
          curiosidades?: Json | null
          download?: string | null
          editora?: string | null
          id?: number
          link?: string | null
          livro?: string | null
          sobre?: string | null
        }
        Relationships: []
      }
      biblioteca_frases: {
        Row: {
          created_at: string
          escopo: string
          frase: string
          id: string
          livro_id: string
          livro_tabela: string
          motivo: string | null
          origem: string
          pagina_num: number | null
        }
        Insert: {
          created_at?: string
          escopo?: string
          frase: string
          id?: string
          livro_id: string
          livro_tabela: string
          motivo?: string | null
          origem?: string
          pagina_num?: number | null
        }
        Update: {
          created_at?: string
          escopo?: string
          frase?: string
          id?: string
          livro_id?: string
          livro_tabela?: string
          motivo?: string | null
          origem?: string
          pagina_num?: number | null
        }
        Relationships: []
      }
      biblioteca_leitura_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          erro: string | null
          finished_at: string | null
          id: string
          livro_id: string
          livro_tabela: string
          pdf_url: string | null
          prioridade: number
          scheduled_for: string
          started_at: string | null
          status: string
          tentativas: number
          tipo: string
          titulo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          erro?: string | null
          finished_at?: string | null
          id?: string
          livro_id: string
          livro_tabela: string
          pdf_url?: string | null
          prioridade?: number
          scheduled_for?: string
          started_at?: string | null
          status?: string
          tentativas?: number
          tipo?: string
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          erro?: string | null
          finished_at?: string | null
          id?: string
          livro_id?: string
          livro_tabela?: string
          pdf_url?: string | null
          prioridade?: number
          scheduled_for?: string
          started_at?: string | null
          status?: string
          tentativas?: number
          tipo?: string
          titulo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      biblioteca_leitura_nativa: {
        Row: {
          capitulos_json: Json | null
          conteudo_md: string | null
          conteudo_md_refinado: string | null
          created_at: string
          erro_detalhe: string | null
          etapa: string | null
          id: string
          livro_id: string
          livro_tabela: string
          preliminares_md: string | null
          progresso: number
          refino_erro: string | null
          refino_modelo: string | null
          refino_status: string | null
          refino_updated_at: string | null
          status: string
          sumario_json: Json | null
          total_etapas: number
          total_paginas: number | null
          updated_at: string
        }
        Insert: {
          capitulos_json?: Json | null
          conteudo_md?: string | null
          conteudo_md_refinado?: string | null
          created_at?: string
          erro_detalhe?: string | null
          etapa?: string | null
          id?: string
          livro_id: string
          livro_tabela: string
          preliminares_md?: string | null
          progresso?: number
          refino_erro?: string | null
          refino_modelo?: string | null
          refino_status?: string | null
          refino_updated_at?: string | null
          status?: string
          sumario_json?: Json | null
          total_etapas?: number
          total_paginas?: number | null
          updated_at?: string
        }
        Update: {
          capitulos_json?: Json | null
          conteudo_md?: string | null
          conteudo_md_refinado?: string | null
          created_at?: string
          erro_detalhe?: string | null
          etapa?: string | null
          id?: string
          livro_id?: string
          livro_tabela?: string
          preliminares_md?: string | null
          progresso?: number
          refino_erro?: string | null
          refino_modelo?: string | null
          refino_status?: string | null
          refino_updated_at?: string | null
          status?: string
          sumario_json?: Json | null
          total_etapas?: number
          total_paginas?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      biblioteca_leitura_progresso: {
        Row: {
          bookmark_ids: Json | null
          id: string
          livro_id: string
          livro_tabela: string
          pagina_atual: number | null
          scroll_offset: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bookmark_ids?: Json | null
          id?: string
          livro_id: string
          livro_tabela: string
          pagina_atual?: number | null
          scroll_offset?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bookmark_ids?: Json | null
          id?: string
          livro_id?: string
          livro_tabela?: string
          pagina_atual?: number | null
          scroll_offset?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      biblioteca_lideranca: {
        Row: {
          analise_detalhada: string | null
          ano_lancamento: string | null
          area: string | null
          autor: string | null
          capa_horizontal: string | null
          created_at: string
          curiosidades: Json | null
          download: string | null
          editora: string | null
          id: number
          imagem: string | null
          link: string | null
          livro: string | null
          sobre: string | null
        }
        Insert: {
          analise_detalhada?: string | null
          ano_lancamento?: string | null
          area?: string | null
          autor?: string | null
          capa_horizontal?: string | null
          created_at?: string
          curiosidades?: Json | null
          download?: string | null
          editora?: string | null
          id: number
          imagem?: string | null
          link?: string | null
          livro?: string | null
          sobre?: string | null
        }
        Update: {
          analise_detalhada?: string | null
          ano_lancamento?: string | null
          area?: string | null
          autor?: string | null
          capa_horizontal?: string | null
          created_at?: string
          curiosidades?: Json | null
          download?: string | null
          editora?: string | null
          id?: number
          imagem?: string | null
          link?: string | null
          livro?: string | null
          sobre?: string | null
        }
        Relationships: []
      }
      biblioteca_livros: {
        Row: {
          autor: string | null
          conteudo: Json | null
          created_at: string
          estrutura_leitura: Json | null
          id: string
          titulo: string
          total_paginas: number | null
          ultima_pagina: number | null
        }
        Insert: {
          autor?: string | null
          conteudo?: Json | null
          created_at?: string
          estrutura_leitura?: Json | null
          id?: string
          titulo: string
          total_paginas?: number | null
          ultima_pagina?: number | null
        }
        Update: {
          autor?: string | null
          conteudo?: Json | null
          created_at?: string
          estrutura_leitura?: Json | null
          id?: string
          titulo?: string
          total_paginas?: number | null
          ultima_pagina?: number | null
        }
        Relationships: []
      }
      biblioteca_oab: {
        Row: {
          analise_detalhada: string | null
          ano_lancamento: string | null
          area: string | null
          capa_area: string | null
          capa_horizontal: string | null
          capa_livro: string | null
          created_at: string
          curiosidades: Json | null
          download: string | null
          editora: string | null
          id: number
          link: string | null
          ordem: number | null
          sobre: string | null
          tema: string | null
          updated_at: string
        }
        Insert: {
          analise_detalhada?: string | null
          ano_lancamento?: string | null
          area?: string | null
          capa_area?: string | null
          capa_horizontal?: string | null
          capa_livro?: string | null
          created_at?: string
          curiosidades?: Json | null
          download?: string | null
          editora?: string | null
          id: number
          link?: string | null
          ordem?: number | null
          sobre?: string | null
          tema?: string | null
          updated_at?: string
        }
        Update: {
          analise_detalhada?: string | null
          ano_lancamento?: string | null
          area?: string | null
          capa_area?: string | null
          capa_horizontal?: string | null
          capa_livro?: string | null
          created_at?: string
          curiosidades?: Json | null
          download?: string | null
          editora?: string | null
          id?: number
          link?: string | null
          ordem?: number | null
          sobre?: string | null
          tema?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      biblioteca_oratoria: {
        Row: {
          analise_detalhada: string | null
          ano_lancamento: string | null
          area: string | null
          autor: string | null
          capa_horizontal: string | null
          capa_livro: string | null
          created_at: string
          curiosidades: Json | null
          download: string | null
          editora: string | null
          id: number
          link: string | null
          livro: string | null
          ordem: number | null
          sobre: string | null
          updated_at: string
        }
        Insert: {
          analise_detalhada?: string | null
          ano_lancamento?: string | null
          area?: string | null
          autor?: string | null
          capa_horizontal?: string | null
          capa_livro?: string | null
          created_at?: string
          curiosidades?: Json | null
          download?: string | null
          editora?: string | null
          id?: number
          link?: string | null
          livro?: string | null
          ordem?: number | null
          sobre?: string | null
          updated_at?: string
        }
        Update: {
          analise_detalhada?: string | null
          ano_lancamento?: string | null
          area?: string | null
          autor?: string | null
          capa_horizontal?: string | null
          capa_livro?: string | null
          created_at?: string
          curiosidades?: Json | null
          download?: string | null
          editora?: string | null
          id?: number
          link?: string | null
          livro?: string | null
          ordem?: number | null
          sobre?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      biblioteca_pdf_telemetry: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          event: string
          id: string
          livro_id: number | null
          livro_titulo: string | null
          platform: string | null
          total_pages: number | null
          url: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event: string
          id?: string
          livro_id?: number | null
          livro_titulo?: string | null
          platform?: string | null
          total_pages?: number | null
          url: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event?: string
          id?: string
          livro_id?: number | null
          livro_titulo?: string | null
          platform?: string | null
          total_pages?: number | null
          url?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      biblioteca_pesquisa_cientifica: {
        Row: {
          analise_detalhada: string | null
          ano_lancamento: string | null
          area: string | null
          autor: string | null
          capa_horizontal: string | null
          created_at: string
          curiosidades: Json | null
          download: string | null
          editora: string | null
          id: number
          imagem: string | null
          link: string | null
          livro: string | null
          sobre: string | null
          updated_at: string
        }
        Insert: {
          analise_detalhada?: string | null
          ano_lancamento?: string | null
          area?: string | null
          autor?: string | null
          capa_horizontal?: string | null
          created_at?: string
          curiosidades?: Json | null
          download?: string | null
          editora?: string | null
          id: number
          imagem?: string | null
          link?: string | null
          livro?: string | null
          sobre?: string | null
          updated_at?: string
        }
        Update: {
          analise_detalhada?: string | null
          ano_lancamento?: string | null
          area?: string | null
          autor?: string | null
          capa_horizontal?: string | null
          created_at?: string
          curiosidades?: Json | null
          download?: string | null
          editora?: string | null
          id?: number
          imagem?: string | null
          link?: string | null
          livro?: string | null
          sobre?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      biblioteca_portugues: {
        Row: {
          analise_detalhada: string | null
          ano_lancamento: string | null
          area: string | null
          autor: string | null
          capa_horizontal: string | null
          created_at: string
          curiosidades: Json | null
          download: string | null
          editora: string | null
          id: number
          imagem: string | null
          link: string | null
          livro: string | null
          sobre: string | null
          updated_at: string
        }
        Insert: {
          analise_detalhada?: string | null
          ano_lancamento?: string | null
          area?: string | null
          autor?: string | null
          capa_horizontal?: string | null
          created_at?: string
          curiosidades?: Json | null
          download?: string | null
          editora?: string | null
          id: number
          imagem?: string | null
          link?: string | null
          livro?: string | null
          sobre?: string | null
          updated_at?: string
        }
        Update: {
          analise_detalhada?: string | null
          ano_lancamento?: string | null
          area?: string | null
          autor?: string | null
          capa_horizontal?: string | null
          created_at?: string
          curiosidades?: Json | null
          download?: string | null
          editora?: string | null
          id?: number
          imagem?: string | null
          link?: string | null
          livro?: string | null
          sobre?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      blog_edicao_config: {
        Row: {
          created_at: string
          estilo_capa_prompt: string
          horarios: string[]
          id: string
          intervalo_minutos: number | null
          modelo_texto: string
          modo_publicacao: string
          narracao_amostra: string | null
          narracao_estilo: string | null
          narracao_modelo: string | null
          narracao_voz: string | null
          posts_por_dia: number
          push_ativo: boolean
          push_audiencia: Json
          push_corpo_template: string
          push_quiet_end: string | null
          push_quiet_start: string | null
          push_titulo_template: string
          tamanho_alvo: number
          timezone: string
          tom: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estilo_capa_prompt?: string
          horarios?: string[]
          id?: string
          intervalo_minutos?: number | null
          modelo_texto?: string
          modo_publicacao?: string
          narracao_amostra?: string | null
          narracao_estilo?: string | null
          narracao_modelo?: string | null
          narracao_voz?: string | null
          posts_por_dia?: number
          push_ativo?: boolean
          push_audiencia?: Json
          push_corpo_template?: string
          push_quiet_end?: string | null
          push_quiet_start?: string | null
          push_titulo_template?: string
          tamanho_alvo?: number
          timezone?: string
          tom?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estilo_capa_prompt?: string
          horarios?: string[]
          id?: string
          intervalo_minutos?: number | null
          modelo_texto?: string
          modo_publicacao?: string
          narracao_amostra?: string | null
          narracao_estilo?: string | null
          narracao_modelo?: string | null
          narracao_voz?: string | null
          posts_por_dia?: number
          push_ativo?: boolean
          push_audiencia?: Json
          push_corpo_template?: string
          push_quiet_end?: string | null
          push_quiet_start?: string | null
          push_titulo_template?: string
          tamanho_alvo?: number
          timezone?: string
          tom?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_edicao_logs: {
        Row: {
          created_at: string
          evento: string
          id: string
          payload: Json | null
          tema_id: string | null
        }
        Insert: {
          created_at?: string
          evento: string
          id?: string
          payload?: Json | null
          tema_id?: string | null
        }
        Update: {
          created_at?: string
          evento?: string
          id?: string
          payload?: Json | null
          tema_id?: string | null
        }
        Relationships: []
      }
      blog_edicao_posts: {
        Row: {
          audio_cost_credits: number | null
          audio_duration_seconds: number | null
          audio_generated_at: string | null
          audio_model: string | null
          audio_url: string | null
          audio_voice: string | null
          autor: string
          categoria: string
          conteudo_md: string
          created_at: string
          data_publicacao: string
          headline_push: string | null
          id: string
          imagem_path: string | null
          imagem_thumb_url: string | null
          imagem_url: string
          publicado: boolean
          push_campaign_id: string | null
          resumo: string
          tema_id: string | null
          tempo_leitura_min: number
          titulo: string
        }
        Insert: {
          audio_cost_credits?: number | null
          audio_duration_seconds?: number | null
          audio_generated_at?: string | null
          audio_model?: string | null
          audio_url?: string | null
          audio_voice?: string | null
          autor?: string
          categoria: string
          conteudo_md: string
          created_at?: string
          data_publicacao?: string
          headline_push?: string | null
          id: string
          imagem_path?: string | null
          imagem_thumb_url?: string | null
          imagem_url: string
          publicado?: boolean
          push_campaign_id?: string | null
          resumo: string
          tema_id?: string | null
          tempo_leitura_min?: number
          titulo: string
        }
        Update: {
          audio_cost_credits?: number | null
          audio_duration_seconds?: number | null
          audio_generated_at?: string | null
          audio_model?: string | null
          audio_url?: string | null
          audio_voice?: string | null
          autor?: string
          categoria?: string
          conteudo_md?: string
          created_at?: string
          data_publicacao?: string
          headline_push?: string | null
          id?: string
          imagem_path?: string | null
          imagem_thumb_url?: string | null
          imagem_url?: string
          publicado?: boolean
          push_campaign_id?: string | null
          resumo?: string
          tema_id?: string | null
          tempo_leitura_min?: number
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_edicao_posts_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "blog_edicao_temas"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_edicao_temas: {
        Row: {
          agendado_para: string | null
          categoria: string
          concluido_em: string | null
          created_at: string
          erro: string | null
          id: string
          ordem: number
          post_id: string | null
          resumo_briefing: string | null
          status: string
          tags: string[] | null
          titulo_sugerido: string
          updated_at: string
        }
        Insert: {
          agendado_para?: string | null
          categoria?: string
          concluido_em?: string | null
          created_at?: string
          erro?: string | null
          id?: string
          ordem?: number
          post_id?: string | null
          resumo_briefing?: string | null
          status?: string
          tags?: string[] | null
          titulo_sugerido: string
          updated_at?: string
        }
        Update: {
          agendado_para?: string | null
          categoria?: string
          concluido_em?: string | null
          created_at?: string
          erro?: string | null
          id?: string
          ordem?: number
          post_id?: string | null
          resumo_briefing?: string | null
          status?: string
          tags?: string[] | null
          titulo_sugerido?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_post_comments: {
        Row: {
          autor_nome: string | null
          comentario: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          autor_nome?: string | null
          comentario: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          autor_nome?: string | null
          comentario?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_post_views: {
        Row: {
          created_at: string
          id: string
          post_id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      boletim_comentarios: {
        Row: {
          autor_nome: string | null
          boletim_id: string
          created_at: string
          id: string
          scene_index: number
          texto: string
          user_id: string
        }
        Insert: {
          autor_nome?: string | null
          boletim_id: string
          created_at?: string
          id?: string
          scene_index: number
          texto: string
          user_id: string
        }
        Update: {
          autor_nome?: string | null
          boletim_id?: string
          created_at?: string
          id?: string
          scene_index?: number
          texto?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boletim_comentarios_boletim_id_fkey"
            columns: ["boletim_id"]
            isOneToOne: false
            referencedRelation: "boletins_juridicos"
            referencedColumns: ["id"]
          },
        ]
      }
      boletim_config: {
        Row: {
          ativo: boolean
          enviar_push: boolean
          github_ref: string
          github_repo: string
          github_workflow: string
          horario_geracao: string
          id: number
          max_normas: number
          noticias_ativo: boolean
          noticias_horario: string
          noticias_max_itens: number
          noticias_prompt_tts_extra: string
          noticias_voz_id: string
          prompt_tts_extra: string
          updated_at: string
          voz_genero: string
          voz_id: string
        }
        Insert: {
          ativo?: boolean
          enviar_push?: boolean
          github_ref?: string
          github_repo?: string
          github_workflow?: string
          horario_geracao?: string
          id?: number
          max_normas?: number
          noticias_ativo?: boolean
          noticias_horario?: string
          noticias_max_itens?: number
          noticias_prompt_tts_extra?: string
          noticias_voz_id?: string
          prompt_tts_extra?: string
          updated_at?: string
          voz_genero?: string
          voz_id?: string
        }
        Update: {
          ativo?: boolean
          enviar_push?: boolean
          github_ref?: string
          github_repo?: string
          github_workflow?: string
          horario_geracao?: string
          id?: number
          max_normas?: number
          noticias_ativo?: boolean
          noticias_horario?: string
          noticias_max_itens?: number
          noticias_prompt_tts_extra?: string
          noticias_voz_id?: string
          prompt_tts_extra?: string
          updated_at?: string
          voz_genero?: string
          voz_id?: string
        }
        Relationships: []
      }
      boletim_likes: {
        Row: {
          boletim_id: string
          created_at: string
          id: string
          scene_index: number
          user_id: string
        }
        Insert: {
          boletim_id: string
          created_at?: string
          id?: string
          scene_index: number
          user_id: string
        }
        Update: {
          boletim_id?: string
          created_at?: string
          id?: string
          scene_index?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boletim_likes_boletim_id_fkey"
            columns: ["boletim_id"]
            isOneToOne: false
            referencedRelation: "boletins_juridicos"
            referencedColumns: ["id"]
          },
        ]
      }
      boletim_tipo_imagens: {
        Row: {
          ativo: boolean
          cor_hex: string | null
          created_at: string
          id: string
          imagem_url: string
          nome: string
          tipo: Database["public"]["Enums"]["boletim_tipo_norma"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor_hex?: string | null
          created_at?: string
          id?: string
          imagem_url: string
          nome: string
          tipo: Database["public"]["Enums"]["boletim_tipo_norma"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor_hex?: string | null
          created_at?: string
          id?: string
          imagem_url?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["boletim_tipo_norma"]
          updated_at?: string
        }
        Relationships: []
      }
      boletins_juridicos: {
        Row: {
          audio_urls: string[] | null
          created_at: string
          data_ref: string
          duracao_s: number | null
          erro: string | null
          gerado_por: string | null
          github_run_id: string | null
          id: string
          roteiro_json: Json
          status: string
          subtitulo: string | null
          thumb_url: string | null
          thumbnail_url: string | null
          tipo: string
          titulo: string
          updated_at: string
          video_url: string | null
          youtube_url: string | null
          youtube_video_id: string | null
        }
        Insert: {
          audio_urls?: string[] | null
          created_at?: string
          data_ref: string
          duracao_s?: number | null
          erro?: string | null
          gerado_por?: string | null
          github_run_id?: string | null
          id?: string
          roteiro_json?: Json
          status?: string
          subtitulo?: string | null
          thumb_url?: string | null
          thumbnail_url?: string | null
          tipo?: string
          titulo: string
          updated_at?: string
          video_url?: string | null
          youtube_url?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          audio_urls?: string[] | null
          created_at?: string
          data_ref?: string
          duracao_s?: number | null
          erro?: string | null
          gerado_por?: string | null
          github_run_id?: string | null
          id?: string
          roteiro_json?: Json
          status?: string
          subtitulo?: string | null
          thumb_url?: string | null
          thumbnail_url?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
          video_url?: string | null
          youtube_url?: string | null
          youtube_video_id?: string | null
        }
        Relationships: []
      }
      chat_feedback: {
        Row: {
          created_at: string
          id: string
          message_id: string
          motivo: string | null
          pergunta: string | null
          resposta: string | null
          session_id: string | null
          sources: Json | null
          tipo: string
          user_id: string | null
          web_search: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          motivo?: string | null
          pergunta?: string | null
          resposta?: string | null
          session_id?: string | null
          sources?: Json | null
          tipo: string
          user_id?: string | null
          web_search?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          motivo?: string | null
          pergunta?: string | null
          resposta?: string | null
          session_id?: string | null
          sources?: Json | null
          tipo?: string
          user_id?: string | null
          web_search?: boolean
        }
        Relationships: []
      }
      concorrente_analises: {
        Row: {
          concorrente_id: string
          created_at: string
          id: string
          modelo: string | null
          resumo: Json
          total_analisado: number
        }
        Insert: {
          concorrente_id: string
          created_at?: string
          id?: string
          modelo?: string | null
          resumo: Json
          total_analisado?: number
        }
        Update: {
          concorrente_id?: string
          created_at?: string
          id?: string
          modelo?: string | null
          resumo?: Json
          total_analisado?: number
        }
        Relationships: [
          {
            foreignKeyName: "concorrente_analises_concorrente_id_fkey"
            columns: ["concorrente_id"]
            isOneToOne: false
            referencedRelation: "concorrentes"
            referencedColumns: ["id"]
          },
        ]
      }
      concorrente_reviews: {
        Row: {
          ano: number | null
          autor: string | null
          concorrente_id: string
          created_at: string
          data_publicacao: string | null
          helpful_count: number | null
          id: string
          rating: number | null
          resposta_dev: string | null
          review_hash: string
          texto: string | null
        }
        Insert: {
          ano?: number | null
          autor?: string | null
          concorrente_id: string
          created_at?: string
          data_publicacao?: string | null
          helpful_count?: number | null
          id?: string
          rating?: number | null
          resposta_dev?: string | null
          review_hash: string
          texto?: string | null
        }
        Update: {
          ano?: number | null
          autor?: string | null
          concorrente_id?: string
          created_at?: string
          data_publicacao?: string | null
          helpful_count?: number | null
          id?: string
          rating?: number | null
          resposta_dev?: string | null
          review_hash?: string
          texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concorrente_reviews_concorrente_id_fkey"
            columns: ["concorrente_id"]
            isOneToOne: false
            referencedRelation: "concorrentes"
            referencedColumns: ["id"]
          },
        ]
      }
      concorrentes: {
        Row: {
          avg_rating: number | null
          categoria_play: string | null
          created_at: string
          descricao: string | null
          desenvolvedor: string | null
          downloads_texto: string | null
          hl: string
          icon_url: string | null
          id: string
          job_atualizado_em: string | null
          job_logs: Json
          job_progresso: Json
          job_status: string | null
          nome: string
          nome_app: string | null
          package_id: string
          total_avaliacoes_play: number | null
          total_reviews: number
          ultima_extracao_em: string | null
          updated_at: string
          url: string
        }
        Insert: {
          avg_rating?: number | null
          categoria_play?: string | null
          created_at?: string
          descricao?: string | null
          desenvolvedor?: string | null
          downloads_texto?: string | null
          hl?: string
          icon_url?: string | null
          id?: string
          job_atualizado_em?: string | null
          job_logs?: Json
          job_progresso?: Json
          job_status?: string | null
          nome: string
          nome_app?: string | null
          package_id: string
          total_avaliacoes_play?: number | null
          total_reviews?: number
          ultima_extracao_em?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          avg_rating?: number | null
          categoria_play?: string | null
          created_at?: string
          descricao?: string | null
          desenvolvedor?: string | null
          downloads_texto?: string | null
          hl?: string
          icon_url?: string | null
          id?: string
          job_atualizado_em?: string | null
          job_logs?: Json
          job_progresso?: Json
          job_status?: string | null
          nome?: string
          nome_app?: string | null
          package_id?: string
          total_avaliacoes_play?: number | null
          total_reviews?: number
          ultima_extracao_em?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      design_imagens_prompts: {
        Row: {
          ativo: boolean
          categoria_alvo: string | null
          created_at: string
          descricao: string | null
          exemplos: Json
          id: string
          is_default: boolean
          nome: string
          paleta: Json
          preview_url: string | null
          prompt_base: string
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_alvo?: string | null
          created_at?: string
          descricao?: string | null
          exemplos?: Json
          id?: string
          is_default?: boolean
          nome: string
          paleta?: Json
          preview_url?: string | null
          prompt_base: string
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_alvo?: string | null
          created_at?: string
          descricao?: string | null
          exemplos?: Json
          id?: string
          is_default?: boolean
          nome?: string
          paleta?: Json
          preview_url?: string | null
          prompt_base?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      desktop_link_tokens: {
        Row: {
          action_link: string | null
          claimed_at: string | null
          created_at: string
          desktop_id: string | null
          email: string | null
          expires_at: string
          otp_hash: string | null
          status: string
          token: string
          user_id: string | null
        }
        Insert: {
          action_link?: string | null
          claimed_at?: string | null
          created_at?: string
          desktop_id?: string | null
          email?: string | null
          expires_at?: string
          otp_hash?: string | null
          status?: string
          token?: string
          user_id?: string | null
        }
        Update: {
          action_link?: string | null
          claimed_at?: string | null
          created_at?: string
          desktop_id?: string | null
          email?: string | null
          expires_at?: string
          otp_hash?: string | null
          status?: string
          token?: string
          user_id?: string | null
        }
        Relationships: []
      }
      desktop_sessions: {
        Row: {
          created_at: string
          desktop_id: string
          expires_at: string
          id: string
          revoked_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          desktop_id: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          desktop_id?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          invalid_reason: string | null
          invalidated_at: string | null
          last_success_at: string | null
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invalid_reason?: string | null
          invalidated_at?: string | null
          last_success_at?: string | null
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invalid_reason?: string | null
          invalidated_at?: string | null
          last_success_at?: string | null
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dicionario_juridico: {
        Row: {
          created_at: string
          exemplo_pratico: string | null
          id: string
          letra: string
          palavra: string
          significado: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          exemplo_pratico?: string | null
          id?: string
          letra: string
          palavra: string
          significado: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          exemplo_pratico?: string | null
          id?: string
          letra?: string
          palavra?: string
          significado?: string
          updated_at?: string
        }
        Relationships: []
      }
      dicionario_termo_stats: {
        Row: {
          clicks: number
          palavra: string
          updated_at: string
        }
        Insert: {
          clicks?: number
          palavra: string
          updated_at?: string
        }
        Update: {
          clicks?: number
          palavra?: string
          updated_at?: string
        }
        Relationships: []
      }
      feature_limits: {
        Row: {
          category: string
          created_at: string
          description: string | null
          enabled: boolean
          feature_key: string
          label: string
          limit_value: number
          period: string
          scope_key: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          feature_key: string
          label: string
          limit_value?: number
          period: string
          scope_key?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          feature_key?: string
          label?: string
          limit_value?: number
          period?: string
          scope_key?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      feature_usage: {
        Row: {
          feature_key: string
          id: string
          ref_key: string | null
          scope_value: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          feature_key: string
          id?: string
          ref_key?: string | null
          scope_value?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          feature_key?: string
          id?: string
          ref_key?: string | null
          scope_value?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gcp_monitor_cache: {
        Row: {
          bucket: string
          payload: Json
          updated_at: string
        }
        Insert: {
          bucket: string
          payload: Json
          updated_at?: string
        }
        Update: {
          bucket?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      hero_home_images: {
        Row: {
          animation_preset: string
          ativo: boolean
          created_at: string
          created_by: string | null
          id: string
          imagem_url: string
          ordem: number
          prompt_used: string | null
          storage_path: string
          tag: string
          updated_at: string
        }
        Insert: {
          animation_preset?: string
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          imagem_url: string
          ordem?: number
          prompt_used?: string | null
          storage_path: string
          tag: string
          updated_at?: string
        }
        Update: {
          animation_preset?: string
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          imagem_url?: string
          ordem?: number
          prompt_used?: string | null
          storage_path?: string
          tag?: string
          updated_at?: string
        }
        Relationships: []
      }
      hero_motifs_config: {
        Row: {
          id: number
          interval_ms: number
          slots_count: number
          updated_at: string
        }
        Insert: {
          id?: number
          interval_ms?: number
          slots_count?: number
          updated_at?: string
        }
        Update: {
          id?: number
          interval_ms?: number
          slots_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      HISTORICO_ALTERACOES: {
        Row: {
          ano_alteracao: number | null
          created_at: string | null
          data_alteracao: string | null
          id: number
          lei_alteradora: string | null
          numero_artigo: string
          tabela_lei: string
          texto_completo: string
          tipo_alteracao: string
          updated_at: string | null
        }
        Insert: {
          ano_alteracao?: number | null
          created_at?: string | null
          data_alteracao?: string | null
          id?: number
          lei_alteradora?: string | null
          numero_artigo: string
          tabela_lei: string
          texto_completo: string
          tipo_alteracao: string
          updated_at?: string | null
        }
        Update: {
          ano_alteracao?: number | null
          created_at?: string | null
          data_alteracao?: string | null
          id?: number
          lei_alteradora?: string | null
          numero_artigo?: string
          tabela_lei?: string
          texto_completo?: string
          tipo_alteracao?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      home_curiosidades: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          created_by: string | null
          id: string
          imagem_path: string | null
          imagem_url: string | null
          ordem: number
          prompt_imagem: string | null
          texto: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          created_by?: string | null
          id?: string
          imagem_path?: string | null
          imagem_url?: string | null
          ordem?: number
          prompt_imagem?: string | null
          texto: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          created_by?: string | null
          id?: string
          imagem_path?: string | null
          imagem_url?: string | null
          ordem?: number
          prompt_imagem?: string | null
          texto?: string
          updated_at?: string
        }
        Relationships: []
      }
      horus_campaign_targets: {
        Row: {
          campaign_id: string
          created_at: string
          enviado_em: string | null
          erro: string | null
          id: string
          nome: string | null
          phone: string
          status: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          nome?: string | null
          phone: string
          status?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          nome?: string | null
          phone?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "horus_campaign_targets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "horus_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      horus_campaigns: {
        Row: {
          agendada_para: string | null
          created_at: string
          created_by: string | null
          filtro: Json | null
          id: string
          media_url: string | null
          mensagem: string
          publico_alvo: string
          status: string
          titulo: string
          total_alvo: number
          total_enviado: number
          total_falha: number
          updated_at: string
        }
        Insert: {
          agendada_para?: string | null
          created_at?: string
          created_by?: string | null
          filtro?: Json | null
          id?: string
          media_url?: string | null
          mensagem: string
          publico_alvo?: string
          status?: string
          titulo: string
          total_alvo?: number
          total_enviado?: number
          total_falha?: number
          updated_at?: string
        }
        Update: {
          agendada_para?: string | null
          created_at?: string
          created_by?: string | null
          filtro?: Json | null
          id?: string
          media_url?: string | null
          mensagem?: string
          publico_alvo?: string
          status?: string
          titulo?: string
          total_alvo?: number
          total_enviado?: number
          total_falha?: number
          updated_at?: string
        }
        Relationships: []
      }
      horus_canais: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          invite_link: string | null
          jid: string
          last_post_at: string | null
          nome: string
          post_blog: boolean
          post_leis: boolean
          post_noticias: boolean
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          invite_link?: string | null
          jid: string
          last_post_at?: string | null
          nome: string
          post_blog?: boolean
          post_leis?: boolean
          post_noticias?: boolean
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          invite_link?: string | null
          jid?: string
          last_post_at?: string | null
          nome?: string
          post_blog?: boolean
          post_leis?: boolean
          post_noticias?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      horus_config: {
        Row: {
          chave: string
          updated_at: string
          valor: Json
        }
        Insert: {
          chave: string
          updated_at?: string
          valor: Json
        }
        Update: {
          chave?: string
          updated_at?: string
          valor?: Json
        }
        Relationships: []
      }
      horus_conversations: {
        Row: {
          agent_id: string | null
          content: string | null
          cost_usd: number | null
          created_at: string
          duration_ms: number | null
          id: string
          intent_confianca: number | null
          media_type: string | null
          media_url: string | null
          model: string | null
          phone_e164: string
          role: string
          tokens: number | null
          tokens_in: number | null
          tokens_out: number | null
          tokens_total: number | null
          tools_used: string[] | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          content?: string | null
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          intent_confianca?: number | null
          media_type?: string | null
          media_url?: string | null
          model?: string | null
          phone_e164: string
          role: string
          tokens?: number | null
          tokens_in?: number | null
          tokens_out?: number | null
          tokens_total?: number | null
          tools_used?: string[] | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          content?: string | null
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          intent_confianca?: number | null
          media_type?: string | null
          media_url?: string | null
          model?: string | null
          phone_e164?: string
          role?: string
          tokens?: number | null
          tokens_in?: number | null
          tokens_out?: number | null
          tokens_total?: number | null
          tools_used?: string[] | null
          user_id?: string | null
        }
        Relationships: []
      }
      horus_funcoes: {
        Row: {
          apenas_premium: boolean
          ativo: boolean
          created_at: string
          descricao: string | null
          eh_fallback: boolean
          eh_onboarding: boolean
          ferramentas: Json
          icone: string | null
          id: string
          keywords: string[]
          max_tokens: number
          modelo: string
          nome: string
          ordem: number
          prioridade: number
          prompt: string
          requer_cadastro: boolean
          temperatura: number
          updated_at: string
          usa_estatisticas: boolean
          usar_busca_web: boolean
        }
        Insert: {
          apenas_premium?: boolean
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          eh_fallback?: boolean
          eh_onboarding?: boolean
          ferramentas?: Json
          icone?: string | null
          id?: string
          keywords?: string[]
          max_tokens?: number
          modelo?: string
          nome: string
          ordem?: number
          prioridade?: number
          prompt: string
          requer_cadastro?: boolean
          temperatura?: number
          updated_at?: string
          usa_estatisticas?: boolean
          usar_busca_web?: boolean
        }
        Update: {
          apenas_premium?: boolean
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          eh_fallback?: boolean
          eh_onboarding?: boolean
          ferramentas?: Json
          icone?: string | null
          id?: string
          keywords?: string[]
          max_tokens?: number
          modelo?: string
          nome?: string
          ordem?: number
          prioridade?: number
          prompt?: string
          requer_cadastro?: boolean
          temperatura?: number
          updated_at?: string
          usa_estatisticas?: boolean
          usar_busca_web?: boolean
        }
        Relationships: []
      }
      horus_intent_logs: {
        Row: {
          agente_id: string | null
          confidence: number | null
          created_at: string
          id: string
          intent: string | null
          mensagem: string | null
          raw_response: Json | null
          redirect: boolean | null
          telefone: string
        }
        Insert: {
          agente_id?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          intent?: string | null
          mensagem?: string | null
          raw_response?: Json | null
          redirect?: boolean | null
          telefone: string
        }
        Update: {
          agente_id?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          intent?: string | null
          mensagem?: string | null
          raw_response?: Json | null
          redirect?: boolean | null
          telefone?: string
        }
        Relationships: []
      }
      horus_memoria: {
        Row: {
          created_at: string
          embedding: string | null
          id: string
          kind: string
          metadata: Json | null
          texto: string
          user_phone: string
        }
        Insert: {
          created_at?: string
          embedding?: string | null
          id?: string
          kind?: string
          metadata?: Json | null
          texto: string
          user_phone: string
        }
        Update: {
          created_at?: string
          embedding?: string | null
          id?: string
          kind?: string
          metadata?: Json | null
          texto?: string
          user_phone?: string
        }
        Relationships: []
      }
      horus_outbound_log: {
        Row: {
          campaign_id: string | null
          created_at: string
          error: string | null
          id: string
          kind: string
          payload: Json | null
          phone_e164: string
          sent_at: string | null
          status: string
          tipo: string
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          kind: string
          payload?: Json | null
          phone_e164: string
          sent_at?: string | null
          status?: string
          tipo?: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          payload?: Json | null
          phone_e164?: string
          sent_at?: string | null
          status?: string
          tipo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      horus_phone_takeover_notices: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          id: string
          new_owner_email: string | null
          new_owner_user_id: string | null
          phone_e164: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          new_owner_email?: string | null
          new_owner_user_id?: string | null
          phone_e164: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          new_owner_email?: string | null
          new_owner_user_id?: string | null
          phone_e164?: string
          user_id?: string
        }
        Relationships: []
      }
      horus_phone_transfers: {
        Row: {
          created_at: string
          from_user_id: string | null
          id: string
          phone_e164: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id?: string | null
          id?: string
          phone_e164: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string | null
          id?: string
          phone_e164?: string
          to_user_id?: string
        }
        Relationships: []
      }
      horus_poderes: {
        Row: {
          ativo: boolean
          base_url: string | null
          categoria: string
          config: Json
          cor: string | null
          created_at: string
          descricao: string
          docs_url: string | null
          icone: string | null
          id: string
          nome: string
          ordem: number
          slug: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          base_url?: string | null
          categoria: string
          config?: Json
          cor?: string | null
          created_at?: string
          descricao: string
          docs_url?: string | null
          icone?: string | null
          id?: string
          nome: string
          ordem?: number
          slug: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          base_url?: string | null
          categoria?: string
          config?: Json
          cor?: string | null
          created_at?: string
          descricao?: string
          docs_url?: string | null
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      horus_poderes_calls: {
        Row: {
          created_at: string
          error: string | null
          id: string
          input: Json | null
          latency_ms: number | null
          ok: boolean
          output: Json | null
          poder_slug: string
          user_phone: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          input?: Json | null
          latency_ms?: number | null
          ok?: boolean
          output?: Json | null
          poder_slug: string
          user_phone?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          input?: Json | null
          latency_ms?: number | null
          ok?: boolean
          output?: Json | null
          poder_slug?: string
          user_phone?: string | null
        }
        Relationships: []
      }
      horus_proactive_log: {
        Row: {
          created_at: string
          enviada_em: string
          id: string
          mensagem_enviada: string
          metadata: Json | null
          motivo: string
          respondida: boolean | null
          respondida_em: string | null
          telefone: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          enviada_em?: string
          id?: string
          mensagem_enviada: string
          metadata?: Json | null
          motivo: string
          respondida?: boolean | null
          respondida_em?: string | null
          telefone: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          enviada_em?: string
          id?: string
          mensagem_enviada?: string
          metadata?: Json | null
          motivo?: string
          respondida?: boolean | null
          respondida_em?: string | null
          telefone?: string
          user_id?: string | null
        }
        Relationships: []
      }
      horus_qr_cache: {
        Row: {
          code: string | null
          event_name: string | null
          expires_at: string
          instance_name: string
          payload: Json
          qrcode: string | null
          received_at: string
          status: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          event_name?: string | null
          expires_at?: string
          instance_name: string
          payload?: Json
          qrcode?: string | null
          received_at?: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          event_name?: string | null
          expires_at?: string
          instance_name?: string
          payload?: Json
          qrcode?: string | null
          received_at?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      horus_user_stats: {
        Row: {
          contexto_formatado: string | null
          created_at: string
          dias_streak_estudo: number | null
          horarios_pico_app: number[] | null
          id: string
          livros_favoritos: Json | null
          materia_mais_estudada_30d: string | null
          materia_mais_estudada_7d: string | null
          metadata: Json | null
          nome_preferido: string | null
          notificacoes_permitidas: boolean | null
          pct_acerto_geral: number | null
          plano_atual: string | null
          plano_expira_em: string | null
          preferencia_horario_contato: string | null
          telefone: string | null
          total_questoes_respondidas: number | null
          ultima_atividade_em: string | null
          ultimas_buscas: Json | null
          ultimo_artigo_lido: string | null
          ultimo_resumo_visto: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          contexto_formatado?: string | null
          created_at?: string
          dias_streak_estudo?: number | null
          horarios_pico_app?: number[] | null
          id?: string
          livros_favoritos?: Json | null
          materia_mais_estudada_30d?: string | null
          materia_mais_estudada_7d?: string | null
          metadata?: Json | null
          nome_preferido?: string | null
          notificacoes_permitidas?: boolean | null
          pct_acerto_geral?: number | null
          plano_atual?: string | null
          plano_expira_em?: string | null
          preferencia_horario_contato?: string | null
          telefone?: string | null
          total_questoes_respondidas?: number | null
          ultima_atividade_em?: string | null
          ultimas_buscas?: Json | null
          ultimo_artigo_lido?: string | null
          ultimo_resumo_visto?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contexto_formatado?: string | null
          created_at?: string
          dias_streak_estudo?: number | null
          horarios_pico_app?: number[] | null
          id?: string
          livros_favoritos?: Json | null
          materia_mais_estudada_30d?: string | null
          materia_mais_estudada_7d?: string | null
          metadata?: Json | null
          nome_preferido?: string | null
          notificacoes_permitidas?: boolean | null
          pct_acerto_geral?: number | null
          plano_atual?: string | null
          plano_expira_em?: string | null
          preferencia_horario_contato?: string | null
          telefone?: string | null
          total_questoes_respondidas?: number | null
          ultima_atividade_em?: string | null
          ultimas_buscas?: Json | null
          ultimo_artigo_lido?: string | null
          ultimo_resumo_visto?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      horus_verification_codes: {
        Row: {
          attempts: number
          code: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone_e164: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone_e164: string
          user_id: string
        }
        Update: {
          attempts?: number
          code?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone_e164?: string
          user_id?: string
        }
        Relationships: []
      }
      horus_whatsapp_users: {
        Row: {
          apelido: string | null
          apelido_ativo: boolean
          blocked: boolean
          contexto_resumo: string | null
          created_at: string
          display_name: string | null
          first_seen_at: string | null
          id: string
          last_onboarding_msg_at: string | null
          last_seen_at: string | null
          linked_at: string | null
          linked_user_id: string | null
          msg_count: number
          nome_preferido: string | null
          notif_prefs: Json
          off_topic_streak: number
          onboarding_state: string
          opt_in_blog: boolean
          opt_in_leis: boolean
          opt_in_lembretes: boolean
          perfil_pessoal: Json
          phone_e164: string
          session_state: Json
          updated_at: string
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          apelido?: string | null
          apelido_ativo?: boolean
          blocked?: boolean
          contexto_resumo?: string | null
          created_at?: string
          display_name?: string | null
          first_seen_at?: string | null
          id?: string
          last_onboarding_msg_at?: string | null
          last_seen_at?: string | null
          linked_at?: string | null
          linked_user_id?: string | null
          msg_count?: number
          nome_preferido?: string | null
          notif_prefs?: Json
          off_topic_streak?: number
          onboarding_state?: string
          opt_in_blog?: boolean
          opt_in_leis?: boolean
          opt_in_lembretes?: boolean
          perfil_pessoal?: Json
          phone_e164: string
          session_state?: Json
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          apelido?: string | null
          apelido_ativo?: boolean
          blocked?: boolean
          contexto_resumo?: string | null
          created_at?: string
          display_name?: string | null
          first_seen_at?: string | null
          id?: string
          last_onboarding_msg_at?: string | null
          last_seen_at?: string | null
          linked_at?: string | null
          linked_user_id?: string | null
          msg_count?: number
          nome_preferido?: string | null
          notif_prefs?: Json
          off_topic_streak?: number
          onboarding_state?: string
          opt_in_blog?: boolean
          opt_in_leis?: boolean
          opt_in_lembretes?: boolean
          perfil_pessoal?: Json
          phone_e164?: string
          session_state?: Json
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      informativos_stf: {
        Row: {
          created_at: string
          data_publicacao: string | null
          destaque: string | null
          edicao: number
          edicao_titulo: string | null
          id: string
          informacoes_adicionais: string | null
          inteiro_teor: string | null
          ordem: number
          processo: string | null
          ramo_direito: string | null
          raw: string | null
          secao: string | null
          tema: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_publicacao?: string | null
          destaque?: string | null
          edicao: number
          edicao_titulo?: string | null
          id?: string
          informacoes_adicionais?: string | null
          inteiro_teor?: string | null
          ordem: number
          processo?: string | null
          ramo_direito?: string | null
          raw?: string | null
          secao?: string | null
          tema?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_publicacao?: string | null
          destaque?: string | null
          edicao?: number
          edicao_titulo?: string | null
          id?: string
          informacoes_adicionais?: string | null
          inteiro_teor?: string | null
          ordem?: number
          processo?: string | null
          ramo_direito?: string | null
          raw?: string | null
          secao?: string | null
          tema?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      informativos_stj: {
        Row: {
          created_at: string
          data_publicacao: string | null
          destaque: string | null
          edicao: number
          edicao_titulo: string | null
          id: string
          informacoes_adicionais: string | null
          inteiro_teor: string | null
          ordem: number
          processo: string | null
          ramo_direito: string | null
          raw: string | null
          secao: string | null
          tema: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_publicacao?: string | null
          destaque?: string | null
          edicao: number
          edicao_titulo?: string | null
          id?: string
          informacoes_adicionais?: string | null
          inteiro_teor?: string | null
          ordem: number
          processo?: string | null
          ramo_direito?: string | null
          raw?: string | null
          secao?: string | null
          tema?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_publicacao?: string | null
          destaque?: string | null
          edicao?: number
          edicao_titulo?: string | null
          id?: string
          informacoes_adicionais?: string | null
          inteiro_teor?: string | null
          ordem?: number
          processo?: string | null
          ramo_direito?: string | null
          raw?: string | null
          secao?: string | null
          tema?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      jurisprudencia_cache: {
        Row: {
          corpus_lei_id: number
          created_at: string
          expires_at: string
          fetched_at: string
          fonte: string
          id: string
          numero_artigo: string
          payload: Json
          total_itens: number
          updated_at: string
        }
        Insert: {
          corpus_lei_id: number
          created_at?: string
          expires_at?: string
          fetched_at?: string
          fonte?: string
          id?: string
          numero_artigo: string
          payload?: Json
          total_itens?: number
          updated_at?: string
        }
        Update: {
          corpus_lei_id?: number
          created_at?: string
          expires_at?: string
          fetched_at?: string
          fonte?: string
          id?: string
          numero_artigo?: string
          payload?: Json
          total_itens?: number
          updated_at?: string
        }
        Relationships: []
      }
      jurisprudencia_favoritos: {
        Row: {
          categoria: string
          conteudo: string | null
          corpus_item_id: number
          created_at: string
          id: string
          numero_artigo: string | null
          slug_local: string | null
          titulo: string | null
          url_origem: string | null
          user_id: string
        }
        Insert: {
          categoria: string
          conteudo?: string | null
          corpus_item_id: number
          created_at?: string
          id?: string
          numero_artigo?: string | null
          slug_local?: string | null
          titulo?: string | null
          url_origem?: string | null
          user_id: string
        }
        Update: {
          categoria?: string
          conteudo?: string | null
          corpus_item_id?: number
          created_at?: string
          id?: string
          numero_artigo?: string | null
          slug_local?: string | null
          titulo?: string | null
          url_origem?: string | null
          user_id?: string
        }
        Relationships: []
      }
      jurisprudencia_leis_map: {
        Row: {
          ativo: boolean
          corpus_lei_id: number
          corpus_lei_slug: string | null
          created_at: string
          id: string
          nome_exibicao: string
          slug_local: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          corpus_lei_id: number
          corpus_lei_slug?: string | null
          created_at?: string
          id?: string
          nome_exibicao: string
          slug_local: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          corpus_lei_id?: number
          corpus_lei_slug?: string | null
          created_at?: string
          id?: string
          nome_exibicao?: string
          slug_local?: string
          updated_at?: string
        }
        Relationships: []
      }
      jurisprudencia_prontas: {
        Row: {
          assunto: string | null
          created_at: string
          id: string
          ordem: number
          query_string: string | null
          query_url: string
          ramo: string
          slug: string
          titulo: string
          tribunal: string
          updated_at: string
        }
        Insert: {
          assunto?: string | null
          created_at?: string
          id?: string
          ordem?: number
          query_string?: string | null
          query_url: string
          ramo: string
          slug: string
          titulo: string
          tribunal: string
          updated_at?: string
        }
        Update: {
          assunto?: string | null
          created_at?: string
          id?: string
          ordem?: number
          query_string?: string | null
          query_url?: string
          ramo?: string
          slug?: string
          titulo?: string
          tribunal?: string
          updated_at?: string
        }
        Relationships: []
      }
      jurisprudencia_prontas_resultados: {
        Row: {
          created_at: string
          data_julgamento: string | null
          data_publicacao: string | null
          ementa: string | null
          ementa_refinada: string | null
          fetched_at: string
          id: string
          observacao: string | null
          observacao_refinada: string | null
          ordem: number
          orgao: string | null
          pesquisa_id: string
          raw: Json | null
          refinado_em: string | null
          relator: string | null
          titulo: string
          url_inteiro_teor: string | null
          url_pdf: string | null
        }
        Insert: {
          created_at?: string
          data_julgamento?: string | null
          data_publicacao?: string | null
          ementa?: string | null
          ementa_refinada?: string | null
          fetched_at?: string
          id?: string
          observacao?: string | null
          observacao_refinada?: string | null
          ordem?: number
          orgao?: string | null
          pesquisa_id: string
          raw?: Json | null
          refinado_em?: string | null
          relator?: string | null
          titulo: string
          url_inteiro_teor?: string | null
          url_pdf?: string | null
        }
        Update: {
          created_at?: string
          data_julgamento?: string | null
          data_publicacao?: string | null
          ementa?: string | null
          ementa_refinada?: string | null
          fetched_at?: string
          id?: string
          observacao?: string | null
          observacao_refinada?: string | null
          ordem?: number
          orgao?: string | null
          pesquisa_id?: string
          raw?: Json | null
          refinado_em?: string | null
          relator?: string | null
          titulo?: string
          url_inteiro_teor?: string | null
          url_pdf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jurisprudencia_prontas_resultados_pesquisa_id_fkey"
            columns: ["pesquisa_id"]
            isOneToOne: false
            referencedRelation: "jurisprudencia_prontas"
            referencedColumns: ["id"]
          },
        ]
      }
      jurisprudencia_teses_edicoes: {
        Row: {
          created_at: string
          data_publicacao: string | null
          edicao: number
          id: string
          ramo: string | null
          titulo: string
          total_teses: number
          tribunal: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_publicacao?: string | null
          edicao: number
          id?: string
          ramo?: string | null
          titulo: string
          total_teses?: number
          tribunal?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_publicacao?: string | null
          edicao?: number
          id?: string
          ramo?: string | null
          titulo?: string
          total_teses?: number
          tribunal?: string
          updated_at?: string
        }
        Relationships: []
      }
      jurisprudencia_teses_itens: {
        Row: {
          created_at: string
          edicao: number
          edicao_id: string
          id: string
          julgados: string | null
          numero: number
          tese: string
          tribunal: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          edicao: number
          edicao_id: string
          id?: string
          julgados?: string | null
          numero: number
          tese: string
          tribunal?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          edicao?: number
          edicao_id?: string
          id?: string
          julgados?: string | null
          numero?: number
          tese?: string
          tribunal?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jurisprudencia_teses_itens_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: false
            referencedRelation: "jurisprudencia_teses_edicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_cards: {
        Row: {
          coluna: string
          created_at: string
          descricao: string | null
          id: string
          ordem: number
          prioridade: string
          tags: string[] | null
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coluna?: string
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          prioridade?: string
          tags?: string[] | null
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coluna?: string
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          prioridade?: string
          tags?: string[] | null
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kanban_proposicoes: {
        Row: {
          ano: number | null
          atualizado_em: string
          autor: string | null
          created_at: string
          dados: Json | null
          ementa: string | null
          id: string
          lei_afetada: string | null
          numero: string | null
          sigla_tipo: string | null
          status_kanban: string
          url: string | null
        }
        Insert: {
          ano?: number | null
          atualizado_em?: string
          autor?: string | null
          created_at?: string
          dados?: Json | null
          ementa?: string | null
          id?: string
          lei_afetada?: string | null
          numero?: string | null
          sigla_tipo?: string | null
          status_kanban?: string
          url?: string | null
        }
        Update: {
          ano?: number | null
          atualizado_em?: string
          autor?: string | null
          created_at?: string
          dados?: Json | null
          ementa?: string | null
          id?: string
          lei_afetada?: string | null
          numero?: string | null
          sigla_tipo?: string | null
          status_kanban?: string
          url?: string | null
        }
        Relationships: []
      }
      locais_avaliacoes: {
        Row: {
          aprovado: boolean
          comentario: string | null
          created_at: string
          id: string
          local_id: string
          moderado_em: string | null
          nota: number
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          aprovado?: boolean
          comentario?: string | null
          created_at?: string
          id?: string
          local_id: string
          moderado_em?: string | null
          nota: number
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          aprovado?: boolean
          comentario?: string | null
          created_at?: string
          id?: string
          local_id?: string
          moderado_em?: string | null
          nota?: number
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locais_avaliacoes_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "locais_juridicos"
            referencedColumns: ["id"]
          },
        ]
      }
      locais_categorias_seed: {
        Row: {
          ativo: boolean
          categoria: string
          cidade: string | null
          created_at: string
          endereco: string | null
          id: string
          lat: number
          lng: number
          nome: string
          observacoes: string | null
          site: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          cidade?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          lat: number
          lng: number
          nome: string
          observacoes?: string | null
          site?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          cidade?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          lat?: number
          lng?: number
          nome?: string
          observacoes?: string | null
          site?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      locais_checkins: {
        Row: {
          created_at: string
          id: string
          local_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          local_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          local_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locais_checkins_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "locais_juridicos"
            referencedColumns: ["id"]
          },
        ]
      }
      locais_favoritos: {
        Row: {
          created_at: string
          local_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          local_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          local_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locais_favoritos_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "locais_juridicos"
            referencedColumns: ["id"]
          },
        ]
      }
      locais_fotos_usuario: {
        Row: {
          aprovada: boolean
          created_at: string
          id: string
          local_id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          aprovada?: boolean
          created_at?: string
          id?: string
          local_id: string
          storage_path: string
          user_id: string
        }
        Update: {
          aprovada?: boolean
          created_at?: string
          id?: string
          local_id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locais_fotos_usuario_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "locais_juridicos"
            referencedColumns: ["id"]
          },
        ]
      }
      locais_juridicos: {
        Row: {
          categoria: string
          cep: string | null
          cidade: string | null
          created_at: string
          editorial_summary: string | null
          email: string | null
          endereco: string | null
          fonte: string
          google_maps_uri: string | null
          horario: Json | null
          horario_places: Json | null
          id: string
          lat: number
          lng: number
          nome: string
          osm_id: string | null
          photo_attribution: string | null
          photo_fetched_at: string | null
          photo_url: string | null
          place_id: string | null
          rating: number | null
          reviews: Json | null
          site: string | null
          tags: Json | null
          telefone: string | null
          uf: string | null
          updated_at: string
          user_ratings_total: number | null
          wikimedia_commons: string | null
        }
        Insert: {
          categoria: string
          cep?: string | null
          cidade?: string | null
          created_at?: string
          editorial_summary?: string | null
          email?: string | null
          endereco?: string | null
          fonte?: string
          google_maps_uri?: string | null
          horario?: Json | null
          horario_places?: Json | null
          id?: string
          lat: number
          lng: number
          nome: string
          osm_id?: string | null
          photo_attribution?: string | null
          photo_fetched_at?: string | null
          photo_url?: string | null
          place_id?: string | null
          rating?: number | null
          reviews?: Json | null
          site?: string | null
          tags?: Json | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          user_ratings_total?: number | null
          wikimedia_commons?: string | null
        }
        Update: {
          categoria?: string
          cep?: string | null
          cidade?: string | null
          created_at?: string
          editorial_summary?: string | null
          email?: string | null
          endereco?: string | null
          fonte?: string
          google_maps_uri?: string | null
          horario?: Json | null
          horario_places?: Json | null
          id?: string
          lat?: number
          lng?: number
          nome?: string
          osm_id?: string | null
          photo_attribution?: string | null
          photo_fetched_at?: string | null
          photo_url?: string | null
          place_id?: string | null
          rating?: number | null
          reviews?: Json | null
          site?: string | null
          tags?: Json | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          user_ratings_total?: number | null
          wikimedia_commons?: string | null
        }
        Relationships: []
      }
      locais_selos: {
        Row: {
          codigo: string
          granted_at: string
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          codigo: string
          granted_at?: string
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          codigo?: string
          granted_at?: string
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      locais_trilhas: {
        Row: {
          ativa: boolean
          cover_url: string | null
          created_at: string
          descricao: string | null
          id: string
          local_ids: string[]
          selo_codigo: string | null
          slug: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          cover_url?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          local_ids?: string[]
          selo_codigo?: string | null
          slug: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          cover_url?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          local_ids?: string[]
          selo_codigo?: string | null
          slug?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      locais_trilhas_progresso: {
        Row: {
          certificado_url: string | null
          concluida_em: string | null
          id: string
          local_ids_visitados: string[]
          trilha_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          certificado_url?: string | null
          concluida_em?: string | null
          id?: string
          local_ids_visitados?: string[]
          trilha_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          certificado_url?: string | null
          concluida_em?: string | null
          id?: string
          local_ids_visitados?: string[]
          trilha_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locais_trilhas_progresso_trilha_id_fkey"
            columns: ["trilha_id"]
            isOneToOne: false
            referencedRelation: "locais_trilhas"
            referencedColumns: ["id"]
          },
        ]
      }
      location_reminders: {
        Row: {
          active: boolean
          address: string | null
          artigo_ref: string | null
          channel: string
          created_at: string
          id: string
          label: string
          last_triggered_at: string | null
          lat: number
          lng: number
          message: string
          radius_m: number
          triggered_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          artigo_ref?: string | null
          channel?: string
          created_at?: string
          id?: string
          label: string
          last_triggered_at?: string | null
          lat: number
          lng: number
          message: string
          radius_m?: number
          triggered_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          address?: string | null
          artigo_ref?: string | null
          channel?: string
          created_at?: string
          id?: string
          label?: string
          last_triggered_at?: string | null
          lat?: number
          lng?: number
          message?: string
          radius_m?: number
          triggered_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mensagens_suporte: {
        Row: {
          assunto: string
          created_at: string
          email: string
          id: string
          mensagem: string
          respondido: boolean
          user_id: string
        }
        Insert: {
          assunto: string
          created_at?: string
          email: string
          id?: string
          mensagem: string
          respondido?: boolean
          user_id: string
        }
        Update: {
          assunto?: string
          created_at?: string
          email?: string
          id?: string
          mensagem?: string
          respondido?: boolean
          user_id?: string
        }
        Relationships: []
      }
      mentor_conversas: {
        Row: {
          created_at: string
          id: string
          titulo: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          titulo?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          titulo?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mentor_historico_resumo: {
        Row: {
          created_at: string
          id: string
          resumo: string
          topicos: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          resumo: string
          topicos?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          resumo?: string
          topicos?: Json
          user_id?: string
        }
        Relationships: []
      }
      mentor_mensagens: {
        Row: {
          content: string | null
          conversa_id: string
          created_at: string
          id: string
          role: string
          tool_calls: Json | null
          user_id: string
        }
        Insert: {
          content?: string | null
          conversa_id: string
          created_at?: string
          id?: string
          role: string
          tool_calls?: Json | null
          user_id: string
        }
        Update: {
          content?: string | null
          conversa_id?: string
          created_at?: string
          id?: string
          role?: string
          tool_calls?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "mentor_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_perfil: {
        Row: {
          area_foco: string | null
          created_at: string
          dores: Json
          idade: number | null
          metas: Json
          nivel: string | null
          nome: string | null
          preferencias: Json
          tipo_usuario: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area_foco?: string | null
          created_at?: string
          dores?: Json
          idade?: number | null
          metas?: Json
          nivel?: string | null
          nome?: string | null
          preferencias?: Json
          tipo_usuario?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area_foco?: string | null
          created_at?: string
          dores?: Json
          idade?: number | null
          metas?: Json
          nivel?: string | null
          nome?: string | null
          preferencias?: Json
          tipo_usuario?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      narracao_livro_paginas: {
        Row: {
          audio_path: string | null
          audio_url: string | null
          caracteres: number | null
          created_at: string
          duracao_segundos: number | null
          erro: string | null
          estilo: string | null
          id: string
          livro_id: string
          livro_tabela: string
          modelo: string | null
          pagina_index: number
          pagina_label: string | null
          status: string
          texto_hash: string | null
          updated_at: string
          voz: string
        }
        Insert: {
          audio_path?: string | null
          audio_url?: string | null
          caracteres?: number | null
          created_at?: string
          duracao_segundos?: number | null
          erro?: string | null
          estilo?: string | null
          id?: string
          livro_id: string
          livro_tabela: string
          modelo?: string | null
          pagina_index: number
          pagina_label?: string | null
          status?: string
          texto_hash?: string | null
          updated_at?: string
          voz: string
        }
        Update: {
          audio_path?: string | null
          audio_url?: string | null
          caracteres?: number | null
          created_at?: string
          duracao_segundos?: number | null
          erro?: string | null
          estilo?: string | null
          id?: string
          livro_id?: string
          livro_tabela?: string
          modelo?: string | null
          pagina_index?: number
          pagina_label?: string | null
          status?: string
          texto_hash?: string | null
          updated_at?: string
          voz?: string
        }
        Relationships: []
      }
      narracao_vozes_config: {
        Row: {
          ativa: boolean
          created_at: string
          descricao: string | null
          genero: string
          padrao: boolean
          updated_at: string
          voz: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          descricao?: string | null
          genero?: string
          padrao?: boolean
          updated_at?: string
          voz: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          descricao?: string | null
          genero?: string
          padrao?: boolean
          updated_at?: string
          voz?: string
        }
        Relationships: []
      }
      narracao_vozes_preview: {
        Row: {
          audio_path: string | null
          audio_url: string | null
          created_at: string
          duracao_segundos: number | null
          estilo: string
          id: string
          texto: string
          texto_hash: string
          updated_at: string
          voz: string
        }
        Insert: {
          audio_path?: string | null
          audio_url?: string | null
          created_at?: string
          duracao_segundos?: number | null
          estilo?: string
          id?: string
          texto: string
          texto_hash: string
          updated_at?: string
          voz: string
        }
        Update: {
          audio_path?: string | null
          audio_url?: string | null
          created_at?: string
          duracao_segundos?: number | null
          estilo?: string
          id?: string
          texto?: string
          texto_hash?: string
          updated_at?: string
          voz?: string
        }
        Relationships: []
      }
      narracoes_artigos: {
        Row: {
          artigo_numero: string
          audio_url: string
          created_at: string | null
          id: string
          lei_nome: string
          tabela_nome: string
          titulo_artigo: string | null
          word_timings: Json | null
        }
        Insert: {
          artigo_numero: string
          audio_url: string
          created_at?: string | null
          id?: string
          lei_nome: string
          tabela_nome: string
          titulo_artigo?: string | null
          word_timings?: Json | null
        }
        Update: {
          artigo_numero?: string
          audio_url?: string
          created_at?: string | null
          id?: string
          lei_nome?: string
          tabela_nome?: string
          titulo_artigo?: string | null
          word_timings?: Json | null
        }
        Relationships: []
      }
      noticias_comentarios: {
        Row: {
          autor_nome: string | null
          comentario: string
          created_at: string
          id: string
          noticia_ref: string
          updated_at: string
          user_id: string
        }
        Insert: {
          autor_nome?: string | null
          comentario: string
          created_at?: string
          id?: string
          noticia_ref: string
          updated_at?: string
          user_id: string
        }
        Update: {
          autor_nome?: string | null
          comentario?: string
          created_at?: string
          id?: string
          noticia_ref?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      noticias_juridicas: {
        Row: {
          categoria: string | null
          conteudo_md: string | null
          created_at: string
          data_publicacao: string
          fonte: string
          id: string
          imagem_url: string | null
          link: string
          resumo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          conteudo_md?: string | null
          created_at?: string
          data_publicacao?: string
          fonte?: string
          id?: string
          imagem_url?: string | null
          link: string
          resumo?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          conteudo_md?: string | null
          created_at?: string
          data_publicacao?: string
          fonte?: string
          id?: string
          imagem_url?: string | null
          link?: string
          resumo?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_read_state: {
        Row: {
          created_at: string
          last_read_at: string
          opened_ids: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          last_read_at?: string
          opened_ids?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          last_read_at?: string
          opened_ids?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      overlay_frases: {
        Row: {
          ativa: boolean
          categoria: string
          created_at: string
          id: string
          legenda: string | null
          ordem: number
          texto: string
          updated_at: string
          voz_preferida: string | null
        }
        Insert: {
          ativa?: boolean
          categoria: string
          created_at?: string
          id?: string
          legenda?: string | null
          ordem?: number
          texto: string
          updated_at?: string
          voz_preferida?: string | null
        }
        Update: {
          ativa?: boolean
          categoria?: string
          created_at?: string
          id?: string
          legenda?: string | null
          ordem?: number
          texto?: string
          updated_at?: string
          voz_preferida?: string | null
        }
        Relationships: []
      }
      peticoes_iniciais: {
        Row: {
          area_direito: string | null
          audio_url: string | null
          created_at: string
          dados_sensiveis: Json
          etapa: number
          fatos_texto: string | null
          fontes: Json
          id: string
          jurisprudencias: Json
          partes: Json
          peca_markdown: string | null
          pedidos: Json
          resumo: string | null
          status: string
          tags: string[]
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_direito?: string | null
          audio_url?: string | null
          created_at?: string
          dados_sensiveis?: Json
          etapa?: number
          fatos_texto?: string | null
          fontes?: Json
          id?: string
          jurisprudencias?: Json
          partes?: Json
          peca_markdown?: string | null
          pedidos?: Json
          resumo?: string | null
          status?: string
          tags?: string[]
          titulo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_direito?: string | null
          audio_url?: string | null
          created_at?: string
          dados_sensiveis?: Json
          etapa?: number
          fatos_texto?: string | null
          fontes?: Json
          id?: string
          jurisprudencias?: Json
          partes?: Json
          peca_markdown?: string | null
          pedidos?: Json
          resumo?: string | null
          status?: string
          tags?: string[]
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      play_subscriptions: {
        Row: {
          auto_renewing: boolean
          base_plan_id: string | null
          cancel_reason: string | null
          created_at: string
          expires_at: string | null
          id: string
          latest_notification_at: string | null
          latest_notification_type: number | null
          linked_purchase_token: string | null
          order_id: string | null
          product_id: string
          purchase_token: string
          raw_payload: Json | null
          start_time: string | null
          status: Database["public"]["Enums"]["play_subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renewing?: boolean
          base_plan_id?: string | null
          cancel_reason?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          latest_notification_at?: string | null
          latest_notification_type?: number | null
          linked_purchase_token?: string | null
          order_id?: string | null
          product_id: string
          purchase_token: string
          raw_payload?: Json | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["play_subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renewing?: boolean
          base_plan_id?: string | null
          cancel_reason?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          latest_notification_at?: string | null
          latest_notification_type?: number | null
          linked_purchase_token?: string | null
          order_id?: string | null
          product_id?: string
          purchase_token?: string
          raw_payload?: Json | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["play_subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      praticar_desafios_cache: {
        Row: {
          artigo_id: string
          gerado_em: string
          payload: Json
          updated_at: string
          versao_texto: string
        }
        Insert: {
          artigo_id: string
          gerado_em?: string
          payload: Json
          updated_at?: string
          versao_texto: string
        }
        Update: {
          artigo_id?: string
          gerado_em?: string
          payload?: Json
          updated_at?: string
          versao_texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "praticar_desafios_cache_artigo_id_fkey"
            columns: ["artigo_id"]
            isOneToOne: true
            referencedRelation: "vade_mecum_artigos"
            referencedColumns: ["id"]
          },
        ]
      }
      praticar_progresso_artigo: {
        Row: {
          acertos_total: number
          artigo_id: string
          created_at: string
          estrelas: number
          id: string
          lei_id: string | null
          melhor_pct: number
          tentativas: number
          ultima_sessao_em: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acertos_total?: number
          artigo_id: string
          created_at?: string
          estrelas?: number
          id?: string
          lei_id?: string | null
          melhor_pct?: number
          tentativas?: number
          ultima_sessao_em?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acertos_total?: number
          artigo_id?: string
          created_at?: string
          estrelas?: number
          id?: string
          lei_id?: string | null
          melhor_pct?: number
          tentativas?: number
          ultima_sessao_em?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "praticar_progresso_artigo_artigo_id_fkey"
            columns: ["artigo_id"]
            isOneToOne: false
            referencedRelation: "vade_mecum_artigos"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_usage: {
        Row: {
          feature: string
          id: string
          ref_key: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          feature: string
          id?: string
          ref_key?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          feature?: string
          id?: string
          ref_key?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          areas_interesse: string[] | null
          bio: string | null
          capa_id: string
          cidade: string | null
          created_at: string
          desktop_onboarding_done_at: string | null
          display_name: string | null
          faixa_etaria: string | null
          horus_onboarded_at: string | null
          id: string
          interacoes_total: number
          interesses: string[] | null
          is_premium: boolean
          locale: string | null
          onboarding_completed_at: string | null
          pais: string | null
          perfil_contexto: string | null
          perfil_tipos: string[] | null
          segundos_em_tela: number
          status_perfil: string | null
          telefone: string | null
          timezone: string | null
          uf: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          areas_interesse?: string[] | null
          bio?: string | null
          capa_id?: string
          cidade?: string | null
          created_at?: string
          desktop_onboarding_done_at?: string | null
          display_name?: string | null
          faixa_etaria?: string | null
          horus_onboarded_at?: string | null
          id: string
          interacoes_total?: number
          interesses?: string[] | null
          is_premium?: boolean
          locale?: string | null
          onboarding_completed_at?: string | null
          pais?: string | null
          perfil_contexto?: string | null
          perfil_tipos?: string[] | null
          segundos_em_tela?: number
          status_perfil?: string | null
          telefone?: string | null
          timezone?: string | null
          uf?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          areas_interesse?: string[] | null
          bio?: string | null
          capa_id?: string
          cidade?: string | null
          created_at?: string
          desktop_onboarding_done_at?: string | null
          display_name?: string | null
          faixa_etaria?: string | null
          horus_onboarded_at?: string | null
          id?: string
          interacoes_total?: number
          interesses?: string[] | null
          is_premium?: boolean
          locale?: string | null
          onboarding_completed_at?: string | null
          pais?: string | null
          perfil_contexto?: string | null
          perfil_tipos?: string[] | null
          segundos_em_tela?: number
          status_perfil?: string | null
          telefone?: string | null
          timezone?: string | null
          uf?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      push_automations: {
        Row: {
          audience: Json
          cooldown_minutos: number
          created_at: string
          default_url: string | null
          descricao: string | null
          emoji: string | null
          enabled: boolean
          id: string
          key: string
          last_run_at: string | null
          nome: string
          quiet_hours_fim: number
          quiet_hours_inicio: number
          updated_at: string
          usa_capa: boolean
          usa_ia: boolean
        }
        Insert: {
          audience?: Json
          cooldown_minutos?: number
          created_at?: string
          default_url?: string | null
          descricao?: string | null
          emoji?: string | null
          enabled?: boolean
          id?: string
          key: string
          last_run_at?: string | null
          nome: string
          quiet_hours_fim?: number
          quiet_hours_inicio?: number
          updated_at?: string
          usa_capa?: boolean
          usa_ia?: boolean
        }
        Update: {
          audience?: Json
          cooldown_minutos?: number
          created_at?: string
          default_url?: string | null
          descricao?: string | null
          emoji?: string | null
          enabled?: boolean
          id?: string
          key?: string
          last_run_at?: string | null
          nome?: string
          quiet_hours_fim?: number
          quiet_hours_inicio?: number
          updated_at?: string
          usa_capa?: boolean
          usa_ia?: boolean
        }
        Relationships: []
      }
      push_campaigns: {
        Row: {
          audience: Json
          automation_key: string | null
          body: string
          click_url: string | null
          converted_count: number
          created_at: string
          created_by: string | null
          delivered_count: number
          emoji: string | null
          failed_count: number
          icon: string | null
          id: string
          image_url: string | null
          last_run_at: string | null
          next_run_at: string | null
          opened_count: number
          recurrence: Json | null
          scheduled_at: string | null
          sent_count: number
          status: string
          tipo: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          audience?: Json
          automation_key?: string | null
          body: string
          click_url?: string | null
          converted_count?: number
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          emoji?: string | null
          failed_count?: number
          icon?: string | null
          id?: string
          image_url?: string | null
          last_run_at?: string | null
          next_run_at?: string | null
          opened_count?: number
          recurrence?: Json | null
          scheduled_at?: string | null
          sent_count?: number
          status?: string
          tipo?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          audience?: Json
          automation_key?: string | null
          body?: string
          click_url?: string | null
          converted_count?: number
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          emoji?: string | null
          failed_count?: number
          icon?: string | null
          id?: string
          image_url?: string | null
          last_run_at?: string | null
          next_run_at?: string | null
          opened_count?: number
          recurrence?: Json | null
          scheduled_at?: string | null
          sent_count?: number
          status?: string
          tipo?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      push_events: {
        Row: {
          campaign_id: string | null
          created_at: string
          error: string | null
          event_type: string
          id: string
          metadata: Json | null
          platform: string | null
          token: string | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          platform?: string | null
          token?: string | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          platform?: string | null
          token?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "push_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      push_open_journey: {
        Row: {
          at: string
          campaign_id: string | null
          id: string
          install_id: string | null
          route: string
          step: number
          title: string | null
          user_id: string | null
        }
        Insert: {
          at?: string
          campaign_id?: string | null
          id?: string
          install_id?: string | null
          route: string
          step?: number
          title?: string | null
          user_id?: string | null
        }
        Update: {
          at?: string
          campaign_id?: string | null
          id?: string
          install_id?: string | null
          route?: string
          step?: number
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_open_journey_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "push_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          enabled: boolean
          endpoint: string
          id: string
          last_seen_at: string | null
          p256dh: string
          platform: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          enabled?: boolean
          endpoint: string
          id?: string
          last_seen_at?: string | null
          p256dh: string
          platform?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          enabled?: boolean
          endpoint?: string
          id?: string
          last_seen_at?: string | null
          p256dh?: string
          platform?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      radar_impactos_leis: {
        Row: {
          aplicado_em: string | null
          aplicado_por: string | null
          artigo_id: string | null
          artigo_numero: string | null
          artigos_afetados: Json
          ato_ementa: string | null
          ato_id: string | null
          ato_url: string | null
          created_at: string
          id: string
          lei_id: string
          resumo_ia: string | null
          run_id: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          aplicado_em?: string | null
          aplicado_por?: string | null
          artigo_id?: string | null
          artigo_numero?: string | null
          artigos_afetados?: Json
          ato_ementa?: string | null
          ato_id?: string | null
          ato_url?: string | null
          created_at?: string
          id?: string
          lei_id: string
          resumo_ia?: string | null
          run_id?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          aplicado_em?: string | null
          aplicado_por?: string | null
          artigo_id?: string | null
          artigo_numero?: string | null
          artigos_afetados?: Json
          ato_ementa?: string | null
          ato_id?: string | null
          ato_url?: string | null
          created_at?: string
          id?: string
          lei_id?: string
          resumo_ia?: string | null
          run_id?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "radar_impactos_leis_artigo_id_fkey"
            columns: ["artigo_id"]
            isOneToOne: false
            referencedRelation: "vade_mecum_artigos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radar_impactos_leis_lei_id_fkey"
            columns: ["lei_id"]
            isOneToOne: false
            referencedRelation: "vade_mecum_leis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radar_impactos_leis_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "radar_leis_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      radar_leis_runs: {
        Row: {
          atos_ids: string[]
          concluido_em: string | null
          erro: string | null
          id: string
          iniciado_em: string
          novos_count: number
          origem: string
          push_campaign_id: string | null
          push_subtitulo: string | null
          push_titulo: string | null
          status: string
        }
        Insert: {
          atos_ids?: string[]
          concluido_em?: string | null
          erro?: string | null
          id?: string
          iniciado_em?: string
          novos_count?: number
          origem?: string
          push_campaign_id?: string | null
          push_subtitulo?: string | null
          push_titulo?: string | null
          status?: string
        }
        Update: {
          atos_ids?: string[]
          concluido_em?: string | null
          erro?: string | null
          id?: string
          iniciado_em?: string
          novos_count?: number
          origem?: string
          push_campaign_id?: string | null
          push_subtitulo?: string | null
          push_titulo?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "radar_leis_runs_push_campaign_id_fkey"
            columns: ["push_campaign_id"]
            isOneToOne: false
            referencedRelation: "push_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_reminders: {
        Row: {
          channels: string[]
          created_at: string
          days_of_week: number[]
          enabled: boolean
          id: string
          last_fired_at: string | null
          livro_area: string | null
          livro_capa: string | null
          livro_id: string | null
          livro_titulo: string | null
          message_style: string
          next_fire_at: string | null
          preset: string
          time_of_day: string
          timezone: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channels?: string[]
          created_at?: string
          days_of_week?: number[]
          enabled?: boolean
          id?: string
          last_fired_at?: string | null
          livro_area?: string | null
          livro_capa?: string | null
          livro_id?: string | null
          livro_titulo?: string | null
          message_style?: string
          next_fire_at?: string | null
          preset?: string
          time_of_day: string
          timezone?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channels?: string[]
          created_at?: string
          days_of_week?: number[]
          enabled?: boolean
          id?: string
          last_fired_at?: string | null
          livro_area?: string | null
          livro_capa?: string | null
          livro_id?: string | null
          livro_titulo?: string | null
          message_style?: string
          next_fire_at?: string | null
          preset?: string
          time_of_day?: string
          timezone?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reels_analises: {
        Row: {
          analise_md: string
          canal: string | null
          criada_em: string
          titulo: string | null
          transcricao: string | null
          video_id: string
        }
        Insert: {
          analise_md: string
          canal?: string | null
          criada_em?: string
          titulo?: string | null
          transcricao?: string | null
          video_id: string
        }
        Update: {
          analise_md?: string
          canal?: string | null
          criada_em?: string
          titulo?: string | null
          transcricao?: string | null
          video_id?: string
        }
        Relationships: []
      }
      reels_comentarios: {
        Row: {
          autor_avatar: string | null
          autor_nome: string | null
          created_at: string
          id: string
          texto: string
          user_id: string
          video_id: string
        }
        Insert: {
          autor_avatar?: string | null
          autor_nome?: string | null
          created_at?: string
          id?: string
          texto: string
          user_id: string
          video_id: string
        }
        Update: {
          autor_avatar?: string | null
          autor_nome?: string | null
          created_at?: string
          id?: string
          texto?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      reels_curtidas: {
        Row: {
          created_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      reminder_dispatch_log: {
        Row: {
          article_ref: string | null
          article_titulo: string | null
          canal: string
          created_at: string
          error: string | null
          id: string
          livro_id: string | null
          livro_titulo: string | null
          reminder_id: string | null
          reminder_type: string
          retry_attempt: number
          status: string
          user_id: string | null
        }
        Insert: {
          article_ref?: string | null
          article_titulo?: string | null
          canal: string
          created_at?: string
          error?: string | null
          id?: string
          livro_id?: string | null
          livro_titulo?: string | null
          reminder_id?: string | null
          reminder_type?: string
          retry_attempt?: number
          status: string
          user_id?: string | null
        }
        Update: {
          article_ref?: string | null
          article_titulo?: string | null
          canal?: string
          created_at?: string
          error?: string | null
          id?: string
          livro_id?: string | null
          livro_titulo?: string | null
          reminder_id?: string | null
          reminder_type?: string
          retry_attempt?: number
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      resenha_diaria: {
        Row: {
          created_at: string | null
          data_dou: string
          data_publicacao: string
          ementa: string
          explicacao: string | null
          id: string
          numero_ato: string
          texto_completo: string | null
          tipo_ato: string
          url: string
        }
        Insert: {
          created_at?: string | null
          data_dou: string
          data_publicacao: string
          ementa: string
          explicacao?: string | null
          id?: string
          numero_ato: string
          texto_completo?: string | null
          tipo_ato: string
          url: string
        }
        Update: {
          created_at?: string | null
          data_dou?: string
          data_publicacao?: string
          ementa?: string
          explicacao?: string | null
          id?: string
          numero_ato?: string
          texto_completo?: string | null
          tipo_ato?: string
          url?: string
        }
        Relationships: []
      }
      resumos_juridicos: {
        Row: {
          area: string
          created_at: string
          exemplos: string | null
          id: string
          markdown: string | null
          ordem_subtema: number | null
          ordem_tema: number | null
          origem_id: number | null
          subtema: string | null
          tema: string
          termos: string | null
          updated_at: string
        }
        Insert: {
          area: string
          created_at?: string
          exemplos?: string | null
          id?: string
          markdown?: string | null
          ordem_subtema?: number | null
          ordem_tema?: number | null
          origem_id?: number | null
          subtema?: string | null
          tema: string
          termos?: string | null
          updated_at?: string
        }
        Update: {
          area?: string
          created_at?: string
          exemplos?: string | null
          id?: string
          markdown?: string | null
          ordem_subtema?: number | null
          ordem_tema?: number | null
          origem_id?: number | null
          subtema?: string | null
          tema?: string
          termos?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      search_hits: {
        Row: {
          created_at: string
          id: string
          termo: string
          termo_norm: string
          tipo: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          termo: string
          termo_norm: string
          tipo?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          termo?: string
          termo_norm?: string
          tipo?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      search_learning: {
        Row: {
          clicks: number
          created_at: string
          hits: number
          id: string
          tags: string[]
          termo_display: string
          termo_norm: string
          top_clicks: number
          top_entity_id: string | null
          top_entity_table: string | null
          top_entity_type: string | null
          top_route: string | null
          top_subtitle: string | null
          top_thumb_url: string | null
          top_title: string | null
          updated_at: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          hits?: number
          id?: string
          tags?: string[]
          termo_display: string
          termo_norm: string
          top_clicks?: number
          top_entity_id?: string | null
          top_entity_table?: string | null
          top_entity_type?: string | null
          top_route?: string | null
          top_subtitle?: string | null
          top_thumb_url?: string | null
          top_title?: string | null
          updated_at?: string
        }
        Update: {
          clicks?: number
          created_at?: string
          hits?: number
          id?: string
          tags?: string[]
          termo_display?: string
          termo_norm?: string
          top_clicks?: number
          top_entity_id?: string | null
          top_entity_table?: string | null
          top_entity_type?: string | null
          top_route?: string | null
          top_subtitle?: string | null
          top_thumb_url?: string | null
          top_title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      smart_link_claims: {
        Row: {
          consumed_at: string | null
          created_at: string
          fingerprint_hash: string
          id: string
          platform: string
          target_path: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          fingerprint_hash: string
          id?: string
          platform?: string
          target_path: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          fingerprint_hash?: string
          id?: string
          platform?: string
          target_path?: string
        }
        Relationships: []
      }
      store_setup_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          step_key: string
          store: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          step_key: string
          store: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          step_key?: string
          store?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_flashcards: {
        Row: {
          artigo_numero: string
          cards: Json
          created_at: string
          id: string
          tabela_nome: string
          updated_at: string
        }
        Insert: {
          artigo_numero: string
          cards: Json
          created_at?: string
          id?: string
          tabela_nome: string
          updated_at?: string
        }
        Update: {
          artigo_numero?: string
          cards?: Json
          created_at?: string
          id?: string
          tabela_nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      study_questions: {
        Row: {
          artigo_numero: string
          created_at: string
          id: string
          questions: Json
          tabela_nome: string
          updated_at: string
        }
        Insert: {
          artigo_numero: string
          created_at?: string
          id?: string
          questions: Json
          tabela_nome: string
          updated_at?: string
        }
        Update: {
          artigo_numero?: string
          created_at?: string
          id?: string
          questions?: Json
          tabela_nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          artigo_numero: string
          correct: number
          created_at: string
          id: string
          mode: string
          tabela_nome: string
          total: number
          user_id: string
        }
        Insert: {
          artigo_numero: string
          correct?: number
          created_at?: string
          id?: string
          mode: string
          tabela_nome: string
          total?: number
          user_id: string
        }
        Update: {
          artigo_numero?: string
          correct?: number
          created_at?: string
          id?: string
          mode?: string
          tabela_nome?: string
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      sumulas_favoritos: {
        Row: {
          created_at: string
          sumula_numero: number
          tribunal: string
          user_id: string
        }
        Insert: {
          created_at?: string
          sumula_numero: number
          tribunal: string
          user_id: string
        }
        Update: {
          created_at?: string
          sumula_numero?: number
          tribunal?: string
          user_id?: string
        }
        Relationships: []
      }
      sumulas_stf: {
        Row: {
          created_at: string
          data_aprovacao: string | null
          enunciado: string
          fonte_publicacao: string | null
          numero: number
          observacao: string | null
          orgao_julgador: string | null
          ramo_direito: string | null
          situacao: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_aprovacao?: string | null
          enunciado: string
          fonte_publicacao?: string | null
          numero: number
          observacao?: string | null
          orgao_julgador?: string | null
          ramo_direito?: string | null
          situacao?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_aprovacao?: string | null
          enunciado?: string
          fonte_publicacao?: string | null
          numero?: number
          observacao?: string | null
          orgao_julgador?: string | null
          ramo_direito?: string | null
          situacao?: string
          updated_at?: string
        }
        Relationships: []
      }
      sumulas_stj: {
        Row: {
          created_at: string
          data_publicacao: string | null
          enunciado: string
          numero: number
          observacao: string | null
          orgao_julgador: string | null
          situacao: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_publicacao?: string | null
          enunciado: string
          numero: number
          observacao?: string | null
          orgao_julgador?: string | null
          situacao?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_publicacao?: string | null
          enunciado?: string
          numero?: number
          observacao?: string | null
          orgao_julgador?: string | null
          situacao?: string
          updated_at?: string
        }
        Relationships: []
      }
      sumulas_vinculantes: {
        Row: {
          created_at: string
          data_publicacao: string | null
          enunciado: string
          extras: Json
          numero: number
          referencia: string | null
          situacao: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_publicacao?: string | null
          enunciado?: string
          extras?: Json
          numero: number
          referencia?: string | null
          situacao?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_publicacao?: string | null
          enunciado?: string
          extras?: Json
          numero?: number
          referencia?: string | null
          situacao?: string
          updated_at?: string
        }
        Relationships: []
      }
      tematica_comentarios: {
        Row: {
          created_at: string
          elogio: boolean
          id: string
          obra_id: string
          texto: string
          user_id: string
        }
        Insert: {
          created_at?: string
          elogio?: boolean
          id?: string
          obra_id: string
          texto: string
          user_id: string
        }
        Update: {
          created_at?: string
          elogio?: boolean
          id?: string
          obra_id?: string
          texto?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tematica_comentarios_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "tematica_juridica_obras"
            referencedColumns: ["id"]
          },
        ]
      }
      tematica_favoritos: {
        Row: {
          created_at: string
          obra_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          obra_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          obra_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tematica_favoritos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "tematica_juridica_obras"
            referencedColumns: ["id"]
          },
        ]
      }
      tematica_juridica_obras: {
        Row: {
          ano: number | null
          ativo: boolean
          backdrop_url: string | null
          categorias_juridicas: string[] | null
          created_at: string
          destaque: boolean
          duracao_min: number | null
          elenco: Json | null
          generos: string[] | null
          habilidades: string[]
          homepage: string | null
          id: string
          nota: number | null
          ordem: number
          porque_assistir: string | null
          poster_url: string | null
          providers: Json | null
          sinopse: string | null
          tipo: string
          titulo: string
          titulo_original: string | null
          tmdb_id: number
          trailer_youtube_id: string | null
          updated_at: string
        }
        Insert: {
          ano?: number | null
          ativo?: boolean
          backdrop_url?: string | null
          categorias_juridicas?: string[] | null
          created_at?: string
          destaque?: boolean
          duracao_min?: number | null
          elenco?: Json | null
          generos?: string[] | null
          habilidades?: string[]
          homepage?: string | null
          id?: string
          nota?: number | null
          ordem?: number
          porque_assistir?: string | null
          poster_url?: string | null
          providers?: Json | null
          sinopse?: string | null
          tipo: string
          titulo: string
          titulo_original?: string | null
          tmdb_id: number
          trailer_youtube_id?: string | null
          updated_at?: string
        }
        Update: {
          ano?: number | null
          ativo?: boolean
          backdrop_url?: string | null
          categorias_juridicas?: string[] | null
          created_at?: string
          destaque?: boolean
          duracao_min?: number | null
          elenco?: Json | null
          generos?: string[] | null
          habilidades?: string[]
          homepage?: string | null
          id?: string
          nota?: number | null
          ordem?: number
          porque_assistir?: string | null
          poster_url?: string | null
          providers?: Json | null
          sinopse?: string | null
          tipo?: string
          titulo?: string
          titulo_original?: string | null
          tmdb_id?: number
          trailer_youtube_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tematica_metricas: {
        Row: {
          created_at: string
          evento: string
          id: string
          obra_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          evento: string
          id?: string
          obra_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          evento?: string
          id?: string
          obra_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tematica_metricas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "tematica_juridica_obras"
            referencedColumns: ["id"]
          },
        ]
      }
      tematica_watchlist: {
        Row: {
          created_at: string
          obra_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          obra_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          obra_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tematica_watchlist_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "tematica_juridica_obras"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_reminders: {
        Row: {
          channels: Json
          created_at: string
          id: string
          plano: string
          reminder_at: string
          sent_at: string | null
          status: string
          trial_days: number
          trial_ends_at: string
          trial_started_at: string
          user_id: string
        }
        Insert: {
          channels?: Json
          created_at?: string
          id?: string
          plano: string
          reminder_at: string
          sent_at?: string | null
          status?: string
          trial_days: number
          trial_ends_at: string
          trial_started_at?: string
          user_id: string
        }
        Update: {
          channels?: Json
          created_at?: string
          id?: string
          plano?: string
          reminder_at?: string
          sent_at?: string | null
          status?: string
          trial_days?: number
          trial_ends_at?: string
          trial_started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          created_at: string
          current_route: string | null
          display_name: string | null
          email: string | null
          id: string
          last_seen_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_route?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          last_seen_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_route?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          last_seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity_state: {
        Row: {
          device_hint: string | null
          kind: string
          label: string
          path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          device_hint?: string | null
          kind?: string
          label: string
          path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          device_hint?: string | null
          kind?: string
          label?: string
          path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          highlights: Json | null
          id: string
          theme_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          highlights?: Json | null
          id?: string
          theme_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          highlights?: Json | null
          id?: string
          theme_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reminder_preferences: {
        Row: {
          created_at: string
          default_time: string
          failure_alerts: boolean
          horus_enabled: boolean
          push_enabled: boolean
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_time?: string
          failure_alerts?: boolean
          horus_enabled?: boolean
          push_enabled?: boolean
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_time?: string
          failure_alerts?: boolean
          horus_enabled?: boolean
          push_enabled?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reminders: {
        Row: {
          ativo: boolean
          created_at: string
          dias: string[]
          horario: string
          id: string
          local_notification_ids: number[] | null
          mensagem_tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dias?: string[]
          horario?: string
          id?: string
          local_notification_ids?: number[] | null
          mensagem_tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dias?: string[]
          horario?: string
          id?: string
          local_notification_ids?: number[] | null
          mensagem_tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          cidade: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          initial_route: string | null
          locale: string | null
          pais: string | null
          platform: string | null
          started_at: string
          timezone: string | null
          uf: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          initial_route?: string | null
          locale?: string | null
          pais?: string | null
          platform?: string | null
          started_at?: string
          timezone?: string | null
          uf?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          cidade?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          initial_route?: string | null
          locale?: string | null
          pais?: string | null
          platform?: string | null
          started_at?: string
          timezone?: string | null
          uf?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          auto_renewing: boolean
          created_at: string
          expires_at: string | null
          id: string
          platform: string
          product_id: string
          purchase_token: string
          raw_payload: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renewing?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          platform?: string
          product_id: string
          purchase_token: string
          raw_payload?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renewing?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          platform?: string
          product_id?: string
          purchase_token?: string
          raw_payload?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vade_mecum_artigos: {
        Row: {
          alteracoes: Json | null
          comentario: string | null
          created_at: string
          epigrafe: string | null
          exemplo: string | null
          explicacao_resumido: string | null
          explicacao_simples_maior16: string | null
          explicacao_simples_menor16: string | null
          explicacao_tecnico: string | null
          flashcards: Json | null
          id: string
          lei_id: string
          narracao_url: string | null
          numero: string | null
          ordem: number
          planalto_url: string | null
          questoes: Json | null
          relevancia: string | null
          relevancia_nota: string | null
          revogado: boolean | null
          termos: Json | null
          texto: string
          ult_alteracao_em: string | null
          updated_at: string
        }
        Insert: {
          alteracoes?: Json | null
          comentario?: string | null
          created_at?: string
          epigrafe?: string | null
          exemplo?: string | null
          explicacao_resumido?: string | null
          explicacao_simples_maior16?: string | null
          explicacao_simples_menor16?: string | null
          explicacao_tecnico?: string | null
          flashcards?: Json | null
          id?: string
          lei_id: string
          narracao_url?: string | null
          numero?: string | null
          ordem?: number
          planalto_url?: string | null
          questoes?: Json | null
          relevancia?: string | null
          relevancia_nota?: string | null
          revogado?: boolean | null
          termos?: Json | null
          texto: string
          ult_alteracao_em?: string | null
          updated_at?: string
        }
        Update: {
          alteracoes?: Json | null
          comentario?: string | null
          created_at?: string
          epigrafe?: string | null
          exemplo?: string | null
          explicacao_resumido?: string | null
          explicacao_simples_maior16?: string | null
          explicacao_simples_menor16?: string | null
          explicacao_tecnico?: string | null
          flashcards?: Json | null
          id?: string
          lei_id?: string
          narracao_url?: string | null
          numero?: string | null
          ordem?: number
          planalto_url?: string | null
          questoes?: Json | null
          relevancia?: string | null
          relevancia_nota?: string | null
          revogado?: boolean | null
          termos?: Json | null
          texto?: string
          ult_alteracao_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vade_mecum_artigos_lei_id_fkey"
            columns: ["lei_id"]
            isOneToOne: false
            referencedRelation: "vade_mecum_leis"
            referencedColumns: ["id"]
          },
        ]
      }
      vade_mecum_bulk_runs: {
        Row: {
          created_at: string
          falhas: number
          finalizado_em: string | null
          id: string
          iniciado_em: string | null
          next_at: string | null
          processados: number
          status: string
          sucessos: number
          tempo_medio_ms: number | null
          total: number
          uf: string
          ultimo_erro: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          falhas?: number
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string | null
          next_at?: string | null
          processados?: number
          status?: string
          sucessos?: number
          tempo_medio_ms?: number | null
          total?: number
          uf: string
          ultimo_erro?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          falhas?: number
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string | null
          next_at?: string | null
          processados?: number
          status?: string
          sucessos?: number
          tempo_medio_ms?: number | null
          total?: number
          uf?: string
          ultimo_erro?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vade_mecum_ingest_jobs: {
        Row: {
          categoria: string | null
          erro_msg: string | null
          executado_em: string
          executado_por: string | null
          id: string
          lei_nome: string | null
          lei_slug: string
          log: string | null
          nome_curto: string | null
          planalto_url: string | null
          proxima_tentativa_em: string | null
          status: string
          tentativas: number
          total_artigos: number | null
          usar_browserless: boolean
        }
        Insert: {
          categoria?: string | null
          erro_msg?: string | null
          executado_em?: string
          executado_por?: string | null
          id?: string
          lei_nome?: string | null
          lei_slug: string
          log?: string | null
          nome_curto?: string | null
          planalto_url?: string | null
          proxima_tentativa_em?: string | null
          status?: string
          tentativas?: number
          total_artigos?: number | null
          usar_browserless?: boolean
        }
        Update: {
          categoria?: string | null
          erro_msg?: string | null
          executado_em?: string
          executado_por?: string | null
          id?: string
          lei_nome?: string | null
          lei_slug?: string
          log?: string | null
          nome_curto?: string | null
          planalto_url?: string | null
          proxima_tentativa_em?: string | null
          status?: string
          tentativas?: number
          total_artigos?: number | null
          usar_browserless?: boolean
        }
        Relationships: []
      }
      vade_mecum_lei_snapshots: {
        Row: {
          created_at: string
          data_ultima_alteracao_detectada: string | null
          lei_id: string
          raw_html_bytes: number | null
          status: string
          texto_hash: string | null
          ultimo_diff: Json | null
          updated_at: string
          verificado_em: string
        }
        Insert: {
          created_at?: string
          data_ultima_alteracao_detectada?: string | null
          lei_id: string
          raw_html_bytes?: number | null
          status?: string
          texto_hash?: string | null
          ultimo_diff?: Json | null
          updated_at?: string
          verificado_em?: string
        }
        Update: {
          created_at?: string
          data_ultima_alteracao_detectada?: string | null
          lei_id?: string
          raw_html_bytes?: number | null
          status?: string
          texto_hash?: string | null
          ultimo_diff?: Json | null
          updated_at?: string
          verificado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "vade_mecum_lei_snapshots_lei_id_fkey"
            columns: ["lei_id"]
            isOneToOne: true
            referencedRelation: "vade_mecum_leis"
            referencedColumns: ["id"]
          },
        ]
      }
      vade_mecum_leis: {
        Row: {
          ano_lei: number | null
          categoria: string
          created_at: string
          ementa: string | null
          id: string
          nome: string
          nome_curto: string | null
          numero_lei: string | null
          ordem: number
          planalto_url: string | null
          slug: string
          total_artigos: number
          ultima_reextracao_em: string | null
          ultima_reextracao_por: string | null
          updated_at: string
        }
        Insert: {
          ano_lei?: number | null
          categoria?: string
          created_at?: string
          ementa?: string | null
          id?: string
          nome: string
          nome_curto?: string | null
          numero_lei?: string | null
          ordem?: number
          planalto_url?: string | null
          slug: string
          total_artigos?: number
          ultima_reextracao_em?: string | null
          ultima_reextracao_por?: string | null
          updated_at?: string
        }
        Update: {
          ano_lei?: number | null
          categoria?: string
          created_at?: string
          ementa?: string | null
          id?: string
          nome?: string
          nome_curto?: string | null
          numero_lei?: string | null
          ordem?: number
          planalto_url?: string | null
          slug?: string
          total_artigos?: number
          ultima_reextracao_em?: string | null
          ultima_reextracao_por?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vade_mecum_leis_estaduais_catalog: {
        Row: {
          ano: number | null
          data_publicacao: string | null
          discovered_at: string
          ementa: string | null
          erro_populacao: string | null
          hash_conteudo: string | null
          hash_texto: string | null
          id: string
          last_seen_at: string
          lei_id: string | null
          metadata: Json
          numero: string | null
          revisao_at: string | null
          status: string
          tipo: string
          titulo: string | null
          uf: string
          updated_at: string
          url_original: string
          url_texto_integral: string | null
        }
        Insert: {
          ano?: number | null
          data_publicacao?: string | null
          discovered_at?: string
          ementa?: string | null
          erro_populacao?: string | null
          hash_conteudo?: string | null
          hash_texto?: string | null
          id?: string
          last_seen_at?: string
          lei_id?: string | null
          metadata?: Json
          numero?: string | null
          revisao_at?: string | null
          status?: string
          tipo: string
          titulo?: string | null
          uf: string
          updated_at?: string
          url_original: string
          url_texto_integral?: string | null
        }
        Update: {
          ano?: number | null
          data_publicacao?: string | null
          discovered_at?: string
          ementa?: string | null
          erro_populacao?: string | null
          hash_conteudo?: string | null
          hash_texto?: string | null
          id?: string
          last_seen_at?: string
          lei_id?: string | null
          metadata?: Json
          numero?: string | null
          revisao_at?: string | null
          status?: string
          tipo?: string
          titulo?: string | null
          uf?: string
          updated_at?: string
          url_original?: string
          url_texto_integral?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vade_mecum_leis_estaduais_catalog_lei_id_fkey"
            columns: ["lei_id"]
            isOneToOne: false
            referencedRelation: "vade_mecum_leis"
            referencedColumns: ["id"]
          },
        ]
      }
      vade_mecum_portal_snapshots: {
        Row: {
          created_at: string
          duracao_verificacao_seg: number | null
          id: string
          novas: number
          por_tipo: Json
          removidas: number
          tempo_estimado_min: number | null
          total: number
          uf: string
          verificado_at: string
        }
        Insert: {
          created_at?: string
          duracao_verificacao_seg?: number | null
          id?: string
          novas?: number
          por_tipo?: Json
          removidas?: number
          tempo_estimado_min?: number | null
          total?: number
          uf: string
          verificado_at?: string
        }
        Update: {
          created_at?: string
          duracao_verificacao_seg?: number | null
          id?: string
          novas?: number
          por_tipo?: Json
          removidas?: number
          tempo_estimado_min?: number | null
          total?: number
          uf?: string
          verificado_at?: string
        }
        Relationships: []
      }
      videoaula_comentarios: {
        Row: {
          autor_nome: string | null
          created_at: string
          id: string
          texto: string
          user_id: string
          video_id: string
        }
        Insert: {
          autor_nome?: string | null
          created_at?: string
          id?: string
          texto: string
          user_id: string
          video_id: string
        }
        Update: {
          autor_nome?: string | null
          created_at?: string
          id?: string
          texto?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      videoaula_conteudo: {
        Row: {
          artigo_numero: string | null
          canal: string | null
          created_at: string
          dislikes_count: number
          flashcards: Json | null
          likes_count: number
          questoes: Json | null
          resumo_md: string | null
          tabela_nome: string | null
          titulo: string | null
          transcricao: string | null
          updated_at: string
          video_id: string
        }
        Insert: {
          artigo_numero?: string | null
          canal?: string | null
          created_at?: string
          dislikes_count?: number
          flashcards?: Json | null
          likes_count?: number
          questoes?: Json | null
          resumo_md?: string | null
          tabela_nome?: string | null
          titulo?: string | null
          transcricao?: string | null
          updated_at?: string
          video_id: string
        }
        Update: {
          artigo_numero?: string | null
          canal?: string | null
          created_at?: string
          dislikes_count?: number
          flashcards?: Json | null
          likes_count?: number
          questoes?: Json | null
          resumo_md?: string | null
          tabela_nome?: string | null
          titulo?: string | null
          transcricao?: string | null
          updated_at?: string
          video_id?: string
        }
        Relationships: []
      }
      videoaula_reacoes: {
        Row: {
          created_at: string
          tipo: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          tipo: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          tipo?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_ai_usage_actors: {
        Args: { _user_ids: string[] }
        Returns: {
          display_name: string
          email: string
          user_id: string
        }[]
      }
      admin_gerenciar_usuario: {
        Args: { _acao: string; _user_id: string }
        Returns: Json
      }
      admin_get_open_journey: {
        Args: { _campaign_id: string; _install_id: string; _user_id: string }
        Returns: {
          at: string
          route: string
          step: number
          title: string
        }[]
      }
      admin_lembretes_biblioteca_recent: {
        Args: { _limit?: number }
        Returns: {
          canal: string
          created_at: string
          display_name: string
          email: string
          error: string
          id: string
          livro_id: string
          livro_titulo: string
          status: string
          user_id: string
        }[]
      }
      admin_lembretes_biblioteca_stats: {
        Args: { _dias?: number }
        Returns: Json
      }
      admin_lembretes_biblioteca_top_livros: {
        Args: { _limit?: number }
        Returns: {
          livro_capa: string
          livro_id: string
          livro_titulo: string
          total: number
          usuarios: number
        }[]
      }
      admin_lembretes_biblioteca_top_users: {
        Args: { _limit?: number }
        Returns: {
          ativos: number
          display_name: string
          email: string
          total: number
          user_id: string
        }[]
      }
      admin_list_opens_today: {
        Args: never
        Returns: {
          campaign_id: string
          campaign_title: string
          display_name: string
          email: string
          event_id: string
          install_id: string
          opened_at: string
          platform: string
          user_id: string
        }[]
      }
      admin_lista_dia: {
        Args: { _dia: string; _tipo: string }
        Returns: {
          acessos: number
          at: string
          email: string
          key: string
          subtitle: string
          title: string
          user_id: string
        }[]
      }
      admin_lista_provider: {
        Args: { _provider: string; _tipo: string }
        Returns: {
          criado_em: string
          email: string
          nome: string
          provider: string
          user_id: string
        }[]
      }
      admin_metricas_dia: { Args: { _dia: string }; Returns: Json }
      admin_push_status_usuario: { Args: { _user_id: string }; Returns: Json }
      admin_totais: { Args: { _tipo: string }; Returns: Json }
      admin_user_auth_providers: {
        Args: { _ids: string[] }
        Returns: {
          email: string
          provider: string
          user_id: string
        }[]
      }
      admin_user_geo: {
        Args: { _user_id: string }
        Returns: {
          at: string
          cidade: string
          locale: string
          pais: string
          platform: string
          timezone: string
          uf: string
        }[]
      }
      aplicar_hierarquia_lei: {
        Args: {
          _art_ids: string[]
          _art_ordens: number[]
          _hier_numeros: string[]
          _hier_ordens: number[]
          _hier_textos: string[]
          _lei_id: string
        }
        Returns: Json
      }
      aprender_revisoes_devidas: {
        Args: { p_user_id: string }
        Returns: number
      }
      aprender_streak_atual: { Args: { p_user_id: string }; Returns: number }
      blog_posts_trending: {
        Args: { _dias?: number; _limit?: number }
        Returns: {
          likes: number
          post_id: string
          score: number
          views: number
        }[]
      }
      buscar_conteudo: {
        Args: { _limit?: number; _termo: string; _tipo?: string }
        Returns: {
          entity_id: string
          entity_table: string
          entity_type: string
          route: string
          score: number
          snippet: string
          subtitle: string
          thumb_url: string
          title: string
        }[]
      }
      earth: { Args: never; Returns: number }
      estatisticas_estudo: {
        Args: { p_user_id: string }
        Returns: {
          pct_acerto: number
          tabela_nome: string
          total_corretas: number
          total_questoes: number
          total_sessoes: number
        }[]
      }
      get_design_prompt_for_categoria: {
        Args: { _categoria: string }
        Returns: string
      }
      get_estatuto_head: {
        Args: { _limit?: number; _slug: string }
        Returns: Json
      }
      get_estatuto_tail: {
        Args: { _offset?: number; _slug: string }
        Returns: Json
      }
      get_estatuto_user: {
        Args: { _slug: string; _user_id: string }
        Returns: Json
      }
      horus_transferir_numero: {
        Args: { _new_user_id: string; _phone: string }
        Returns: Json
      }
      increment_dicionario_click: {
        Args: { p_palavra: string }
        Returns: undefined
      }
      increment_user_metrics: {
        Args: { p_clicks: number; p_seconds: number }
        Returns: undefined
      }
      is_admin_email: { Args: never; Returns: boolean }
      is_admin_user: { Args: { _user_id: string }; Returns: boolean }
      is_premium_user: { Args: { _user_id: string }; Returns: boolean }
      locais_proximos: {
        Args: {
          _categorias?: string[]
          _lat: number
          _limite?: number
          _lng: number
          _raio_km?: number
        }
        Returns: {
          categoria: string
          cidade: string
          dist_km: number
          endereco: string
          fonte: string
          horario: Json
          id: string
          lat: number
          lng: number
          nome: string
          osm_id: string
          site: string
          telefone: string
          uf: string
        }[]
      }
      local_estatisticas: { Args: { _local_id: string }; Returns: Json }
      match_horus_memoria: {
        Args: {
          _match_count?: number
          _query_embedding: string
          _user_phone: string
        }
        Returns: {
          id: string
          kind: string
          similarity: number
          texto: string
        }[]
      }
      recalcular_dominio_area: {
        Args: { p_area_id: string; p_user_id: string }
        Returns: undefined
      }
      registrar_busca_click: {
        Args: {
          _entity_id: string
          _entity_table: string
          _entity_type: string
          _route: string
          _subtitle: string
          _termo: string
          _thumb_url: string
          _title: string
        }
        Returns: undefined
      }
      set_videoaula_reacao: {
        Args: { _tipo: string; _video_id: string }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      sugerir_busca: {
        Args: { _limit?: number; _prefix: string }
        Returns: {
          clicks: number
          hits: number
          termo_display: string
          top_entity_type: string
          top_route: string
          top_subtitle: string
          top_thumb_url: string
          top_title: string
        }[]
      }
      tematica_ranking_engajamento: {
        Args: { periodo_dias?: number }
        Returns: {
          comentarios: number
          favoritos: number
          obra_id: string
          score: number
          views: number
        }[]
      }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      boletim_tipo_norma:
        | "lei"
        | "decreto"
        | "medida_provisoria"
        | "portaria"
        | "resolucao"
        | "instrucao_normativa"
        | "generico"
      play_subscription_status:
        | "SUBSCRIPTION_STATE_UNSPECIFIED"
        | "SUBSCRIPTION_STATE_PENDING"
        | "SUBSCRIPTION_STATE_ACTIVE"
        | "SUBSCRIPTION_STATE_PAUSED"
        | "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"
        | "SUBSCRIPTION_STATE_ON_HOLD"
        | "SUBSCRIPTION_STATE_CANCELED"
        | "SUBSCRIPTION_STATE_EXPIRED"
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
      boletim_tipo_norma: [
        "lei",
        "decreto",
        "medida_provisoria",
        "portaria",
        "resolucao",
        "instrucao_normativa",
        "generico",
      ],
      play_subscription_status: [
        "SUBSCRIPTION_STATE_UNSPECIFIED",
        "SUBSCRIPTION_STATE_PENDING",
        "SUBSCRIPTION_STATE_ACTIVE",
        "SUBSCRIPTION_STATE_PAUSED",
        "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
        "SUBSCRIPTION_STATE_ON_HOLD",
        "SUBSCRIPTION_STATE_CANCELED",
        "SUBSCRIPTION_STATE_EXPIRED",
      ],
    },
  },
} as const
