"use client";

import { useCallback, useEffect, useState } from "react";
import { API, type CalibrationEvent, type Prediction, type PredictionOutcome } from "@/lib/contract";
import { fetchJson } from "@/lib/client/api";
import { useCustomers } from "@/components/customer-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const OUTCOMES: PredictionOutcome[] = ["pending", "hit", "miss", "partial", "unknown"];
const PRECISIONS: CalibrationEvent["datePrecision"][] = ["day", "month", "year"];

export default function AuditPage() {
  const { selected, loading: customersLoading, error: customersError } = useCustomers();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [events, setEvents] = useState<CalibrationEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (customerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [predictionData, eventData] = await Promise.all([
        fetchJson<{ predictions: Prediction[] }>(API.predictions(customerId)),
        fetchJson<{ events: CalibrationEvent[] }>(`${API.calibrationEvents}?customerId=${customerId}`),
      ]);
      setPredictions(predictionData.predictions);
      setEvents(eventData.events);
    } catch (err) {
      setPredictions([]);
      setEvents([]);
      setError(err instanceof Error ? err.message : "Could not load the audit data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selected) {
      setPredictions([]);
      setEvents([]);
      return;
    }
    void load(selected.id);
  }, [selected, load]);

  const busy = customersLoading || loading;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <p className="text-xs font-medium tracking-widest text-accent uppercase">Audit</p>
        <h1 className="mt-1 font-heading text-2xl font-semibold md:text-3xl">Prediction audit &amp; calibration</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Predictions are hypotheses to record and audit — they are not engine output. The engine computes chart
          facts; the statements below are claims you score against real life, and the calibration events are the
          confirmed life events you compare them with.
        </p>
      </header>

      {customersError ? (
        <ErrorBlock message={customersError} />
      ) : !customersLoading && !selected ? (
        <EmptyBlock message="No profile selected yet. Add a birth profile to audit predictions." />
      ) : busy ? (
        <AuditSkeleton />
      ) : error ? (
        <div>
          <ErrorBlock message={error} />
          {selected ? (
            <Button className="mt-3" variant="outline" onClick={() => void load(selected.id)}>
              Try again
            </Button>
          ) : null}
        </div>
      ) : selected ? (
        <div className="space-y-6">
          <PredictionsSection
            predictions={predictions}
            onUpdated={(next) =>
              setPredictions((rows) => rows.map((row) => (row.id === next.id ? next : row)))
            }
          />
          <CalibrationSection
            customerId={selected.id}
            events={events}
            onCreated={(created) => setEvents((rows) => [created, ...rows])}
          />
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------ predictions */

function PredictionsSection({
  predictions,
  onUpdated,
}: {
  predictions: Prediction[];
  onUpdated: (next: Prediction) => void;
}) {
  return (
    <Card className="border-border bg-surface">
      <CardHeader>
        <CardTitle className="font-heading text-base">Predictions ({predictions.length})</CardTitle>
        <CardDescription>Score each statement against what actually happened. Saving is immediate.</CardDescription>
      </CardHeader>
      <CardContent>
        {predictions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No predictions recorded yet. Statements from app sessions and legacy PDFs will appear here.
          </p>
        ) : (
          <div className="-mx-4 overflow-x-auto md:mx-0" role="region" aria-label="Predictions to audit" tabIndex={0}>
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead>
                <tr>
                  {["Statement", "Window", "Source", "Outcome", "Outcome notes"].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-3 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {predictions.map((prediction) => (
                  <PredictionRow key={prediction.id} prediction={prediction} onUpdated={onUpdated} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PredictionRow({
  prediction,
  onUpdated,
}: {
  prediction: Prediction;
  onUpdated: (next: Prediction) => void;
}) {
  const [outcome, setOutcome] = useState<PredictionOutcome>(prediction.outcome);
  const [notes, setNotes] = useState(prediction.outcomeNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = outcome !== prediction.outcome || notes !== (prediction.outcomeNotes ?? "");

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const data = await fetchJson<{ prediction: Prediction }>(API.prediction(prediction.id), {
        method: "PATCH",
        body: JSON.stringify({ outcome, outcomeNotes: notes.trim() || undefined }),
      });
      onUpdated(data.prediction);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this outcome.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="border-t border-border/60 align-top">
      <td className="max-w-md px-3 py-3 text-sm font-medium text-foreground">
        {prediction.statement}
        <span className="mt-1 block text-xs font-normal text-muted-foreground">
          {prediction.category}
          {prediction.convergenceLabel ? ` · ${prediction.convergenceLabel}` : ""}
        </span>
      </td>
      <td className="px-3 py-3 text-sm tabular-nums text-muted-foreground">{windowText(prediction)}</td>
      <td className="px-3 py-3">
        <Badge variant={prediction.source === "app" ? "secondary" : "outline"}>
          {prediction.source === "app" ? "App" : "Legacy PDF"}
        </Badge>
      </td>
      <td className="px-3 py-3">
        <Label htmlFor={`outcome-${prediction.id}`} className="sr-only">
          Outcome for {prediction.statement}
        </Label>
        <NativeSelect
          id={`outcome-${prediction.id}`}
          className="w-36"
          value={outcome}
          disabled={saving}
          onChange={(event) => {
            setOutcome(event.target.value as PredictionOutcome);
            setSaved(false);
          }}
        >
          {OUTCOMES.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {label(value)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <span className="mt-1.5 block">
          <OutcomeBadge outcome={prediction.outcome} />
        </span>
      </td>
      <td className="px-3 py-3">
        <Label htmlFor={`notes-${prediction.id}`} className="sr-only">
          Outcome notes for {prediction.statement}
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id={`notes-${prediction.id}`}
            className="w-56"
            value={notes}
            disabled={saving}
            placeholder="What actually happened?"
            onChange={(event) => {
              setNotes(event.target.value);
              setSaved(false);
            }}
          />
          <Button disabled={saving || !dirty} onClick={() => void save()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
        <div className="mt-1 min-h-5 text-xs" aria-live="polite">
          {error ? (
            <span className="text-destructive">{error}</span>
          ) : saved ? (
            <span className="text-verdict-support">Saved.</span>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function OutcomeBadge({ outcome }: { outcome: PredictionOutcome }) {
  const variant =
    outcome === "hit" ? "default" : outcome === "miss" ? "destructive" : outcome === "partial" ? "secondary" : "outline";
  return <Badge variant={variant}>{label(outcome)}</Badge>;
}

/* -------------------------------------------------------------- calibration */

function CalibrationSection({
  customerId,
  events,
  onCreated,
}: {
  customerId: string;
  events: CalibrationEvent[];
  onCreated: (created: CalibrationEvent) => void;
}) {
  const [eventDate, setEventDate] = useState("");
  const [datePrecision, setDatePrecision] = useState<CalibrationEvent["datePrecision"]>("day");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [confirmed, setConfirmed] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const valid = eventDate.trim() !== "" && category.trim() !== "" && description.trim() !== "";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid) {
      setError("Date, category and description are required.");
      return;
    }
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const data = await fetchJson<{ event: CalibrationEvent }>(API.calibrationEvents, {
        method: "POST",
        body: JSON.stringify({
          customerId,
          eventDate: eventDate.trim(),
          datePrecision,
          category: category.trim(),
          description: description.trim(),
          confirmed,
        }),
      });
      onCreated(data.event);
      setEventDate("");
      setCategory("");
      setDescription("");
      setDatePrecision("day");
      setConfirmed(true);
      setStatus("Calibration event added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add this calibration event.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-border bg-surface">
      <CardHeader>
        <CardTitle className="font-heading text-base">Calibration events ({events.length})</CardTitle>
        <CardDescription>Confirmed life events used to score the predictions above.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No calibration events recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {events.map((item) => (
              <li key={item.id} className="py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium tabular-nums text-foreground">{item.eventDate}</span>
                  <Badge variant="outline">{item.datePrecision} precision</Badge>
                  <Badge variant="secondary">{item.category}</Badge>
                  <Badge variant={item.confirmed ? "default" : "outline"}>
                    {item.confirmed ? "Confirmed" : "Unconfirmed"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </li>
            ))}
          </ul>
        )}

        <form className="space-y-3 border-t border-border pt-4" onSubmit={submit} aria-label="Add calibration event">
          <p className="text-sm font-medium text-foreground">Add a calibration event</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="event-date" className="text-xs">
                Date
              </Label>
              <Input
                id="event-date"
                type="date"
                required
                value={eventDate}
                disabled={saving}
                onChange={(event) => setEventDate(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="event-precision" className="text-xs">
                Precision
              </Label>
              <NativeSelect
                id="event-precision"
                className="w-full"
                value={datePrecision}
                disabled={saving}
                onChange={(event) => setDatePrecision(event.target.value as CalibrationEvent["datePrecision"])}
              >
                {PRECISIONS.map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {value}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div>
              <Label htmlFor="event-category" className="text-xs">
                Category
              </Label>
              <Input
                id="event-category"
                required
                value={category}
                disabled={saving}
                placeholder="career, health, family…"
                onChange={(event) => setCategory(event.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="event-description" className="text-xs">
              Description
            </Label>
            <Textarea
              id="event-description"
              required
              rows={3}
              value={description}
              disabled={saving}
              placeholder="What happened, in your own words."
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-input focus-visible:ring-3 focus-visible:ring-ring/50"
              checked={confirmed}
              disabled={saving}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            Confirmed by the person it happened to
          </label>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving || !valid}>
              {saving ? "Adding…" : "Add event"}
            </Button>
            <span className="text-xs" aria-live="polite">
              {error ? (
                <span className="text-destructive">{error}</span>
              ) : status ? (
                <span className="text-verdict-support">{status}</span>
              ) : null}
            </span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ atoms */

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

function AuditSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
      <span className="sr-only">Loading audit data…</span>
    </div>
  );
}

function label(outcome: PredictionOutcome): string {
  switch (outcome) {
    case "hit":
      return "Hit";
    case "miss":
      return "Miss";
    case "partial":
      return "Partial";
    case "unknown":
      return "Unknown";
    default:
      return "Pending";
  }
}

function windowText(prediction: Prediction): string {
  if (prediction.windowStart && prediction.windowEnd) return `${prediction.windowStart} → ${prediction.windowEnd}`;
  if (prediction.windowStart) return `from ${prediction.windowStart}`;
  if (prediction.windowEnd) return `until ${prediction.windowEnd}`;
  return "no window recorded";
}
