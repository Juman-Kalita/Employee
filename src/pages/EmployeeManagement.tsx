import { useState, useMemo, useEffect } from "react";
import { getEmployees, addEmployee, updateEmployee, deleteEmployee, getTasks, addTask as storeAddTask, addNotification, saveTasks } from "@/lib/store";
import { Employee, Task, Priority } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, Pencil, Trash2, CheckCircle, Clock, TrendingUp, ListTodo } from "lucide-react";

const priorityColors: Record<Priority, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-success/10 text-success border-success/20",
};

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add/Edit employee dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "", status: "active" as "active" | "inactive", password: "" });

  // Profile dialog
  const [profileEmployee, setProfileEmployee] = useState<Employee | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({ title: "", description: "", deadline: "", priority: "medium" as Priority, expectedTime: "" });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [empData, taskData] = await Promise.all([getEmployees(), getTasks()]);
    setEmployees(empData);
    setTasks(taskData);
    setLoading(false);
  };

  const filtered = useMemo(() =>
    employees.filter(e =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase())
    ), [employees, search]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", email: "", role: "", status: "active", password: "" });
    setDialogOpen(true);
  };

  const openEdit = (e: Employee) => {
    setEditing(e);
    setForm({ name: e.name, email: e.email, role: e.role, status: e.status, password: e.password || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.password) return;
    if (editing) {
      await updateEmployee({ ...editing, ...form });
    } else {
      await addEmployee({ ...form });
    }
    await loadData();
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteEmployee(id);
    await loadData();
  };

  const openProfile = (emp: Employee) => {
    setProfileEmployee(emp);
    setAddTaskOpen(false);
    setNewTaskForm({ title: "", description: "", deadline: "", priority: "medium", expectedTime: "" });
  };

  const handleCreateTask = async () => {
    if (!newTaskForm.title || !profileEmployee) return;
    const now = new Date().toISOString();
    const task: Omit<Task, 'id'> = {
      title: newTaskForm.title,
      description: newTaskForm.description,
      assignedTo: profileEmployee.id,
      expectedTime: newTaskForm.expectedTime ? parseInt(newTaskForm.expectedTime) : 0,
      deadline: newTaskForm.deadline || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      priority: newTaskForm.priority,
      status: "in-progress",
      createdAt: now,
      startedAt: now,
    };
    await storeAddTask(task);
    await addNotification({ message: `New Task Assigned: ${task.title}`, read: false, createdAt: now, forUser: profileEmployee.id });
    await loadData();
    setAddTaskOpen(false);
    setNewTaskForm({ title: "", description: "", deadline: "", priority: "medium", expectedTime: "" });
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
    if (task) {
      await addNotification({ message: `Your extension request for "${task.title}" has been ${approved ? 'approved' : 'rejected'}`, read: false, createdAt: new Date().toISOString(), forUser: task.assignedTo });
    }
    await loadData();
  };

  // Profile stats for selected employee
  const profileStats = useMemo(() => {
    if (!profileEmployee) return null;
    const empTasks = tasks.filter(t => t.assignedTo === profileEmployee.id);
    const completed = empTasks.filter(t => t.status === "completed");
    const inProgress = empTasks.filter(t => t.status === "in-progress");
    const completionRate = empTasks.length > 0 ? Math.round((completed.length / empTasks.length) * 100) : 0;
    const avgEfficiency = completed.length > 0
      ? Math.round(completed.reduce((s, t) => s + Math.min(100, t.efficiency || 0), 0) / completed.length)
      : 0;
    return { empTasks, completed, inProgress, completionRate, avgEfficiency };
  }, [profileEmployee, tasks]);

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
                <TableRow key={e.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openProfile(e)}>
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

      {/* Full Profile Dialog */}
      <Dialog open={!!profileEmployee} onOpenChange={open => { if (!open) { setProfileEmployee(null); setAddTaskOpen(false); } }}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col overflow-hidden p-0">
          {profileEmployee && profileStats && (() => {
            const { empTasks, completed, inProgress, completionRate, avgEfficiency } = profileStats;
            return (
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-6 border-b shrink-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                          {profileEmployee.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-2xl font-bold">{profileEmployee.name}</h2>
                        <p className="text-sm text-muted-foreground">{profileEmployee.role}</p>
                        {profileEmployee.email && <p className="text-sm text-muted-foreground">{profileEmployee.email}</p>}
                        <Badge variant="outline" className={profileEmployee.status === 'active' ? 'text-success border-success/30 bg-success/5 mt-1' : 'text-muted-foreground mt-1'}>
                          ● {profileEmployee.status}
                        </Badge>
                      </div>
                    </div>
                    <Button onClick={() => setAddTaskOpen(v => !v)} className="gap-2 shrink-0">
                      <Plus className="h-4 w-4" /> Add Task
                    </Button>
                  </div>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                  {/* Inline Add Task Form */}
                  {addTaskOpen && (
                    <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                      <h3 className="font-semibold text-sm">New Task for {profileEmployee.name}</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Title</Label>
                          <Input placeholder="Task title" value={newTaskForm.title} onChange={e => setNewTaskForm(f => ({ ...f, title: e.target.value }))} />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Description</Label>
                          <Textarea placeholder="Task description" rows={2} value={newTaskForm.description} onChange={e => setNewTaskForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Deadline</Label>
                          <Input type="date" value={newTaskForm.deadline} onChange={e => setNewTaskForm(f => ({ ...f, deadline: e.target.value }))} min={new Date().toISOString().split('T')[0]} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Priority</Label>
                          <Select value={newTaskForm.priority} onValueChange={(v: Priority) => setNewTaskForm(f => ({ ...f, priority: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">🟢 Low</SelectItem>
                              <SelectItem value="medium">🟡 Medium</SelectItem>
                              <SelectItem value="high">🔴 High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Expected Time (optional)</Label>
                          <Input type="number" placeholder="e.g. 60 (minutes)" value={newTaskForm.expectedTime} onChange={e => setNewTaskForm(f => ({ ...f, expectedTime: e.target.value }))} min={1} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleCreateTask} className="flex-1" disabled={!newTaskForm.title}>Assign Task</Button>
                        <Button variant="outline" onClick={() => setAddTaskOpen(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Card><CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold">{empTasks.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Total Tasks</p>
                      </CardContent></Card>
                      <Card><CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-warning">{inProgress.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">In Progress</p>
                      </CardContent></Card>
                      <Card><CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-success">{completed.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Completed</p>
                      </CardContent></Card>
                      <Card><CardContent className="p-4 text-center">
                        <p className={`text-2xl font-bold ${avgEfficiency >= 80 ? 'text-success' : avgEfficiency >= 50 ? 'text-warning' : 'text-destructive'}`}>
                          {avgEfficiency}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Avg Efficiency</p>
                      </CardContent></Card>
                    </div>

                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <p className="text-sm font-semibold">Performance Summary</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Completion Rate</span>
                            <span className="font-semibold text-foreground">{completionRate}%</span>
                          </div>
                          <Progress value={completionRate} className="h-2" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Avg Efficiency</span>
                            <span className="font-semibold text-foreground">{avgEfficiency}%</span>
                          </div>
                          <Progress value={avgEfficiency} className="h-2" />
                        </div>
                        <div className="pt-1 border-t text-xs text-muted-foreground space-y-1">
                          <p className="flex justify-between"><span>High priority</span><span className="font-medium text-destructive">{empTasks.filter(t => t.priority === 'high').length}</span></p>
                          <p className="flex justify-between"><span>Medium priority</span><span className="font-medium text-warning">{empTasks.filter(t => t.priority === 'medium').length}</span></p>
                          <p className="flex justify-between"><span>Low priority</span><span className="font-medium text-success">{empTasks.filter(t => t.priority === 'low').length}</span></p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* In Progress Tasks */}
                  {inProgress.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-warning" /> In Progress ({inProgress.length})
                      </h3>
                      <div className="space-y-3">
                        {inProgress.map(task => {
                          const elapsedMinutes = Math.round((new Date().getTime() - new Date(task.startedAt!).getTime()) / 60000);
                          const isOvertime = task.extensionRequest?.status === 'approved' ? false : (task.expectedTime > 0 && elapsedMinutes > task.expectedTime);
                          return (
                            <Card key={task.id} className="border-l-4 border-l-warning">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <h4 className="font-semibold">{task.title}</h4>
                                  <Badge variant="outline" className={priorityColors[task.priority]}>{task.priority}</Badge>
                                </div>
                                {task.description && <p className="text-sm text-muted-foreground mb-3">{task.description}</p>}
                                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs p-3 bg-muted/40 rounded-lg mb-2">
                                  <span className="text-muted-foreground">Assigned</span>
                                  <span className="font-medium">{new Date(task.createdAt).toLocaleDateString()} {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  <span className="text-muted-foreground">Deadline</span>
                                  <span className="font-medium">{new Date(task.deadline).toLocaleDateString()}</span>
                                  {task.expectedTime > 0 && <>
                                    <span className="text-muted-foreground">Expected Time</span>
                                    <span className="font-medium">{task.expectedTime} min</span>
                                  </>}
                                  <span className="text-muted-foreground">Time Elapsed</span>
                                  <span className={`font-semibold ${isOvertime ? 'text-destructive' : 'text-primary'}`}>
                                    {elapsedMinutes} min {isOvertime ? `(+${elapsedMinutes - task.expectedTime}m overtime)` : ''}
                                  </span>
                                </div>
                                {task.extensionRequest?.status === 'pending' && (
                                  <div className="p-3 bg-warning/5 border border-warning/20 rounded">
                                    <p className="text-xs font-semibold text-warning mb-1">Extension Request Pending</p>
                                    <p className="text-xs text-muted-foreground mb-1">Reason: {task.extensionRequest.reason}</p>
                                    <p className="text-xs text-muted-foreground mb-2">Proposed: {new Date(task.extensionRequest.proposedDeadline).toLocaleDateString()}</p>
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={() => handleExtensionApproval(task.id, true)} className="flex-1">Approve</Button>
                                      <Button size="sm" variant="destructive" onClick={() => handleExtensionApproval(task.id, false)} className="flex-1">Reject</Button>
                                    </div>
                                  </div>
                                )}
                                {task.extensionRequest && task.extensionRequest.status !== 'pending' && (
                                  <div className={`p-2 rounded text-xs ${task.extensionRequest.status === 'approved' ? 'bg-success/5 text-success' : 'bg-destructive/5 text-destructive'}`}>
                                    Extension {task.extensionRequest.status}{task.extensionRequest.status === 'approved' && ` — New deadline: ${new Date(task.deadline).toLocaleDateString()}`}
                                  </div>
                                )}
                                {task.cancellationRequest?.status === 'pending' && (
                                  <div className="p-2 bg-warning/5 border border-warning/20 rounded text-xs mt-2">
                                    <span className="font-semibold text-warning">Not Completed Today: </span>{task.cancellationRequest.reason}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Completed Tasks */}
                  {completed.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" /> Completed ({completed.length})
                      </h3>
                      <div className="space-y-3">
                        {completed.map(task => (
                          <Card key={task.id} className="border-l-4 border-l-success">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4 className="font-semibold">{task.title}</h4>
                                <Badge variant="outline" className={priorityColors[task.priority]}>{task.priority}</Badge>
                              </div>
                              {task.description && <p className="text-sm text-muted-foreground mb-3">{task.description}</p>}
                              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs p-3 bg-muted/40 rounded-lg mb-2">
                                <span className="text-muted-foreground">Assigned</span>
                                <span className="font-medium">{new Date(task.createdAt).toLocaleDateString()} {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="text-muted-foreground">Completed</span>
                                <span className="font-medium">{new Date(task.completedAt!).toLocaleDateString()} {new Date(task.completedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {task.expectedTime > 0 && <>
                                  <span className="text-muted-foreground">Expected Time</span>
                                  <span className="font-medium">{task.expectedTime} min</span>
                                </>}
                                <span className="text-muted-foreground">Actual Time</span>
                                <span className="font-medium">{task.actualTime} min</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-success/5 rounded border border-success/20 text-xs">
                                <TrendingUp className="h-3.5 w-3.5 text-success" />
                                <span className="text-muted-foreground">Efficiency:</span>
                                <span className={`font-bold ${(task.efficiency || 0) >= 100 ? 'text-success' : 'text-warning'}`}>
                                  {Math.min(100, task.efficiency || 0)}%
                                </span>
                                <span className="ml-auto text-muted-foreground">
                                  {(task.efficiency || 0) >= 100 ? '✓ Ahead of schedule' : `${task.actualTime! - task.expectedTime}m over expected`}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {empTasks.length === 0 && !addTaskOpen && (
                    <div className="text-center py-12 text-muted-foreground">
                      <ListTodo className="h-12 w-12 mx-auto mb-3 opacity-40" />
                      <p>No tasks assigned yet. Click "Add Task" to assign one.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
