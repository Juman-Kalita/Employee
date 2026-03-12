import { useMemo, useEffect, useState } from "react";
import { getTasks, getEmployees } from "@/lib/store";
import { StatsCard } from "@/components/StatsCard";
import { Users, ListTodo, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from "recharts";
import { Task, Employee, Priority } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const COLORS = ["hsl(220, 91%, 54%)", "hsl(220, 14%, 80%)"];

const priorityColors: Record<Priority, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-success/10 text-success border-success/20",
};

export default function AdminDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"employees" | "tasks" | "completed" | "inProgress">("employees");

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

  const completed = tasks.filter(t => t.status === "completed").length;
  const inProgress = tasks.filter(t => t.status === "in-progress").length;

  const tasksByEmployee = useMemo(() => {
    return employees.map(e => ({
      name: e.name.split(" ")[0],
      completed: tasks.filter(t => t.assignedTo === e.id && t.status === "completed").length,
      inProgress: tasks.filter(t => t.assignedTo === e.id && t.status === "in-progress").length,
    }));
  }, [employees, tasks]);

  const pieData = [
    { name: "Completed", value: completed },
    { name: "In Progress", value: inProgress },
  ];

  const openDialog = (type: "employees" | "tasks" | "completed" | "inProgress") => {
    setDialogType(type);
    setDialogOpen(true);
  };

  const getDialogContent = () => {
    switch (dialogType) {
      case "employees":
        return {
          title: `All Employees (${employees.length})`,
          items: employees.map(emp => {
            const empTasks = tasks.filter(t => t.assignedTo === emp.id);
            const empCompleted = empTasks.filter(t => t.status === "completed").length;
            return (
              <Card key={emp.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 bg-primary/10">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {emp.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{emp.name}</h3>
                      <p className="text-sm text-muted-foreground">{emp.email}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <Badge variant="outline">{emp.role}</Badge>
                        <span className="text-muted-foreground">
                          {empTasks.length} tasks ({empCompleted} completed)
                        </span>
                      </div>
                    </div>
                    <Badge variant={emp.status === 'active' ? 'default' : 'secondary'}>
                      {emp.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })
        };
      
      case "tasks":
        return {
          title: `All Tasks (${tasks.length})`,
          items: tasks.map(task => {
            const employee = employees.find(e => e.id === task.assignedTo);
            return (
              <Card key={task.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold">{task.title}</h3>
                    <Badge variant="outline" className={priorityColors[task.priority]}>
                      {task.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Assigned to: {employee?.name}</span>
                    <span>Status: {task.status}</span>
                    <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        };
      
      case "completed":
        const completedTasks = tasks.filter(t => t.status === "completed");
        return {
          title: `Completed Tasks (${completedTasks.length})`,
          items: completedTasks.map(task => {
            const employee = employees.find(e => e.id === task.assignedTo);
            return (
              <Card key={task.id} className="hover:shadow-md transition-all border-l-4 border-l-success">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold">{task.title}</h3>
                    <Badge variant="outline" className={priorityColors[task.priority]}>
                      {task.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                  <div className="flex items-center gap-4 text-xs mb-2">
                    <span className="text-muted-foreground">By: {employee?.name}</span>
                    <span className="text-muted-foreground">
                      Completed: {new Date(task.completedAt!).toLocaleDateString()}
                    </span>
                    <span className="text-muted-foreground">Time: {task.actualTime}m</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className={`text-sm font-semibold ${task.efficiency! >= 100 ? 'text-success' : 'text-warning'}`}>
                      Efficiency: {Math.min(100, task.efficiency || 0)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        };
      
      case "inProgress":
        const inProgressTasks = tasks.filter(t => t.status === "in-progress");
        return {
          title: `In Progress Tasks (${inProgressTasks.length})`,
          items: inProgressTasks.map(task => {
            const employee = employees.find(e => e.id === task.assignedTo);
            const startTime = new Date(task.startedAt!);
            const now = new Date();
            const elapsedMinutes = Math.round((now.getTime() - startTime.getTime()) / 60000);
            return (
              <Card key={task.id} className="hover:shadow-md transition-all border-l-4 border-l-warning">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold">{task.title}</h3>
                    <Badge variant="outline" className={priorityColors[task.priority]}>
                      {task.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                  <div className="flex items-center gap-4 text-xs mb-2">
                    <span className="text-muted-foreground">By: {employee?.name}</span>
                    <span className="text-muted-foreground">
                      Started: {startTime.toLocaleDateString()}
                    </span>
                    <span className="text-muted-foreground">Due: {new Date(task.deadline).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium">
                      Elapsed: {elapsedMinutes}m / {task.expectedTime}m
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of your team's performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => openDialog("employees")} className="cursor-pointer">
          <StatsCard title="Total Employees" value={employees.length} icon={Users} />
        </div>
        <div onClick={() => openDialog("tasks")} className="cursor-pointer">
          <StatsCard title="Total Tasks" value={tasks.length} icon={ListTodo} />
        </div>
        <div onClick={() => openDialog("completed")} className="cursor-pointer">
          <StatsCard title="Completed" value={completed} icon={CheckCircle2} />
        </div>
        <div onClick={() => openDialog("inProgress")} className="cursor-pointer">
          <StatsCard title="In Progress" value={inProgress} icon={Clock} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Tasks by Employee</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={tasksByEmployee}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="hsl(220, 91%, 54%)" radius={[4, 4, 0, 0]} name="Completed" />
                <Bar dataKey="inProgress" fill="hsl(220, 14%, 75%)" radius={[4, 4, 0, 0]} name="In Progress" />
              </BarChart>
            </ResponsiveContainer>
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

      {/* Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getDialogContent().title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {getDialogContent().items}
            {getDialogContent().items.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No items found</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
