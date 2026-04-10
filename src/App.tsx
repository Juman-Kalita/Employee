import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import LoginPage from "@/pages/LoginPage";
import DashboardLayout from "@/components/DashboardLayout";
import AdminDashboard from "@/pages/AdminDashboard";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
import EmployeeManagement from "@/pages/EmployeeManagement";
import EmployeePerformance from "@/pages/EmployeePerformance";
import TaskManagement from "@/pages/TaskManagement";
import ExtensionRequests from "@/pages/ExtensionRequests";
import AttendancePage from "@/pages/AttendancePage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import SalesPage from "@/pages/SalesPage";
import ServicePage from "@/pages/ServicePage";
import InventoryPage from "@/pages/InventoryPage";
import InventoryLoginPage from "@/pages/InventoryLoginPage";
import InventoryPanelLayout from "@/pages/InventoryPanelLayout";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function InventoryWrapper() {
  const { user } = useAuth();
  return <InventoryPage isAdmin={user?.role === "admin"} />;
}

function DashboardRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return user.role === "admin" ? <AdminDashboard /> : <EmployeeDashboard />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/inventory-panel" element={<InventoryLoginPage />} />
              <Route path="/inventory-panel" element={<InventoryPanelLayout />}>
                <Route path="home" element={<InventoryPage isAdmin={true} />} />
              </Route>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardRouter />} />
                <Route path="/tasks" element={<TaskManagement />} />
                <Route path="/sales" element={<SalesPage />} />
                <Route path="/service" element={<ServicePage />} />
                <Route path="/inventory" element={<InventoryWrapper />} />
                <Route path="/extensions" element={<ExtensionRequests />} />
                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/employees" element={<EmployeeManagement />} />
                <Route path="/employees/:id" element={<EmployeePerformance />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
