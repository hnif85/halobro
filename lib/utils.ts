import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const APP_COLORS: Record<string, string> = {
  FinanceWhiz: "#84cc16",
  SalesWhiz: "#3b82f6",
  SmartWhiz: "#7c3aed",
  CreateWhiz: "#f59e0b",
  SMEWhiz: "#10b981",
};

export function formatCredit(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k cr";
  return n + " cr";
}