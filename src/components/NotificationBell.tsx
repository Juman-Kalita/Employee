import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth";
import { getNotifications, markNotificationRead } from "@/lib/store";
import { type Notification as NotificationType } from "@/lib/types";

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationType[]>([]);

  useEffect(() => {
    const load = async () => {
      const all = await getNotifications();
      setNotifications(user ? all.filter(n => n.forUser === user.id || n.forUser === "all") : []);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const unread = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center font-medium">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b">
          <p className="font-semibold text-sm">Notifications</p>
        </div>
        <div className="max-h-64 overflow-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No notifications</p>
          ) : (
            notifications.slice(0, 10).map(n => (
              <button key={n.id} onClick={() => handleMarkRead(n.id)}
                className={`w-full text-left p-3 border-b last:border-0 text-sm hover:bg-muted/50 transition-colors ${!n.read ? "bg-primary/5" : ""}`}>
                <p className={!n.read ? "font-medium" : "text-muted-foreground"}>{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
