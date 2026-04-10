import { useState, useEffect } from "react";
import { getInventory, addInventoryItem, deleteInventoryItem, getSalesProjects } from "@/lib/store";
import { InventoryItem, SalesProject } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Trash2, Calendar, Cpu } from "lucide-react";

export default function InventoryPage({ isAdmin: isAdminProp }: { isAdmin?: boolean }) {
  const isAdmin = isAdminProp ?? false;
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [projects, setProjects] = useState<SalesProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ description: "", machineSource: "", customMachine: "", arrivedAt: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [inv, sp] = await Promise.all([getInventory(), getSalesProjects()]);
    setItems(inv);
    setProjects(sp);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.description.trim() || !form.arrivedAt || submitting) return;
    const machineName = form.machineSource === "none"
      ? form.customMachine.trim()
      : form.machineSource;
    if (!machineName) return;
    setSubmitting(true);
    await addInventoryItem({
      description: form.description.trim(),
      machineName,
      arrivedAt: new Date(form.arrivedAt).toISOString(),
    });
    setForm({ description: "", machineSource: "", customMachine: "", arrivedAt: "" });
    setAddOpen(false);
    setSubmitting(false);
    await loadData();
  };

  const handleDelete = async (id: string) => {
    await deleteInventoryItem(id);
    await loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-96"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Manage material arrivals" : "View material arrivals for machines"}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Material
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No materials recorded yet</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <Card key={item.id} className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium mb-1">{item.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Cpu className="h-3.5 w-3.5" />
                        <span>Machine: </span>
                        <Badge variant="outline" className="text-xs ml-1">{item.machineName}</Badge>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Arrived: {new Date(item.arrivedAt).toLocaleDateString()} at {new Date(item.arrivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-8 w-8 p-0 shrink-0" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isAdmin && (
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Add Material</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What material arrived?"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Machine</Label>
                <Select value={form.machineSource} onValueChange={v => setForm(f => ({ ...f, machineSource: v, customMachine: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select machine" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None — enter manually</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.name}>{p.name} #{p.projectNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.machineSource === "none" && (
                <div className="space-y-2">
                  <Label>Material Name</Label>
                  <Input
                    value={form.customMachine}
                    onChange={e => setForm(f => ({ ...f, customMachine: e.target.value }))}
                    placeholder="Enter material name"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Arrival Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={form.arrivedAt}
                  onChange={e => setForm(f => ({ ...f, arrivedAt: e.target.value }))}
                />
              </div>
              <Button
                onClick={handleAdd}
                className="w-full"
                disabled={
                  !form.description.trim() ||
                  !form.machineSource ||
                  (form.machineSource === "none" && !form.customMachine.trim()) ||
                  !form.arrivedAt ||
                  submitting
                }
              >
                {submitting ? "Adding..." : "Add Material"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
