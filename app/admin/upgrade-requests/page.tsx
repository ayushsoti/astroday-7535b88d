"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, RefreshCw, Sparkles, X } from "lucide-react";
import { API, type UpgradeRequest, type UpgradeStatus } from "@/lib/contract";
import { fetchJson, RequestError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function describeError(error: unknown): string {
  if (error instanceof RequestError) return error.message;
  return "Something went wrong. Please try again.";
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_STYLES: Record<UpgradeStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "border-verdict-conflicted/40 text-verdict-conflicted" },
  approved: { label: "Approved", className: "border-verdict-support/40 text-verdict-support" },
  declined: { label: "Declined", className: "border-verdict-opposes/40 text-verdict-opposes" },
};

export default function AdminUpgradeRequestsPage() {
  const [requests, setRequests] = useState<UpgradeRequest[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<{ requests: UpgradeRequest[] }>(API.adminUpgradeRequests);
      setRequests(data.requests);
    } catch (err) {
      setRequests(null);
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = useCallback(
    async (id: string, status: UpgradeStatus) => {
      const previous = requests;
      setActionError(null);
      setSavingId(id);
      setRequests((current) =>
        current ? current.map((row) => (row.id === id ? { ...row, status } : row)) : current,
      );
      try {
        const data = await fetchJson<{ request: UpgradeRequest }>(API.adminUpgradeRequest(id), {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        setRequests((current) =>
          current ? current.map((row) => (row.id === id ? data.request : row)) : current,
        );
      } catch (err) {
        setRequests(previous);
        setActionError(describeError(err));
      } finally {
        setSavingId(null);
      }
    },
    [requests],
  );

  const pendingCount = useMemo(
    () => (requests ?? []).filter((request) => request.status === "pending").length,
    [requests],
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Upgrade requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Approving a request also switches that account to the Pro plan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {requests ? (
            <span
              className="rounded-full border border-verdict-conflicted/40 px-3 py-1 text-xs font-medium text-verdict-conflicted"
              aria-live="polite"
            >
              {pendingCount} pending
            </span>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : undefined} aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-xl border border-verdict-opposes/40 bg-elevated px-4 py-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 text-verdict-opposes" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-medium text-verdict-opposes">Could not load upgrade requests</p>
            <p className="mt-0.5 text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      {actionError ? (
        <div
          role="alert"
          className="mt-6 flex items-center gap-2 rounded-xl border border-verdict-opposes/40 bg-elevated px-4 py-3 text-sm text-verdict-opposes"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          Update failed and was rolled back: {actionError}
        </div>
      ) : null}

      {loading && !requests ? (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-border bg-surface p-5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : null}

      {requests && requests.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <Sparkles className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium">No upgrade requests yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Requests from free accounts appear here for review.
          </p>
        </div>
      ) : null}

      {requests && requests.length > 0 ? (
        <ul className="mt-6 space-y-4">
          {requests.map((request) => {
            const status = STATUS_STYLES[request.status];
            const busy = savingId === request.id;
            return (
              <li key={request.id} className="rounded-2xl border border-border bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{request.userName}</p>
                    <p className="truncate text-xs text-muted-foreground">{request.userEmail}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                    >
                      {status.label}
                    </span>
                    <time className="text-xs text-muted-foreground" dateTime={request.createdAt}>
                      {formatDateTime(request.createdAt)}
                    </time>
                  </div>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
                  {request.message}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busy || request.status === "approved"}
                    onClick={() => void decide(request.id, "approved")}
                    aria-label={`Approve upgrade request from ${request.userName}`}
                  >
                    <Check aria-hidden="true" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || request.status === "declined"}
                    onClick={() => void decide(request.id, "declined")}
                    aria-label={`Decline upgrade request from ${request.userName}`}
                  >
                    <X aria-hidden="true" />
                    Decline
                  </Button>
                  {busy ? <span className="self-center text-xs text-muted-foreground">Saving…</span> : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
