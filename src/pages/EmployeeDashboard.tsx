import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { getTasks, getEmployees } from "@/lib/store";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, ListTodo, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";

const COLORS = ["hsl(220, 91%, 54%)", "hsl(220, 14%, 80%)"];

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const tasks = useMemo(() => getTasks().filter(t => t.assignedTo === user?.id), [user]);
  const completed = tasks.filter(t => t.status === "completed");
  const inProgress = tasks.filter(t => t.status === "in-progress").length;
  const avgEfficiency = completed.length ? Math.round(completed.reduce((s, t) => s + (t.efficiency || 0), 0) / completed.length) : 0;

  const pieData = [
    { name: "Completed", value: completed.length },
    { name: "In Progress", value: inProgress },
  ];

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
        <StatsCard title="Assigned" value={tasks.length} icon={ListTodo} />
        <StatsCard title="Completed" value={completed.length} icon={CheckCircle2} />
        <StatsCard title="In Progress" value={inProgress} icon={Clock} />
        <StatsCard title="Avg Efficiency" value={`${avgEfficiency}%`} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Daily Productivity</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="efficiency" stroke="hsl(220, 91%, 54%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
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
    </div>
  );
}
