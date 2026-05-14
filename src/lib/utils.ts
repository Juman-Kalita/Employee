import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Calculate efficiency with late penalty
// If completed after deadline, apply penalty: -20% for first day late, -10% per additional day
export function calcEfficiency(expectedTime: number, actualMinutes: number, deadline: string, completedAt: string): number {
  const base = expectedTime > 0 ? Math.round((expectedTime / Math.max(actualMinutes, 1)) * 100) : 100;
  const capped = base > 100 ? 100 : base;

  const deadlineDate = new Date(deadline.includes("T") ? deadline : deadline + "T23:59:59");
  const completedDate = new Date(completedAt);

  if (completedDate <= deadlineDate) return capped;

  // Calculate days late (rounded up)
  const msLate = completedDate.getTime() - deadlineDate.getTime();
  const daysLate = Math.ceil(msLate / (1000 * 60 * 60 * 24));
  const penalty = 20 + (daysLate - 1) * 10;

  return capped - penalty;
}
// Check if an ISO string is effectively a date-only value (midnight UTC = no real time info)
function isDateOnly(iso: string): boolean {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return true;
  if (iso.endsWith("T00:00:00.000Z") || iso.endsWith("T00:00:00Z")) return true;
  return false;
}

// Parse a date string safely — plain dates parsed as local noon to avoid UTC offset issues
function parseDate(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date(iso + "T12:00:00");
  return new Date(iso);
}

// Format a date string to local date only (no time)
export function fmtDate(iso: string): string {
  return parseDate(iso).toLocaleDateString();
}

// Format a date string to local time only
export function fmtTime(iso: string): string {
  return parseDate(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

// Format a date string to local date + time
// If the value is effectively date-only (midnight UTC), show date only — no fake 5:30 AM
export function fmtDateTime(iso: string): string {
  if (isDateOnly(iso)) return fmtDate(iso);
  return `${fmtDate(iso)} at ${fmtTime(iso)}`;
}

// Format deadline — always date-only for plain dates
export function fmtDeadline(iso: string): string {
  if (isDateOnly(iso)) return fmtDate(iso);
  return fmtDateTime(iso);
}
