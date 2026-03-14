import { useState, useEffect, useMemo } from "react";
import { getAttendance, AttendanceRecord } from "@/lib/store";
import { getEmployees } from "@/lib/store";
import { Employee } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, LogIn, LogOut, Search, Users, CheckCircle, AlertCircle } from "lucide-react";

function formatTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [att, emps] = await Promise.all([getAttendance(), getEmployees()]);
    setRecords(att);
    setEmployees(emps.filter(e => e.id !== "00000000-0000-0000-0000-000000000001"));
    setLoading(false);
  };

  const getName = (id: string) => employees.find(e => e.id === id)?.name || "Unknown";
  const getInitials = (id: string) => getName(id).split(" ").map(n => n[0]).join("");

  const filtered = useMemo(() => records.filter(r => {
    const name = getName(r.employeeId).toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (filterEmployee !== "all" && r.employeeId !== filterEmployee) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    return true;
  }), [records, search, filterEmployee, filterStatus, employees]);

  // Today's summary
  const today = new Date().toISOString().split("T")[0];
  const todayRecords = records.filter(r => r.date === today);
  const presentToday = todayRecords.filter(r => r.status === "present").length;
  const activeNow = todayRecords.filter(r => !r.logoutTime).length;
  const incompleteToday = todayRecords.filter(r => r.status === "incomplete").length;

  // Group by date
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

      {/* Today's summary */}
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

      {/* Filters */}
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

      {/* Records grouped by date */}
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
                  <Card key={record.id} className={`border-l-4 ${record.status === "present" ? "border-l-success" : "border-l-warning"}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4 flex-wrap">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {getInitials(record.employeeId)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{getName(record.employeeId)}</p>
                          <p className="text-xs text-muted-foreground">{employees.find(e => e.id === record.employeeId)?.role}</p>
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
                      </div>
                      {record.notes && (
                        <p className="text-xs text-muted-foreground mt-2 pl-13 ml-[52px]">{record.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
