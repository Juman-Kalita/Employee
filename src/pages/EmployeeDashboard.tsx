import { useMemo, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getTasks, saveTasks, addNotification, getEmployees } from "@/lib/store";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, ListTodo, TrendingUp, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, AreaChart, Area } from "recharts";
import { Task, TaskStatus, Priority, Employee } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = ["hsl(220, 91%, 54%)", "hsl(220, 14%, 80%)"];

const priorityColors: Record<Priority, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-success/10 text-success border-success/20",
};

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"all" | "completed" | "inProgress">("all");
  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [extensionForm, setExtensionForm] = useState({ reason: "", proposedDeadline: "", blockedByEmployee: "" });

  useEffect(() => {
    loadTasks();
  }, [user]);

  const loadTasks = async () => {
    if (!user?.id) return;
    setLoading(true);
    const [allTasks, allEmployees] = await Promise.all([getTasks(), getEmployees()]);
    setTasks(allTasks.filter(t => t.assignedTo === user.id));
    setEmployees(allEmployees);
    setLoading(false);
  };

  const completed = tasks.filter(t => t.status === "completed");
  const inProgress = tasks.filter(t => t.status === "in-progress");
  const avgEfficiency = completed.length 
    ? Math.min(100, Math.round(completed.reduce((s, t) => s + (t.efficiency || 0), 0) / completed.length))
    : 0;

  const completeTask = async (id: string) => {
    const now = new Date();
    const updated = tasks.map(t => {
      if (t.id !== id) return t;
      const start = new Date(t.startedAt!);
      const actualMinutes = Math.round((now.getTime() - start.getTime()) / 60000);
      const actual = Math.max(actualMinutes, 1);
      // Cap efficiency at 100% - if completed faster, it's 100% (perfect)
      const efficiency = Math.min(100, Math.round((t.expectedTime / actual) * 100));
      return { ...t, status: "completed" as TaskStatus, completedAt: now.toISOString(), actualTime: actual, efficiency };
    });
    await saveTasks(updated);
    await loadTasks();
  };

  const openDialog = (type: "all" | "completed" | "inProgress") => {
    setDialogType(type);
    setDialogOpen(true);
  };

  const getDialogTasks = () => {
    if (dialogType === "completed") return completed;
    if (dialogType === "inProgress") return inProgress;
    return tasks;
  };

  const getDialogTitle = () => {
    if (dialogType === "completed") return `Completed Tasks (${completed.length})`;
    if (dialogType === "inProgress") return `In Progress Tasks (${inProgress.length})`;
    return `All Assigned Tasks (${tasks.length})`;
  };

  const openExtensionDialog = (task: Task) => {
    setSelectedTask(task);
    setExtensionForm({ reason: "", proposedDeadline: "", blockedByEmployee: "" });
    setExtensionDialogOpen(true);
    setDialogOpen(false);
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
    
    await loadTasks();
    setExtensionDialogOpen(false);
    setSelectedTask(null);
  };

  const pieData = [
    { name: "Completed", value: completed.length },
    { name: "In Progress", value: inProgress.length },
  ];

  // Task completion time data for bar chart
  const taskCompletionData = completed
    .slice(0, 10) // Show last 10 completed tasks
    .reverse() // Show oldest to newest
    .map(task => ({
      name: task.title.length > 15 ? task.title.substring(0, 15) + '...' : task.title,
      actualTime: task.actualTime || 0,
      expectedTime: task.expectedTime,
      fullName: task.title
    }));

  const dailyData = ["Mon", "Tue", "Wed", "Thu", "Fri"].map(d => ({
    name: d,
    efficiency: 0,
    tasks: 0,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-xl bg-primary p-6 text-primary-foreground">
        <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(" ")[0]}! 👋</h1>
        <p className="text-primary-foreground/80 mt-1">Here's your productivity overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => openDialog("all")} className="cursor-pointer">
          <StatsCard title="Assigned" value={tasks.length} icon={ListTodo} />
        </div>
        <div onClick={() => openDialog("completed")} className="cursor-pointer">
          <StatsCard title="Completed" value={completed.length} icon={CheckCircle2} />
        </div>
        <div onClick={() => openDialog("inProgress")} className="cursor-pointer">
          <StatsCard title="In Progress" value={inProgress.length} icon={Clock} />
        </div>
        <StatsCard title="Avg Efficiency" value={`${avgEfficiency}%`} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Task Completion Time</CardTitle></CardHeader>
          <CardContent>
            {taskCompletionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={taskCompletionData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(220, 91%, 54%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(220, 91%, 54%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 90%)" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={10} 
                    angle={-35} 
                    textAnchor="end" 
                    height={70}
                    stroke="hsl(220, 14%, 60%)"
                  />
                  <YAxis 
                    fontSize={11} 
                    stroke="hsl(220, 14%, 60%)"
                    label={{ 
                      value: 'Minutes', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fontSize: 11, fill: 'hsl(220, 14%, 60%)' }
                    }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(0, 0%, 100%)',
                      border: '1px solid hsl(220, 14%, 90%)',
                      borderRadius: '6px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const efficiency = Math.min(100, Math.round((data.expectedTime / data.actualTime) * 100));
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold text-sm mb-2">{data.fullName}</p>
                            <div className="space-y-1">
                              <p className="text-xs flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-primary"></span>
                                <span>Actual: <span className="font-semibold">{data.actualTime}m</span></span>
                              </p>
                              <p className="text-xs flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-success"></span>
                                <span>Expected: <span className="font-semibold">{data.expectedTime}m</span></span>
                              </p>
                              <p className={`text-xs font-semibold mt-2 ${efficiency >= 100 ? 'text-success' : 'text-warning'}`}>
                                Efficiency: {efficiency}%
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expectedTime" 
                    stroke="hsl(142, 76%, 36%)" 
                    strokeWidth={2.5}
                    fill="url(#colorExpected)"
                    dot={{ r: 5, fill: "hsl(142, 76%, 36%)", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 7 }}
                    name="Expected Time"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="actualTime" 
                    stroke="hsl(220, 91%, 54%)" 
                    strokeWidth={2.5}
                    fill="url(#colorActual)"
                    dot={{ r: 5, fill: "hsl(220, 91%, 54%)", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 7 }}
                    name="Actual Time"
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px' }}
                    iconType="circle"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <p className="text-sm">No completed tasks yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Task Distribution</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Task Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            {getDialogTasks().map(task => {
              const isInProgress = task.status === "in-progress";
              const isCompleted = task.status === "completed";
              
              if (isInProgress) {
                const startTime = new Date(task.startedAt!);
                const now = new Date();
                const elapsedMinutes = Math.round((now.getTime() - startTime.getTime()) / 60000);
                // Don't show overtime if extension was approved
                const isOvertime = task.extensionRequest?.status === 'approved' ? false : elapsedMinutes > task.expectedTime;
                
                return (
                  <Card key={task.id} className="border-l-4 border-l-warning">
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
                            <CheckCircle2 className="h-4 w-4" />
                            Complete
                          </Button>
                          {!task.extensionRequest && (
                            <Button onClick={() => openExtensionDialog(task)} size="sm" variant="outline" className="gap-2">
                              <AlertCircle className="h-4 w-4" />
                              Request Extension
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              
              if (isCompleted) {
                return (
                  <Card key={task.id} className="border-l-4 border-l-success opacity-90">
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
                              {task.efficiency}%
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
                );
              }
              
              return null;
            })}
            
            {getDialogTasks().length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tasks found</p>
              </div>
            )}
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
    </div>
  );
}
