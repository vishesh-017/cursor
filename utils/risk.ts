import type { Priority } from "@/types";

export function riskLabel(priority: Priority): string {
  if (priority === "critical") return "Critical risk";
  if (priority === "high") return "High risk";
  if (priority === "medium") return "Medium risk";
  return "Low risk";
}

export function riskShort(priority: Priority): string {
  if (priority === "critical") return "Critical";
  if (priority === "high") return "High";
  if (priority === "medium") return "Medium";
  return "Low";
}
