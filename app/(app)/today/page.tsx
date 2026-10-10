"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { API, type Customer } from "@/lib/contract";
import type { ActiveDasha, DashaPeriod, NatalChart, TransitInfo } from "@/lib/astro/types";
import { SLOW_MOVERS } from "@/lib/astro/constants";
import { dayNumber, todayIso } from "@/lib/astro/time";
import { fetchJson, RequestError } from "@/lib/client/api";
import { useCustomers } from "@/components/customer-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

interface DashaPayload {
  customer: Customer;
  dasha: ActiveDasha & { detailed: DashaPeriod[] };
}

interface ChartPayload {
  customer: Customer;
  natal: NatalChart;
}

interface TransitPayload {
  transits: TransitInfo[];
}

/** Transit positions are exposed through a read-only snapshot endpoint. */
function transitsUrl(customerId: string, asOf: string): string {
  return `/api/transits/${customerId}?asOf=${asOf}`;
}

function errorMessage(err: unknown): string {
  if (err instanceof RequestError) return err.message;
  return err instanceof Error ? err.message : "Something went wrong.";
}

/** Today's civil date in the profile's own timezone. */
function isoInZone(timezone: string | undefined): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone ?? "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return todayIso();
  }
}

function formatIsoDate(iso: string, timezone: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

function formatLongDate(iso: string, timezone: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

export default function TodayPage() {
  const { selected, loading: customersLoading, error: customersError, refresh } = useCustomers();
  const [asOf, setAsOf] = useState<string | null>(null);
  const [dasha, setDasha] = useState<DashaPayload["dasha"] | null>(null);
  const [natal, setNatal] = useState<NatalChart | null>(null);
  const [transits, setTransits] = useState<TransitInfo[]>([]);
  const [transitsMissing, setTransitsMissing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState<{ customerId: string; message: string } | null>(null);

  const load = useCallback(async (customer: Customer) => {
    setLoading(true);
    setError(null);
    setTransitsMissing(false);
    const today = isoInZone(customer.timezone);
    setAsOf(today);
    try {
      const [dashaPayload, chartPayload] = await Promise.all([
        fetchJson<DashaPayload>(`${API.dasha(customer.id)}?asOf=${today}`),
        fetchJson<ChartPayload>(API.chart(customer.id)),
      ]);
      setDasha(dashaPayload.dasha);
      setNatal(chartPayload.natal);
      setLoadedFor(customer.id);
    } catch (err) {
      setDasha(null);
      setNatal(null);
      setError({ customerId: customer.id, message: errorMessage(err) });
    } finally {
      setLoading(false);
    }

    // The snapshot is supplementary: a missing endpoint must not break the page.
    try {
      const payload = await fetchJson<TransitPayload>(transitsUrl(customer.id, today));
      setTransits(payload.transits ?? []);
    } catch {
      setTransits([]);
      setTransitsMissing(true);
    }
  }, []);

  useEffect(() => {
    if (!selected) return;
    void load(selected);
  }, [selected, load]);

  let body: ReactNode;
  if (customersLoading) {
    body = <TodaySkeleton />;
  } else if (customersError) {
    body = <ErrorState message={customersError} onRetry={() => void refresh()} retryLabel="Reload profiles" />;
  } else if (!selected) {
    body = <NoProfileState />;
  } else if (error && error.customerId === selected.id) {
    body = <ErrorState message={error.message} onRetry={() => void load(selected)} retryLabel="Retry" />;
  } else if (loading || loadedFor !== selected.id || !dasha || !natal || !asOf) {
    body = <TodaySkeleton />;
  } else {
    body = <TodayBody dasha={dasha} natal={natal} transits={transits} transitsMissing={transitsMissing} asOf={asOf} timezone={selected.timezone} />;
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-surface px-4 py-4 sm:px-6">
        <h1 className="font-heading text-xl font-semibold">Today</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {asOf && selected
            ? `${formatLongDate(asOf, selected.timezone)} · ${selected.name}`
            : "The periods and transits running right now."}
        </p>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4">{body}</div>
      </div>
    </div>
  );
}

function TodayBody({
  dasha,
  natal,
  transits,
  transitsMissing,
  asOf,
  timezone,
}: {
  dasha: DashaPayload["dasha"];
  natal: NatalChart;
  transits: TransitInfo[];
  transitsMissing: boolean;
  asOf: string;
  timezone: string;
}) {
  const periods = [
    { level: "Mahadasha", lord: dasha.md, window: dasha.mdWindow },
    { level: "Antardasha", lord: dasha.ad, window: dasha.adWindow },
    { level: "Pratyantardasha", lord: dasha.pd, window: dasha.pdWindow },
  ].filter((period) => period.lord && period.window);

  const slow = SLOW_MOVERS.flatMap((body) => transits.filter((transit) => transit.body === body));

  return (
    <>
      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Active period</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3">
            {periods.map((period) => {
              const [start, end] = period.window as [string, string];
              return (
                <li
                  key={period.level}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-3 last:border-b-0 last:pb-0"
                >
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{period.level}</p>
                    <p className="text-base font-medium text-accent">{period.lord}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatIsoDate(start, timezone)} → {formatIsoDate(end, timezone)}
                  </p>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Next transitions</CardTitle>
        </CardHeader>
        <CardContent>
          {dasha.nextTransitions.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {dasha.nextTransitions.map((transition) => {
                const days = dayNumber(transition.date) - dayNumber(asOf);
                return (
                  <li
                    key={`${transition.level}-${transition.lord}-${transition.date}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm"
                  >
                    <span>
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {transition.level}
                      </span>{" "}
                      <span className="font-medium text-foreground">{transition.lord}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatIsoDate(transition.date, timezone)}
                      {days >= 0 ? ` · in ${days} day${days === 1 ? "" : "s"}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No further transitions were computed.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Slow transits</CardTitle>
        </CardHeader>
        <CardContent>
          {slow.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {slow.map((transit) => (
                <li
                  key={transit.body}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm"
                >
                  <span className="font-medium text-foreground">{transit.body}</span>
                  <span className="text-xs text-muted-foreground">
                    {transit.sign} · house {transit.houseFromMoon} from Moon · house {transit.houseFromLagna} from Lagna
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {transitsMissing
                ? "The transit snapshot is not available yet."
                : "No slow-planet transits were returned for today."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Natal Moon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">
            {natal.moonSign} · {natal.moonNakshatra} pada {natal.moonNakshatraPada}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            The Moon is the reference point for the dasha sequence and for counting transits.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button asChild size="lg">
          <Link href="/chat">
            Ask about today
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </>
  );
}

function NoProfileState() {
  return (
    <Empty className="border border-dashed border-border bg-surface/60">
      <EmptyHeader>
        <EmptyTitle>No birth profile yet</EmptyTitle>
        <EmptyDescription>
          Add your birth date, time and place so the active periods and transits can be computed.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild size="lg">
          <Link href="/onboarding">Add a profile</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function ErrorState({
  message,
  onRetry,
  retryLabel,
}: {
  message: string;
  onRetry: () => void;
  retryLabel: string;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-2xl border border-verdict-opposes/40 bg-verdict-opposes/10 p-4 text-sm text-verdict-opposes"
    >
      <p>{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        {retryLabel}
      </Button>
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading today">
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}
