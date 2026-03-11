import { useMemo, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getEmployees, getTasks } from "@/lib/store";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, ListTodo, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { Task, Employee } from "@/lib/types";

export default function EmployeePerformance() {
  const { id } = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    const [employeesData, tasksData] = await Promise.all([getEmployees(), getTasks()]);
    setEmployee(employeesData.find(e => e.id === id) || null);
    setTasks(tasksData.filter(t => t.assignedTo === id));
    setLoading(false);
  };

  if (!employee) return <div className="p-8 text-center text-muted-foreground">Employee not found</div>;

  const completed = tasks.filter(t => t.status === "completed");
  const avgEfficiency = completed.length ? Math.round(completed.reduce((s, t) => s + (t.efficiency || 0), 0) / completed.length) : 0;
  const avgTime = completed.length ? Math.round(completed.reduce((s, t) => s + (t.actualTime || 0), 0) / completed.length) : 0;

  const timeComparison = completed.map(t => ({
    name: t.title.substring(0, 15),
    expected: t.expectedTime,
    actual: t.actualTime || 0,
  }));

  const productivityData = ["Mon", "Tue", "Wed", "Thu", "Fri"].map(d => ({
    name: d,
    efficiency: 0,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">{employee.name}</h1>
        <p className="text-muted-foreground">{employee.role} · {employee.email}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Tasks Assigned" value={tasks.length} icon={ListTodo} />
        <StatsCard title="Completed" value={completed.length} icon={CheckCircle2} />
        <StatsCard title="Avg Time" value={`${avgTime}m`} icon={Clock} />
        <StatsCard title="Avg Efficiency" value={`${avgEfficiency}%`} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Productivity Over Time</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={productivityData}>
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
          <CardHeader><CardTitle className="text-base">Time Comparison</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={timeComparison}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="expected" fill="hsl(220, 14%, 75%)" radius={[4, 4, 0, 0]} name="Expected" />
                <Bar dataKey="actual" fill="hsl(220, 91%, 54%)" radius={[4, 4, 0, 0]} name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
