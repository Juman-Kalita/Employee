import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { getTasks, saveTasks, addTask as storeAddTask, getEmployees, getSalesProjects, addNotification, deleteTask } from "@/lib/store";
import { Task, Priority, TaskStatus, Employee, SalesProject } from "@/lib/types";
import { fmtDate, fmtTime, fmtDateTime, fmtDeadline, calcEfficiency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, CheckCircle, Clock, TrendingUp, User, ChevronRight, ListTodo, AlertCircle, PlusCircle, Trash2, X } from "lucide-react";
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
  const [otherTaskDate, setOtherTaskDate] = useState(new Date().toISOString().split("T")[0]);
  const [reportEntries, setReportEntries] = useState([{ description: "", from: "", to: "" }]);
  const [assignTaskOpen, setAssignTaskOpen] = useState(false);
  const [assignTaskForm, setAssignTaskForm] = useState({ title: "", description: "", toEmployee: "", deadline: "", priority: "medium" as Priority });
  const [statDialogOpen, setStatDialogOpen] = useState(false);
  const [statDialogType, setStatDialogType] = useState<"all" | "inProgress" | "completed">("all");
  const [adminView, setAdminView] = useState<"employees" | "tasks">("employees");
  const [teamTaskDialogOpen, setTeamTaskDialogOpen] = useState(false);
  const [teamTaskForm, setTeamTaskForm] = useState({ title: "", description: "", team: "", leaderId: "", deadline: "", priority: "medium" as Priority });

  const location = useLocation();

  useEffect(() => {
    loadData();
  }, []);

  // Auto-open employee profile if navigated from a notification
  useEffect(() => {
    const state = location.state as { openEmployeeId?: string } | null;
    if (state?.openEmployeeId && employees.length > 0) {
      const emp = employees.find(e => e.id === state.openEmployeeId);
      if (emp) {
        setSelectedEmployee(emp);
        // Clear the state so it doesn't re-trigger
        window.history.replaceState({}, "");
      }
    }
  }, [location.state, employees]);

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
      const avgEfficiency = completed > 0 
        ? Math.round(empTasks.filter(t => t.status === "completed").reduce((sum, t) => sum + (t.efficiency ?? 0), 0) / completed)
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

  const submitTeamTask = async () => {
    if (!teamTaskForm.title || !teamTaskForm.leaderId || !teamTaskForm.deadline) return;
    const now = new Date().toISOString();
    await storeAddTask({
      title: teamTaskForm.title,
      description: teamTaskForm.description,
      assignedTo: teamTaskForm.leaderId,
      assignedBy: user?.id,
      expectedTime: 0,
      deadline: teamTaskForm.deadline,
      priority: teamTaskForm.priority,
      status: "in-progress" as TaskStatus,
      createdAt: now,
      startedAt: now,
    });
    await addNotification({
      message: `New team task "${teamTaskForm.title}" assigned to you for the ${teamTaskForm.team} team. Please distribute to your team.`,
      read: false,
      createdAt: now,
      forUser: teamTaskForm.leaderId,
    });
    setTeamTaskForm({ title: "", description: "", team: "", leaderId: "", deadline: "", priority: "medium" });
    setTeamTaskDialogOpen(false);
    await loadData();
  };

  const handleCreate = async () => {
    const now = new Date().toISOString();
    const task: Omit<Task, 'id'> = {
      title: form.title, 
      description: form.description,
      assignedTo: form.assignedTo,
      assignedBy: user?.id,
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
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // Use startedAt if available, otherwise fall back to createdAt
    const startRef = task.startedAt || task.createdAt;

    const start = new Date(startRef);
    const actual = Math.max(Math.round((now.getTime() - start.getTime()) / 60000), 1);
    const efficiency = calcEfficiency(task.expectedTime, actual, task.deadline, now.toISOString());

    // Always route through pending-approval — admin must approve all completions
    const success = await saveTasks([{ ...task, status: "pending-approval" as TaskStatus, startedAt: task.startedAt || now.toISOString(), actualTime: actual, efficiency }]);
    if (!success) {
      console.error("completeTask: saveTasks failed — check that the DB status constraint includes 'pending-approval'. Run supabase-migration-pending-approval.sql.");
      return;
    }
    await addNotification({
      message: `${user?.name} marked task "${task.description || task.title}" as complete — pending your approval`,
      read: false,
      createdAt: now.toISOString(),
      forUser: "00000000-0000-0000-0000-000000000001", // Admin
    });
    await loadData();
  };

  const openExtensionDialog = (task: Task) => {
    setSelectedTask(task);
    setExtensionForm({ reason: "", proposedDeadline: "", blockedByEmployee: "" });
    setExtensionDialogOpen(true);
  };

  const submitExtensionRequest = async () => {
    if (!selectedTask || !extensionForm.reason || !extensionForm.proposedDeadline) return;
    
    const updatedTask = {
      ...selectedTask,
      extensionRequest: {
        reason: extensionForm.reason,
        proposedDeadline: extensionForm.proposedDeadline,
        requestedAt: new Date().toISOString(),
        status: "pending" as const,
        blockedByEmployee: extensionForm.blockedByEmployee || undefined
      }
    };
    
    await saveTasks([updatedTask]);
    
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
      assignedBy: user?.id,
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
    if (!user) return;
    const validEntries = reportEntries.filter(e => e.description.trim() && e.from && e.to);
    if (validEntries.length === 0) return;
    const dateStr = otherTaskDate || new Date().toISOString().split("T")[0];
    const completedAt = new Date(dateStr).toISOString();

    // Calculate total minutes across all entries
    const totalMinutes = validEntries.reduce((sum, e) => {
      const [fh, fm] = e.from.split(":").map(Number);
      const [th, tm] = e.to.split(":").map(Number);
      const diff = (th * 60 + tm) - (fh * 60 + fm);
      return sum + Math.max(0, diff);
    }, 0);

    // Build combined description
    const combinedDesc = validEntries.map(e => {
      const [fh, fm] = e.from.split(":").map(Number);
      const [th, tm] = e.to.split(":").map(Number);
      const mins = Math.max(0, (th * 60 + tm) - (fh * 60 + fm));
      const h = Math.floor(mins / 60), m = mins % 60;
      const duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
      return `${e.description.trim()} (${e.from}–${e.to}, ${duration})`;
    }).join(" | ");

    await storeAddTask({
      title: "Daily Report",
      description: combinedDesc,
      assignedTo: user.id,
      expectedTime: 0,
      deadline: dateStr,
      priority: "low",
      status: "completed",
      createdAt: completedAt,
      startedAt: completedAt,
      completedAt: completedAt,
      actualTime: totalMinutes,
    });
    setReportEntries([{ description: "", from: "", to: "" }]);
    setOtherTaskDate(new Date().toISOString().split("T")[0]);
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
        status: "in-progress" as TaskStatus,
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
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

    const inProgressTasks = userTasks.filter(t => t.status === "in-progress" || t.status === "pending");
    const completedTasks = userTasks.filter(t => t.status === "completed");
    const pendingAdminApproval = userTasks.filter(t => t.status === "pending-approval");
    const notCompletedTasks = inProgressTasks.filter(t => t.cancellationRequest?.status === 'pending');

    // Team leader: tasks in their projects pending approval
    const myLeaderProjects = projects.filter(p => p.leaderId === user?.id);
    const pendingApprovalTasks = myLeaderProjects.length > 0
      ? tasks.filter(t => t.status === "pending-approval" && myLeaderProjects.some(p => p.name === t.title))
      : [];

    const approveTask = async (taskId: string, approved: boolean) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      const now = new Date().toISOString();
      if (approved) {
        await saveTasks([{ ...task, status: "completed" as TaskStatus, completedAt: now }]);
        await addNotification({ message: `Your task "${task.description || task.title}" was approved by ${user?.name}`, read: false, createdAt: now, forUser: task.assignedTo });
      } else {
        await saveTasks([{ ...task, status: "in-progress" as TaskStatus }]);
        await addNotification({ message: `Your task "${task.description || task.title}" was sent back for revision by ${user?.name}`, read: false, createdAt: now, forUser: task.assignedTo });
      }
      await loadData();
    };

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
              Daily Report
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => { setStatDialogType("all"); setStatDialogOpen(true); }}>
            <CardContent className="p-6 text-center">
              <ListTodo className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{userTasks.length}</p>
              <p className="text-sm text-muted-foreground">Total Assigned</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => { setStatDialogType("inProgress"); setStatDialogOpen(true); }}>
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-warning" />
              <p className="text-3xl font-bold">{inProgressTasks.length}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => { setStatDialogType("completed"); setStatDialogOpen(true); }}>
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
              <p className="text-3xl font-bold">{completedTasks.length}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Admin Approval */}
        {pendingAdminApproval.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Pending Approval ({pendingAdminApproval.length})
            </h2>
            <div className="space-y-3">
              {pendingAdminApproval.map(task => {
                const allotter = task.assignedBy ? employees.find(e => e.id === task.assignedBy) : null;
                return (
                  <Card key={task.id} className="hover:shadow-md transition-all border-l-4 border-l-orange-400 opacity-90">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-semibold text-lg">{task.title}</h3>
                            <Badge variant="outline" className={priorityColors[task.priority]}>
                              {task.priority}
                            </Badge>
                            <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 animate-pulse">
                              ⏳ Awaiting Admin Approval
                            </Badge>
                          </div>
                          {task.description && <p className="text-sm text-muted-foreground mb-3">{task.description}</p>}
                          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Assigned On</p>
                              <p className="text-sm font-medium">{fmtDateTime(task.createdAt)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Deadline</p>
                              <p className="text-sm font-medium">{fmtDeadline(task.deadline)}</p>
                            </div>
                            {task.actualTime != null && task.actualTime > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Time Taken</p>
                                <p className="text-sm font-medium">{task.actualTime} minutes</p>
                              </div>
                            )}
                            {task.expectedTime > 0 && task.efficiency != null && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Efficiency</p>
                                <p className={`text-sm font-medium ${task.efficiency >= 100 ? "text-success" : task.efficiency < 0 ? "text-destructive" : "text-warning"}`}>
                                  {task.efficiency}%
                                </p>
                              </div>
                            )}
                            {allotter && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Allotted By</p>
                                <p className="text-sm font-medium flex items-center gap-1">
                                  <User className="h-3 w-3 text-primary" />{allotter.name}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="mt-3 p-2 bg-orange-500/5 border border-orange-500/20 rounded text-xs text-orange-600 dark:text-orange-400">
                            You marked this task as complete. Waiting for admin to review and approve.
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

        {/* In Progress Tasks */}
        {inProgressTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              In Progress ({inProgressTasks.length})
            </h2>
            <div className="space-y-3">
              {inProgressTasks.map(task => {
                const startTime = new Date(task.startedAt || task.createdAt);
                const now = new Date();
                const elapsedMinutes = task.startedAt
                  ? Math.max(0, Math.round((now.getTime() - startTime.getTime()) / 60000))
                  : 0;
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
                              <p className="text-sm font-medium">{fmtDateTime(task.createdAt)}</p>
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
                            {task.assignedBy && (() => {
                              const allotter = employees.find(e => e.id === task.assignedBy);
                              return allotter ? (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Allotted By</p>
                                  <p className="text-sm font-medium flex items-center gap-1">
                                    <User className="h-3 w-3 text-primary" />
                                    {allotter.name}
                                  </p>
                                </div>
                              ) : null;
                            })()}
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
                                Proposed Deadline: {fmtDate(task.extensionRequest.proposedDeadline)}
                              </p>
                              {task.extensionRequest.adminResponse && (
                                <p className="text-xs text-muted-foreground">Admin Response: {task.extensionRequest.adminResponse}</p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          {(() => {
                            return (
                              <Button onClick={() => completeTask(task.id)} size="sm" className="gap-2">
                                <CheckCircle className="h-4 w-4" />
                                Mark Complete
                              </Button>
                            );
                          })()}
                          {task.rescheduleRequest?.status === "approved" ? (
                            <div className="text-center p-2 bg-success/10 border border-success/20 rounded text-xs text-success font-medium">
                              ✓ Rescheduled for next day
                              <p className="font-bold mt-0.5">{fmtDeadline(task.deadline)}</p>
                            </div>
                          ) : task.rescheduleRequest?.status === "pending" ? (
                            <div className="text-center p-2 bg-primary/5 border border-primary/20 rounded text-xs text-primary">
                              ⏳ Reschedule pending approval
                            </div>
                          ) : (!task.extensionRequest || task.extensionRequest.status === "approved" || task.extensionRequest.status === "rejected") && !task.cancellationRequest && (
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
                              Reported: {fmtDate(task.cancellationRequest!.requestedAt)} at {fmtTime(task.cancellationRequest!.requestedAt)}
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
                            <p className="text-sm font-medium">{fmtDateTime(task.createdAt)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Completed On</p>
                            <p className="text-sm font-medium">{fmtDate(task.completedAt!)} at {fmtTime(task.completedAt!)}</p>
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
                          {task.assignedBy && (() => {
                            const allotter = employees.find(e => e.id === task.assignedBy);
                            return allotter ? (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Allotted By</p>
                                <p className="text-sm font-medium flex items-center gap-1">
                                  <User className="h-3 w-3 text-primary" />
                                  {allotter.name}
                                </p>
                              </div>
                            ) : null;
                          })()}
                        </div>

                        {task.expectedTime > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-success/5 rounded border border-success/20">
                          <TrendingUp className="h-4 w-4 text-success" />
                          <span className="text-sm font-medium">Efficiency:</span>
                          <span className={`text-sm font-bold ${task.efficiency! >= 100 ? 'text-success' : (task.efficiency ?? 0) < 0 ? "text-destructive" : "text-warning"}`}>
                            {task.efficiency || 0}%
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

        {/* Pending Approval (Team Leader) */}
        {pendingApprovalTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Pending Your Approval ({pendingApprovalTasks.length})
            </h2>
            <div className="space-y-3">
              {pendingApprovalTasks.map(task => {
                const assignedEmp = employees.find(e => e.id === task.assignedTo);
                return (
                  <Card key={task.id} className="border-l-4 border-l-warning">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold">{task.description || task.title}</h3>
                            <Badge variant="outline" className={priorityColors[task.priority]}>{task.priority}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>By: <span className="font-medium text-foreground">{assignedEmp?.name || "Unknown"}</span></span>
                            <span>Project: {task.title}</span>
                            <span>Due: {fmtDeadline(task.deadline)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" className="gap-1 bg-success hover:bg-success/90" onClick={() => approveTask(task.id, true)}>
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30" onClick={() => approveTask(task.id, false)}>
                            <AlertCircle className="h-3.5 w-3.5" /> Send Back
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
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
                              <span>Deadline: {fmtDeadline(task.deadline)}</span>
                              <span>Assigned on: {fmtDateTime(task.createdAt)}</span>
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
                Daily Report ({otherTasks.length})
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
                        <span>Date: {fmtDeadline(task.deadline)}</span>
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
          <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
            <DialogHeader><DialogTitle>Daily Report</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2 overflow-y-auto flex-1 pr-1">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={otherTaskDate} onChange={e => setOtherTaskDate(e.target.value)} max={new Date().toISOString().split("T")[0]} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Work Entries</Label>
                  <button
                    type="button"
                    onClick={() => setReportEntries(prev => [...prev, { description: "", from: "", to: "" }])}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Row
                  </button>
                </div>

                {/* Header row */}
                <div className="grid grid-cols-[1fr_90px_90px_24px] gap-2 text-xs text-muted-foreground px-1">
                  <span>Description</span><span>From</span><span>To</span><span></span>
                </div>

                {reportEntries.map((entry, i) => {
                  // Auto-calculate duration
                  let duration = "";
                  if (entry.from && entry.to) {
                    const [fh, fm] = entry.from.split(":").map(Number);
                    const [th, tm] = entry.to.split(":").map(Number);
                    const mins = Math.max(0, (th * 60 + tm) - (fh * 60 + fm));
                    const h = Math.floor(mins / 60), m = mins % 60;
                    duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
                  }
                  return (
                    <div key={i} className="space-y-1">
                      <div className="grid grid-cols-[1fr_90px_90px_24px] gap-2 items-center">
                        <Input
                          value={entry.description}
                          onChange={e => setReportEntries(prev => prev.map((r, j) => j === i ? { ...r, description: e.target.value } : r))}
                          placeholder="What did you do?"
                          className="text-sm"
                        />
                        <Input
                          type="time"
                          value={entry.from}
                          onChange={e => setReportEntries(prev => prev.map((r, j) => j === i ? { ...r, from: e.target.value } : r))}
                          className="text-sm"
                        />
                        <Input
                          type="time"
                          value={entry.to}
                          onChange={e => setReportEntries(prev => prev.map((r, j) => j === i ? { ...r, to: e.target.value } : r))}
                          className="text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setReportEntries(prev => prev.length > 1 ? prev.filter((_, j) => j !== i) : prev)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {duration && (
                        <p className="text-xs text-primary pl-1">⏱ {duration}</p>
                      )}
                    </div>
                  );
                })}

                {/* Total */}
                {(() => {
                  const total = reportEntries.reduce((sum, e) => {
                    if (!e.from || !e.to) return sum;
                    const [fh, fm] = e.from.split(":").map(Number);
                    const [th, tm] = e.to.split(":").map(Number);
                    return sum + Math.max(0, (th * 60 + tm) - (fh * 60 + fm));
                  }, 0);
                  if (total === 0) return null;
                  const h = Math.floor(total / 60), m = total % 60;
                  return (
                    <div className="text-sm font-medium text-right pt-1 border-t">
                      Total: {h > 0 ? `${h}h ${m}m` : `${m}m`}
                    </div>
                  );
                })()}
              </div>

              <Button
                onClick={submitOtherTask}
                className="w-full"
                disabled={reportEntries.every(e => !e.description.trim() || !e.from || !e.to)}
              >
                Submit Report
              </Button>
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
                <p className="text-sm text-muted-foreground">Current Deadline: {selectedTask && fmtDate(selectedTask.deadline)}</p>
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

        {/* Stat Detail Dialog */}
        <Dialog open={statDialogOpen} onOpenChange={setStatDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {statDialogType === "all" ? `All Tasks (${userTasks.length})` :
                 statDialogType === "inProgress" ? `In Progress (${inProgressTasks.length})` :
                 `Completed (${completedTasks.length})`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              {(statDialogType === "all" ? userTasks :
                statDialogType === "inProgress" ? inProgressTasks :
                completedTasks).map(task => (
                <Card key={task.id} className={`border-l-4 ${task.status === "completed" ? "border-l-success" : "border-l-warning"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold">{task.title}</h3>
                      <div className="flex gap-1 shrink-0">
                        <Badge variant="outline" className={priorityColors[task.priority]}>{task.priority}</Badge>
                        <Badge variant="outline" className={task.status === "completed" ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}>
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                    {task.description && <p className="text-sm text-muted-foreground mb-2">{task.description}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Assigned: {fmtDate(task.createdAt)}</span>
                      <span>Deadline: {fmtDeadline(task.deadline)}</span>
                      {task.status === "completed" && task.completedAt && <span className="text-success">Completed: {fmtDate(task.completedAt!)}</span>}
                      {task.actualTime && task.actualTime > 0 && <span>Time: {task.actualTime}m</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(statDialogType === "all" ? userTasks : statDialogType === "inProgress" ? inProgressTasks : completedTasks).length === 0 && (
                <div className="text-center py-8 text-muted-foreground"><ListTodo className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>No tasks</p></div>
              )}
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
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" className="gap-2" onClick={() => setTeamTaskDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Assign Task to Team
          </Button>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button onClick={() => setAdminView("employees")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${adminView === "employees" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Employees</button>
            <button onClick={() => setAdminView("tasks")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${adminView === "tasks" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Tasks</button>
          </div>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={adminView === "employees" ? "Search employees..." : "Search tasks..."} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {adminView === "tasks" && (
        <div className="space-y-1">
          {tasks.filter(t => !search || (t.description || t.title).toLowerCase().includes(search.toLowerCase()) || employees.find(e => e.id === t.assignedTo)?.name.toLowerCase().includes(search.toLowerCase())).map(task => {
            const emp = employees.find(e => e.id === task.assignedTo);
            const isInProgress = task.status === "in-progress";
            return (
              <Card key={task.id} className={`border-l-4 ${isInProgress ? "border-l-warning" : "border-l-success"}`}>
                <CardContent className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">{task.description || task.title}</p>
                        <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>{task.priority}</Badge>
                        <Badge variant="outline" className={`text-xs ${isInProgress ? "bg-warning/10 text-warning border-warning/20" : "bg-success/10 text-success border-success/20"}`}>{isInProgress ? "Active" : "Done"}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{emp?.name || "Unknown"} — {emp?.role}</span>
                        <span>Project: {task.title}</span>
                        <span>Due: {fmtDeadline(task.deadline)}</span>
                        {task.createdAt && <span>Assigned: {fmtDateTime(task.createdAt)}</span>}
                        {task.assignedBy && (() => {
                          const allotter = employees.find(e => e.id === task.assignedBy);
                          return allotter ? <span className="flex items-center gap-1 text-primary font-medium">Allotted by: {allotter.name}</span> : null;
                        })()}
                        {task.status === "completed" && task.completedAt && <span className="text-success">Completed: {fmtDateTime(task.completedAt!)}</span>}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-7 w-7 p-0 shrink-0" onClick={async () => { await deleteTask(task.id); await loadData(); }}>
                      <Trash2 className="h-3.5 w-3.5" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredStats.map(stat => {
              const empTasks = tasks.filter(t => t.assignedTo === stat.employee.id && t.status === "in-progress");
              const projectNumbers = [...new Set(empTasks.map(t => {
                const proj = projects.find(p => p.name === t.title);
                return proj ? proj.projectNumber : null;
              }).filter(Boolean))];

              return (
                <Card key={stat.employee.id} className="hover:shadow-md transition-all cursor-pointer group" onClick={() => { setSelectedEmployee(stat.employee); setAddTaskOpen(false); }}>
                  <CardContent className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {stat.employee.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{stat.employee.name}</span>
                          {projectNumbers.map(pn => (
                            <span key={pn} className="text-[10px] bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5 font-medium shrink-0">{pn}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{stat.employee.role}</span>
                          <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-success" />{stat.completed}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-warning" />{stat.inProgress}</span>
                          <span className="ml-auto font-medium text-foreground">{stat.completionRate}%</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
        employees={employees}
        assignedById={user?.id}
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

      {/* Assign Task to Team Dialog */}
      {(() => {
        const TEAMS = ["Design","Electrical","Production","Store","Services","Documentation","Purchase","Admin - HR","Admin - Accountant"];
        const teamAssignments: Record<string, string> = (() => { try { return JSON.parse(localStorage.getItem("team_assignments") || "{}"); } catch { return {}; } })();
        const teamLeaders = teamTaskForm.team
          ? employees.filter(e => teamAssignments[e.id] === teamTaskForm.team && e.type === "team_leader")
          : [];
        const teamMembers = teamTaskForm.team
          ? employees.filter(e => teamAssignments[e.id] === teamTaskForm.team)
          : [];
        const selectableLeaders = teamLeaders.length > 0 ? teamLeaders : teamMembers;
        return (
          <Dialog open={teamTaskDialogOpen} onOpenChange={setTeamTaskDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Assign Task to Team</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Task Title</Label>
                  <Input value={teamTaskForm.title} onChange={e => setTeamTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Enter task title..." />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={teamTaskForm.description} onChange={e => setTeamTaskForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the task..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Team</Label>
                  <Select value={teamTaskForm.team} onValueChange={v => setTeamTaskForm(f => ({ ...f, team: v, leaderId: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                    <SelectContent>
                      {TEAMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Team Leader</Label>
                  <Select value={teamTaskForm.leaderId} onValueChange={v => setTeamTaskForm(f => ({ ...f, leaderId: v }))} disabled={!teamTaskForm.team || selectableLeaders.length === 0}>
                    <SelectTrigger><SelectValue placeholder={!teamTaskForm.team ? "Select a team first" : selectableLeaders.length === 0 ? "No members in this team" : "Select team leader"} /></SelectTrigger>
                    <SelectContent>
                      {selectableLeaders.map(e => <SelectItem key={e.id} value={e.id}>{e.name} — {e.role}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Deadline</Label>
                    <Input type="date" value={teamTaskForm.deadline} onChange={e => setTeamTaskForm(f => ({ ...f, deadline: e.target.value }))} min={new Date().toISOString().split("T")[0]} />
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={teamTaskForm.priority} onValueChange={v => setTeamTaskForm(f => ({ ...f, priority: v as Priority }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={submitTeamTask} className="w-full" disabled={!teamTaskForm.title || !teamTaskForm.leaderId || !teamTaskForm.deadline}>
                  Assign to Team Leader
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}











