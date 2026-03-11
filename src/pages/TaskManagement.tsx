import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { getTasks, saveTasks, addTask as storeAddTask, getEmployees, addNotification } from "@/lib/store";
import { Task, Priority, TaskStatus } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Play, CheckCircle, Clock, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const priorityColors: Record<Priority, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-success/10 text-success border-success/20",
};

function TaskCard({ task, onStart, onComplete }: { task: Task; onStart?: () => void; onComplete?: () => void }) {
  const employees = getEmployees();
  const assignee = employees.find(e => e.id === task.assignedTo);

  return (
    <Card className="shadow-sm hover:shadow-md transition-all group">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight">{task.title}</h3>
          <Badge variant="outline" className={`text-[10px] shrink-0 ${priorityColors[task.priority]}`}>{task.priority}</Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{task.expectedTime}m</span>
          <span>Due {new Date(task.deadline).toLocaleDateString()}</span>
        </div>
        {assignee && <p className="text-xs text-muted-foreground">→ {assignee.name}</p>}
        {task.efficiency != null && (
          <p className={`text-xs font-medium ${task.efficiency >= 100 ? "text-success" : "text-destructive"}`}>
            Efficiency: {task.efficiency}%
          </p>
        )}
        <div className="flex gap-2 pt-1">
          {task.status === "in-progress" && onComplete && (
            <Button size="sm" className="h-7 text-xs gap-1" onClick={onComplete}><CheckCircle className="h-3 w-3" />Complete</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TaskManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", assignedTo: "", expectedTime: "", deadline: "", priority: "medium" as Priority });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [tasksData, employeesData] = await Promise.all([getTasks(), getEmployees()]);
    setTasks(tasksData);
    setEmployees(employeesData);
    setLoading(false);
  };

  const myTasks = useMemo(() => {
    let t = isAdmin ? tasks : tasks.filter(t => t.assignedTo === user?.id);
    if (search) t = t.filter(x => x.title.toLowerCase().includes(search.toLowerCase()));
    if (filterEmployee !== "all") t = t.filter(x => x.assignedTo === filterEmployee);
    return t;
  }, [tasks, isAdmin, user, search, filterEmployee]);

  const columns: { status: TaskStatus; label: string }[] = [
    { status: "in-progress", label: "In Progress" },
    { status: "completed", label: "Completed" },
  ];

  const handleCreate = async () => {
    if (!form.title || !form.assignedTo) return;
    const now = new Date().toISOString();
    const task: Omit<Task, 'id'> = {
      title: form.title, 
      description: form.description,
      assignedTo: form.assignedTo, 
      expectedTime: parseInt(form.expectedTime) || 60,
      deadline: form.deadline || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      priority: form.priority, 
      status: "in-progress",
      createdAt: now,
      startedAt: now,
    };
    await storeAddTask(task);
    await addNotification({ message: `New Task Assigned: ${task.title}`, read: false, createdAt: new Date().toISOString(), forUser: task.assignedTo });
    await loadData();
    setDialogOpen(false);
    setForm({ title: "", description: "", assignedTo: "", expectedTime: "", deadline: "", priority: "medium" });
  };

  const startTask = async (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, status: "in-progress" as TaskStatus, startedAt: new Date().toISOString() } : t);
    await saveTasks(updated);
    await loadData();
  };

  const completeTask = async (id: string) => {
    const now = new Date();
    const updated = tasks.map(t => {
      if (t.id !== id) return t;
      const start = new Date(t.startedAt!);
      const actualMinutes = Math.round((now.getTime() - start.getTime()) / 60000);
      const actual = Math.max(actualMinutes, 1);
      const efficiency = Math.round((t.expectedTime / actual) * 100);
      return { ...t, status: "completed" as TaskStatus, completedAt: now.toISOString(), actualTime: actual, efficiency };
    });
    await saveTasks(updated);
    await loadData();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">{isAdmin ? "Task Management" : "My Tasks"}</h1>
          <p className="text-muted-foreground">{isAdmin ? "Create and manage tasks" : "View and complete your tasks"}</p>
        </div>
        {isAdmin && <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" />New Task</Button>}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {isAdmin && (
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="w-[180px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="All employees" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {columns.map(col => (
          <div key={col.status} className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm">{col.label}</h2>
              <Badge variant="secondary" className="text-xs">{myTasks.filter(t => t.status === col.status).length}</Badge>
            </div>
            <div className="space-y-3 min-h-[100px] rounded-lg bg-muted/30 p-3">
              {myTasks.filter(t => t.status === col.status).map(task => (
                <TaskCard key={task.id} task={task}
                  onComplete={!isAdmin ? () => completeTask(task.id) : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Task</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={form.assignedTo} onValueChange={v => setForm(f => ({ ...f, assignedTo: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v: Priority) => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Low</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="high">🔴 High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} className="w-full">Create Task</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
