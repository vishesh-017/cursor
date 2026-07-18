import type { ReportStatus } from "@/types";

const LABELS: Record<ReportStatus, string> = {
  submitted: "Submitted",
  acknowledged: "Acknowledged",
  assigned: "Assigned",
  in_progress: "In progress",
  resolved: "Completed",
  rejected: "Rejected",
};

export function statusLabel(status: ReportStatus): string {
  return LABELS[status] ?? status;
}

export const ADMIN_STATUS_ACTIONS: Array<{
  status: ReportStatus;
  label: string;
  note: string;
}> = [
  {
    status: "acknowledged",
    label: "Acknowledge",
    note: "AMC desk acknowledged the citizen report.",
  },
  {
    status: "assigned",
    label: "Assign",
    note: "Ticket assigned to ward / department officer.",
  },
  {
    status: "in_progress",
    label: "In progress",
    note: "Field work started on site.",
  },
  {
    status: "resolved",
    label: "Completed",
    note: "Issue marked completed by AMC.",
  },
  {
    status: "rejected",
    label: "Reject",
    note: "Ticket rejected after review.",
  },
];
