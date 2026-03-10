export type UserRole = "admin" | "employee";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type Priority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "in-progress" | "completed";

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // employee id
  expectedTime: number; // minutes
  deadline: string; // ISO date
  priority: Priority;
  status: TaskStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  actualTime?: number; // minutes
  efficiency?: number; // percentage
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
