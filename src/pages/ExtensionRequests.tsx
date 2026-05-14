import { useState, useEffect } from "react";
import { fmtDate, fmtTime, fmtDateTime, fmtDeadline } from "@/lib/utils";
import { getTasks, saveTasks, updateTask, getEmployees, addNotification } from "@/lib/store";
import { Task, Employee } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, XCircle, Clock, User, CalendarClock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const priorityColors = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-success/10 text-success border-success/20",
};

export default function ExtensionRequests() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [tasksData, employeesData] = await Promise.all([getTasks(), getEmployees()]);
    setTasks(tasksData);
    setEmployees(employeesData);
    setLoading(false);
  };

  const pendingRequests = tasks.filter(t => t.extensionRequest?.status === "pending");
  const pendingReschedules = tasks.filter(t => t.rescheduleRequest?.status === "pending");
  const notCompletedTasks = tasks.filter(t => t.status === "in-progress" && t.cancellationRequest?.status === "pending");

  const handleApproval = async (taskId: string, approved: boolean) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.extensionRequest) return;
    const updatedTask = approved
      ? { ...task, deadline: task.extensionRequest.proposedDeadline, extensionRequest: { ...task.extensionRequest, status: "approved" as const, adminResponse: "Extension approved" } }
      : { ...task, extensionRequest: { ...task.extensionRequest, status: "rejected" as const, adminResponse: "Extension rejected" } };
    await updateTask(updatedTask);
    await addNotification({ message: `Your extension request for "${task.title}" has been ${approved ? "approved" : "rejected"}`, read: false, createdAt: new Date().toISOString(), forUser: task.assignedTo });
    await loadData();
  };

  const handleRescheduleApproval = async (taskId: string, approved: boolean) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.rescheduleRequest) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    const updatedTask = approved
      ? { ...task, deadline: tomorrowStr, rescheduleRequest: { ...task.rescheduleRequest, status: "approved" as const, adminResponse: "Rescheduled to next day" } }
      : { ...task, rescheduleRequest: { ...task.rescheduleRequest, status: "rejected" as const, adminResponse: "Reschedule rejected" } };
    await updateTask(updatedTask);
    await addNotification({
      message: `Your reschedule request for "${task.title}" has been ${approved ? "approved — task rescheduled to tomorrow" : "rejected"}`,
      read: false,
      createdAt: new Date().toISOString(),
      forUser: task.assignedTo
    });
    await loadData();
  };

  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || "Unknown";
  const getEmployeeInitials = (id: string) => getEmployeeName(id).split(" ").map(n => n[0]).join("");

  if (loading) return <div className="flex items-center justify-center h-96"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Extension Requests</h1>
        <p className="text-muted-foreground">Review and approve deadline extension requests</p>
      </div>

      {/* Extension Requests */}
      {pendingRequests.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-base font-medium mb-1">No Pending Extension Requests</p>
            <p className="text-sm">All extension requests have been reviewed</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map(task => {
            const employee = employees.find(e => e.id === task.assignedTo);
            const blockingEmployee = task.extensionRequest?.blockedByEmployee ? employees.find(e => e.id === task.extensionRequest!.blockedByEmployee) : null;
            return (
              <Card key={task.id} className="hover:shadow-lg transition-all border-l-4 border-l-warning">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12 bg-primary/10">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">{getEmployeeInitials(task.assignedTo)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{task.title}</h3>
                        <Badge variant="outline" className={priorityColors[task.priority]}>{task.priority}</Badge>
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20"><AlertCircle className="h-3 w-3 mr-1" />Pending Review</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                      <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
                        <div><p className="text-xs text-muted-foreground mb-1">Employee</p><p className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" />{employee?.name}</p></div>
                        <div><p className="text-xs text-muted-foreground mb-1">Current Deadline</p><p className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4" />{fmtDate(task.deadline)}</p></div>
                        <div><p className="text-xs text-muted-foreground mb-1">Requested On</p><p className="text-sm font-medium">{fmtDate(task.extensionRequest!.requestedAt)}</p></div>
                        <div><p className="text-xs text-muted-foreground mb-1">Proposed Deadline</p><p className="text-sm font-medium text-primary">{fmtDate(task.extensionRequest!.proposedDeadline)}</p></div>
                      </div>
                      <div className="mb-4 p-3 bg-warning/5 border border-warning/20 rounded">
                        <p className="text-xs font-semibold text-warning mb-1">Reason for Extension:</p>
                        <p className="text-sm">{task.extensionRequest!.reason}</p>
                      </div>
                      {blockingEmployee && (
                        <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 rounded">
                          <p className="text-xs font-semibold text-destructive mb-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />Blocked by Teammate:</p>
                          <p className="text-sm">{blockingEmployee.name} ({blockingEmployee.role})</p>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <Button onClick={() => handleApproval(task.id, true)} className="flex-1 gap-2"><CheckCircle className="h-4 w-4" />Approve Extension</Button>
                        <Button onClick={() => handleApproval(task.id, false)} variant="destructive" className="flex-1 gap-2"><XCircle className="h-4 w-4" />Reject Request</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reschedule Requests */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><CalendarClock className="h-5 w-5" />Reschedule Requests</h2>
          <p className="text-muted-foreground text-sm">Employees requesting to reschedule a task to the next day</p>
        </div>
        {pendingReschedules.length === 0 ? (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-base font-medium mb-1">No Pending Reschedule Requests</p>
              <p className="text-sm">All reschedule requests have been reviewed</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingReschedules.map(task => {
              const employee = employees.find(e => e.id === task.assignedTo);
              return (
                <Card key={task.id} className="hover:shadow-lg transition-all border-l-4 border-l-primary">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12 bg-primary/10">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">{getEmployeeInitials(task.assignedTo)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{task.title}</h3>
                          <Badge variant="outline" className={priorityColors[task.priority]}>{task.priority}</Badge>
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20"><CalendarClock className="h-3 w-3 mr-1" />Reschedule Pending</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                        <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
                          <div><p className="text-xs text-muted-foreground mb-1">Employee</p><p className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" />{employee?.name}</p></div>
                          <div><p className="text-xs text-muted-foreground mb-1">Current Deadline</p><p className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4" />{fmtDate(task.deadline)}</p></div>
                          <div><p className="text-xs text-muted-foreground mb-1">Requested On</p><p className="text-sm font-medium">{fmtDate(task.rescheduleRequest!.requestedAt)}</p></div>
                          <div><p className="text-xs text-muted-foreground mb-1">If Approved</p><p className="text-sm font-medium text-primary">Rescheduled to tomorrow</p></div>
                        </div>
                        <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded">
                          <p className="text-xs font-semibold text-primary mb-1">Reason:</p>
                          <p className="text-sm">{task.rescheduleRequest!.reason}</p>
                        </div>
                        <div className="flex gap-3">
                          <Button onClick={() => handleRescheduleApproval(task.id, true)} className="flex-1 gap-2"><CheckCircle className="h-4 w-4" />Approve & Reschedule</Button>
                          <Button onClick={() => handleRescheduleApproval(task.id, false)} variant="destructive" className="flex-1 gap-2"><XCircle className="h-4 w-4" />Reject</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Not Completed Today */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold">Not Completed Today</h2>
          <p className="text-muted-foreground text-sm">Tasks that employees could not complete today</p>
        </div>
        {notCompletedTasks.length === 0 ? (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-base font-medium mb-1">No Tasks Marked as Not Completed</p>
              <p className="text-sm">All employees are on track with their tasks</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {notCompletedTasks.map(task => {
              const employee = employees.find(e => e.id === task.assignedTo);
              return (
                <Card key={task.id} className="hover:shadow-lg transition-all border-l-4 border-l-warning">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12 bg-warning/10">
                        <AvatarFallback className="bg-warning/10 text-warning font-semibold">{getEmployeeInitials(task.assignedTo)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{task.title}</h3>
                          <Badge variant="outline" className={priorityColors[task.priority]}>{task.priority}</Badge>
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20"><AlertCircle className="h-3 w-3 mr-1" />Not Completed Today</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                        <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
                          <div><p className="text-xs text-muted-foreground mb-1">Employee</p><p className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" />{employee?.name}</p></div>
                          <div><p className="text-xs text-muted-foreground mb-1">Email</p><p className="text-sm font-medium">{employee?.email}</p></div>
                          <div><p className="text-xs text-muted-foreground mb-1">Role</p><p className="text-sm font-medium">{employee?.role}</p></div>
                          <div><p className="text-xs text-muted-foreground mb-1">Reported On</p><p className="text-sm font-medium">{fmtDate(task.cancellationRequest!.requestedAt)} at {fmtTime(task.cancellationRequest!.requestedAt)}</p></div>
                        </div>
                        <div className="p-3 bg-warning/5 border border-warning/20 rounded">
                          <p className="text-xs font-semibold text-warning mb-1">Reason for Not Completing:</p>
                          <p className="text-sm">{task.cancellationRequest!.reason}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


