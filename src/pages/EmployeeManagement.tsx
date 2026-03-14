import { useState, useMemo, useEffect } from "react";
import { getEmployees, addEmployee, updateEmployee, deleteEmployee, getTasks, getProjects, saveTasks, addNotification } from "@/lib/store";
import { Employee, Task, Project } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { EmployeeProfileDialog } from "@/components/EmployeeProfileDialog";

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "", status: "active" as "active" | "inactive", password: "" });
  const [profileEmployee, setProfileEmployee] = useState<Employee | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [empData, taskData, projData] = await Promise.all([getEmployees(), getTasks(), getProjects()]);
    setEmployees(empData);
    setTasks(taskData);
    setProjects(projData);
    setLoading(false);
  };

  const filtered = useMemo(() =>
    employees.filter(e =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase())
    ), [employees, search]);

  const openNew = () => { setEditing(null); setForm({ name: "", email: "", role: "", status: "active", password: "" }); setDialogOpen(true); };
  const openEdit = (e: Employee) => { setEditing(e); setForm({ name: e.name, email: e.email, role: e.role, status: e.status, password: e.password || "" }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.password) return;
    if (editing) await updateEmployee({ ...editing, ...form });
    else await addEmployee({ ...form });
    await loadData();
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteEmployee(id);
    await loadData();
  };

  const handleExtensionApproval = async (taskId: string, approved: boolean) => {
    const updated = tasks.map(t => {
      if (t.id !== taskId || !t.extensionRequest) return t;
      return approved
        ? { ...t, deadline: t.extensionRequest.proposedDeadline, extensionRequest: { ...t.extensionRequest, status: "approved" as const, adminResponse: "Extension approved" } }
        : { ...t, extensionRequest: { ...t.extensionRequest, status: "rejected" as const, adminResponse: "Extension rejected" } };
    });
    await saveTasks(updated);
    const task = tasks.find(t => t.id === taskId);
    if (task) await addNotification({ message: `Your extension request for "${task.title}" has been ${approved ? 'approved' : 'rejected'}`, read: false, createdAt: new Date().toISOString(), forUser: task.assignedTo });
    await loadData();
  };

  const handleRescheduleApproval = async (taskId: string, approved: boolean) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.rescheduleRequest) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    const updatedTask = approved
      ? { ...task, deadline: tomorrowStr, rescheduleRequest: { ...task.rescheduleRequest, status: "approved" as const, adminResponse: "Rescheduled to next day" } }
      : { ...task, rescheduleRequest: { ...task.rescheduleRequest, status: "rejected" as const, adminResponse: "Reschedule rejected" } };
    await saveTasks([updatedTask]);
    await addNotification({ message: `Your reschedule request for "${task.title}" has been ${approved ? "approved — rescheduled to tomorrow" : "rejected"}`, read: false, createdAt: new Date().toISOString(), forUser: task.assignedTo });
    await loadData();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Click on an employee to view their full profile</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Employee</Button>
      </div>

      <Card className="shadow-sm">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(e => (
                <TableRow key={e.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setProfileEmployee(e)}>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell className="text-muted-foreground">{e.email}</TableCell>
                  <TableCell>{e.role}</TableCell>
                  <TableCell>
                    <Badge variant={e.status === "active" ? "default" : "secondary"} className={e.status === "active" ? "bg-success/10 text-success border-success/20" : ""}>
                      {e.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={ev => ev.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Employee Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Employee" : "Add Employee"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email (optional)</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Password</Label><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Enter password" /></div>
            <div className="space-y-2"><Label>Role</Label><Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Developer" /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: "active" | "inactive") => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={!form.name || !form.password}>{editing ? "Update" : "Add"} Employee</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Employee Profile Dialog */}
      <EmployeeProfileDialog
        employee={profileEmployee}
        tasks={tasks}
        projects={projects}
        onClose={() => setProfileEmployee(null)}
        onDataChange={loadData}
        onExtensionApproval={handleExtensionApproval}
        onRescheduleApproval={handleRescheduleApproval}
      />
    </div>
  );
}
