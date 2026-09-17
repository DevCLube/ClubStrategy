export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      alunos: {
        Row: {
          data_cadastro: string;
          id: string;
          idade: number;
          matricula: string;
          nome: string;
        };
        Insert: {
          data_cadastro: string;
          id: string;
          idade: number;
          matricula: string;
          nome: string;
        };
        Update: {
          data_cadastro?: string;
          id?: string;
          idade?: number;
          matricula?: string;
          nome?: string;
        };
        Relationships: [];
      };
      categorias: {
        Row: {
          icone: string | null;
          id: string;
          nome: string;
        };
        Insert: {
          icone?: string | null;
          id: string;
          nome: string;
        };
        Update: {
          icone?: string | null;
          id?: string;
          nome?: string;
        };
        Relationships: [];
      };
      estado_app: {
        Row: {
          atualizado_em: string;
          dados: Json;
          id: string;
        };
        Insert: {
          atualizado_em?: string;
          dados: Json;
          id: string;
        };
        Update: {
          atualizado_em?: string;
          dados?: Json;
          id?: string;
        };
        Relationships: [];
      };
      historico: {
        Row: {
          acao: string;
          aluno_id: string | null;
          aluno_idade: number | null;
          aluno_matricula: string | null;
          aluno_nome: string | null;
          categoria: string | null;
          data_hora: string;
          detalhe: string | null;
          dia: string | null;
          horario: string | null;
          id: string;
          lista: string | null;
          turma_id: string | null;
          turma_nome: string | null;
        };
        Insert: {
          acao: string;
          aluno_id?: string | null;
          aluno_idade?: number | null;
          aluno_matricula?: string | null;
          aluno_nome?: string | null;
          categoria?: string | null;
          data_hora: string;
          detalhe?: string | null;
          dia?: string | null;
          horario?: string | null;
          id: string;
          lista?: string | null;
          turma_id?: string | null;
          turma_nome?: string | null;
        };
        Update: {
          acao?: string;
          aluno_id?: string | null;
          aluno_idade?: number | null;
          aluno_matricula?: string | null;
          aluno_nome?: string | null;
          categoria?: string | null;
          data_hora?: string;
          detalhe?: string | null;
          dia?: string | null;
          horario?: string | null;
          id?: string;
          lista?: string | null;
          turma_id?: string | null;
          turma_nome?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "historico_aluno_id_fkey";
            columns: ["aluno_id"];
            isOneToOne: false;
            referencedRelation: "alunos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "historico_turma_id_fkey";
            columns: ["turma_id"];
            isOneToOne: false;
            referencedRelation: "turmas";
            referencedColumns: ["id"];
          },
        ];
      };
      matriculas: {
        Row: {
          aluno_id: string;
          data_espera: string | null;
          data_matricula: string;
          id: string;
          ordem: number;
          status: string;
          turma_id: string;
        };
        Insert: {
          aluno_id: string;
          data_espera?: string | null;
          data_matricula: string;
          id: string;
          ordem?: number;
          status: string;
          turma_id: string;
        };
        Update: {
          aluno_id?: string;
          data_espera?: string | null;
          data_matricula?: string;
          id?: string;
          ordem?: number;
          status?: string;
          turma_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matriculas_aluno_id_fkey";
            columns: ["aluno_id"];
            isOneToOne: false;
            referencedRelation: "alunos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matriculas_turma_id_fkey";
            columns: ["turma_id"];
            isOneToOne: false;
            referencedRelation: "turmas";
            referencedColumns: ["id"];
          },
        ];
      };
      professor_modalidade: {
        Row: {
          categoria_id: string;
          professor_id: string;
        };
        Insert: {
          categoria_id: string;
          professor_id: string;
        };
        Update: {
          categoria_id?: string;
          professor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "professor_modalidade_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "professor_modalidade_professor_id_fkey";
            columns: ["professor_id"];
            isOneToOne: false;
            referencedRelation: "professores";
            referencedColumns: ["id"];
          },
        ];
      };
      professores: {
        Row: {
          id: string;
          nome: string;
        };
        Insert: {
          id: string;
          nome: string;
        };
        Update: {
          id?: string;
          nome?: string;
        };
        Relationships: [];
      };
      turmas: {
        Row: {
          categoria_id: string;
          dia_semana: string;
          horario: string;
          id: string;
          limite: number;
          nome: string;
          professor: string;
          professor_id: string | null;
          sala: string;
        };
        Insert: {
          categoria_id: string;
          dia_semana: string;
          horario: string;
          id: string;
          limite: number;
          nome: string;
          professor: string;
          professor_id?: string | null;
          sala: string;
        };
        Update: {
          categoria_id?: string;
          dia_semana?: string;
          horario?: string;
          id?: string;
          limite?: number;
          nome?: string;
          professor?: string;
          professor_id?: string | null;
          sala?: string;
        };
        Relationships: [
          {
            foreignKeyName: "turmas_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "turmas_professor_id_fkey";
            columns: ["professor_id"];
            isOneToOne: false;
            referencedRelation: "professores";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
