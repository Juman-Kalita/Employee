import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { getTasks, getEmployees } from "@/lib/store";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";

const COLORS = ["hsl(220, 91%, 54%)", "hsl(220, 14%, 80%)"];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const allTasks = useMemo(() => getTasks(), []);
  const employees = useMemo(() => getEmployees(), []);
  const tasks = isAdmin ? allTasks : allTasks.filter(t => t.assignedTo === user?.id);

  const completed = tasks.filter(t => t.status === "completed");
  const avgEfficiency = completed.length ? Math.round(completed.reduce((s, t) => s + (t.efficiency || 0), 0) / completed.length) : 0;
  const avgTime = completed.length ? Math.round(completed.reduce((s, t) => s + (t.actualTime || 0), 0) / completed.length) : 0;

  const weeklyData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => ({
    name: d,
    completed: 0,
    efficiency: 0,
  }));

  const pieData = [
    { name: "Completed", value: completed.length },
    { name: "In Progress", value: tasks.filter(t => t.status === "in-progress").length },
  ];

  const employeeEfficiency = isAdmin ? employees.map(e => {
    const eTasks = allTasks.filter(t => t.assignedTo === e.id && t.status === "completed");
    return {
      name: e.name.split(" ")[0],
      efficiency: eTasks.length ? Math.round(eTasks.reduce((s, t) => s + (t.efficiency || 0), 0) / eTasks.length) : 0,
    };
  }) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">{isAdmin ? "Team performance overview" : "Your performance metrics"}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Tasks" value={tasks.length} icon={BarChart3} />
        <StatsCard title="Completed" value={completed.length} icon={CheckCircle2} />
        <StatsCard title="Avg Time" value={`${avgTime}m`} icon={Clock} />
        <StatsCard title="Avg Efficiency" value={`${avgEfficiency}%`} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Weekly Productivity</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="completed" stroke="hsl(220, 91%, 54%)" strokeWidth={2} name="Tasks" />
                <Line type="monotone" dataKey="efficiency" stroke="hsl(142, 71%, 45%)" strokeWidth={2} name="Efficiency %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Task Status</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="shadow-sm lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Employee Efficiency</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={employeeEfficiency}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="efficiency" fill="hsl(220, 91%, 54%)" radius={[4, 4, 0, 0]} name="Efficiency %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
