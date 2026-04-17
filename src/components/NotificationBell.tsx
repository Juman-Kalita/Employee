import { useState, useEffect } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth";
import { getNotifications, markNotificationRead, getEmployees } from "@/lib/store";
import { type Notification as NotificationType, Employee } from "@/lib/types";
import { useNavigate } from "react-router-dom";

function getRouteForNotification(message: string, role: string | undefined, employees: Employee[]): { path: string; state?: object } {
  const m = message.toLowerCase();

  // For admin: task-related notifications → go to /tasks and open that employee's profile
  if (role === "admin" && (m.includes("assigned") || m.includes("forwarded")) && m.includes("task")) {
    const match = message.match(/to ([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)*)(?:\s*$|[^a-zA-Z])/);
    if (match) {
      const name = match[1].trim();
      const emp = employees.find(e => e.name.toLowerCase() === name.toLowerCase());
      if (emp) return { path: "/tasks", state: { openEmployeeId: emp.id } };
    }
    return { path: "/tasks" };
  }

  if (m.includes("extension request") || m.includes("extension") || m.includes("reschedule")) {
    return { path: role === "admin" ? "/extensions" : "/tasks" };
  }
  if (m.includes("assigned") || m.includes("forwarded") || m.includes("task")) return { path: "/tasks" };
  if (m.includes("attendance")) return { path: "/attendance" };
  if (m.includes("inventory") || m.includes("material")) return { path: "/inventory" };
  if (m.includes("sales") || m.includes("project")) return { path: "/sales" };
  if (m.includes("service")) return { path: "/service" };
  return { path: "/dashboard" };
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [all, emps] = await Promise.all([getNotifications(), getEmployees()]);
      setNotifications(user ? all.filter(n => n.forUser === user.id || n.forUser === "all") : []);
      setEmployees(emps);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const unread = notifications.filter(n => !n.read);

  const handleClick = async (n: NotificationType) => {
    await markNotificationRead(n.id);
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    setOpen(false);
    const { path, state } = getRouteForNotification(n.message, user?.role, employees);
    navigate(path, state ? { state } : undefined);
  };

  const handleMarkAllRead = async () => {
    await Promise.all(unread.map(n => markNotificationRead(n.id)));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unread.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center font-medium">
              {unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b flex items-center justify-between">
          <p className="font-semibold text-sm">Notifications</p>
          {unread.length > 0 && (
            <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No notifications</p>
          ) : (
            notifications.slice(0, 20).map(n => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left p-3 border-b last:border-0 text-sm transition-colors cursor-pointer hover:bg-muted/70 active:bg-muted ${!n.read ? "bg-primary/5" : ""}`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                  <div className={!n.read ? "" : "pl-4"}>
                    <p className={!n.read ? "font-medium" : "text-muted-foreground"}>{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
