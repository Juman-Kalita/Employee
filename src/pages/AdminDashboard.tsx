import { useMemo, useEffect, useState } from "react";
import { getTasks, getEmployees } from "@/lib/store";
import { StatsCard } from "@/components/StatsCard";
import { Users, ListTodo, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { Task, Employee } from "@/lib/types";

const COLORS = ["hsl(220, 91%, 54%)", "hsl(220, 14%, 80%)"];

export default function AdminDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

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

  const lineData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days.map(d => ({ name: d, tasks: 0 }));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of your team's performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Employees" value={employees.length} icon={Users} />
        <StatsCard title="Total Tasks" value={tasks.length} icon={ListTodo} />
        <StatsCard title="Completed" value={completed} icon={CheckCircle2} />
        <StatsCard title="In Progress" value={inProgress} icon={Clock} />
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

        <Card className="shadow-sm lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Completions Over Time</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="tasks" stroke="hsl(220, 91%, 54%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
