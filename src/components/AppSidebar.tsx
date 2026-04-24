import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { LayoutDashboard, ListTodo, Users, BarChart3, Settings, LogOut, Moon, Sun, AlertCircle, CalendarCheck, Briefcase, Wrench, Package, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { getTasks } from "@/lib/store";

const adminNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Tasks", url: "/tasks", icon: ListTodo },
  { title: "Sales", url: "/sales", icon: Briefcase },
  { title: "Extensions", url: "/extensions", icon: AlertCircle },
  { title: "Attendance", url: "/attendance", icon: CalendarCheck },
  { title: "Employees", url: "/employees", icon: Users },
  { title: "Teams", url: "/teams", icon: UsersRound },
  { title: "Service", url: "/service", icon: Wrench },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Settings", url: "/settings", icon: Settings },
];

const employeeNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "My Tasks", url: "/tasks", icon: ListTodo },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { user, logout, checkCanLogout } = useAuth();
  const { theme, toggle } = useTheme();
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const items = user?.role === "admin" ? adminNav : employeeNav;
  const [pendingExtensions, setPendingExtensions] = useState(0);
  const [blockDialog, setBlockDialog] = useState(false);
  const [blockedTasks, setBlockedTasks] = useState<string[]>([]);

  useEffect(() => {
    if (user?.role === "admin") {
      loadPendingExtensions();
      // Refresh count every 30 seconds
      const interval = setInterval(loadPendingExtensions, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadPendingExtensions = async () => {
    const tasks = await getTasks();
    const pending = tasks.filter(t => t.extensionRequest && t.extensionRequest.status === "pending").length;
    setPendingExtensions(pending);
  };

  const handleLogout = async () => {
    const { allowed, blockedTasks: tasks } = await checkCanLogout();
    if (!allowed) {
      setBlockedTasks(tasks);
      setBlockDialog(true);
      return;
    }
    await logout();
    navigate("/login");
  };

  return (
    <>
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex flex-col items-center gap-1 px-2 py-2">
          <div className="h-10 flex items-center justify-center">
            <img src="/Logo.png" alt="WorkTrack" className="h-10 w-auto object-contain" />
          </div>
          {!collapsed && (
            <span className="font-bold text-sm text-foreground">WorkTrack</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink to={item.url} end={item.url === "/dashboard"} className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium" onClick={() => setOpenMobile(false)}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                      {item.url === "/extensions" && pendingExtensions > 0 && (
                        <Badge variant="destructive" className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs">
                          {pendingExtensions}
                        </Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Separator className="mb-2" />
        <div className="flex flex-col gap-1 px-1">
          <Button variant="ghost" size="sm" className="justify-start gap-2 h-8" onClick={toggle}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {!collapsed && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
          </Button>
          <Button variant="ghost" size="sm" className="justify-start gap-2 h-8 text-destructive hover:text-destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Logout</span>}
          </Button>
        </div>
        {!collapsed && user && (
          <div className="px-3 py-2 mt-1">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        )}
        {!collapsed && (
          <div className="px-3 py-2 mt-1 border-t border-border/50">
            <p className="text-xs text-center">
              <span className="text-muted-foreground">Designed and Developed by </span>
              <span className="font-semibold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">SolvixTech</span>
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>

    {/* Logout blocked dialog */}
    <Dialog open={blockDialog} onOpenChange={setBlockDialog}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" /> Cannot Logout
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <p className="text-sm text-muted-foreground">
            You have pending tasks that are not completed. Please complete your tasks, submit a reason, or request a reschedule before logging out.
          </p>
          <div className="space-y-1">
            {blockedTasks.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-sm p-2 bg-destructive/5 border border-destructive/20 rounded">
                <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                <span>{t}</span>
              </div>
            ))}
          </div>
          <Button className="w-full" onClick={() => setBlockDialog(false)}>OK, I'll finish my tasks</Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
}
