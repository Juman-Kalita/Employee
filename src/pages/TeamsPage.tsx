import { useState, useEffect } from "react";
import { getEmployees, addTask, addNotification, getTasks } from "@/lib/store";
import { Employee, Priority, TaskStatus, Task } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Plus, ListTodo } from "lucide-react";

const TEAMS = [
  "Design",
  "Electrical",
  "Production",
  "Store",
  "Services",
  "Documentation",
  "Purchase",
  "Admin - HR",
  "Admin - Accountant",
] as const;

type Team = typeof TEAMS[number];

const TEAM_COLORS: Record<Team, string> = {
  "Design": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Electrical": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "Production": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Store": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Services": "bg-green-500/10 text-green-400 border-green-500/20",
  "Documentation": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "Purchase": "bg-pink-500/10 text-pink-400 border-pink-500/20",
  "Admin - HR": "bg-red-500/10 text-red-400 border-red-500/20",
  "Admin - Accountant": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
};

function getTeamAssignments(): Record<string, Team> {
  try { return JSON.parse(localStorage.getItem("team_assignments") || "{}"); }
  catch { return {}; }
}

function saveTeamAssignments(assignments: Record<string, Team>) {
  localStorage.setItem("team_assignments", JSON.stringify(assignments));
}

export default function TeamsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Team>>(getTeamAssignments);
  const [loading, setLoading] = useState(true);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    team: "" as Team | "",
    leaderId: "",
    deadline: "",
    priority: "medium" as Priority,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([getEmployees(), getTasks()]).then(([emps, taskData]) => {
      setEmployees(emps.filter(e => e.status === "active"));
      setTasks(taskData);
      setLoading(false);
    });
  }, []);

  const assign = (empId: string, team: string) => {
    const updated = { ...assignments };
    if (team === "__unassign__") delete updated[empId];
    else updated[empId] = team as Team;
    setAssignments(updated);
    saveTeamAssignments(updated);
  };

  const grouped = TEAMS.reduce((acc, team) => {
    acc[team] = employees.filter(e => assignments[e.id] === team);
    return acc;
  }, {} as Record<Team, Employee[]>);

  const unassigned = employees.filter(e => !assignments[e.id]);

  // Team leaders for the selected team
  const teamLeaders = taskForm.team
    ? employees.filter(e => assignments[e.id] === taskForm.team && e.type === "team_leader")
    : [];

  const submitTeamTask = async () => {
    if (!taskForm.title || !taskForm.leaderId || !taskForm.deadline || submitting) return;
    setSubmitting(true);
    const now = new Date().toISOString();
    await addTask({
      title: taskForm.title,
      description: taskForm.description,
      assignedTo: taskForm.leaderId,
      expectedTime: 0,
      deadline: taskForm.deadline,
      priority: taskForm.priority,
      status: "in-progress" as TaskStatus,
      createdAt: now,
      startedAt: now,
    });
    const leader = employees.find(e => e.id === taskForm.leaderId);
    await addNotification({
      message: `New team task "${taskForm.title}" assigned to you for the ${taskForm.team} team. Please distribute to your team.`,
      read: false,
      createdAt: now,
      forUser: taskForm.leaderId,
    });
    setTaskForm({ title: "", description: "", team: "", leaderId: "", deadline: "", priority: "medium" });
    setSubmitting(false);
    setTaskDialogOpen(false);
    const [emps, taskData] = await Promise.all([getEmployees(), getTasks()]);
    setEmployees(emps.filter(e => e.status === "active"));
    setTasks(taskData);
  };

  if (loading) return <div className="flex items-center justify-center h-96"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-muted-foreground">Assign employees to teams and distribute tasks</p>
        </div>
        <Button onClick={() => setTaskDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Assign Task to Team
        </Button>
      </div>

      {/* Team sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {TEAMS.map(team => {
          const teamTasks = tasks.filter(t =>
            grouped[team].some(e => e.id === t.assignedTo) &&
            t.status !== "completed"
          );
          return (
          <Card key={team} className="border-l-4" style={{ borderLeftColor: "hsl(var(--primary))" }}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{team}</span>
                <div className="flex items-center gap-1">
                  {teamTasks.length > 0 && (
                    <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">{teamTasks.length} tasks</Badge>
                  )}
                  <Badge variant="outline" className={TEAM_COLORS[team]}>{grouped[team].length}</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {grouped[team].length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No members yet</p>
              ) : (
                <div className="space-y-2">
                  {grouped[team].map(emp => {
                    const empTasks = tasks.filter(t => t.assignedTo === emp.id && t.status !== "completed");
                    return (
                      <div key={emp.id}>
                        <EmployeeRow emp={emp} team={team} onAssign={assign} />
                        {empTasks.length > 0 && (
                          <div className="ml-9 mt-1 space-y-1">
                            {empTasks.map(t => (
                              <div key={t.id} className="flex items-center gap-2 text-xs bg-muted/40 rounded px-2 py-1">
                                <ListTodo className="h-3 w-3 text-primary shrink-0" />
                                <span className="truncate flex-1">{t.description || t.title}</span>
                                <span className="text-muted-foreground shrink-0">Due {new Date(t.deadline).toLocaleDateString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          );
        })}
      </div>

      {/* Unassigned */}
      {unassigned.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Unassigned ({unassigned.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unassigned.map(emp => (
                <EmployeeRow key={emp.id} emp={emp} team="" onAssign={assign} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assign Task to Team</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Task Title</Label>
              <Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Enter task title..." />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the task..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={taskForm.team} onValueChange={v => setTaskForm(f => ({ ...f, team: v as Team, leaderId: "" }))}>
                <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent>
                  {TEAMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Team Leader</Label>
              <Select
                value={taskForm.leaderId}
                onValueChange={v => setTaskForm(f => ({ ...f, leaderId: v }))}
                disabled={!taskForm.team}
              >
                <SelectTrigger><SelectValue placeholder={taskForm.team ? (teamLeaders.length === 0 ? "No team leaders in this team" : "Select team leader") : "Select a team first"} /></SelectTrigger>
                <SelectContent>
                  {/* Show all team members if no team_leader type exists */}
                  {(teamLeaders.length > 0 ? teamLeaders : (taskForm.team ? grouped[taskForm.team as Team] : [])).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name} — {e.role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {taskForm.team && teamLeaders.length === 0 && grouped[taskForm.team as Team]?.length > 0 && (
                <p className="text-xs text-muted-foreground">No team leaders found — showing all team members</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input type="date" value={taskForm.deadline} onChange={e => setTaskForm(f => ({ ...f, deadline: e.target.value }))} min={new Date().toISOString().split("T")[0]} />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v as Priority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={submitTeamTask}
              className="w-full"
              disabled={!taskForm.title || !taskForm.leaderId || !taskForm.deadline || submitting}
            >
              {submitting ? "Assigning..." : "Assign to Team Leader"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmployeeRow({ emp, team, onAssign }: { emp: Employee; team: Team | ""; onAssign: (id: string, team: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {emp.name.split(" ").map(n => n[0]).join("")}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{emp.name}</p>
        <p className="text-xs text-muted-foreground truncate">{emp.role}{emp.type === "team_leader" ? " · Leader" : ""}</p>
      </div>
      <Select value={team || "__unassign__"} onValueChange={v => onAssign(emp.id, v)}>
        <SelectTrigger className="h-7 text-xs w-36 shrink-0">
          <SelectValue placeholder="Assign team" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__unassign__">— Unassign —</SelectItem>
          {(TEAMS as unknown as string[]).map(t => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
