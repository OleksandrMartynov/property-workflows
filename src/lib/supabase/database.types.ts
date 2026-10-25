// Типи схеми бази. Оновлюйте разом із міграцією: готовий файл — у Summary прогону job db-check у CI
// (supabase gen types typescript --local на одноразовій базі); або npm run db:types після npx supabase link на ваш проєкт.
// Ця версія описує таблиці й функції з міграцій 20261012000000_profiles_and_roles.sql, 20261019174350_run_launch.sql, 20261019174954_complete_task.sql, 20261019183128_run_progress_view.sql, 20261021093026_launch_run_drop_stale_assignments.sql і 20261021093442_complete_task_confirmation.sql.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      templates: {
        Row: { id: string; name: string; created_at: string; current_version: number | null; has_unpublished_changes: boolean };
        Insert: { id?: string; name: string; created_at?: string; current_version?: number | null; has_unpublished_changes?: boolean };
        Update: { id?: string; name?: string; created_at?: string; current_version?: number | null; has_unpublished_changes?: boolean };
        Relationships: [];
      };
      template_versions: {
        Row: { id: string; template_id: string; number: number; name: string; saved_at: string; saved_by: string | null };
        Insert: { id?: string; template_id: string; number: number; name: string; saved_at?: string; saved_by?: string | null };
        Update: { id?: string; template_id?: string; number?: number; name?: string; saved_at?: string; saved_by?: string | null };
        Relationships: [
          {
            foreignKeyName: "template_versions_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "template_versions_saved_by_fkey";
            columns: ["saved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      template_version_tasks: {
        Row: {
          id: string;
          version_id: string;
          template_task_id: string;
          section_name: string;
          section_position: number;
          position: number;
          name: string;
          required: boolean;
        };
        Insert: {
          id?: string;
          version_id: string;
          template_task_id: string;
          section_name: string;
          section_position: number;
          position: number;
          name: string;
          required: boolean;
        };
        Update: {
          id?: string;
          version_id?: string;
          template_task_id?: string;
          section_name?: string;
          section_position?: number;
          position?: number;
          name?: string;
          required?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "template_version_tasks_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "template_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      template_sections: {
        Row: { id: string; template_id: string; name: string; position: number };
        Insert: { id?: string; template_id: string; name: string; position?: number };
        Update: { id?: string; template_id?: string; name?: string; position?: number };
        Relationships: [
          {
            foreignKeyName: "template_sections_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "templates";
            referencedColumns: ["id"];
          },
        ];
      };
      template_tasks: {
        Row: { id: string; section_id: string; name: string; required: boolean; position: number };
        Insert: { id?: string; section_id: string; name: string; required?: boolean; position?: number };
        Update: { id?: string; section_id?: string; name?: string; required?: boolean; position?: number };
        Relationships: [
          {
            foreignKeyName: "template_tasks_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "template_sections";
            referencedColumns: ["id"];
          },
        ];
      };
      runs: {
        Row: {
          id: string;
          template_id: string | null;
          template_name: string;
          template_version: number | null;
          case_name: string;
          run_manager_id: string;
          status: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          template_id?: string | null;
          template_name: string;
          template_version?: number | null;
          case_name: string;
          run_manager_id: string;
          status?: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          template_id?: string | null;
          template_name?: string;
          template_version?: number | null;
          case_name?: string;
          run_manager_id?: string;
          status?: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "runs_run_manager_id_fkey";
            columns: ["run_manager_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "runs_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "templates";
            referencedColumns: ["id"];
          },
        ];
      };
      run_tasks: {
        Row: {
          id: string;
          run_id: string;
          template_task_id: string | null;
          section_name: string;
          section_position: number;
          position: number;
          name: string;
          required: boolean;
          assignee_id: string;
          status: string;
          done_at: string | null;
          done_by: string | null;
        };
        Insert: {
          id?: string;
          run_id: string;
          template_task_id?: string | null;
          section_name: string;
          section_position?: number;
          position?: number;
          name: string;
          required: boolean;
          assignee_id: string;
          status?: string;
          done_at?: string | null;
          done_by?: string | null;
        };
        Update: {
          id?: string;
          run_id?: string;
          template_task_id?: string | null;
          section_name?: string;
          section_position?: number;
          position?: number;
          name?: string;
          required?: boolean;
          assignee_id?: string;
          status?: string;
          done_at?: string | null;
          done_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "run_tasks_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "runs";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      run_progress: {
        Row: { run_id: string | null; done: number | null; total: number | null };
        Relationships: [
          {
            foreignKeyName: "run_tasks_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "runs";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      add_template_section: {
        Args: { p_name: string; p_template_id: string };
        Returns: string;
      };
      add_template_task: {
        Args: { p_name: string; p_required: boolean; p_section_id: string; p_template_id: string };
        Returns: string;
      };
      complete_task: {
        Args: { p_task_id: string; p_confirmed?: boolean };
        Returns: { task_status: string; run_status: string }[];
      };
      launch_run: {
        Args: { p_template_id: string; p_case_name: string; p_assignees?: Json };
        Returns: string;
      };
      list_assignable_users: {
        Args: Record<PropertyKey, never>;
        Returns: { id: string; email: string }[];
      };
      list_template_drafts: {
        Args: Record<PropertyKey, never>;
        Returns: { id: string; name: string; current_version: number | null; has_unpublished_changes: boolean }[];
      };
      move_template_item: {
        Args: { p_direction: string; p_id: string; p_kind: string; p_template_id: string };
        Returns: undefined;
      };
      move_template_task_to_section: {
        Args: { p_section_id: string; p_task_id: string; p_template_id: string };
        Returns: undefined;
      };
      save_template_version: {
        Args: { p_template_id: string };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
