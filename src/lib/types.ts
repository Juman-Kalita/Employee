export type UserRole = "admin" | "employee" | "team_leader";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type Priority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "in-progress" | "completed" | "pending-approval";

export interface Project {
  id: string;
  name: string;
  assignedTo: string; // employee id
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  description: string;
  machineName: string;
  quantity?: string;
  arrivedAt: string;
  createdAt: string;
}

export interface SalesProject {
  id: string;
  name: string;
  projectNumber: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  status: "active" | "completed";
  completedAt?: string;
  taskTemplates?: string[];
  leaderId?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // employee id
  assignedBy?: string; // employee id who assigned this task
  projectId?: string; // optional project id
  expectedTime: number; // minutes
  deadline: string; // ISO date
  priority: Priority;
  status: TaskStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  actualTime?: number; // minutes
  efficiency?: number; // percentage
  extensionRequest?: {
    reason: string;
    proposedDeadline: string;
    requestedAt: string;
    status: "pending" | "approved" | "rejected";
    adminResponse?: string;
    blockedByEmployee?: string; // ID of employee causing the delay
  };
  cancellationRequest?: {
    reason: string;
    requestedAt: string;
    status: "pending" | "approved" | "rejected";
    adminResponse?: string;
  };
  rescheduleRequest?: {
    reason: string;
    requestedAt: string;
    status: "pending" | "approved" | "rejected";
    adminResponse?: string;
  };
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  type?: "employee" | "team_leader";
  status: "active" | "inactive";
  password?: string;
}

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
  forUser: string; // user id
}


