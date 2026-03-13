import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { getTasks, saveTasks, getEmployees, addNotification } from "@/lib/store";
import { Task, Employee } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, XCircle, Clock, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const priorityColors = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-success/10 text-success border-success/20",
};

export default function ExtensionRequests() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [tasksData, employeesData] = await Promise.all([getTasks(), getEmployees()]);
    console.log('All tasks:', tasksData);
    console.log('Tasks with extension requests:', tasksData.filter(t => t.extensionRequest));
    console.log('Pending extension requests:', tasksData.filter(t => t.extensionRequest && t.extensionRequest.status === "pending"));
    setTasks(tasksData);
    setEmployees(employeesData);
    setLoading(false);
  };

  const pendingRequests = tasks.filter(
    t => t.extensionRequest && t.extensionRequest.status === "pending"
  );

  const pendingCancellations = tasks.filter(
    t => t.cancellationRequest && t.cancellationRequest.status === "pending"
  );

  const handleCancellationApproval = async (taskId: string, approved: boolean) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (approved) {
      // Mark task as completed with a note that it was cancelled
      const updated = tasks.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          status: "completed" as const,
          completedAt: new Date().toISOString(),
          actualTime: 0,
          efficiency: 0,
          cancellationRequest: {
            ...t.cancellationRequest!,
            status: "approved" as const,
            adminResponse: "Task cancelled by admin approval"
          }
        };
      });
      await saveTasks(updated);
    } else {
      // Just update the cancellation request status
      const updated = tasks.map(t => {
        if (t.id !== taskId || !t.cancellationRequest) return t;
        return {
          ...t,
          cancellationRequest: {
            ...t.cancellationRequest,
            status: "rejected" as const,
            adminResponse: "Cancellation request rejected"
          }
        };
      });
      await saveTasks(updated);
    }

    await addNotification({
      message: `Your cancellation request for "${task.title}" has been ${approved ? 'approved - task cancelled' : 'rejected'}`,
      read: false,
      createdAt: new Date().toISOString(),
      forUser: task.assignedTo
    });

    await loadData();
  };

  const handleApproval = async (taskId: string, approved: boolean) => {
    const updated = tasks.map(t => {
      if (t.id !== taskId || !t.extensionRequest) return t;
      
      if (approved) {
        return {
          ...t,
          deadline: t.extensionRequest.proposedDeadline,
          extensionRequest: {
            ...t.extensionRequest,
            status: "approved" as const,
            adminResponse: "Extension approved"
          }
        };
      } else {
        return {
          ...t,
          extensionRequest: {
            ...t.extensionRequest,
            status: "rejected" as const,
            adminResponse: "Extension rejected"
          }
        };
      }
    });
    
    await saveTasks(updated);
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      await addNotification({
        message: `Your extension request for "${task.title}" has been ${approved ? 'approved' : 'rejected'}`,
        read: false,
        createdAt: new Date().toISOString(),
        forUser: task.assignedTo
      });
    }
    await loadData();
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee?.name || "Unknown";
  };

  const getEmployeeInitials = (employeeId: string) => {
    const name = getEmployeeName(employeeId);
    return name.split(' ').map(n => n[0]).join('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading extension requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Extension Requests</h1>
        <p className="text-muted-foreground">Review and approve deadline extension requests and task cancellations</p>
      </div>

      {/* Extension Requests Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Extension Requests</h2>
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
            const blockingEmployee = task.extensionRequest?.blockedByEmployee 
              ? employees.find(e => e.id === task.extensionRequest.blockedByEmployee)
              : null;

            return (
              <Card key={task.id} className="hover:shadow-lg transition-all border-l-4 border-l-warning">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12 bg-primary/10">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getEmployeeInitials(task.assignedTo)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{task.title}</h3>
                        <Badge variant="outline" className={priorityColors[task.priority]}>
                          {task.priority}
                        </Badge>
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Pending Review
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">{task.description}</p>

                      <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Employee</p>
                          <p className="text-sm font-medium flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {employee?.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Current Deadline</p>
                          <p className="text-sm font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {new Date(task.deadline).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Requested On</p>
                          <p className="text-sm font-medium">
                            {new Date(task.extensionRequest!.requestedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Proposed Deadline</p>
                          <p className="text-sm font-medium text-primary">
                            {new Date(task.extensionRequest!.proposedDeadline).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4 p-3 bg-warning/5 border border-warning/20 rounded">
                        <p className="text-xs font-semibold text-warning mb-1">Reason for Extension:</p>
                        <p className="text-sm">{task.extensionRequest!.reason}</p>
                      </div>

                      {blockingEmployee && (
                        <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 rounded">
                          <p className="text-xs font-semibold text-destructive mb-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Blocked by Teammate:
                          </p>
                          <p className="text-sm">
                            {blockingEmployee.name} ({blockingEmployee.role})
                          </p>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Button 
                          onClick={() => handleApproval(task.id, true)}
                          className="flex-1 gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve Extension
                        </Button>
                        <Button 
                          onClick={() => handleApproval(task.id, false)}
                          variant="destructive"
                          className="flex-1 gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject Request
                        </Button>
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

      {/* Cancellations Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Cancellation Requests</h2>
        {pendingCancellations.length === 0 ? (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-base font-medium mb-1">No Pending Cancellation Requests</p>
              <p className="text-sm">All cancellation requests have been reviewed</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingCancellations.map(task => {
              const employee = employees.find(e => e.id === task.assignedTo);

              return (
                <Card key={task.id} className="hover:shadow-lg transition-all border-l-4 border-l-destructive">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12 bg-primary/10">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getEmployeeInitials(task.assignedTo)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{task.title}</h3>
                          <Badge variant="outline" className={priorityColors[task.priority]}>
                            {task.priority}
                          </Badge>
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                            <XCircle className="h-3 w-3 mr-1" />
                            Cancellation Request
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground mb-3">{task.description}</p>

                        <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Employee</p>
                            <p className="text-sm font-medium flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {employee?.name}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Deadline</p>
                            <p className="text-sm font-medium flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {new Date(task.deadline).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Requested On</p>
                            <p className="text-sm font-medium">
                              {new Date(task.cancellationRequest!.requestedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Expected Time</p>
                            <p className="text-sm font-medium">
                              {task.expectedTime} minutes
                            </p>
                          </div>
                        </div>

                        <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 rounded">
                          <p className="text-xs font-semibold text-destructive mb-1">Reason for Cancellation:</p>
                          <p className="text-sm">{task.cancellationRequest!.reason}</p>
                        </div>

                        <div className="flex gap-3">
                          <Button 
                            onClick={() => handleCancellationApproval(task.id, true)}
                            variant="destructive"
                            className="flex-1 gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approve Cancellation
                          </Button>
                          <Button 
                            onClick={() => handleCancellationApproval(task.id, false)}
                            variant="outline"
                            className="flex-1 gap-2"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject Request
                          </Button>
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
