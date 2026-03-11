import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { getTasks, saveTasks, addTask as storeAddTask, getEmployees, addNotification } from "@/lib/store";
import { Task, Priority, TaskStatus, Employee } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, CheckCircle, Clock, TrendingUp, User, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

const priorityColors: Record<Priority, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-success/10 text-success border-success/20",
};

export default function TaskManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
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

  const employeeStats = useMemo(() => {
    return employees.map(emp => {
      const empTasks = tasks.filter(t => t.assignedTo === emp.id);
      const completed = empTasks.filter(t => t.status === "completed").length;
      const inProgress = empTasks.filter(t => t.status === "in-progress").length;
      const completionRate = empTasks.length > 0 ? Math.round((completed / empTasks.length) * 100) : 0;
      const avgEfficiency = completed > 0 
        ? Math.round(empTasks.filter(t => t.status === "completed").reduce((sum, t) => sum + (t.efficiency || 0), 0) / completed)
        : 0;
      
      return {
        employee: emp,
        totalTasks: empTasks.length,
        completed,
        inProgress,
        completionRate,
        avgEfficiency,
        tasks: empTasks
      };
    }).filter(stat => stat.totalTasks > 0 || isAdmin);
  }, [employees, tasks, isAdmin]);

  const filteredStats = useMemo(() => {
    if (!search) return employeeStats;
    return employeeStats.filter(stat => 
      stat.employee.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [employeeStats, search]);

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
          <h1 className="text-2xl font-bold">Task Management</h1>
          <p className="text-muted-foreground">Track employee tasks and performance</p>
        </div>
        {isAdmin && <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" />New Task</Button>}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Employee Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStats.map(stat => (
          <Card key={stat.employee.id} className="hover:shadow-lg transition-all cursor-pointer group" onClick={() => setSelectedEmployee(stat.employee)}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 bg-primary/10">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {stat.employee.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{stat.employee.name}</h3>
                    <p className="text-sm text-muted-foreground">{stat.employee.role}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Tasks</span>
                  <span className="font-semibold">{stat.totalTasks}</span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Completion Rate</span>
                    <span className="font-semibold">{stat.completionRate}%</span>
                  </div>
                  <Progress value={stat.completionRate} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-muted-foreground">Completed:</span>
                    <span className="font-semibold">{stat.completed}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-warning" />
                    <span className="text-muted-foreground">Active:</span>
                    <span className="font-semibold">{stat.inProgress}</span>
                  </div>
                </div>

                {stat.avgEfficiency > 0 && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Avg Efficiency:</span>
                    <span className={`text-sm font-semibold ${stat.avgEfficiency >= 100 ? 'text-success' : 'text-warning'}`}>
                      {stat.avgEfficiency}%
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStats.length === 0 && (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No employees with tasks found</p>
          </div>
        </Card>
      )}

      {/* Employee Detail Dialog */}
      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedEmployee && (() => {
            const stat = employeeStats.find(s => s.employee.id === selectedEmployee.id)!;
            const completedTasks = stat.tasks.filter(t => t.status === "completed");
            const inProgressTasks = stat.tasks.filter(t => t.status === "in-progress");
            
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 bg-primary/10">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">
                        {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-2xl">{selectedEmployee.name}</DialogTitle>
                      <p className="text-muted-foreground">{selectedEmployee.role} • {selectedEmployee.email}</p>
                    </div>
                  </div>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-4 my-6">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{stat.totalTasks}</p>
                      <p className="text-sm text-muted-foreground">Total Tasks</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-success">{stat.completed}</p>
                      <p className="text-sm text-muted-foreground">Completed</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-primary">{stat.avgEfficiency}%</p>
                      <p className="text-sm text-muted-foreground">Avg Efficiency</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  {inProgressTasks.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-warning" />
                        In Progress ({inProgressTasks.length})
                      </h3>
                      <div className="space-y-2">
                        {inProgressTasks.map(task => (
                          <Card key={task.id} className="hover:shadow-md transition-all">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4 className="font-medium">{task.title}</h4>
                                <Badge variant="outline" className={priorityColors[task.priority]}>{task.priority}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                                <span>Expected: {task.expectedTime}m</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {completedTasks.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        Completed ({completedTasks.length})
                      </h3>
                      <div className="space-y-2">
                        {completedTasks.map(task => (
                          <Card key={task.id} className="hover:shadow-md transition-all">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4 className="font-medium">{task.title}</h4>
                                <Badge variant="outline" className={priorityColors[task.priority]}>{task.priority}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                              <div className="flex items-center gap-4 text-xs">
                                <span className="text-muted-foreground">Completed: {new Date(task.completedAt!).toLocaleDateString()}</span>
                                <span className="text-muted-foreground">Time: {task.actualTime}m</span>
                                <span className={`font-semibold ${task.efficiency! >= 100 ? 'text-success' : 'text-warning'}`}>
                                  Efficiency: {task.efficiency}%
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
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
