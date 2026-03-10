import React, { createContext, useContext, useState, useCallback } from "react";
import { User, UserRole } from "./types";
import { getEmployees } from "./store";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Temporary admin account until Supabase integration
const ADMIN_ACCOUNT = { 
  email: "admin@worktrack.com", 
  password: "admin123", 
  user: { id: "admin-1", email: "admin@worktrack.com", name: "Admin User", role: "admin" as UserRole } 
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { const s = localStorage.getItem("worktrack_user"); return s ? JSON.parse(s) : null; } catch { return null; }
  });

  const login = useCallback((email: string, password: string) => {
    // Check admin account
    if (email === ADMIN_ACCOUNT.email && password === ADMIN_ACCOUNT.password) {
      setUser(ADMIN_ACCOUNT.user);
      localStorage.setItem("worktrack_user", JSON.stringify(ADMIN_ACCOUNT.user));
      return { success: true };
    }
    
    // Check employee accounts
    const employees = getEmployees();
    const employee = employees.find(e => e.email === email && e.password === password && e.status === "active");
    
    if (employee) {
      const employeeUser: User = {
        id: employee.id,
        email: employee.email,
        name: employee.name,
        role: "employee"
      };
      setUser(employeeUser);
      localStorage.setItem("worktrack_user", JSON.stringify(employeeUser));
      return { success: true };
    }
    
    return { success: false, error: "Invalid email or password" };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("worktrack_user");
  }, []);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
