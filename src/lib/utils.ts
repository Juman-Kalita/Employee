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
export function fmtDate(iso: string): string {
  // Format a date string to local date only (no time)
  return new Date(iso).toLocaleDateString();
}

// Format a date string to local time only
export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

// Format a date string to local date + time
export function fmtDateTime(iso: string): string {
  return `${fmtDate(iso)} at ${fmtTime(iso)}`;
}

// Format deadline — if it's a plain date (no time component), show date only
export function fmtDeadline(iso: string): string {
  // Plain date strings like "2026-04-24" should show date only
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date(iso + "T12:00:00").toLocaleDateString();
  const d = new Date(iso);
  // If time is midnight UTC (00:00:00Z), it's likely a date-only value
  if (iso.endsWith("T00:00:00.000Z") || iso.endsWith("T00:00:00Z")) return d.toLocaleDateString();
  return fmtDateTime(iso);
}
