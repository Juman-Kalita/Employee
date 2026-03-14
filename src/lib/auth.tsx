import React, { createContext, useContext, useState, useCallback } from "react";
import { User, UserRole } from "./types";
import { supabase } from "./supabase";
import { markAttendanceLogin, getTodayAttendance, markAttendanceLogout, getTasks } from "./store";

interface AuthContextType {
  user: User | null;
  login: (nameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkCanLogout: () => Promise<{ allowed: boolean; blockedTasks: string[] }>;
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

      // Mark attendance login for employees
      if (role === "employee") {
        await markAttendanceLogin(data.id);
      }

      setLoading(false);
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      setLoading(false);
      return { success: false, error: "An error occurred during login" };
    }
  }, []);

  const checkCanLogout = useCallback(async (): Promise<{ allowed: boolean; blockedTasks: string[] }> => {
    if (!user || user.role !== "employee") return { allowed: true, blockedTasks: [] };
    const tasks = await getTasks();
    const blocked = tasks.filter(t =>
      t.assignedTo === user.id &&
      t.status === "in-progress" &&
      !t.cancellationRequest &&
      t.rescheduleRequest?.status !== "approved" &&
      t.rescheduleRequest?.status !== "pending"
    );
    return { allowed: blocked.length === 0, blockedTasks: blocked.map(t => t.title) };
  }, [user]);

  const logout = useCallback(async () => {
    // Mark attendance logout for employees
    if (user && user.role === "employee") {
      const today = await getTodayAttendance(user.id);
      if (today && !today.logoutTime) {
        const tasks = await getTasks();
        const empTasks = tasks.filter(t => t.assignedTo === user.id && t.status === "in-progress");
        const allClear = empTasks.every(t =>
          t.rescheduleRequest?.status === "approved" ||
          t.rescheduleRequest?.status === "pending" ||
          t.cancellationRequest?.status === "pending"
        );
        const status = (empTasks.length === 0 || allClear) ? "present" : "incomplete";
        const notes = status === "incomplete"
          ? `${empTasks.filter(t => !t.rescheduleRequest && !t.cancellationRequest).length} task(s) left incomplete without reason`
          : undefined;
        await markAttendanceLogout(today.id, status, notes);
      }
    }
    setUser(null);
    localStorage.removeItem("worktrack_user");
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, checkCanLogout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
