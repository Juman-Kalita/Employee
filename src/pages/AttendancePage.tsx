import { useState, useEffect, useMemo } from "react";
import { fmtDate, fmtTime, fmtDateTime, fmtDeadline } from "@/lib/utils";
import { getAttendance, AttendanceRecord, getTasks } from "@/lib/store";
import { getEmployees } from "@/lib/store";
import { Employee, Task } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, LogIn, LogOut, Search, Users, CheckCircle, AlertCircle, ChevronDown, ChevronRight, TrendingUp, CalendarClock, XCircle } from "lucide-react";

function formatTime(iso?: string) {
  if (!iso) return "—";
  return fmtTime(iso);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function duration(login: string, logout?: string) {
  if (!logout) return "Active";
  const mins = Math.round((new Date(logout).getTime() - new Date(login).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function AttendanceRow({ record, employee, tasks }: {
  record: AttendanceRecord;
  employee?: Employee;
  tasks: Task[];
}) {
  const [expanded, setExpanded] = useState(false);

  // Tasks that were active/completed on this date
  const dayTasks = tasks.filter(t => {
    if (t.assignedTo !== record.employeeId) return false;
    const taskDate = (t.completedAt || t.startedAt || t.createdAt || "").split("T")[0];
    return taskDate === record.date;
  });

  const completedTasks = dayTasks.filter(t => t.status === "completed");
  const inProgressTasks = dayTasks.filter(t => t.status === "in-progress");
  const rescheduledTasks = inProgressTasks.filter(t => t.rescheduleRequest);
  const notCompletedTasks = inProgressTasks.filter(t => t.cancellationRequest?.status === "pending");

  const name = employee?.name || "Unknown";
  const initials = name.split(" ").map((n: string) => n[0]).join("");

  return (
    <Card className={`border-l-4 ${record.status === "present" ? "border-l-success" : "border-l-warning"}`}>
      <CardContent className="p-4">
        {/* Header row */}
        <div
          className="flex items-center gap-4 flex-wrap cursor-pointer"
          onClick={() => dayTasks.length > 0 && setExpanded(e => !e)}
        >
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">{employee?.role}</p>
          </div>
          <div className="flex items-center gap-1 text-sm text-success">
            <LogIn className="h-3.5 w-3.5" />
            <span>{formatTime(record.loginTime)}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <LogOut className="h-3.5 w-3.5" />
            <span>{formatTime(record.logoutTime)}</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className={record.logoutTime ? "" : "text-primary font-medium"}>{duration(record.loginTime, record.logoutTime)}</span>
          </div>
          <Badge
            variant="outline"
            className={record.status === "present"
              ? "bg-success/10 text-success border-success/20"
              : "bg-warning/10 text-warning border-warning/20"}
          >
            {record.status === "present" ? "Present" : "Incomplete"}
          </Badge>
          {dayTasks.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{dayTasks.length} task{dayTasks.length !== 1 ? "s" : ""}</span>
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </div>
          )}
        </div>

        {record.notes && (
          <p className="text-xs text-muted-foreground mt-2 ml-[52px]">{record.notes}</p>
        )}

        {/* Expanded task details */}
        {expanded && dayTasks.length > 0 && (
          <div className="mt-4 ml-[52px] space-y-3">

            {/* Completed tasks */}
            {completedTasks.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-success mb-2 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Completed ({completedTasks.length})
                </p>
                <div className="space-y-2">
                  {completedTasks.map(task => (
                    <div key={task.id} className="p-3 bg-success/5 border border-success/20 rounded-lg">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="text-sm font-medium">{task.description || task.title}</p>
                          {task.description && task.description !== task.title && (
                            <p className="text-xs text-muted-foreground">{task.title}</p>
                          )}
                        </div>
                        <Badge variant="outline" className={
                          task.priority === "high" ? "bg-destructive/10 text-destructive border-destructive/20 text-xs" :
                          task.priority === "medium" ? "bg-warning/10 text-warning border-warning/20 text-xs" :
                          "bg-success/10 text-success border-success/20 text-xs"
                        }>{task.priority}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {task.startedAt && (
                          <span className="flex items-center gap-1">
                            <LogIn className="h-3 w-3" />
                            Started: {formatTime(task.startedAt)}
                          </span>
                        )}
                        {task.completedAt && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-success" />
                            Done: {formatTime(task.completedAt)}
                          </span>
                        )}
                        {task.actualTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Time: {task.actualTime}m
                          </span>
                        )}
                        {task.expectedTime > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expected: {task.expectedTime}m
                          </span>
                        )}
                        {task.efficiency !== undefined && task.expectedTime > 0 && (
                          <span className={`flex items-center gap-1 font-semibold ${task.efficiency >= 100 ? "text-success" : (task.efficiency ?? 0) < 0 ? "text-destructive" : "text-warning"}`}>
                            <TrendingUp className="h-3 w-3" />
                            Efficiency: {task.efficiency}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rescheduled tasks */}
            {rescheduledTasks.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Rescheduled ({rescheduledTasks.length})
                </p>
                <div className="space-y-2">
                  {rescheduledTasks.map(task => (
                    <div key={task.id} className={`p-3 rounded-lg border ${
                      task.rescheduleRequest?.status === "approved" ? "bg-success/5 border-success/20" :
                      task.rescheduleRequest?.status === "rejected" ? "bg-destructive/5 border-destructive/20" :
                      "bg-primary/5 border-primary/20"
                    }`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium">{task.description || task.title}</p>
                        <Badge variant="outline" className="text-xs">
                          {task.rescheduleRequest?.status === "approved" ? "Approved" :
                           task.rescheduleRequest?.status === "rejected" ? "Rejected" : "Pending"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Reason: {task.rescheduleRequest?.reason}
                      </p>
                      {task.rescheduleRequest?.status === "approved" && (
                        <p className="text-xs text-success">Rescheduled to: {fmtDate(task.deadline)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Not completed tasks */}
            {notCompletedTasks.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-warning mb-2 flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" />
                  Not Completed ({notCompletedTasks.length})
                </p>
                <div className="space-y-2">
                  {notCompletedTasks.map(task => (
                    <div key={task.id} className="p-3 bg-warning/5 border border-warning/20 rounded-lg">
                      <p className="text-sm font-medium mb-1">{task.description || task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Reason: {task.cancellationRequest?.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Still in progress (no reason given) */}
            {inProgressTasks.filter(t => !t.rescheduleRequest && !t.cancellationRequest).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-warning mb-2 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Still In Progress ({inProgressTasks.filter(t => !t.rescheduleRequest && !t.cancellationRequest).length})
                </p>
                <div className="space-y-2">
                  {inProgressTasks.filter(t => !t.rescheduleRequest && !t.cancellationRequest).map(task => (
                    <div key={task.id} className="p-3 bg-muted/50 border border-border rounded-lg">
                      <p className="text-sm font-medium">{task.description || task.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">Due: {fmtDate(task.deadline)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [att, emps, taskData] = await Promise.all([getAttendance(), getEmployees(), getTasks()]);
    setRecords(att);
    setEmployees(emps.filter(e => e.id !== "00000000-0000-0000-0000-000000000001"));
    setTasks(taskData);
    setLoading(false);
  };

  const getName = (id: string) => employees.find(e => e.id === id)?.name || "Unknown";

  const filtered = useMemo(() => records.filter(r => {
    const name = getName(r.employeeId).toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (filterEmployee !== "all" && r.employeeId !== filterEmployee) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    return true;
  }), [records, search, filterEmployee, filterStatus, employees]);

  const today = new Date().toISOString().split("T")[0];
  const todayRecords = records.filter(r => r.date === today);
  const presentToday = todayRecords.filter(r => r.status === "present").length;
  const activeNow = todayRecords.filter(r => !r.logoutTime).length;
  const incompleteToday = todayRecords.filter(r => r.status === "incomplete").length;

  const grouped = useMemo(() => {
    const map: Record<string, AttendanceRecord[]> = {};
    filtered.forEach(r => {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  if (loading) return <div className="flex items-center justify-center h-96"><p className="text-muted-foreground">Loading attendance...</p></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-muted-foreground">Employee login/logout records and daily attendance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{presentToday}</p>
              <p className="text-sm text-muted-foreground">Present Today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeNow}</p>
              <p className="text-sm text-muted-foreground">Currently Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{incompleteToday}</p>
              <p className="text-sm text-muted-foreground">Incomplete Today</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Employees" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="present">Present</SelectItem>
            <SelectItem value="incomplete">Incomplete</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {grouped.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No attendance records found</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, dayRecords]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {date === today ? "Today — " : ""}{formatDate(date)}
                </h3>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{dayRecords.length} record{dayRecords.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="space-y-2">
                {dayRecords.map(record => (
                  <AttendanceRow
                    key={record.id}
                    record={record}
                    employee={employees.find(e => e.id === record.employeeId)}
                    tasks={tasks}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


