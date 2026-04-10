import { useState, useEffect } from "react";
import { getSalesProjects, addSalesProject, deleteSalesProject, getEmployees, getTasks, getProjects, saveTasks, addNotification, addTask as storeAddTask } from "@/lib/store";
import { SalesProject, Employee, Task, Priority } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Trash2, Briefcase, Calendar, Hash, ChevronDown, ChevronRight, Users, CheckCircle, Clock } from "lucide-react";

const priorityColors: Record<Priority, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-success/10 text-success border-success/20",
};

export default function SalesPage() {
  const [salesProjects, setSalesProjects] = useState<SalesProject[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", projectNumber: "", startDate: "", endDate: "", createdAt: "" });
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<SalesProject | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [taskForm, setTaskForm] = useState({ description: "", deadline: "", priority: "medium" as Priority });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [sp, emps, taskData] = await Promise.all([getSalesProjects(), getEmployees(), getTasks()]);
    setSalesProjects(sp);
    setEmployees(emps.filter(e => e.id !== "00000000-0000-0000-0000-000000000001"));
    setTasks(taskData);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.name.trim() || !form.projectNumber.trim() || !form.startDate || !form.endDate) return;
    const createdAt = form.createdAt ? new Date(form.createdAt).toISOString() : new Date().toISOString();
    await addSalesProject({ name: form.name.trim(), projectNumber: form.projectNumber.trim(), startDate: form.startDate, endDate: form.endDate, createdAt });
    setForm({ name: "", projectNumber: "", startDate: "", endDate: "", createdAt: "" });
    setAddOpen(false);
    await loadData();
  };

  const handleDelete = async (id: string) => {
    await deleteSalesProject(id);
    await loadData();
  };

  const openAddTask = (project: SalesProject) => {
    setSelectedProject(project);
    setSelectedEmployee("");
    setTaskForm({ description: "", deadline: "", priority: "medium" });
    setAddTaskOpen(true);
  };

  const handleAddTask = async () => {
    if (!selectedProject || !selectedEmployee || !taskForm.description.trim()) return;
    const now = new Date().toISOString();
    const deadline = taskForm.deadline
      ? new Date(taskForm.deadline).toISOString()
      : selectedProject.endDate;
    await storeAddTask({
      title: selectedProject.name,
      description: taskForm.description.trim(),
      assignedTo: selectedEmployee,
      projectId: undefined,
      expectedTime: 0,
      deadline,
      priority: taskForm.priority,
      status: "in-progress",
      createdAt: now,
      startedAt: now,
    });
    await addNotification({
      message: `New task assigned in sales project "${selectedProject.name}"`,
      read: false,
      createdAt: now,
      forUser: selectedEmployee,
    });
    setAddTaskOpen(false);
    await loadData();
  };

  const getProjectTasks = (project: SalesProject) =>
    tasks.filter(t => t.title === project.name);

  if (loading) return <div className="flex items-center justify-center h-96"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales</h1>
          <p className="text-muted-foreground">Manage sales projects and assign tasks to employees</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Project
        </Button>
      </div>

      {salesProjects.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No sales projects yet</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {salesProjects.map(project => {
            const projectTasks = getProjectTasks(project);
            const completed = projectTasks.filter(t => t.status === "completed").length;
            const inProgress = projectTasks.filter(t => t.status === "in-progress").length;
            const isExpanded = expandedProject === project.id;
            const isActive = new Date(project.endDate) >= new Date();

            return (
              <Card key={project.id} className="border-l-4 border-l-primary">
                <CardContent className="p-5">
                  {/* Project header */}
                  <div className="flex items-start gap-4">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <h3 className="font-semibold text-lg">{project.name}</h3>
                        <Badge variant="outline" className={isActive ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}>
                          {isActive ? "Active" : "Ended"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground ml-7">
                        <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" />{project.projectNumber}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(project.startDate).toLocaleDateString()} — {new Date(project.endDate).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1 text-muted-foreground">Created: {new Date(project.createdAt).toLocaleDateString()} at {new Date(project.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-success" />{completed} done</span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-warning" />{inProgress} active</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" className="gap-1" onClick={() => openAddTask(project)}>
                        <Plus className="h-3.5 w-3.5" /> Add Task
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-8 w-8 p-0" onClick={() => handleDelete(project.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded: tasks grouped by employee */}
                  {isExpanded && (
                    <div className="mt-4 ml-7 space-y-3">
                      {projectTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No tasks assigned yet</p>
                      ) : (
                        (() => {
                          const byEmployee: Record<string, Task[]> = {};
                          projectTasks.forEach(t => {
                            if (!byEmployee[t.assignedTo]) byEmployee[t.assignedTo] = [];
                            byEmployee[t.assignedTo].push(t);
                          });
                          return Object.entries(byEmployee).map(([empId, empTasks]) => {
                            const emp = employees.find(e => e.id === empId);
                            return (
                              <div key={empId} className="border rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-3">
                                  <Avatar className="h-7 w-7">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                      {emp?.name.split(" ").map(n => n[0]).join("") || "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-sm">{emp?.name || "Unknown"}</span>
                                  <span className="text-xs text-muted-foreground">{emp?.role}</span>
                                  <Badge variant="outline" className="ml-auto text-xs">{empTasks.length} task{empTasks.length !== 1 ? "s" : ""}</Badge>
                                </div>
                                <div className="space-y-2">
                                  {empTasks.map(task => (
                                    <div key={task.id} className={`p-2.5 rounded border text-sm ${task.status === "completed" ? "bg-success/5 border-success/20" : "bg-warning/5 border-warning/20"}`}>
                                      <div className="flex items-start justify-between gap-2">
                                        <p className="font-medium">{task.description}</p>
                                        <div className="flex gap-1 shrink-0">
                                          <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>{task.priority}</Badge>
                                          <Badge variant="outline" className={`text-xs ${task.status === "completed" ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}`}>
                                            {task.status === "completed" ? "Done" : "Active"}
                                          </Badge>
                                        </div>
                                      </div>
                                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                                        <span>Due: {(() => {
                                          const d = new Date(task.deadline);
                                          const hasTime = task.deadline.includes("T") && !task.deadline.endsWith("T00:00:00.000Z");
                                          return hasTime ? `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : d.toLocaleDateString();
                                        })()}</span>
                                        {task.createdAt && <span>Assigned: {new Date(task.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} {new Date(task.createdAt).toLocaleDateString()}</span>}
                                        {task.status === "completed" && task.completedAt && <span className="text-success">Done: {new Date(task.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} {new Date(task.completedAt).toLocaleDateString()}</span>}
                                        {task.actualTime && <span>Time: {task.actualTime}m</span>}
                                        {task.efficiency !== undefined && task.expectedTime > 0 && (
                                          <span className={task.efficiency >= 100 ? "text-success" : "text-warning"}>Efficiency: {Math.min(100, task.efficiency)}%</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          });
                        })()
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Project Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Sales Project</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Website Redesign" />
            </div>
            <div className="space-y-2">
              <Label>Project Number</Label>
              <Input value={form.projectNumber} onChange={e => setForm(f => ({ ...f, projectNumber: e.target.value }))} placeholder="e.g. PRJ-001" />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} min={form.startDate} />
            </div>
            <div className="space-y-2">
              <Label>Created At (optional — defaults to now)</Label>
              <Input type="datetime-local" value={form.createdAt} onChange={e => setForm(f => ({ ...f, createdAt: e.target.value }))} />
            </div>
            <Button onClick={handleAdd} className="w-full" disabled={!form.name.trim() || !form.projectNumber.trim() || !form.startDate || !form.endDate}>
              Create Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Task — {selectedProject?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name} — {e.role}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} placeholder="What needs to be done?" rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input type="datetime-local" value={taskForm.deadline} onChange={e => setTaskForm(f => ({ ...f, deadline: e.target.value }))} min={new Date().toISOString().slice(0, 16)} />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={taskForm.priority} onValueChange={(v: Priority) => setTaskForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddTask} className="w-full" disabled={!selectedEmployee || !taskForm.description.trim()}>Assign Task</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
