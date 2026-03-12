import React, { createContext, useContext, useState, useCallback } from "react";
import { User, UserRole } from "./types";
import { supabase } from "./supabase";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Admin account check
const ADMIN_EMAIL = "admin@solvixtrack.com";
const ADMIN_ID = "00000000-0000-0000-0000-000000000001";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { 
      const s = localStorage.getItem("solvixtrack_user"); 
      return s ? JSON.parse(s) : null; 
    } catch { 
      return null; 
    }
  });
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      // Query the employees table
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        setLoading(false);
        return { success: false, error: "Invalid email or password" };
      }

      // Determine role based on email or specific admin ID
      const role: UserRole = (email === ADMIN_EMAIL || data.id === ADMIN_ID) ? "admin" : "employee";

      const authenticatedUser: User = {
        id: data.id,
        email: data.email,
        name: data.name,
        role: role
      };

      setUser(authenticatedUser);
      localStorage.setItem("solvixtrack_user", JSON.stringify(authenticatedUser));
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
    localStorage.removeItem("solvixtrack_user");
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
