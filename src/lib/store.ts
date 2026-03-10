import { Employee, Notification, Task } from "./types";

const EMPLOYEES_KEY = "worktrack_employees";
const TASKS_KEY = "worktrack_tasks";
const NOTIFICATIONS_KEY = "worktrack_notifications";

const defaultEmployees: Employee[] = [];

const defaultTasks: Task[] = [];

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Clear all WorkTrack data from localStorage
export function clearAllData() {
  localStorage.removeItem(EMPLOYEES_KEY);
  localStorage.removeItem(TASKS_KEY);
  localStorage.removeItem(NOTIFICATIONS_KEY);
  console.log("All WorkTrack data cleared from localStorage");
}

// Employees
export function getEmployees(): Employee[] { return load(EMPLOYEES_KEY, defaultEmployees); }
export function saveEmployees(e: Employee[]) { save(EMPLOYEES_KEY, e); }
export function addEmployee(e: Employee) { const all = getEmployees(); all.push(e); saveEmployees(all); }
export function updateEmployee(e: Employee) { saveEmployees(getEmployees().map(x => x.id === e.id ? e : x)); }
export function deleteEmployee(id: string) { saveEmployees(getEmployees().filter(x => x.id !== id)); }

// Tasks
export function getTasks(): Task[] { return load(TASKS_KEY, defaultTasks); }
export function saveTasks(t: Task[]) { save(TASKS_KEY, t); }
export function addTask(t: Task) { const all = getTasks(); all.push(t); saveTasks(all); }
export function updateTask(t: Task) { saveTasks(getTasks().map(x => x.id === t.id ? t : x)); }

// Notifications
export function getNotifications(): Notification[] { return load(NOTIFICATIONS_KEY, []); }
export function saveNotifications(n: Notification[]) { save(NOTIFICATIONS_KEY, n); }
export function addNotification(n: Notification) { const all = getNotifications(); all.unshift(n); saveNotifications(all); }
export function markNotificationRead(id: string) {
  saveNotifications(getNotifications().map(n => n.id === id ? { ...n, read: true } : n));
}
