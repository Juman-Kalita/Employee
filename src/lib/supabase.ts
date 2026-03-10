import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string;
          name: string;
          email: string;
          password: string;
          role: string;
          status: 'active' | 'inactive';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['employees']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['employees']['Insert']>;
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string;
          assigned_to: string;
          expected_time: number;
          deadline: string;
          priority: 'low' | 'medium' | 'high';
          status: 'pending' | 'in-progress' | 'completed';
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
          actual_time: number | null;
          efficiency: number | null;
        };
        Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          message: string;
          read: boolean;
          for_user: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
    };
  };
}
