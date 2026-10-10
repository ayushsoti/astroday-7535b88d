"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { API, type Customer } from "@/lib/contract";
import type { ActiveDasha, DashaPeriod } from "@/lib/astro/types";
import { fetchJson } from "@/lib/client/api";
import { useCustomers } from "@/components/customer-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DashaPayload {
  customer: Customer;
  dasha: ActiveDasha & { detailed: DashaPeriod[] };
}

export default function TimelinePage() {
  const { selected, loading: customersLoading, error: customersError } = useCustomers();
  const [payload, setPayload] = useState<DashaPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const today = useMemo(() => localIsoToday(), []);

  const load = useCallback(
    async (customerId: string) => {
      setLoading(true);
      setError(null);
      try {
        setPayload(await fetchJson<DashaPayload>(`${API.dasha(customerId)}?asOf=${today}`));
      } catch (err) {
        setPayload(null);
        setError(err instanceof Error ? err.message : "Could not load the dasha timeline.");
      } finally {
        setLoading(false);
      }
    },
    [today],
  );

  useEffect(() => {
    setExpanded(false);
    if (!selected) {
      setPayload(null);
      return;
    }
    void load(selected.id);
  }, [selected, load]);

  const busy = customersLoading || loading;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <p className="text-xs font-medium tracking-widest text-accent uppercase">Timeline</p>
        <h1 className="mt-1 font-heading text-2xl font-semibold md:text-3xl">Vimshottari dasha</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Mahadasha bars for the full life span with the running period highlighted. Period boundaries carry a
          ±2–3 day uncertainty from the Moon longitude.
        </p>
      </header>

      {customersError ? (
        <ErrorBlock message={customersError} />
      ) : !customersLoading && !selected ? (
        <EmptyBlock message="No profile selected yet. Add a birth profile to build a timeline." />
      ) : busy ? (
        <TimelineSkeleton />
      ) : error ? (
        <div>
          <ErrorBlock message={error} />
          {selected ? (
            <Button className="mt-3" variant="outline" onClick={() => void load(selected.id)}>
              Try again
            </Button>
          ) : null}
        </div>
      ) : payload ? (
        <TimelineBody
          payload={payload}
          today={today}
          expanded={expanded}
          onToggleExpanded={() => setExpanded((v) => !v)}
        />
      ) : null}
    </div>
  );
}

function TimelineBody({
  payload,
  today,
  expanded,
  onToggleExpanded,
}: {
  payload: DashaPayload;
  today: string;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const { customer, dasha } = payload;
  const periods = dasha.detailed;
  const currentIndex = periods.findIndex((p) => contains(p, today));
  const current = currentIndex >= 0 ? periods[currentIndex] : periods[0];
  const ads = current?.children ?? [];

  if (periods.length === 0) {
    return <EmptyBlock message="No dasha periods are stored for this profile." />;
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="font-heading">{customer.name}</CardTitle>
          <CardDescription>
            As of {today} · MD {dasha.md} · AD {dasha.ad} · PD {dasha.pd ?? "—"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Fact label="Mahadasha" value={`${dasha.md} · ${range(dasha.mdWindow)}`} />
          <Fact label="Antardasha" value={`${dasha.ad} · ${range(dasha.adWindow)}`} />
          <Fact label="Pratyantardasha" value={dasha.pd ? `${dasha.pd} · ${range(dasha.pdWindow)}` : "Not available"} />
        </CardContent>
      </Card>

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="font-heading text-base">Mahadasha bars</CardTitle>
          <CardDescription>Bar width is proportional to period length. The marker shows today.</CardDescription>
        </CardHeader>
        <CardContent>
          <DashaBars periods={periods} today={today} />
          <ul className="mt-4 space-y-2">
            {periods.map((p, i) => {
              const isCurrent = i === currentIndex;
              return (
                <li
                  key={`${p.lord}-${p.start}`}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-sm ${
                    isCurrent ? "border-accent/50 bg-elevated" : "border-border bg-elevated/40"
                  }`}
                >
                  <span className={isCurrent ? "font-semibold text-accent" : "font-medium text-foreground"}>{p.lord}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {p.start} → {p.end}
                  </span>
                  {p.isPartial ? <Badge variant="outline">Partial</Badge> : null}
                  {isCurrent ? <Badge>Current</Badge> : null}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {current ? (
        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="font-heading text-base">Antardashas of {current.lord}</CardTitle>
            <CardDescription>
              {current.start} → {current.end} · {ads.length} sub-periods
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" aria-expanded={expanded} onClick={onToggleExpanded}>
              {expanded ? "Hide antardashas" : "Show antardashas"}
            </Button>
            {expanded ? (
              ads.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No antardasha children are stored for this period.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {ads.map((ad) => {
                    const isCurrentAd = contains(ad, today);
                    return (
                      <li
                        key={`${ad.lord}-${ad.start}`}
                        className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-sm ${
                          isCurrentAd ? "border-accent/50 bg-elevated" : "border-border bg-elevated/40"
                        }`}
                      >
                        <span className={isCurrentAd ? "font-semibold text-accent" : "font-medium text-foreground"}>
                          {ad.lord}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {ad.start} → {ad.end}
                        </span>
                        {ad.isPartial ? <Badge variant="outline">Partial</Badge> : null}
                        {isCurrentAd ? <Badge>Current</Badge> : null}
                      </li>
                    );
                  })}
                </ul>
              )
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="font-heading text-base">Next transitions</CardTitle>
          <CardDescription>Upcoming MD, AD and PD boundaries from today.</CardDescription>
        </CardHeader>
        <CardContent>
          {dasha.nextTransitions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No further transitions fall inside the stored timeline.</p>
          ) : (
            <ul className="divide-y divide-border">
              {dasha.nextTransitions.map((t) => (
                <li key={`${t.level}-${t.lord}-${t.date}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary">{t.level}</Badge>
                    <span className="font-medium text-foreground">{t.lord}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">{t.date}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashaBars({ periods, today }: { periods: DashaPeriod[]; today: string }) {
  const spans = periods.map((p) => Math.max(dayValue(p.end) - dayValue(p.start), 1));
  const total = spans.reduce((sum, s) => sum + s, 0);
  const spanStart = dayValue(periods[0].start);
  const spanEnd = dayValue(periods[periods.length - 1].end);
  const markerPct =
    spanEnd > spanStart ? Math.min(100, Math.max(0, ((dayValue(today) - spanStart) / (spanEnd - spanStart)) * 100)) : 0;

  return (
    <div className="pt-6">
      <div className="relative">
        <div
          className="absolute -top-6 z-10 -translate-x-1/2 text-[10px] font-medium tracking-wide text-accent uppercase"
          style={{ left: `${markerPct}%` }}
          aria-hidden="true"
        >
          today
        </div>
        <div
          className="absolute -top-2 bottom-0 z-10 w-px bg-accent"
          style={{ left: `${markerPct}%` }}
          aria-hidden="true"
        />
        <div className="flex h-8 overflow-hidden rounded-lg border border-border">
          {periods.map((p, i) => {
            const isCurrent = contains(p, today);
            return (
              <div
                key={`${p.lord}-${p.start}-bar`}
                className={`flex items-center justify-center overflow-hidden border-r border-border text-[10px] font-medium last:border-r-0 ${
                  isCurrent ? "bg-accent text-primary-foreground" : "bg-elevated text-muted-foreground"
                }`}
                style={{ flexGrow: spans[i], flexBasis: 0, minWidth: "0.5rem" }}
                title={`${p.lord} ${p.start} → ${p.end}${isCurrent ? " (current)" : ""}`}
                aria-label={`${p.lord} mahadasha ${p.start} to ${p.end}${isCurrent ? ", current" : ""}`}
              >
                {spans[i] / total > 0.04 ? p.lord : null}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground">
        <span>{periods[0].start}</span>
        <span>{periods[periods.length - 1].end}</span>
      </div>
      <p className="sr-only">
        Today is {today}, at {Math.round(markerPct)}% of the displayed timeline.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ atoms */

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-elevated/50 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  );
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-6 text-sm text-muted-foreground">{message}</div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <span className="sr-only">Loading dasha timeline…</span>
    </div>
  );
}

function contains(period: DashaPeriod, dateIso: string): boolean {
  return period.start <= dateIso && dateIso < period.end;
}

function range(window: [string, string] | null): string {
  return window ? `${window[0]} → ${window[1]}` : "—";
}

function dayValue(iso: string): number {
  const ms = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(ms) ? 0 : ms;
}

function localIsoToday(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
