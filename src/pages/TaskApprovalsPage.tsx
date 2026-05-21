import { useState, useEffect } from "react";
import { getTasks, saveTasks, getEmployees, addNotification } from "@/lib/store";
import { Task, Employee } from "@/lib/types";
import { fmtDateTime, fmtDeadline, fmtDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock, ListTodo, User, TrendingUp, CalendarDays, Timer, AlarmClock } from "lucide-react";

const priorityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-success/10 text-success border-success/20",
};

type StatFilter = "pending" | "completed" | "in-progress" | null;

function TaskDetailDialog({
  task,
  employees,
  onClose,
  onApprove,
  onReject,
  processing,
}: {
  task: Task | null;
  employees: Employee[];
  onClose: () => void;
  onApprove: (t: Task) => void;
  onReject: (t: Task) => void;
  processing: string | null;
}) {
  if (!task) return null;
  const employee = employees.find(e => e.id === task.assignedTo);
  const allotter = task.assignedBy ? employees.find(e => e.id === task.assignedBy) : null;
  const isPending = task.status === "pending-approval";
  const isProcessing = processing === task.id;

  return (
    <Dialog open={!!task} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Task Details</span>
            <Badge variant="outline" className={priorityColors[task.priority]}>{task.priority}</Badge>
            {isPending && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">⏳ Pending Approval</Badge>
            )}
            {task.status === "completed" && (
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">✓ Completed</Badge>
            )}
            {task.status === "in-progress" && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Active</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Task title / description */}
          <div>
            <p className="text-lg font-semibold">{task.description || task.title}</p>
            {task.description && task.description !== task.title && (
              <p className="text-sm text-muted-foreground mt-1">{task.title}</p>
            )}
          </div>

          {/* Employee info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {employee?.name.split(" ").map(n => n[0]).join("") || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{employee?.name || "Unknown"}</p>
              <p className="text-xs text-muted-foreground">{employee?.role}</p>
            </div>
            {allotter && (
              <div className="ml-auto text-right">
                <p className="text-xs text-muted-foreground">Allotted by</p>
                <p className="text-sm font-medium text-primary">{allotter.name}</p>
              </div>
            )}
          </div>

          {/* Time & deadline grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/40 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <CalendarDays className="h-3.5 w-3.5" /> Assigned On
              </div>
              <p className="text-sm font-medium">{fmtDateTime(task.createdAt)}</p>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <AlarmClock className="h-3.5 w-3.5" /> Deadline
              </div>
              <p className="text-sm font-medium">{fmtDeadline(task.deadline)}</p>
            </div>
            {task.expectedTime > 0 && (
              <div className="p-3 bg-muted/40 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Timer className="h-3.5 w-3.5" /> Expected Time
                </div>
                <p className="text-sm font-medium">{task.expectedTime} minutes</p>
              </div>
            )}
            {task.actualTime != null && task.actualTime > 0 && (
              <div className="p-3 bg-muted/40 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Clock className="h-3.5 w-3.5" /> Time Taken
                </div>
                <p className="text-sm font-medium">{task.actualTime} minutes</p>
              </div>
            )}
            {task.startedAt && (
              <div className="p-3 bg-muted/40 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Clock className="h-3.5 w-3.5" /> Started At
                </div>
                <p className="text-sm font-medium">{fmtDateTime(task.startedAt)}</p>
              </div>
            )}
            {task.completedAt && (
              <div className="p-3 bg-muted/40 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <CheckCircle className="h-3.5 w-3.5 text-success" /> Submitted At
                </div>
                <p className="text-sm font-medium">{fmtDateTime(task.completedAt)}</p>
              </div>
            )}
          </div>

          {/* Efficiency bar */}
          {task.expectedTime > 0 && task.efficiency != null && (
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              task.efficiency >= 100 ? "bg-success/5 border-success/20" :
              task.efficiency < 0 ? "bg-destructive/5 border-destructive/20" :
              "bg-warning/5 border-warning/20"
            }`}>
              <TrendingUp className={`h-5 w-5 ${
                task.efficiency >= 100 ? "text-success" :
                task.efficiency < 0 ? "text-destructive" : "text-warning"
              }`} />
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Efficiency</span>
                  <span className={`font-bold ${
                    task.efficiency >= 100 ? "text-success" :
                    task.efficiency < 0 ? "text-destructive" : "text-warning"
                  }`}>{task.efficiency}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      task.efficiency >= 100 ? "bg-success" :
                      task.efficiency < 0 ? "bg-destructive" : "bg-warning"
                    }`}
                    style={{ width: `${Math.min(Math.max(task.efficiency, 0), 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Approve / Reject buttons — only for pending */}
          {isPending && (
            <div className="flex gap-3 pt-1">
              <Button
                className="flex-1 gap-2 bg-success hover:bg-success/90"
                disabled={isProcessing}
                onClick={() => onApprove(task)}
              >
                <CheckCircle className="h-4 w-4" /> Approve
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
                disabled={isProcessing}
                onClick={() => onReject(task)}
              >
                <XCircle className="h-4 w-4" /> Send Back
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact task row used in both the main list and the stat detail dialog
function TaskRow({
  task,
  employees,
  processing,
  onApprove,
  onReject,
  onClick,
}: {
  task: Task;
  employees: Employee[];
  processing: string | null;
  onApprove: (t: Task) => void;
  onReject: (t: Task) => void;
  onClick: (t: Task) => void;
}) {
  const employee = employees.find(e => e.id === task.assignedTo);
  const allotter = task.assignedBy ? employees.find(e => e.id === task.assignedBy) : null;
  const isPending = task.status === "pending-approval";
  const isProcessing = processing === task.id;

  return (
    <Card
      className={`border-l-4 hover:shadow-md transition-all cursor-pointer ${
        isPending ? "border-l-warning" :
        task.status === "completed" ? "border-l-success" : "border-l-primary"
      }`}
      onClick={() => onClick(task)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Avatar className="h-9 w-9 shrink-0 mt-0.5">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {employee?.name.split(" ").map(n => n[0]).join("") || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold">{task.description || task.title}</h3>
                <Badge variant="outline" className={priorityColors[task.priority]}>{task.priority}</Badge>
                {isPending && (
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">⏳ Pending</Badge>
                )}
                {task.status === "completed" && (
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">✓ Done</Badge>
                )}
                {task.status === "in-progress" && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Active</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className="font-medium text-foreground">{employee?.name || "Unknown"}</span>
                  {employee?.role && <span>— {employee.role}</span>}
                </span>
                {allotter && (
                  <span className="text-primary">Allotted by: <span className="font-medium">{allotter.name}</span></span>
                )}
                <span>Deadline: {fmtDeadline(task.deadline)}</span>
                {task.actualTime != null && task.actualTime > 0 && <span>Time: {task.actualTime}m</span>}
                {task.expectedTime > 0 && task.efficiency != null && (
                  <span className={task.efficiency >= 100 ? "text-success font-medium" : task.efficiency < 0 ? "text-destructive font-medium" : "text-warning font-medium"}>
                    Efficiency: {task.efficiency}%
                  </span>
                )}
              </div>
            </div>
          </div>
          {isPending && (
            <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
              <Button size="sm" className="gap-1.5 bg-success hover:bg-success/90" disabled={isProcessing} onClick={() => onApprove(task)}>
                <CheckCircle className="h-3.5 w-3.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5" disabled={isProcessing} onClick={() => onReject(task)}>
                <XCircle className="h-3.5 w-3.5" /> Send Back
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TaskApprovalsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [statFilter, setStatFilter] = useState<StatFilter>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [t, e] = await Promise.all([getTasks(), getEmployees()]);
    setTasks(t);
    setEmployees(e);
    setLoading(false);
  };

  const pendingTasks = tasks.filter(t => t.status === "pending-approval");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const inProgressTasks = tasks.filter(t => t.status === "in-progress");

  const handleApprove = async (task: Task) => {
    setProcessing(task.id);
    const now = new Date().toISOString();
    await saveTasks([{ ...task, status: "completed", completedAt: task.completedAt || now }]);
    await addNotification({
      message: `Your task "${task.description || task.title}" has been approved and marked as completed.`,
      read: false,
      createdAt: now,
      forUser: task.assignedTo,
    });
    setDetailTask(null);
    await loadData();
    setProcessing(null);
  };

  const handleReject = async (task: Task) => {
    setProcessing(task.id);
    const now = new Date().toISOString();
    await saveTasks([{ ...task, status: "in-progress", completedAt: undefined, actualTime: undefined, efficiency: undefined }]);
    await addNotification({
      message: `Your task "${task.description || task.title}" was sent back for revision. Please complete it again.`,
      read: false,
      createdAt: now,
      forUser: task.assignedTo,
    });
    setDetailTask(null);
    await loadData();
    setProcessing(null);
  };

  // Tasks shown in the stat detail dialog
  const statDialogTasks =
    statFilter === "pending" ? pendingTasks :
    statFilter === "completed" ? completedTasks :
    statFilter === "in-progress" ? inProgressTasks : [];

  const statDialogTitle =
    statFilter === "pending" ? `Pending Approval (${pendingTasks.length})` :
    statFilter === "completed" ? `Approved / Completed (${completedTasks.length})` :
    statFilter === "in-progress" ? `Still In Progress (${inProgressTasks.length})` : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Task Approvals</h1>
        <p className="text-muted-foreground">Review and approve tasks marked as complete by employees</p>
      </div>

      {/* Clickable stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:shadow-md hover:border-warning/50 transition-all"
          onClick={() => setStatFilter("pending")}
        >
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-warning" />
            <p className="text-3xl font-bold">{pendingTasks.length}</p>
            <p className="text-sm text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-md hover:border-success/50 transition-all"
          onClick={() => setStatFilter("completed")}
        >
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
            <p className="text-3xl font-bold">{completedTasks.length}</p>
            <p className="text-sm text-muted-foreground">Approved / Completed</p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
          onClick={() => setStatFilter("in-progress")}
        >
          <CardContent className="p-6 text-center">
            <ListTodo className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-3xl font-bold">{inProgressTasks.length}</p>
            <p className="text-sm text-muted-foreground">Still In Progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending approval list */}
      {pendingTasks.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-40 text-success" />
            <p className="font-medium">All caught up</p>
            <p className="text-sm mt-1">No tasks are waiting for approval right now.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendingTasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              employees={employees}
              processing={processing}
              onApprove={handleApprove}
              onReject={handleReject}
              onClick={setDetailTask}
            />
          ))}
        </div>
      )}

      {/* Stat detail dialog */}
      <Dialog open={!!statFilter} onOpenChange={open => { if (!open) setStatFilter(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{statDialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {statDialogTasks.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <ListTodo className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No tasks in this category</p>
              </div>
            ) : (
              statDialogTasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  employees={employees}
                  processing={processing}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onClick={t => { setStatFilter(null); setTimeout(() => setDetailTask(t), 150); }}
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Task detail dialog */}
      <TaskDetailDialog
        task={detailTask}
        employees={employees}
        onClose={() => setDetailTask(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        processing={processing}
      />
    </div>
  );
}
