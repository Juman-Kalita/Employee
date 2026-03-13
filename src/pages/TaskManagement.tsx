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
import { Plus, Search, CheckCircle, Clock, TrendingUp, User, ChevronRight, ListTodo, AlertCircle } from "lucide-react";
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
  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [extensionForm, setExtensionForm] = useState({ reason: "", proposedDeadline: "", blockedByEmployee: "" });
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [cancellationForm, setCancellationForm] = useState({ reason: "" });
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

  // For employees, filter to show only their tasks
  const userTasks = useMemo(() => {
    if (isAdmin) return tasks;
    return tasks.filter(t => t.assignedTo === user?.id);
  }, [tasks, user?.id, isAdmin]);

  // Admin view - show employee cards
  const employeeStats = useMemo(() => {
    // For non-admin users, only show their own stats
    const employeesToShow = isAdmin ? employees : employees.filter(emp => emp.id === user?.id);
    
    return employeesToShow.map(emp => {
      const empTasks = tasks.filter(t => t.assignedTo === emp.id);
      const completed = empTasks.filter(t => t.status === "completed").length;
      const inProgress = empTasks.filter(t => t.status === "in-progress").length;
      const completionRate = empTasks.length > 0 ? Math.round((completed / empTasks.length) * 100) : 0;
      // Cap each task's efficiency at 100% before averaging
      const avgEfficiency = completed > 0 
        ? Math.round(empTasks.filter(t => t.status === "completed").reduce((sum, t) => sum + Math.min(100, t.efficiency || 0), 0) / completed)
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
  }, [employees, tasks, isAdmin, user?.id]);

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
      // Only cap efficiency at 100% if it exceeds 100 (completed faster than expected)
      // If slower than expected, show the actual low efficiency
      const rawEfficiency = Math.round((t.expectedTime / actual) * 100);
      const efficiency = rawEfficiency > 100 ? 100 : rawEfficiency;
      return { ...t, status: "completed" as TaskStatus, completedAt: now.toISOString(), actualTime: actual, efficiency };
    });
    await saveTasks(updated);
    await loadData();
  };

  const openExtensionDialog = (task: Task) => {
    setSelectedTask(task);
    setExtensionForm({ reason: "", proposedDeadline: "", blockedByEmployee: "" });
    setExtensionDialogOpen(true);
  };

  const submitExtensionRequest = async () => {
    if (!selectedTask || !extensionForm.reason || !extensionForm.proposedDeadline) return;
    
    const updated = tasks.map(t => {
      if (t.id !== selectedTask.id) return t;
      return {
        ...t,
        extensionRequest: {
          reason: extensionForm.reason,
          proposedDeadline: extensionForm.proposedDeadline,
          requestedAt: new Date().toISOString(),
          status: "pending" as const,
          blockedByEmployee: extensionForm.blockedByEmployee || undefined
        }
      };
    });
    
    await saveTasks(updated);
    
    // Notify admin
    await addNotification({
      message: `Extension request for task "${selectedTask.title}" from ${user?.name}${extensionForm.blockedByEmployee ? ' (blocked by teammate)' : ''}`,
      read: false,
      createdAt: new Date().toISOString(),
      forUser: "00000000-0000-0000-0000-000000000001" // Admin user ID
    });
    
    // If blocked by another employee, notify them too
    if (extensionForm.blockedByEmployee) {
      await addNotification({
        message: `Your work is blocking "${selectedTask.title}" assigned to ${user?.name}`,
        read: false,
        createdAt: new Date().toISOString(),
        forUser: extensionForm.blockedByEmployee
      });
    }
    
    await loadData();
    setExtensionDialogOpen(false);
    setSelectedTask(null);
  };

  const openCancellationDialog = (task: Task) => {
    setSelectedTask(task);
    setCancellationForm({ reason: "" });
    setCancellationDialogOpen(true);
  };

  const submitCancellationRequest = async () => {
    if (!selectedTask || !cancellationForm.reason) return;
    
    const updated = tasks.map(t => {
      if (t.id !== selectedTask.id) return t;
      return {
        ...t,
        cancellationRequest: {
          reason: cancellationForm.reason,
          requestedAt: new Date().toISOString(),
          status: "pending" as const // Using pending to indicate "not completed today"
        }
      };
    });
    
    await saveTasks(updated);
    await loadData();
    setCancellationDialogOpen(false);
    setSelectedTask(null);
  };

  const handleExtensionApproval = async (taskId: string, approved: boolean, adminResponse?: string) => {
    const updated = tasks.map(t => {
      if (t.id !== taskId || !t.extensionRequest) return t;
      
      if (approved) {
        return {
          ...t,
          deadline: t.extensionRequest.proposedDeadline,
          extensionRequest: {
            ...t.extensionRequest,
            status: "approved" as const,
            adminResponse: adminResponse || "Extension approved"
          }
        };
      } else {
        return {
          ...t,
          extensionRequest: {
            ...t.extensionRequest,
            status: "rejected" as const,
            adminResponse: adminResponse || "Extension rejected"
          }
        };
      }
    });
    
    await saveTasks(updated);
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      await addNotification({
        message: `Your extension request for "${task.title}" has been ${approved ? 'approved' : 'rejected'}`,
        read: false,
        createdAt: new Date().toISOString(),
        forUser: task.assignedTo
      });
    }
    await loadData();
  };

  // If employee, show simple task list view
  if (!isAdmin) {
    const inProgressTasks = userTasks.filter(t => t.status === "in-progress");
    const completedTasks = userTasks.filter(t => t.status === "completed");
    const notCompletedTasks = inProgressTasks.filter(t => t.cancellationRequest?.status === 'pending');

    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">My Tasks</h1>
          <p className="text-muted-foreground">View your assigned tasks and progress</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <ListTodo className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{userTasks.length}</p>
              <p className="text-sm text-muted-foreground">Total Assigned</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-warning" />
              <p className="text-3xl font-bold">{inProgressTasks.length}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
              <p className="text-3xl font-bold">{completedTasks.length}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* In Progress Tasks */}
        {inProgressTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              In Progress ({inProgressTasks.length})
            </h2>
            <div className="space-y-3">
              {inProgressTasks.map(task => {
                const startTime = new Date(task.startedAt!);
                const now = new Date();
                const elapsedMinutes = Math.round((now.getTime() - startTime.getTime()) / 60000);
                // Don't show overtime if extension was approved
                const isOvertime = task.extensionRequest?.status === 'approved' ? false : elapsedMinutes > task.expectedTime;
                
                return (
                  <Card key={task.id} className="hover:shadow-md transition-all border-l-4 border-l-warning">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{task.title}</h3>
                            <Badge variant="outline" className={priorityColors[task.priority]}>
                              {task.priority}
                            </Badge>
                            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 animate-pulse">
                              ⏱ Active
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                          
                          <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-muted/50 rounded-lg">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Assigned On</p>
                              <p className="text-sm font-medium">{new Date(task.createdAt).toLocaleDateString()} at {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Started On</p>
                              <p className="text-sm font-medium">{startTime.toLocaleDateString()} at {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Deadline</p>
                              <p className="text-sm font-medium">{new Date(task.deadline).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Expected Time</p>
                              <p className="text-sm font-medium">{task.expectedTime} minutes</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 p-2 bg-primary/5 rounded border border-primary/20 mb-3">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Time Elapsed:</span>
                            <span className={`text-sm font-bold ${isOvertime ? 'text-destructive' : 'text-primary'}`}>
                              {elapsedMinutes} minutes
                            </span>
                            {isOvertime && (
                              <span className="text-xs text-destructive ml-auto">
                                ({elapsedMinutes - task.expectedTime}m overtime)
                              </span>
                            )}
                          </div>

                          {task.extensionRequest && (
                            <div className={`p-3 rounded border mb-3 ${
                              task.extensionRequest.status === 'pending' ? 'bg-warning/5 border-warning/20' :
                              task.extensionRequest.status === 'approved' ? 'bg-success/5 border-success/20' :
                              'bg-destructive/5 border-destructive/20'
                            }`}>
                              <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-sm font-semibold">
                                  Extension Request: {task.extensionRequest.status.charAt(0).toUpperCase() + task.extensionRequest.status.slice(1)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mb-1">Reason: {task.extensionRequest.reason}</p>
                              <p className="text-xs text-muted-foreground mb-1">
                                Proposed Deadline: {new Date(task.extensionRequest.proposedDeadline).toLocaleDateString()}
                              </p>
                              {task.extensionRequest.adminResponse && (
                                <p className="text-xs text-muted-foreground">Admin Response: {task.extensionRequest.adminResponse}</p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button onClick={() => completeTask(task.id)} size="sm" className="gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Complete
                          </Button>
                          {!task.extensionRequest && !task.cancellationRequest && (
                            <>
                              <Button onClick={() => openExtensionDialog(task)} size="sm" variant="outline" className="gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Request Extension
                              </Button>
                              <Button onClick={() => openCancellationDialog(task)} size="sm" variant="outline" className="gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Not Completed
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Not Completed Today */}
        {notCompletedTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Not Completed Today ({notCompletedTasks.length})
            </h2>
            <div className="space-y-3">
              {notCompletedTasks.map(task => {
                const employee = employees.find(e => e.id === task.assignedTo);
                
                return (
                  <Card key={task.id} className="hover:shadow-md transition-all border-l-4 border-l-warning">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{task.title}</h3>
                            <Badge variant="outline" className={priorityColors[task.priority]}>
                              {task.priority}
                            </Badge>
                            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                              Not Completed Today
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                          
                          {employee && (
                            <div className="mb-3 p-3 bg-muted/50 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">Employee</p>
                              <p className="text-sm font-medium">{employee.name}</p>
                              <p className="text-xs text-muted-foreground">{employee.email}</p>
                            </div>
                          )}

                          <div className="p-3 bg-warning/5 border border-warning/20 rounded">
                            <p className="text-xs font-semibold text-warning mb-1">Reason:</p>
                            <p className="text-sm">{task.cancellationRequest?.reason}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Reported: {new Date(task.cancellationRequest!.requestedAt).toLocaleDateString()} at {new Date(task.cancellationRequest!.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Completed ({completedTasks.length})
            </h2>
            <div className="space-y-3">
              {completedTasks.map(task => (
                <Card key={task.id} className="hover:shadow-md transition-all border-l-4 border-l-success opacity-90">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{task.title}</h3>
                          <Badge variant="outline" className={priorityColors[task.priority]}>
                            {task.priority}
                          </Badge>
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                            ✓ Completed
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Assigned On</p>
                            <p className="text-sm font-medium">{new Date(task.createdAt).toLocaleDateString()} at {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Completed On</p>
                            <p className="text-sm font-medium">{new Date(task.completedAt!).toLocaleDateString()} at {new Date(task.completedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Expected Time</p>
                            <p className="text-sm font-medium">{task.expectedTime} minutes</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Actual Time</p>
                            <p className="text-sm font-medium">{task.actualTime} minutes</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-2 bg-success/5 rounded border border-success/20">
                          <TrendingUp className="h-4 w-4 text-success" />
                          <span className="text-sm font-medium">Efficiency:</span>
                          <span className={`text-sm font-bold ${task.efficiency! >= 100 ? 'text-success' : 'text-warning'}`}>
                            {Math.min(100, task.efficiency || 0)}%
                          </span>
                          {task.efficiency! >= 100 ? (
                            <span className="text-xs text-success ml-auto">
                              ✓ Completed ahead of schedule
                            </span>
                          ) : (
                            <span className="text-xs text-warning ml-auto">
                              Took {task.actualTime! - task.expectedTime} minutes extra
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {userTasks.length === 0 && (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tasks assigned yet</p>
            </div>
          </Card>
        )}

        {/* Extension Request Dialog */}
        <Dialog open={extensionDialogOpen} onOpenChange={setExtensionDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request Deadline Extension</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Task: {selectedTask?.title}</p>
                <p className="text-sm text-muted-foreground">Current Deadline: {selectedTask && new Date(selectedTask.deadline).toLocaleDateString()}</p>
              </div>
              <div className="space-y-2">
                <Label>Reason for Extension</Label>
                <Textarea 
                  placeholder="Explain why you need more time..."
                  value={extensionForm.reason}
                  onChange={e => setExtensionForm(f => ({ ...f, reason: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Blocked by Teammate? (Optional)</Label>
                <Select 
                  value={extensionForm.blockedByEmployee || "none"} 
                  onValueChange={v => setExtensionForm(f => ({ ...f, blockedByEmployee: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select if blocked by a teammate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None - Not blocked by anyone</SelectItem>
                    {employees && employees.length > 0 && employees
                      .filter(e => e.id !== user?.id && e.status === 'active')
                      .map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} - {e.role}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {extensionForm.blockedByEmployee && (
                  <p className="text-xs text-muted-foreground">
                    This teammate will be notified about the dependency
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Proposed New Deadline</Label>
                <Input 
                  type="date"
                  value={extensionForm.proposedDeadline}
                  onChange={e => setExtensionForm(f => ({ ...f, proposedDeadline: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <Button 
                onClick={submitExtensionRequest} 
                className="w-full"
                disabled={!extensionForm.reason || !extensionForm.proposedDeadline}
              >
                Submit Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Not Completed Dialog */}
        <Dialog open={cancellationDialogOpen} onOpenChange={setCancellationDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Mark Task as Not Completed Today</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Task: {selectedTask?.title}</p>
                <p className="text-sm text-muted-foreground">You can continue working on this task another day.</p>
              </div>
              <div className="space-y-2">
                <Label>Reason for Not Completing Today</Label>
                <Textarea 
                  placeholder="Explain why you couldn't complete this task today..."
                  value={cancellationForm.reason}
                  onChange={e => setCancellationForm(f => ({ ...f, reason: e.target.value }))}
                  rows={4}
                />
              </div>
              <Button 
                onClick={submitCancellationRequest} 
                variant="outline"
                className="w-full"
                disabled={!cancellationForm.reason}
              >
                Submit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Task Management</h1>
          <p className="text-muted-foreground">Track employee tasks and performance</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" />New Task</Button>
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
                              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                                <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                                <span>Expected: {task.expectedTime}m</span>
                              </div>
                              
                              {task.extensionRequest && task.extensionRequest.status === 'pending' && (
                                <div className="mt-3 p-3 bg-warning/5 border border-warning/20 rounded">
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="h-4 w-4 text-warning" />
                                    <span className="text-sm font-semibold text-warning">Extension Request Pending</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-1">Reason: {task.extensionRequest.reason}</p>
                                  <p className="text-xs text-muted-foreground mb-1">
                                    Proposed Deadline: {new Date(task.extensionRequest.proposedDeadline).toLocaleDateString()}
                                  </p>
                                  {task.extensionRequest.blockedByEmployee && (() => {
                                    const blockingEmployee = employees.find(e => e.id === task.extensionRequest!.blockedByEmployee);
                                    return blockingEmployee ? (
                                      <p className="text-xs text-destructive mb-3 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        Blocked by: {blockingEmployee.name} ({blockingEmployee.role})
                                      </p>
                                    ) : null;
                                  })()}
                                  <div className="flex gap-2 mt-3">
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleExtensionApproval(task.id, true)}
                                      className="flex-1"
                                    >
                                      Approve
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="destructive"
                                      onClick={() => handleExtensionApproval(task.id, false)}
                                      className="flex-1"
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              )}
                              
                              {task.extensionRequest && task.extensionRequest.status !== 'pending' && (
                                <div className={`mt-3 p-2 rounded text-xs ${
                                  task.extensionRequest.status === 'approved' 
                                    ? 'bg-success/5 text-success' 
                                    : 'bg-destructive/5 text-destructive'
                                }`}>
                                  Extension {task.extensionRequest.status}
                                  {task.extensionRequest.status === 'approved' && 
                                    ` - New deadline: ${new Date(task.deadline).toLocaleDateString()}`
                                  }
                                </div>
                              )}
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
                                  Efficiency: {Math.min(100, task.efficiency || 0)}%
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
