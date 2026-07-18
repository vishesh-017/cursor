"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AccountStatus, ModerationAction, UserProfile } from "@/types";

const STATUS_TONE: Record<
  AccountStatus,
  "success" | "warning" | "danger" | "default" | "brand"
> = {
  active: "success",
  flagged: "warning",
  suspended: "danger",
  removed: "danger",
};

type ModerateCitizenProps = {
  citizenId: string;
  citizenName: string;
  reportId?: string;
  /** When moderating from a ticket, reject that report as fake. */
  rejectReportDefault?: boolean;
  accountStatus?: AccountStatus;
  flagCount?: number;
  moderationNote?: string;
  onModerated?: (user: UserProfile) => void;
  compact?: boolean;
};

export function ModerateCitizen({
  citizenId,
  citizenName,
  reportId,
  rejectReportDefault = Boolean(reportId),
  accountStatus = "active",
  flagCount = 0,
  moderationNote,
  onModerated,
  compact = false,
}: ModerateCitizenProps) {
  const [reason, setReason] = useState("");
  const [rejectReport, setRejectReport] = useState(rejectReportDefault);
  const [busy, setBusy] = useState<ModerationAction | null>(null);
  const [status, setStatus] = useState<AccountStatus>(accountStatus);
  const [flags, setFlags] = useState(flagCount);
  const [note, setNote] = useState(moderationNote);

  async function run(action: ModerationAction) {
    const trimmed = reason.trim();
    if (trimmed.length < 4) {
      toast.error("Add a short reason (at least 4 characters)");
      return;
    }

    const confirmMsg =
      action === "remove"
        ? `Permanently remove ${citizenName}? They will not be able to sign in or file reports.`
        : action === "suspend"
          ? `Suspend ${citizenName}? They cannot sign in until reinstated.`
          : action === "flag"
            ? `Flag ${citizenName} for fake / spam reports?`
            : `Reinstate ${citizenName}?`;

    if (!window.confirm(confirmMsg)) return;

    setBusy(action);
    try {
      const res = await fetch(`/api/users/${citizenId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: trimmed,
          reportId,
          rejectReport: Boolean(reportId) && rejectReport && action !== "reinstate",
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
        data?: { user: UserProfile };
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || "Moderation failed");
      }
      const user = json.data.user;
      setStatus(user.accountStatus ?? "active");
      setFlags(user.flagCount ?? 0);
      setNote(user.moderationNote);
      setReason("");
      onModerated?.(user);
      toast.success(
        action === "reinstate"
          ? "Citizen reinstated"
          : action === "flag"
            ? "Citizen flagged for fake reports"
            : action === "suspend"
              ? "Citizen suspended"
              : "Citizen account removed"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Moderation failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONE[status]}>{status}</Badge>
        {flags > 0 ? (
          <Badge tone="warning">{flags} fake-report flag{flags === 1 ? "" : "s"}</Badge>
        ) : null}
        <span className="text-sm text-[var(--muted)]">{citizenName}</span>
      </div>

      {note ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Last note: {note}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`mod-reason-${citizenId}`}>Reason</Label>
        <Textarea
          id={`mod-reason-${citizenId}`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Repeated staged photos / GPS mismatch / AI flagged as possibly fake…"
          rows={compact ? 2 : 3}
        />
      </div>

      {reportId ? (
        <label className="flex items-start gap-2 text-sm text-[var(--muted)]">
          <input
            type="checkbox"
            className="mt-1"
            checked={rejectReport}
            onChange={(e) => setRejectReport(e.target.checked)}
          />
          <span>Also reject this report as fake when flagging / suspending / removing</span>
        </label>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={Boolean(busy)}
          onClick={() => void run("flag")}
        >
          {busy === "flag" ? "Flagging…" : "Flag fake reports"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={Boolean(busy) || status === "suspended"}
          onClick={() => void run("suspend")}
        >
          {busy === "suspend" ? "Suspending…" : "Suspend user"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-rose-300 text-rose-800 hover:bg-rose-50"
          disabled={Boolean(busy) || status === "removed"}
          onClick={() => void run("remove")}
        >
          {busy === "remove" ? "Removing…" : "Remove user"}
        </Button>
        {(status === "flagged" ||
          status === "suspended" ||
          status === "removed") && (
          <Button
            type="button"
            size="sm"
            variant="default"
            disabled={Boolean(busy)}
            onClick={() => void run("reinstate")}
          >
            {busy === "reinstate" ? "Reinstating…" : "Reinstate"}
          </Button>
        )}
      </div>
    </div>
  );
}
