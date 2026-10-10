"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Orbit,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { API } from "@/lib/contract";
import { fetchJson, RequestError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminStats {
  totalUsers: number;
  paidUsers: number;
  freeUsers: number;
  totalCustomers: number;
  pendingUpgrades: number;
  predictionsPending: number;
}

function describeError(error: unknown): string {
  if (error instanceof RequestError) return error.message;
  return "Could not load admin stats. Please try again.";
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchJson<{ stats: AdminStats }>(API.adminStats);
      setStats(data.stats);
      setError(null);
    } catch (err) {
      setStats(null);
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await load();
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  const paidShare = stats && stats.totalUsers > 0 ? Math.round((stats.paidUsers / stats.totalUsers) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Accounts, plans and review queues across Astroday.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : undefined} aria-hidden="true" />
          Refresh
        </Button>
      </header>

      {error ? (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-xl border border-verdict-opposes/40 bg-elevated px-4 py-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 text-verdict-opposes" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-medium text-verdict-opposes">Stats unavailable</p>
            <p className="mt-0.5 text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      ) : null}

      {loading && !stats ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-border bg-surface p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-4 h-8 w-16" />
              <Skeleton className="mt-3 h-3 w-32" />
            </div>
          ))}
        </div>
      ) : null}

      {stats ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile
            icon={Users}
            label="Total users"
            value={stats.totalUsers}
            hint="Registered accounts"
          />
          <StatTile
            icon={CreditCard}
            label="Paid vs free"
            value={`${stats.paidUsers} / ${stats.freeUsers}`}
            hint={`${paidShare}% on the Pro plan`}
          >
            <div
              className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-elevated"
              role="img"
              aria-label={`${stats.paidUsers} paid accounts, ${stats.freeUsers} free accounts`}
            >
              <div className="h-full rounded-full bg-accent" style={{ width: `${paidShare}%` }} />
            </div>
          </StatTile>
          <StatTile
            icon={Orbit}
            label="Total profiles"
            value={stats.totalCustomers}
            hint="Charts computed for users"
          />
          <StatTile
            icon={Sparkles}
            label="Pending upgrades"
            value={stats.pendingUpgrades}
            hint={stats.pendingUpgrades > 0 ? "Awaiting your review" : "Nothing waiting"}
            tone={stats.pendingUpgrades > 0 ? "attention" : "calm"}
          />
          <StatTile
            icon={Activity}
            label="Pending predictions"
            value={stats.predictionsPending}
            hint="Outcome not yet resolved"
          />
        </div>
      ) : null}

      {stats && stats.pendingUpgrades > 0 ? (
        <section className="mt-8 rounded-2xl border border-accent/40 bg-elevated p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">
                {stats.pendingUpgrades} upgrade {stats.pendingUpgrades === 1 ? "request" : "requests"} need a decision
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Approving a request switches that account to the Pro plan automatically.
              </p>
            </div>
            <Button asChild>
              <Link href="/admin/upgrade-requests">
                Review requests
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

      {stats ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/users">Manage users</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/upgrade-requests">Upgrade requests</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "calm",
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  hint: string;
  tone?: "calm" | "attention";
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <Icon
          className={tone === "attention" ? "h-4 w-4 text-verdict-conflicted" : "h-4 w-4 text-accent"}
        />
      </div>
      <p
        className={`mt-3 font-heading text-3xl font-semibold tabular-nums ${
          tone === "attention" ? "text-verdict-conflicted" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      {children}
    </div>
  );
}
