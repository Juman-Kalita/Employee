import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { getTasks, saveTasks, addTask as storeAddTask, getEmployees, getSalesProjects, addNotification, deleteTask } from "@/lib/store";
import { Task, Priority, TaskStatus, Employee, SalesProject } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, CheckCircle, Clock, TrendingUp, User, ChevronRight, ListTodo, AlertCircle, PlusCircle, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { EmployeeProfileDialog } from "@/components/EmployeeProfileDialog";

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
  const [projects, setProjects] = useState<SalesProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [extensionForm, setExtensionForm] = useState({ reason: "", proposedDeadline: "", blockedByEmployee: "" });
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [cancellationForm, setCancellationForm] = useState({ reason: "" });
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [forwardForm, setForwardForm] = useState({ description: "", toEmployee: "" });
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({ reason: "" });
  const [form, setForm] = useState({ title: "", description: "", assignedTo: "", expectedTime: "", deadline: "", priority: "medium" as Priority });
  const [newTaskForm, setNewTaskForm] = useState({ title: "", description: "", expectedTime: "", deadline: "", priority: "medium" as Priority });
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [otherTaskOpen, setOtherTaskOpen] = useState(false);
  const [otherTaskForm, setOtherTaskForm] = useState({ title: "", description: "", actualTime: "", date: new Date().toISOString().split("T")[0] });
  const [assignTaskOpen, setAssignTaskOpen] = useState(false);
  const [assignTaskForm, setAssignTaskForm] = useState({ title: "", description: "", toEmployee: "", deadline: "", priority: "medium" as Priority });
  const [adminView, setAdminView] = useState<"employees" | "tasks">("employees");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [tasksData, employeesData, projectsData] = await Promise.all([getTasks(), getEmployees(), getSalesProjects()]);
    setTasks(tasksData);
    setEmployees(employeesData);
    setProjects(projectsData);
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
      expectedTime: parseInt(form.expectedTime) || 0,
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

  const openForwardDialog = (task: Task) => {
    setSelectedTask(task);
    setForwardForm({ description: "", toEmployee: "" });
    setForwardDialogOpen(true);
  };

  const submitForwardTask = async () => {
    if (!selectedTask || !forwardForm.toEmployee || !forwardForm.description) return;
    const allTasks = await getTasks();
    const forwardedTask: Task = {
      ...selectedTask,
      id: crypto.randomUUID(),
      assignedTo: forwardForm.toEmployee,
      description: forwardForm.description,
      status: "pending" as TaskStatus,
      createdAt: new Date().toISOString(),
      startedAt: undefined,
      completedAt: undefined,
      actualTime: undefined,
      efficiency: undefined,
      extensionRequest: undefined,
      cancellationRequest: undefined,
    };
    await saveTasks([...allTasks, forwardedTask]);
    await addNotification({
      message: `Task "${selectedTask.title}" was forwarded to you by ${user?.name}`,
      read: false,
      createdAt: new Date().toISOString(),
      forUser: forwardForm.toEmployee,
    });
    setForwardDialogOpen(false);
    setSelectedTask(null);
    await loadData();
  };

  const openRescheduleDialog = (task: Task) => {
    setSelectedTask(task);
    setRescheduleForm({ reason: "" });
    setRescheduleDialogOpen(true);
  };

  const submitRescheduleRequest = async () => {
    if (!selectedTask || !rescheduleForm.reason) return;
    const updated = tasks.map(t => {
      if (t.id !== selectedTask.id) return t;
      return {
        ...t,
        rescheduleRequest: {
          reason: rescheduleForm.reason,
          requestedAt: new Date().toISOString(),
          status: "pending" as const,
        }
      };
    });
    await saveTasks(updated);
    await addNotification({
      message: `Reschedule request for task "${selectedTask.title}" from ${user?.name}`,
      read: false,
      createdAt: new Date().toISOString(),
      forUser: "00000000-0000-0000-0000-000000000001"
    });
    await loadData();
    setRescheduleDialogOpen(false);
    setSelectedTask(null);
  };

  const handleCreateForEmployee = async () => {
    if (!newTaskForm.title || !selectedEmployee) return;
    const now = new Date().toISOString();
    const task: Omit<Task, 'id'> = {
      title: newTaskForm.title,
      description: newTaskForm.description,
      assignedTo: selectedEmployee.id,
      expectedTime: newTaskForm.expectedTime ? parseInt(newTaskForm.expectedTime) : 0,
      deadline: newTaskForm.deadline || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      priority: newTaskForm.priority,
      status: "in-progress",
      createdAt: now,
      startedAt: now,
    };
    await storeAddTask(task);
    await addNotification({ message: `New Task Assigned: ${task.title}`, read: false, createdAt: new Date().toISOString(), forUser: selectedEmployee.id });
    await loadData();
    setAddTaskOpen(false);
    setNewTaskForm({ title: "", description: "", expectedTime: "", deadline: "", priority: "medium" });
  };

  const handleExtensionApproval = async (taskId: string, approved: boolean, adminResponse?: string) => {    const updated = tasks.map(t => {
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

  const submitOtherTask = async () => {
    if (!otherTaskForm.title.trim() || !user) return;
    const dateStr = otherTaskForm.date || new Date().toISOString().split("T")[0];
    const completedAt = new Date(dateStr).toISOString();
    await storeAddTask({
      title: otherTaskForm.title.trim(),
      description: otherTaskForm.description.trim(),
      assignedTo: user.id,
      expectedTime: 0,
      deadline: dateStr,
      priority: "low",
      status: "completed",
      createdAt: completedAt,
      startedAt: completedAt,
      completedAt: completedAt,
      actualTime: otherTaskForm.actualTime ? parseInt(otherTaskForm.actualTime) : 0,
    });
    setOtherTaskForm({ title: "", description: "", actualTime: "", date: new Date().toISOString().split("T")[0] });
    setOtherTaskOpen(false);
    await loadData();
  };

  // If employee, show simple task list view
  if (!isAdmin) {
    const submitAssignTask = async () => {
      if (!assignTaskForm.title || !assignTaskForm.toEmployee || !assignTaskForm.deadline) return;
      const newTask = await storeAddTask({
        title: assignTaskForm.title,
        description: assignTaskForm.description,
        assignedTo: assignTaskForm.toEmployee,
        assignedBy: user?.id,
        expectedTime: 0,
        deadline: assignTaskForm.deadline,
        priority: assignTaskForm.priority,
        status: "pending" as TaskStatus,
        createdAt: new Date().toISOString(),
      });
      if (newTask) {
        const targetEmp = employees.find(e => e.id === assignTaskForm.toEmployee);
        // Notify the assigned employee
        await addNotification({
          message: `${user?.name} assigned you a new task: "${assignTaskForm.title}"`,
          read: false,
          createdAt: new Date().toISOString(),
          forUser: assignTaskForm.toEmployee,
        });
        // Notify admin
        await addNotification({
          message: `${user?.name} assigned task "${assignTaskForm.title}" to ${targetEmp?.name || "an employee"}`,
          read: false,
          createdAt: new Date().toISOString(),
          forUser: "00000000-0000-0000-0000-000000000001",
        });
        setAssignTaskForm({ title: "", description: "", toEmployee: "", deadline: "", priority: "medium" });
        setAssignTaskOpen(false);
        await loadData();
      }
    };

    const inProgressTasks = userTasks.filter(t => t.status === "in-progress");
    const completedTasks = userTasks.filter(t => t.status === "completed");
    const notCompletedTasks = inProgressTasks.filter(t => t.cancellationRequest?.status === 'pending');

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Tasks</h1>
            <p className="text-muted-foreground">View your assigned tasks and progress</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setAssignTaskOpen(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Assign Task
            </Button>
            <Button onClick={() => setOtherTaskOpen(true)} className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Other Tasks
            </Button>
          </div>
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
                // Don't show overtime if extension was approved or no expected time set
                const isOvertime = task.extensionRequest?.status === 'approved' ? false : (task.expectedTime > 0 && elapsedMinutes > task.expectedTime);
                
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
                              â± Active
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                          
                          <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-muted/50 rounded-lg">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Assigned On</p>
                              <p className="text-sm font-medium">{new Date(task.createdAt).toLocaleDateString()} at {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Deadline</p>
                              <p className="text-sm font-medium">{(() => {
                                const d = new Date(task.deadline);
                                const hasTime = task.deadline.includes("T") && !task.deadline.endsWith("T00:00:00.000Z");
                                return hasTime ? `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : d.toLocaleDateString();
                              })()}</p>
                            </div>
                            {task.expectedTime > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Expected Time</p>
                                <p className="text-sm font-medium">{task.expectedTime} minutes</p>
                              </div>
                            )}
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
                          {task.rescheduleRequest?.status === "approved" ? (
                            <div className="text-center p-2 bg-success/10 border border-success/20 rounded text-xs text-success font-medium">
                              ✓ Rescheduled for next day
                              <p className="font-bold mt-0.5">{new Date(task.deadline).toLocaleDateString()}</p>
                            </div>
                          ) : task.rescheduleRequest?.status === "pending" ? (
                            <div className="text-center p-2 bg-primary/5 border border-primary/20 rounded text-xs text-primary">
                              ⏳ Reschedule pending approval
                            </div>
                          ) : !task.extensionRequest && !task.cancellationRequest && (
                            <>
                              <Button onClick={() => openExtensionDialog(task)} size="sm" variant="outline" className="gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Request Extension
                              </Button>
                              <Button onClick={() => openCancellationDialog(task)} size="sm" variant="outline" className="gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Not Completed
                              </Button>
                              <Button onClick={() => openRescheduleDialog(task)} size="sm" variant="outline" className="gap-2 text-primary border-primary/30 hover:bg-primary/5">
                                <AlertCircle className="h-4 w-4" />
                                Reason
                              </Button>
                              <Button onClick={() => openForwardDialog(task)} size="sm" variant="outline" className="gap-2 text-blue-500 border-blue-400/30 hover:bg-blue-500/5">
                                <ChevronRight className="h-4 w-4" />
                                Forward Task
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
                              Reported: {new Date(task.cancellationRequest!.requestedAt).toLocaleDateString()} at {new Date(task.cancellationRequest!.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
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
                            âœ“ Completed
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Assigned On</p>
                            <p className="text-sm font-medium">{new Date(task.createdAt).toLocaleDateString()} at {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Completed On</p>
                            <p className="text-sm font-medium">{new Date(task.completedAt!).toLocaleDateString()} at {new Date(task.completedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                          </div>
                          {task.expectedTime > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Expected Time</p>
                              <p className="text-sm font-medium">{task.expectedTime} minutes</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Actual Time</p>
                            <p className="text-sm font-medium">{task.actualTime} minutes</p>
                          </div>
                        </div>

                        {task.expectedTime > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-success/5 rounded border border-success/20">
                          <TrendingUp className="h-4 w-4 text-success" />
                          <span className="text-sm font-medium">Efficiency:</span>
                          <span className={`text-sm font-bold ${task.efficiency! >= 100 ? 'text-success' : 'text-warning'}`}>
                            {Math.min(100, task.efficiency || 0)}%
                          </span>
                          {task.efficiency! >= 100 ? (
                            <span className="text-xs text-success ml-auto">
                              âœ“ Completed ahead of schedule
                            </span>
                          ) : (
                            <span className="text-xs text-warning ml-auto">
                              Took {task.actualTime! - task.expectedTime} minutes extra
                            </span>
                          )}
                        </div>
                        )}
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

        {/* Tasks I Assigned to Others */}
        {(() => {
          const myAssignedTasks = tasks.filter(t => t.assignedBy === user?.id);
          if (myAssignedTasks.length === 0) return null;
          return (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Tasks I Assigned ({myAssignedTasks.length})
              </h2>
              <div className="space-y-3">
                {myAssignedTasks.map(task => {
                  const assignedTo = employees.find(e => e.id === task.assignedTo);
                  return (
                    <Card key={task.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold">{task.title}</h3>
                              <Badge variant="outline" className={priorityColors[task.priority]}>{task.priority}</Badge>
                              <Badge variant="outline" className={
                                task.status === "completed" ? "bg-success/10 text-success border-success/20" :
                                task.status === "in-progress" ? "bg-warning/10 text-warning border-warning/20" :
                                "bg-muted text-muted-foreground"
                              }>{task.status}</Badge>
                            </div>
                            {task.description && <p className="text-sm text-muted-foreground mb-2">{task.description}</p>}
                            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><User className="h-3 w-3" />Assigned to: <span className="font-medium text-foreground">{assignedTo?.name || "Unknown"}</span></span>
                              <span>Deadline: {new Date(task.deadline).toLocaleDateString()}</span>
                              <span>Assigned on: {new Date(task.createdAt).toLocaleDateString()} at {new Date(task.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Other Tasks (self-reported) */}
        {(() => {
          const otherTasks = userTasks.filter(t => t.status === "completed" && t.expectedTime === 0 && t.startedAt === t.completedAt);
          if (otherTasks.length === 0) return null;
          return (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                Other Tasks ({otherTasks.length})
              </h2>
              <div className="space-y-3">
                {otherTasks.map(task => (
                  <Card key={task.id} className="hover:shadow-md transition-all border-l-4 border-l-primary opacity-90">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{task.title}</h3>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Self-reported</Badge>
                      </div>
                      {task.description && <p className="text-sm text-muted-foreground mb-3">{task.description}</p>}
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>Date: {new Date(task.deadline).toLocaleDateString()}</span>
                        {task.actualTime && task.actualTime > 0 && <span>Time spent: {task.actualTime}m</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Other Task Dialog */}
        <Dialog open={otherTaskOpen} onOpenChange={setOtherTaskOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Other Task</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">Log any extra work you did outside your assigned tasks.</p>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={otherTaskForm.title} onChange={e => setOtherTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="What did you work on?" />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea value={otherTaskForm.description} onChange={e => setOtherTaskForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description..." rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={otherTaskForm.date} onChange={e => setOtherTaskForm(f => ({ ...f, date: e.target.value }))} max={new Date().toISOString().split("T")[0]} />
              </div>
              <div className="space-y-2">
                <Label>Time Spent (minutes, optional)</Label>
                <Input type="number" value={otherTaskForm.actualTime} onChange={e => setOtherTaskForm(f => ({ ...f, actualTime: e.target.value }))} placeholder="e.g. 45" min="1" />
              </div>
              <Button onClick={submitOtherTask} className="w-full" disabled={!otherTaskForm.title.trim()}>Submit</Button>
            </div>
          </DialogContent>
        </Dialog>

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

        {/* Reschedule Request Dialog */}
        <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Incomplete Task Reason</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Task: {selectedTask?.title}</p>
                <p className="text-sm text-muted-foreground">If approved by admin, this task will be rescheduled to the next day.</p>
              </div>
              <div className="space-y-2">
                <Label>Reason for Incomplete Task</Label>
                <Textarea
                  placeholder="Explain why you could not complete this task..."
                  value={rescheduleForm.reason}
                  onChange={e => setRescheduleForm(f => ({ ...f, reason: e.target.value }))}
                  rows={4}
                />
              </div>
              <Button
                onClick={submitRescheduleRequest}
                className="w-full"
                disabled={!rescheduleForm.reason}
              >
                Submit Reason
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

        {/* Assign Task Dialog */}
        <Dialog open={assignTaskOpen} onOpenChange={setAssignTaskOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Task to Employee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Task Title</Label>
                <Input
                  placeholder="Enter task title..."
                  value={assignTaskForm.title}
                  onChange={e => setAssignTaskForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe the task..."
                  value={assignTaskForm.description}
                  onChange={e => setAssignTaskForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={assignTaskForm.toEmployee} onValueChange={v => setAssignTaskForm(f => ({ ...f, toEmployee: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => e.id !== user?.id && e.status === "active").map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name} — {e.role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={assignTaskForm.priority} onValueChange={v => setAssignTaskForm(f => ({ ...f, priority: v as Priority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={assignTaskForm.deadline}
                  onChange={e => setAssignTaskForm(f => ({ ...f, deadline: e.target.value }))}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <Button
                onClick={submitAssignTask}
                className="w-full"
                disabled={!assignTaskForm.title || !assignTaskForm.toEmployee || !assignTaskForm.deadline}
              >
                Assign Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Forward Task Dialog */}
        <Dialog open={forwardDialogOpen} onOpenChange={setForwardDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Forward Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <p className="text-sm font-medium">Task: {selectedTask?.title}</p>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe what needs to be done..."
                  value={forwardForm.description}
                  onChange={e => setForwardForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select
                  value={forwardForm.toEmployee}
                  onValueChange={v => setForwardForm(f => ({ ...f, toEmployee: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees
                      .filter(e => e.id !== user?.id && e.status === "active")
                      .map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} — {e.role}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={submitForwardTask}
                className="w-full"
                disabled={!forwardForm.description || !forwardForm.toEmployee}
              >
                Forward Task
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
          <p className="text-muted-foreground">
            {adminView === "employees" ? "Click on an employee to view their profile and assign tasks" : "All tasks and their assigned employees"}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button onClick={() => setAdminView("employees")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${adminView === "employees" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Employees</button>
          <button onClick={() => setAdminView("tasks")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${adminView === "tasks" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Tasks</button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={adminView === "employees" ? "Search employees..." : "Search tasks..."} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {adminView === "tasks" && (
        <div className="space-y-3">
          {tasks.filter(t => !search || (t.description || t.title).toLowerCase().includes(search.toLowerCase()) || employees.find(e => e.id === t.assignedTo)?.name.toLowerCase().includes(search.toLowerCase())).map(task => {
            const emp = employees.find(e => e.id === task.assignedTo);
            const isInProgress = task.status === "in-progress";
            return (
              <Card key={task.id} className={`border-l-4 ${isInProgress ? "border-l-warning" : "border-l-success"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-medium">{task.description || task.title}</p>
                        <Badge variant="outline" className={priorityColors[task.priority]}>{task.priority}</Badge>
                        <Badge variant="outline" className={isInProgress ? "bg-warning/10 text-warning border-warning/20" : "bg-success/10 text-success border-success/20"}>{isInProgress ? "Active" : "Done"}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{emp?.name || "Unknown"} — {emp?.role}</span>
                        <span>Project: {task.title}</span>
                        <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                        {task.createdAt && <span>Assigned: {new Date(task.createdAt).toLocaleDateString()} {new Date(task.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                        {task.status === "completed" && task.completedAt && <span className="text-success">Completed: {new Date(task.completedAt).toLocaleDateString()} {new Date(task.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-8 w-8 p-0 shrink-0" onClick={async () => { await deleteTask(task.id); await loadData(); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {tasks.length === 0 && (
            <Card className="p-12"><div className="text-center text-muted-foreground"><ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No tasks found</p></div></Card>
          )}
        </div>
      )}

      {adminView === "employees" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStats.map(stat => (
          <Card key={stat.employee.id} className="hover:shadow-lg transition-all cursor-pointer group" onClick={() => { setSelectedEmployee(stat.employee); setAddTaskOpen(false); }}>
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
            <p>No employees found</p>
          </div>
        </Card>
      )}
        </>
      )}

      {/* Employee Profile Dialog */}
      <EmployeeProfileDialog
        employee={selectedEmployee}
        tasks={tasks}
        projects={projects}
        onClose={() => setSelectedEmployee(null)}
        onDataChange={loadData}
        onExtensionApproval={handleExtensionApproval}
        onRescheduleApproval={async (taskId, approved) => {
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
        }}
      />
    </div>
  );
}






