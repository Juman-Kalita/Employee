import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { getInventoryUser, clearInventoryUser } from "./InventoryLoginPage";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { Package, LogOut, Moon, Sun } from "lucide-react";

export default function InventoryPanelLayout() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState(getInventoryUser());

  useEffect(() => {
    if (!user) navigate("/inventory-panel", { replace: true });
  }, [user]);

  const handleLogout = () => {
    clearInventoryUser();
    navigate("/inventory-panel");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Inventory Panel</p>
            <p className="text-xs text-muted-foreground">WorkTrack</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground mr-2">{user.name}</span>
          <Button variant="ghost" size="sm" onClick={toggle} className="h-8 w-8 p-0">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-destructive hover:text-destructive">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <Outlet />
      </main>

      <footer className="border-t border-border py-3 text-center">
        <p className="text-xs text-muted-foreground">
          Designed and Developed by{" "}
          <span className="font-semibold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">SolvixTech</span>
        </p>
      </footer>
    </div>
  );
}
