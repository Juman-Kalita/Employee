import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { User, UserRole } from "./types";
import { supabase } from "./supabase";

interface AuthContextType {
  user: User | null;
  login: (nameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Admin account check
const ADMIN_EMAIL = "admin@worktrack.com";
const ADMIN_ID = "00000000-0000-0000-0000-000000000001";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { 
      const s = localStorage.getItem("worktrack_user"); 
      return s ? JSON.parse(s) : null; 
    } catch { 
      return null; 
    }
  });
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (nameOrEmail: string, password: string) => {
    setLoading(true);
    try {
      // Try to find employee by name first, then by email
      let query = supabase
        .from('employees')
        .select('*')
        .eq('password', password)
        .eq('status', 'active');

      // Check if input looks like an email (contains @)
      if (nameOrEmail.includes('@')) {
        query = query.eq('email', nameOrEmail);
      } else {
        query = query.eq('name', nameOrEmail);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        setLoading(false);
        return { success: false, error: "Invalid name/email or password" };
      }

      // Determine role based on email or specific admin ID
      const role: UserRole = (data.email === ADMIN_EMAIL || data.id === ADMIN_ID) ? "admin" : "employee";

      const authenticatedUser: User = {
        id: data.id,
        email: data.email,
        name: data.name,
        role: role
      };

      setUser(authenticatedUser);
      localStorage.setItem("worktrack_user", JSON.stringify(authenticatedUser));
      setLoading(false);
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      setLoading(false);
      return { success: false, error: "An error occurred during login" };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("worktrack_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
