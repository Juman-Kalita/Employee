import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Package } from "lucide-react";

const INVENTORY_SESSION_KEY = "worktrack_inventory_user";

export function getInventoryUser() {
  try { return JSON.parse(localStorage.getItem(INVENTORY_SESSION_KEY) || "null"); } catch { return null; }
}

export function clearInventoryUser() {
  localStorage.removeItem(INVENTORY_SESSION_KEY);
}

export default function InventoryLoginPage() {
  const navigate = useNavigate();
  const [nameOrEmail, setNameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (nameOrEmail === "inventory" && password === "1234") {
      localStorage.setItem(INVENTORY_SESSION_KEY, JSON.stringify({ id: "inventory", name: "Inventory", email: "" }));
      navigate("/inventory-panel/home");
    } else {
      setError("Invalid credentials");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Inventory Panel</h1>
          <p className="text-sm text-muted-foreground">WorkTrack</p>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>Access the inventory management panel</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label>Name or Email</Label>
                <Input value={nameOrEmail} onChange={e => setNameOrEmail(e.target.value)} placeholder="Your name or email" required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
