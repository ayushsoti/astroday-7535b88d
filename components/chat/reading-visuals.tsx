"use client";

import { useMemo, useState } from "react";
import type { AnalyzeResponse } from "@/lib/astro/types";
import { ConvergenceBadge, VerdictChip } from "@/components/verdict";

/**
 * A compact visual summary of the engine's reading. Every value here is taken
 * from the deterministic analysis payload — nothing is inferred for display.
 * The charts are plain SVG so they render identically on the server and client.
 */

type View = "reads" | "strength" | "timing";

const VIEWS: { id: View; label: string }[] = [
  { id: "reads", label: "Reads" },
  { id: "strength", label: "Strength" },
  { id: "timing", label: "Timing" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function ratio(now: number, start: number, end: number): number {
  if (end <= start) return 0;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

export function ReadingVisuals({
  analysis,
  initialView = "reads",
}: {
  analysis: AnalyzeResponse;
  /** Which tab to open first. Useful for tests and deep links. */
  initialView?: View;
}) {
  const [view, setView] = useState<View>(initialView);

  return (
    <section
      aria-label="Reading at a glance"
      className="mt-4 rounded-xl border border-border bg-elevated/50 p-3.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-[11px] font-semibold tracking-wide text-foreground/80 uppercase">
          Reading at a glance
        </h3>
        <ConvergenceBadge label={analysis.convergenceLabel} />
      </div>

      <div
        role="tablist"
        aria-label="Visual summary views"
        className="mt-3 inline-flex rounded-lg border border-border bg-surface p-0.5"
      >
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            onClick={() => setView(v.id)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
              view === v.id
                ? "bg-accent text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {view === "reads" && <ReadsView analysis={analysis} />}
        {view === "strength" && <StrengthView analysis={analysis} />}
        {view === "timing" && <TimingView analysis={analysis} />}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/80">
        Drawn from the computed chart and the evidence groups for this question — not a
        forecast of its own.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ Reads */

function ReadsView({ analysis }: { analysis: AnalyzeResponse }) {
  const reports = analysis.conflictReports;
  if (reports.length === 0) {
    return <p className="text-xs text-muted-foreground">No domain reads were produced.</p>;
  }
  return (
    <ul className="space-y-2.5">
      {reports.map((r) => {
        const support = r.independentSupportGroupCount;
        const oppose = r.independentOpposeGroupCount;
        const correlated = r.correlatedGroupCount;
        const total = support + oppose + correlated;
        return (
          <li
            key={`${r.domain}-${r.eventKey ?? ""}`}
            className="grid grid-cols-[minmax(0,1fr)] gap-1.5 sm:grid-cols-[7rem_1fr_auto] sm:items-center sm:gap-3"
          >
            <span className="text-xs font-medium capitalize text-foreground/80">{r.domain}</span>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-border/60">
              {total === 0 ? (
                <span className="h-full w-full bg-muted-foreground/30" />
              ) : (
                <>
                  {support > 0 && (
                    <span
                      className="h-full bg-verdict-support"
                      style={{ width: `${(support / total) * 100}%` }}
                      title={`${support} independent group(s) support`}
                    />
                  )}
                  {oppose > 0 && (
                    <span
                      className="h-full bg-verdict-opposes"
                      style={{ width: `${(oppose / total) * 100}%` }}
                      title={`${oppose} independent group(s) oppose`}
                    />
                  )}
                  {correlated > 0 && (
                    <span
                      className="h-full bg-verdict-correlated"
                      style={{ width: `${(correlated / total) * 100}%` }}
                      title={`${correlated} correlated group(s)`}
                    />
                  )}
                </>
              )}
            </div>
            <VerdictChip label={r.netRead} />
          </li>
        );
      })}
    </ul>
  );
}

/* --------------------------------------------------------------- Strength */

const CHART_W = 560;
const CHART_H = 190;
const PAD_L = 26;
const PAD_R = 8;
const PAD_T = 12;
const PAD_B = 22;
const PLOT_W = CHART_W - PAD_L - PAD_R;
const PLOT_H = CHART_H - PAD_T - PAD_B;

function StrengthView({ analysis }: { analysis: AnalyzeResponse }) {
  const { sarva, grandTotal } = analysis.natal.ashtakavarga;
  const relevantHouses = useMemo(
    () => new Set(analysis.guidance.domainActions.map((d) => d.house)),
    [analysis.guidance.domainActions],
  );

  const average = sarva.length ? grandTotal / sarva.length : 0;
  const maxPoints = Math.max(...sarva, 1);
  const step = PLOT_W / Math.max(sarva.length, 1);
  const barW = step * 0.56;
  const baseline = PAD_T + PLOT_H;
  const yOf = (value: number) => PAD_T + PLOT_H - (value / maxPoints) * PLOT_H;

  const ticks = [0, Math.round(maxPoints / 2), maxPoints];

  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">
        Ashtakavarga strength per house (Sarva points). Highlighted houses carry this
        question&apos;s topics. Total {grandTotal}.
      </p>

      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="h-48 w-full"
        role="img"
        aria-label={`Ashtakavarga strength by house, average ${average.toFixed(1)} points`}
      >
        {ticks.map((t) => (
          <g key={`tick-${t}`}>
            <line
              x1={PAD_L}
              x2={CHART_W - PAD_R}
              y1={yOf(t)}
              y2={yOf(t)}
              className="stroke-border/60"
              strokeWidth={1}
            />
            <text
              x={PAD_L - 5}
              y={yOf(t) + 3}
              textAnchor="end"
              className="fill-muted-foreground text-[9px]"
            >
              {t}
            </text>
          </g>
        ))}

        {sarva.map((points, i) => {
          const highlight = relevantHouses.has(i + 1);
          const x = PAD_L + i * step + (step - barW) / 2;
          const y = yOf(points);
          const height = Math.max(1, baseline - y);
          return (
            <g key={`bar-${i}`}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={height}
                rx={2}
                className={highlight ? "fill-chart-1" : "fill-chart-5/60"}
              >
                <title>
                  {`House ${i + 1} · ${analysis.natal.houseSigns[i] ?? "—"} · Lord ${
                    analysis.natal.houseLords[i] ?? "—"
                  } · ${points} points`}
                </title>
              </rect>
              <text
                x={x + barW / 2}
                y={CHART_H - 7}
                textAnchor="middle"
                className="fill-muted-foreground text-[9px]"
              >
                {i + 1}
              </text>
            </g>
          );
        })}

        <line
          x1={PAD_L}
          x2={CHART_W - PAD_R}
          y1={yOf(average)}
          y2={yOf(average)}
          className="stroke-accent"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      </svg>

      <p className="mt-1 text-[11px] text-muted-foreground/80">
        Dashed line marks the average of {average.toFixed(1)} points per house.
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------- Timing */

function TimingView({ analysis }: { analysis: AnalyzeResponse }) {
  const { md, ad, pd, adWindow, pdWindow, nextTransitions } = analysis.activeDasha;
  const now = Date.now();
  const adStart = new Date(adWindow[0]).getTime();
  const adEnd = new Date(adWindow[1]).getTime();
  const todayRatio = ratio(now, adStart, adEnd);

  let pdLeft = 0;
  let pdWidth = 0;
  if (pdWindow && adEnd > adStart) {
    const pStart = new Date(pdWindow[0]).getTime();
    const pEnd = new Date(pdWindow[1]).getTime();
    pdLeft = ratio(pStart, adStart, adEnd);
    pdWidth = Math.max(0.02, ratio(pEnd, adStart, adEnd) - pdLeft);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Active period{" "}
        <span className="font-medium text-foreground">
          {md} / {ad}
          {pd ? ` / ${pd}` : ""}
        </span>
      </p>

      <div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{formatDay(adWindow[0])}</span>
          <span className="font-medium text-foreground/80">{ad} period</span>
          <span>{formatDay(adWindow[1])}</span>
        </div>
        <div className="relative mt-1.5 h-6 w-full rounded-md bg-border/50">
          {pdWindow && (
            <span
              className="absolute inset-y-1 rounded bg-accent/35"
              style={{ left: `${pdLeft * 100}%`, width: `${pdWidth * 100}%` }}
              title={`${pd} sub-period ${formatDay(pdWindow[0])} – ${formatDay(pdWindow[1])}`}
            />
          )}
          <span
            className="absolute -top-0.5 -bottom-0.5 w-px bg-foreground"
            style={{ left: `${todayRatio * 100}%` }}
            aria-hidden
          />
          <span
            className="absolute -bottom-1.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-foreground"
            style={{ left: `${todayRatio * 100}%` }}
            aria-hidden
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground/80">
          Marker shows today within the {ad} sub-period
          {pdWindow ? `, with the ${pd} sub-period shaded` : ""}.
        </p>
      </div>

      {nextTransitions.length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold tracking-wide text-foreground/80 uppercase">
            Next shifts
          </h4>
          <ul className="mt-1.5 space-y-1">
            {nextTransitions.slice(0, 4).map((t) => (
              <li
                key={`${t.level}-${t.lord}-${t.date}`}
                className="flex items-center justify-between text-xs text-muted-foreground"
              >
                <span>
                  <span className="font-medium text-foreground/80">{t.lord}</span> {t.level}
                </span>
                <span className="tabular-nums">{formatDay(t.date)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
