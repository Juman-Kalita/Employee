import { useState, useEffect } from "react";
import { getSalesProjects, getTasks, getEmployees } from "@/lib/store";
import { SalesProject, Task, Employee } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Wrench, Hash, Calendar, CheckCircle, ChevronDown, ChevronRight, TrendingUp, Clock } from "lucide-react";

const priorityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-success/10 text-success border-success/20",
};

export default function ServicePage() {
  const [projects, setProjects] = useState<SalesProject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [sp, taskData, emps] = await Promise.all([getSalesProjects(), getTasks(), getEmployees()]);
    setProjects(sp.filter(p => p.status === "completed"));
    setTasks(taskData);
    setEmployees(emps.filter(e => e.id !== "00000000-0000-0000-0000-000000000001"));
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-96"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Service</h1>
        <p className="text-muted-foreground">Completed sales projects</p>
      </div>

      {projects.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No completed projects yet</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map(project => {
            const projectTasks = tasks.filter(t => t.title === project.name);
            const completedTasks = projectTasks.filter(t => t.status === "completed").length;
            const isExpanded = expanded === project.id;

            return (
              <Card key={project.id} className="border-l-4 border-l-success">
                <CardContent className="p-5">
                  <div
                    className="flex items-start gap-4 cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : project.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <h3 className="font-semibold text-lg">{project.name}</h3>
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">Completed</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground ml-7">
                        <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" />{project.projectNumber}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(project.startDate).toLocaleDateString()} — {new Date(project.endDate).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-success" />{completedTasks}/{projectTasks.length} tasks done</span>
                        {project.completedAt && (
                          <span className="flex items-center gap-1 text-success">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Completed: {new Date(project.completedAt).toLocaleDateString()} at {new Date(project.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 ml-7 space-y-3">
                      {projectTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No tasks in this project</p>
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
                                  <Badge variant="outline" className="ml-auto text-xs">{empTasks.filter(t => t.status === "completed").length}/{empTasks.length} done</Badge>
                                </div>
                                <div className="space-y-2">
                                  {empTasks.map(task => (
                                    <div key={task.id} className={`p-2.5 rounded border text-sm ${task.status === "completed" ? "bg-success/5 border-success/20" : "bg-warning/5 border-warning/20"}`}>
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <p className="font-medium">{task.description}</p>
                                        <div className="flex gap-1 shrink-0">
                                          <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>{task.priority}</Badge>
                                          <Badge variant="outline" className={`text-xs ${task.status === "completed" ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}`}>
                                            {task.status === "completed" ? "Done" : "Active"}
                                          </Badge>
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                        {task.createdAt && <span>Assigned: {new Date(task.createdAt).toLocaleDateString()} {new Date(task.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                                        {task.status === "completed" && task.completedAt && <span className="text-success">Done: {new Date(task.completedAt).toLocaleDateString()} {new Date(task.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                                        {task.actualTime && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{task.actualTime}m</span>}
                                        {task.efficiency !== undefined && task.expectedTime > 0 && (
                                          <span className={`flex items-center gap-1 ${task.efficiency >= 100 ? "text-success" : "text-warning"}`}>
                                            <TrendingUp className="h-3 w-3" />Efficiency: {Math.min(100, task.efficiency)}%
                                          </span>
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
    </div>
  );
}
