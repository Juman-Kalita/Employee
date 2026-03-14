export type UserRole = "admin" | "employee";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type Priority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "in-progress" | "completed";

export interface Project {
  id: string;
  name: string;
  assignedTo: string; // employee id
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // employee id
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
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  password?: string; // Optional for backward compatibility
}

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
  forUser: string; // user id
}
