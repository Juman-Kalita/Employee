import { useState, useEffect } from "react";
import { Employee, Task, SalesProject, Priority } from "@/lib/types";
import { addTask as storeAddTask, addNotification, getTasks, getSalesProjects } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, TrendingUp, Plus, ChevronDown, ChevronRight, Briefcase, ListTodo, CalendarClock } from "lucide-react";

const priorityColors: Record<Priority, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-success/10 text-success border-success/20",
};

function TaskCard({ task, onExtensionApproval, onRescheduleApproval }: {
  task: Task;
  onExtensionApproval?: (id: string, approved: boolean) => void;
  onRescheduleApproval?: (id: string, approved: boolean) => void;
}) {
  const isInProgress = task.status === "in-progress";
  const elapsedMinutes = isInProgress && task.startedAt
    ? Math.round((Date.now() - new Date(task.startedAt).getTime()) / 60000)
    : null;
  const isOvertime = elapsedMinutes !== null && task.expectedTime > 0 && elapsedMinutes > task.expectedTime;

  return (
    <Card className={`border-l-4 ${isInProgress ? "border-l-warning" : "border-l-success"}`}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-medium">{task.description || task.title}</p>
          <div className="flex gap-1 shrink-0">
            <Badge variant="outline" className={priorityColors[task.priority]}>{task.priority}</Badge>
            <Badge variant="outline" className={isInProgress ? "bg-warning/10 text-warning border-warning/20" : "bg-success/10 text-success border-success/20"}>
              {isInProgress ? "Active" : "Done"}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
          <span>Due: {(() => {
            const d = new Date(task.deadline);
            const hasTime = task.deadline.includes("T") && !task.deadline.endsWith("T00:00:00.000Z");
            return hasTime
              ? `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : d.toLocaleDateString();
          })()}</span>
          {task.createdAt && <span>Assigned: {new Date(task.createdAt).toLocaleDateString()} {new Date(task.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
          {task.status === "completed" && task.completedAt && <span className="text-success">Completed: {new Date(task.completedAt).toLocaleDateString()} {new Date(task.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
        </div>
        {isInProgress && elapsedMinutes !== null && (
          <div className={`flex items-center gap-2 text-xs p-1.5 rounded ${isOvertime ? "bg-destructive/5 text-destructive" : "bg-primary/5 text-primary"}`}>
            <Clock className="h-3 w-3" />
            <span>Elapsed: {elapsedMinutes}m{task.expectedTime > 0 ? ` / ${task.expectedTime}m` : ""}</span>
            {isOvertime && <span className="ml-auto">+{elapsedMinutes - task.expectedTime}m overtime</span>}
          </div>
        )}
        {task.status === "completed" && (
          <div className="flex items-center gap-3 text-xs mt-1">
            <span className="text-muted-foreground">Actual: {task.actualTime}m</span>
            {task.expectedTime > 0 && (
              <span className={task.efficiency! >= 100 ? "text-success" : "text-warning"}>
                Efficiency: {Math.min(100, task.efficiency || 0)}%
              </span>
            )}
          </div>
        )}
        {task.extensionRequest?.status === "pending" && onExtensionApproval && (
          <div className="mt-2 p-2 bg-warning/5 border border-warning/20 rounded text-xs">
            <p className="font-medium mb-1">Extension Request</p>
            <p className="text-muted-foreground mb-1">{task.extensionRequest.reason}</p>
            <p className="text-muted-foreground mb-2">New deadline: {new Date(task.extensionRequest.proposedDeadline).toLocaleDateString()}</p>
            <div className="flex gap-2">
              <Button size="sm" className="h-6 text-xs" onClick={() => onExtensionApproval(task.id, true)}>Approve</Button>
              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => onExtensionApproval(task.id, false)}>Reject</Button>
            </div>
          </div>
        )}
        {task.rescheduleRequest && (
          <div className={`mt-2 p-2 rounded text-xs border ${
            task.rescheduleRequest.status === "pending" ? "bg-primary/5 border-primary/20" :
            task.rescheduleRequest.status === "approved" ? "bg-success/5 border-success/20" :
            "bg-destructive/5 border-destructive/20"
          }`}>
            <div className="flex items-center gap-1 font-medium mb-1">
              <CalendarClock className="h-3 w-3" />
              {task.rescheduleRequest.status === "pending" ? "Incomplete Task Reason - Pending" :
               task.rescheduleRequest.status === "approved" ? `Rescheduled to ${new Date(task.deadline).toLocaleDateString()}` :
               "Reschedule Rejected"}
            </div>
            <p className="text-muted-foreground mb-1">{task.rescheduleRequest.reason}</p>
            {task.rescheduleRequest.status === "pending" && onRescheduleApproval && (
              <div className="flex gap-2 mt-1">
                <Button size="sm" className="h-6 text-xs" onClick={() => onRescheduleApproval(task.id, true)}>Approve and Reschedule</Button>
                <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => onRescheduleApproval(task.id, false)}>Reject</Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SalesProjectRow({ project, tasks, onAddTask, onExtensionApproval, onRescheduleApproval }: {
  project: SalesProject;
  tasks: Task[];
  onAddTask: (project?: SalesProject) => void;
  onExtensionApproval?: (id: string, approved: boolean) => void;
  onRescheduleApproval?: (id: string, approved: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const projectTasks = tasks.filter(t => t.title === project.name);
  const completed = projectTasks.filter(t => t.status === "completed").length;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setExpanded(e => !e)}>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <Briefcase className="h-4 w-4 text-primary" />
        <span className="font-medium flex-1">{project.name}</span>
        <span className="text-xs text-muted-foreground mr-2">#{project.projectNumber}</span>
        <Badge variant="outline" className="text-xs">{completed}/{projectTasks.length} done</Badge>
      </div>
      {expanded && (
        <div className="border-t bg-muted/20 p-3 space-y-2">
          {projectTasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No tasks yet</p>}
          {projectTasks.map(task => (
            <TaskCard key={task.id} task={task} onExtensionApproval={onExtensionApproval} onRescheduleApproval={onRescheduleApproval} />
          ))}
          <Button size="sm" variant="outline" className="w-full gap-2 mt-1" onClick={e => { e.stopPropagation(); onAddTask(project); }}>
            <Plus className="h-3 w-3" /> Add Task
          </Button>
        </div>
      )}
    </div>
  );
}

export interface EmployeeProfileDialogProps {
  employee: Employee | null;
  tasks: Task[];
  projects: SalesProject[];
  onClose: () => void;
  onDataChange: () => void;
  onExtensionApproval?: (taskId: string, approved: boolean) => void;
  onRescheduleApproval?: (taskId: string, approved: boolean) => void;
}

export function EmployeeProfileDialog({
  employee,
  tasks,
  projects,
  onClose,
  onDataChange,
  onExtensionApproval,
  onRescheduleApproval,
}: EmployeeProfileDialogProps) {
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [localProjects, setLocalProjects] = useState<SalesProject[]>(projects);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [targetProject, setTargetProject] = useState<SalesProject | null>(null);
  const [taskForm, setTaskForm] = useState({ description: "", deadline: "", priority: "medium" as Priority, projectId: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (employee) refreshData();
  }, [employee?.id]);

  const refreshData = async () => {
    const [t, p] = await Promise.all([getTasks(), getSalesProjects()]);
    setLocalTasks(t);
    setLocalProjects(p);
    onDataChange();
  };

  if (!employee) return null;

  const empTasks = localTasks.filter(t => t.assignedTo === employee.id);
  const completed = empTasks.filter(t => t.status === "completed").length;
  const inProgress = empTasks.filter(t => t.status === "in-progress").length;
  const avgEfficiency = completed > 0
    ? Math.round(empTasks.filter(t => t.status === "completed").reduce((s, t) => s + Math.min(100, t.efficiency || 0), 0) / completed)
    : 0;
  const standaloneTasks = empTasks.filter(t => !localProjects.some(p => p.name === t.title));

  const openAddTask = (project?: SalesProject) => {
    setTargetProject(project || null);
    setTaskForm({ description: "", deadline: "", priority: "medium", projectId: project?.id || "" });
    setAddTaskOpen(true);
  };

  const handleAddTask = async () => {
    if (!taskForm.description.trim() || submitting) return;
    setSubmitting(true);
    const isNone = !targetProject && (!taskForm.projectId || taskForm.projectId === "none");
    const project = isNone ? null : (localProjects.find(p => p.id === taskForm.projectId) || targetProject);
    const now = new Date().toISOString();
    // If deadline has time use full ISO, if date-only keep as date string to avoid timezone shift
    const deadline = taskForm.deadline
      ? new Date(taskForm.deadline).toISOString()
      : project?.endDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    await storeAddTask({
      title: project ? project.name : taskForm.description.trim(),
      description: taskForm.description,
      assignedTo: employee.id,
      projectId: undefined,
      expectedTime: 0,
      deadline,
      priority: taskForm.priority,
      status: "in-progress",
      createdAt: now,
      startedAt: now,
    });
    await addNotification({
      message: project ? `New task assigned in project "${project.name}"` : `New task assigned: ${taskForm.description.trim()}`,
      read: false,
      createdAt: now,
      forUser: employee.id,
    });
    setAddTaskOpen(false);
    setSubmitting(false);
    await refreshData();
  };

  return (
    <>
      <Dialog open={!!employee} onOpenChange={open => { if (!open) onClose(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {employee.name.split(" ").map((n: string) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold">{employee.name}</p>
                <p className="text-sm text-muted-foreground font-normal">{employee.role}{employee.email ? ` - ${employee.email}` : ""}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Tasks", value: empTasks.length, icon: ListTodo, color: "text-foreground" },
                { label: "In Progress", value: inProgress, icon: Clock, color: "text-warning" },
                { label: "Completed", value: completed, icon: CheckCircle, color: "text-success" },
                { label: "Avg Efficiency", value: `${avgEfficiency}%`, icon: TrendingUp, color: avgEfficiency >= 80 ? "text-success" : avgEfficiency >= 50 ? "text-warning" : "text-destructive" },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label}>
                  <CardContent className="p-4 text-center">
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardContent className="p-4">
                <p className="font-semibold mb-3">Performance Summary</p>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Completion Rate</span>
                      <span className="font-medium">{empTasks.length > 0 ? Math.round((completed / empTasks.length) * 100) : 0}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${empTasks.length > 0 ? Math.round((completed / empTasks.length) * 100) : 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Avg Efficiency</span>
                      <span className="font-medium">{avgEfficiency}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${avgEfficiency}%` }} />
                    </div>
                  </div>
                  <div className="pt-1 space-y-1.5">
                    {[
                      { label: "High priority", count: empTasks.filter(t => t.priority === "high").length, color: "text-destructive" },
                      { label: "Medium priority", count: empTasks.filter(t => t.priority === "medium").length, color: "text-warning" },
                      { label: "Low priority", count: empTasks.filter(t => t.priority === "low").length, color: "text-success" },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <span className={`font-semibold ${color}`}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2"><Briefcase className="h-4 w-4" /> Projects ({localProjects.length})</h3>
              <Button size="sm" className="gap-1" onClick={() => openAddTask()}>
                <Plus className="h-3 w-3" /> Add Task
              </Button>
            </div>
            {localProjects.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No sales projects yet. Add them from the Sales tab.</p>}
            <div className="space-y-2">
              {localProjects.map(project => (
                <SalesProjectRow
                  key={project.id}
                  project={project}
                  tasks={localTasks.filter(t => t.assignedTo === employee.id)}
                  onAddTask={openAddTask}
                  onExtensionApproval={onExtensionApproval}
                  onRescheduleApproval={onRescheduleApproval}
                />
              ))}
            </div>
          </div>

          {standaloneTasks.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold flex items-center gap-2 mb-3"><ListTodo className="h-4 w-4" /> Other Tasks ({standaloneTasks.length})</h3>
              <div className="space-y-2">
                {standaloneTasks.map(task => (
                  <TaskCard key={task.id} task={task} onExtensionApproval={onExtensionApproval} onRescheduleApproval={onRescheduleApproval} />
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Task{targetProject ? ` to "${targetProject.name}"` : ""}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            {!targetProject && (
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={taskForm.projectId} onValueChange={v => setTaskForm(f => ({ ...f, projectId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (standalone task)</SelectItem>
                    {localProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name} #{p.projectNumber}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
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
            <Button onClick={handleAddTask} className="w-full" disabled={!taskForm.description.trim() || (!targetProject && taskForm.projectId === "") || submitting}>
              {submitting ? "Adding..." : "Add Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}