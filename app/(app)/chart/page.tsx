"use client";

import { useCallback, useEffect, useState } from "react";
import { API, type Customer } from "@/lib/contract";
import type { NatalChart, PlanetCondition } from "@/lib/astro/types";
import type { Sign } from "@/lib/astro/constants";
import { fetchJson } from "@/lib/client/api";
import { useCustomers } from "@/components/customer-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartPayload {
  customer: Customer;
  natal: NatalChart;
}

export default function ChartPage() {
  const { selected, loading: customersLoading, error: customersError } = useCustomers();
  const [payload, setPayload] = useState<ChartPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (customerId: string) => {
    setLoading(true);
    setError(null);
    try {
      setPayload(await fetchJson<ChartPayload>(API.chart(customerId)));
    } catch (err) {
      setPayload(null);
      setError(err instanceof Error ? err.message : "Could not load the chart.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selected) {
      setPayload(null);
      return;
    }
    void load(selected.id);
  }, [selected, load]);

  const busy = customersLoading || loading;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <p className="text-xs font-medium tracking-widest text-accent uppercase">Chart</p>
        <h1 className="mt-1 font-heading text-2xl font-semibold md:text-3xl">Natal chart (D1) &amp; vargas</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Sidereal, Lahiri ayanamsha, whole-sign houses. Computed positions are shown as data — not as advice.
        </p>
      </header>

      {customersError ? (
        <ErrorBlock message={customersError} />
      ) : !customersLoading && !selected ? (
        <EmptyBlock message="No profile selected yet. Add a birth profile to compute a chart." />
      ) : busy ? (
        <ChartSkeleton />
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
        <ChartBody payload={payload} />
      ) : null}
    </div>
  );
}

function ChartBody({ payload }: { payload: ChartPayload }) {
  const { customer, natal } = payload;
  return (
    <div className="space-y-6">
      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="font-heading">{customer.name}</CardTitle>
          <CardDescription>
            {customer.birthDate} · {customer.birthTime} · {customer.birthPlace} ({customer.timezone})
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Fact label="Ascendant" value={`${natal.ascendant.sign} ${natal.ascendant.degreeText}`} />
          <Fact label="Moon sign" value={natal.moonSign} />
          <Fact
            label="Moon nakshatra"
            value={`${natal.moonNakshatra} (pada ${natal.moonNakshatraPada})`}
          />
          <Fact label="Ayanamsha" value={`${natal.ayanamsha.toFixed(5)}° (Lahiri)`} />
        </CardContent>
      </Card>

      <Section
        title="D1 positions"
        description={`Ascendant: ${natal.ascendant.sign} ${natal.ascendant.degreeText} · ${natal.ascendant.nakshatra} pada ${natal.ascendant.pada}`}
      >
        <TableWrap caption="D1 planetary positions">
          <thead>
            <tr>
              {["Body", "Sign", "Degree", "Nakshatra", "Pada", "Nak. lord", "House", "Motion"].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {natal.positions.map((p) => (
              <tr key={p.body} className="border-t border-border/60">
                <Td className="font-medium text-foreground">
                  {p.body}
                  {p.displayOnly ? <span className="ml-1 text-xs text-muted-foreground">(display)</span> : null}
                </Td>
                <Td>{p.sign}</Td>
                <Td className="tabular-nums">{p.degreeText}</Td>
                <Td>{p.nakshatra}</Td>
                <Td className="tabular-nums">{p.pada}</Td>
                <Td>{p.nakshatraLord}</Td>
                <Td className="tabular-nums">{p.house}</Td>
                <Td>
                  {p.retrograde ? <Badge variant="outline">R</Badge> : <span className="text-muted-foreground">—</span>}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Section>

      <Section title="House signs &amp; lords" description="Whole-sign houses: house 1 begins at the ascendant's sign.">
        <TableWrap caption="House signs and ruling planets">
          <thead>
            <tr>
              <Th>House</Th>
              <Th>Sign</Th>
              <Th>Lord</Th>
            </tr>
          </thead>
          <tbody>
            {natal.houseSigns.map((sign, i) => (
              <tr key={`house-${i + 1}`} className="border-t border-border/60">
                <Td className="tabular-nums">{i + 1}</Td>
                <Td>{sign}</Td>
                <Td className="text-foreground">{natal.houseLords[i] ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Section>

      <Section
        title="Planet conditions"
        description="Dignity, combustion, composite score, direction and strength. Scores describe chart condition, not outcomes."
      >
        <TableWrap caption="Planet conditions">
          <thead>
            <tr>
              {["Body", "Dignity", "Combust", "Score", "Direction", "Strength", "House"].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {natal.conditions.map((c) => (
              <tr key={c.body} className="border-t border-border/60">
                <Td className="font-medium text-foreground">{c.body}</Td>
                <Td>
                  {c.dignity ? (
                    <span title={c.dignityReason}>{c.dignity}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </Td>
                <Td>
                  {c.combust ? (
                    <Badge variant="destructive">Combust</Badge>
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </Td>
                <Td className="tabular-nums">{formatScore(c)}</Td>
                <Td>{directionLabel(c.direction)}</Td>
                <Td>{c.strength}</Td>
                <Td className="tabular-nums">{c.house}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <VargaTable
          title="D9 (navamsha)"
          description="Used for strength confirmation in the reasoning paths."
          signs={natal.varga.D9}
          houses={natal.vargaHouses.D9}
        />
        <VargaTable
          title="D7 (saptamsha)"
          description="Used only where a sourced rule requires it."
          signs={natal.varga.D7}
          houses={natal.vargaHouses.D7}
        />
      </div>

      <AshtakavargaGrid natal={natal} />

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="font-heading text-base">Limitations</CardTitle>
          <CardDescription>
            Known gaps for this profile. Anything listed here is not covered by the calculation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customer.limitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No limitations recorded for this profile.</p>
          ) : (
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              {customer.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function VargaTable({
  title,
  description,
  signs,
  houses,
}: {
  title: string;
  description: string;
  signs: Record<string, Sign>;
  houses: Record<string, number>;
}) {
  const bodies = Object.keys(signs);
  return (
    <Section title={title} description={description}>
      <TableWrap caption={title}>
        <thead>
          <tr>
            <Th>Body</Th>
            <Th>Sign</Th>
            <Th>House</Th>
          </tr>
        </thead>
        <tbody>
          {bodies.length === 0 ? (
            <tr className="border-t border-border/60">
              <Td className="text-muted-foreground">Not computed</Td>
              <Td className="text-muted-foreground">—</Td>
              <Td className="text-muted-foreground">—</Td>
            </tr>
          ) : (
            bodies.map((body) => (
              <tr key={body} className="border-t border-border/60">
                <Td className="font-medium text-foreground">{body}</Td>
                <Td>{signs[body]}</Td>
                <Td className="tabular-nums">{houses[body] ?? "—"}</Td>
              </tr>
            ))
          )}
        </tbody>
      </TableWrap>
    </Section>
  );
}

function AshtakavargaGrid({ natal }: { natal: NatalChart }) {
  const { bhinna, sarva, totals, grandTotal, invariantOk, convention } = natal.ashtakavarga;
  const rows = Object.keys(bhinna);
  const signHeaders = Array.from({ length: 12 }, (_, i) => `H${i + 1}`);
  return (
    <Section
      title="Ashtakavarga"
      description={`${convention} convention. Bhinna rows are per-planet bindus by sign; Sarva is the column sum.`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant={invariantOk ? "default" : "destructive"}>
          {grandTotal} {invariantOk ? "invariant ok" : "invariant mismatch"}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Grand total of all bindu rows {invariantOk ? "equals" : "does not equal"} the locked 337 invariant.
        </span>
      </div>
      <TableWrap caption="Ashtakavarga bhinna and sarva bindus">
        <thead>
          <tr>
            <Th>Row</Th>
            {signHeaders.map((h) => (
              <Th key={h} className="tabular-nums">
                {h}
              </Th>
            ))}
            <Th>Total</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((body) => (
            <tr key={body} className="border-t border-border/60">
              <Td className="font-medium text-foreground">{body}</Td>
              {Array.from({ length: 12 }, (_, i) => (
                <Td key={`${body}-${i}`} className="tabular-nums">
                  {bhinna[body]?.[i] ?? "—"}
                </Td>
              ))}
              <Td className="tabular-nums text-foreground">{totals[body] ?? "—"}</Td>
            </tr>
          ))}
          <tr className="border-t border-border bg-elevated/60">
            <Td className="font-semibold text-accent">Sarva</Td>
            {Array.from({ length: 12 }, (_, i) => (
              <Td key={`sarva-${i}`} className="font-semibold tabular-nums text-accent">
                {sarva[i] ?? "—"}
              </Td>
            ))}
            <Td className="font-semibold tabular-nums text-accent">{grandTotal}</Td>
          </tr>
        </tbody>
      </TableWrap>
    </Section>
  );
}

/* ------------------------------------------------------------------ atoms */

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border bg-surface">
      <CardHeader>
        <CardTitle className="font-heading text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function TableWrap({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto md:mx-0" role="region" aria-label={caption} tabIndex={0}>
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={`px-3 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-top whitespace-nowrap ${className}`}>{children}</td>;
}

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

function ChartSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <span className="sr-only">Loading chart…</span>
    </div>
  );
}

function formatScore(c: PlanetCondition): string {
  const sign = c.score > 0 ? "+" : "";
  return `${sign}${c.score}`;
}

function directionLabel(direction: PlanetCondition["direction"]): string {
  switch (direction) {
    case "POSITIVE":
      return "Positive";
    case "NEGATIVE":
      return "Negative";
    case "NEUTRAL_INTENSITY":
      return "Neutral intensity";
    case "MIXED":
      return "Mixed";
    default:
      return "Unknown";
  }
}
