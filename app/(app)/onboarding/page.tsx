"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Compass, LoaderCircle, MapPin, Sparkles } from "lucide-react";
import { API, type Customer, type PlaceCandidateDto } from "@/lib/contract";
import { fetchJson, RequestError } from "@/lib/client/api";
import { useCustomers } from "@/components/customer-provider";

interface FormState {
  name: string;
  birthDate: string;
  birthTime: string;
  placeText: string;
  latitude: string;
  longitude: string;
  timezone: string;
}

interface PlaceOverrides {
  latitude: number;
  longitude: number;
  timezone: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  birthDate: "",
  birthTime: "",
  placeText: "",
  latitude: "",
  longitude: "",
  timezone: "",
};

function toCandidates(detail: unknown): PlaceCandidateDto[] {
  if (!detail || typeof detail !== "object") return [];
  const raw = (detail as { candidates?: unknown }).candidates;
  if (!Array.isArray(raw)) return [];
  return raw.filter((candidate): candidate is PlaceCandidateDto => {
    if (!candidate || typeof candidate !== "object") return false;
    const c = candidate as Partial<PlaceCandidateDto>;
    return (
      typeof c.name === "string" &&
      typeof c.region === "string" &&
      typeof c.country === "string" &&
      typeof c.latitude === "number" &&
      typeof c.longitude === "number" &&
      typeof c.timezone === "string"
    );
  });
}

function parseCoordinate(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { customers, loading: profilesLoading, error: profilesError, refresh } = useCustomers();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [advanced, setAdvanced] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<PlaceCandidateDto[]>([]);
  const [unknownPlace, setUnknownPlace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Customer | null>(null);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "Please enter the full name to chart.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.birthDate.trim())) next.birthDate = "Use the format YYYY-MM-DD.";
    if (!/^\d{2}:\d{2}$/.test(form.birthTime.trim())) next.birthTime = "Use 24-hour time, for example 07:45.";
    if (!form.placeText.trim()) next.placeText = "A city and country is enough, for example “Pune, India”.";
    if (advanced) {
      const lat = parseCoordinate(form.latitude);
      const lon = parseCoordinate(form.longitude);
      if (form.latitude.trim() && lat === undefined) next.latitude = "Latitude must be a number between -90 and 90.";
      else if (lat !== undefined && (lat < -90 || lat > 90)) next.latitude = "Latitude must be between -90 and 90.";
      if (form.longitude.trim() && lon === undefined) next.longitude = "Longitude must be a number between -180 and 180.";
      else if (lon !== undefined && (lon < -180 || lon > 180)) next.longitude = "Longitude must be between -180 and 180.";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(overrides?: PlaceOverrides) {
    if (busy) return;
    if (!overrides && !validate()) return;
    if (overrides && (!form.name.trim() || !form.birthDate.trim() || !form.birthTime.trim())) {
      setError("Please re-enter the name, birth date and birth time, then pick the place again.");
      return;
    }

    setBusy(true);
    setError(null);
    setUnknownPlace(false);
    setCreated(null);

    const latitude = overrides?.latitude ?? parseCoordinate(form.latitude);
    const longitude = overrides?.longitude ?? parseCoordinate(form.longitude);
    const timezone = overrides?.timezone ?? (form.timezone.trim() || undefined);

    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        birthDate: form.birthDate.trim(),
        birthTime: form.birthTime.trim(),
        placeText: form.placeText.trim(),
      };
      if (latitude !== undefined) body.latitude = latitude;
      if (longitude !== undefined) body.longitude = longitude;
      if (timezone) body.timezone = timezone;

      const data = await fetchJson<{ customer: Customer }>(API.customers, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setCreated(data.customer);
      setCandidates([]);
      await refresh();
      router.push("/chat");
    } catch (err) {
      if (err instanceof RequestError) {
        if (err.code === "AMBIGUOUS_BIRTH_PLACE") {
          const list = toCandidates(err.detail);
          setCandidates(list);
          setError(
            list.length > 0
              ? err.message
              : "Several places match that name, but no candidates were returned. Add coordinates under Advanced.",
          );
        } else if (err.code === "UNKNOWN_BIRTH_PLACE") {
          setUnknownPlace(true);
          setError(err.message);
        } else {
          setError(err.message);
        }
      } else {
        setError("Something went wrong while creating the profile. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-12">
      <header className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-elevated px-3 py-1 text-xs text-muted-foreground">
          <Compass className="h-3.5 w-3.5 text-accent" aria-hidden />
          Step 1 of 2
        </span>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Birth details</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          The chart is computed from exact birth data. A precise time matters: without it, house-based techniques stay
          unavailable and the reading says so instead of guessing.
        </p>
      </header>

      <section
        aria-label="Saved profiles"
        className="rounded-2xl border border-border bg-surface p-4 sm:p-5"
      >
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your profiles
        </h2>
        {profilesLoading ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
            Loading profiles…
          </p>
        ) : profilesError ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {profilesError}
          </p>
        ) : customers.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No profiles yet. Add the first set of birth details below.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {customers.map((customer) => (
              <li key={customer.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span className="text-sm font-medium">{customer.name}</span>
                <span className="text-xs text-muted-foreground">
                  {customer.birthDate} · {customer.birthTime} · {customer.birthPlace}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form
        noValidate
        aria-busy={busy}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-4 sm:p-6"
      >
        <h2 className="font-heading text-lg font-semibold">New profile</h2>

        <Field id="name" label="Full name" error={fieldErrors.name}>
          <input
            id="name"
            name="name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            autoComplete="name"
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
            className={inputClass(fieldErrors.name)}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="birthDate" label="Birth date" error={fieldErrors.birthDate}>
            <input
              id="birthDate"
              name="birthDate"
              type="date"
              value={form.birthDate}
              onChange={(e) => update("birthDate", e.target.value)}
              aria-invalid={Boolean(fieldErrors.birthDate)}
              aria-describedby={fieldErrors.birthDate ? "birthDate-error" : undefined}
              className={inputClass(fieldErrors.birthDate)}
            />
          </Field>

          <Field id="birthTime" label="Birth time" error={fieldErrors.birthTime}>
            <input
              id="birthTime"
              name="birthTime"
              type="time"
              value={form.birthTime}
              onChange={(e) => update("birthTime", e.target.value)}
              aria-invalid={Boolean(fieldErrors.birthTime)}
              aria-describedby={fieldErrors.birthTime ? "birthTime-error" : undefined}
              className={inputClass(fieldErrors.birthTime)}
            />
          </Field>
        </div>

        <Field id="placeText" label="Birth place" error={fieldErrors.placeText} hint="City, region, country">
          <input
            id="placeText"
            name="placeText"
            value={form.placeText}
            onChange={(e) => update("placeText", e.target.value)}
            placeholder="Pune, India"
            aria-invalid={Boolean(fieldErrors.placeText)}
            aria-describedby={fieldErrors.placeText ? "placeText-error" : "placeText-hint"}
            className={inputClass(fieldErrors.placeText)}
          />
        </Field>

        <div className="rounded-xl border border-border bg-elevated/40">
          <button
            type="button"
            onClick={() => setAdvanced((value) => !value)}
            aria-expanded={advanced}
            aria-controls="advanced-fields"
            className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Advanced: exact coordinates and timezone
            <span className="text-xs text-muted-foreground">{advanced ? "Hide" : "Show"}</span>
          </button>
          {advanced && (
            <fieldset id="advanced-fields" className="grid gap-5 px-4 pb-4 sm:grid-cols-3">
              <legend className="sr-only">Exact coordinates and timezone</legend>
              <Field id="latitude" label="Latitude" error={fieldErrors.latitude}>
                <input
                  id="latitude"
                  name="latitude"
                  inputMode="decimal"
                  value={form.latitude}
                  onChange={(e) => update("latitude", e.target.value)}
                  placeholder="18.5204"
                  aria-invalid={Boolean(fieldErrors.latitude)}
                  aria-describedby={fieldErrors.latitude ? "latitude-error" : undefined}
                  className={inputClass(fieldErrors.latitude)}
                />
              </Field>
              <Field id="longitude" label="Longitude" error={fieldErrors.longitude}>
                <input
                  id="longitude"
                  name="longitude"
                  inputMode="decimal"
                  value={form.longitude}
                  onChange={(e) => update("longitude", e.target.value)}
                  placeholder="73.8567"
                  aria-invalid={Boolean(fieldErrors.longitude)}
                  aria-describedby={fieldErrors.longitude ? "longitude-error" : undefined}
                  className={inputClass(fieldErrors.longitude)}
                />
              </Field>
              <Field id="timezone" label="Timezone" hint="IANA name">
                <input
                  id="timezone"
                  name="timezone"
                  value={form.timezone}
                  onChange={(e) => update("timezone", e.target.value)}
                  placeholder="Asia/Kolkata"
                  aria-describedby="timezone-hint"
                  className={inputClass()}
                />
              </Field>
            </fieldset>
          )}
        </div>

        {candidates.length > 0 && (
          <div className="rounded-xl border border-border bg-elevated/50 p-4" role="group" aria-label="Place candidates">
            <p className="text-sm font-medium">Which place is correct?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Picking one resubmits your details with the exact coordinates and timezone.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {candidates.map((candidate) => (
                <button
                  key={`${candidate.name}-${candidate.latitude}-${candidate.longitude}`}
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void submit({
                      latitude: candidate.latitude,
                      longitude: candidate.longitude,
                      timezone: candidate.timezone,
                    })
                  }
                  className="flex items-start gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-left text-sm transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{candidate.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[candidate.region, candidate.country].filter(Boolean).join(", ")} · {candidate.timezone}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {unknownPlace && (
          <div className="rounded-xl border border-verdict-unvalidated/40 bg-verdict-unvalidated/10 p-4 text-sm">
            <p className="font-medium">That place could not be located.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Write it as “City, Country” — for example “Kochi, India”.</li>
              <li>Add the region or state if the city name is common.</li>
              <li>If the town is small, open Advanced and enter latitude, longitude and the IANA timezone.</li>
            </ul>
          </div>
        )}

        <div aria-live="polite">
          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {created && (
            <p className="rounded-lg bg-verdict-support/10 px-3 py-2 text-sm text-verdict-support">
              {created.name} is ready. Opening your conversation…
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50"
        >
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
          {busy ? "Computing the chart…" : "Compute chart"}
        </button>
        <p className="text-xs text-muted-foreground">
          The chart is computed on the server. Times are stored exactly as you enter them, together with the resolved
          timezone.
        </p>
      </form>
    </div>
  );
}

function inputClass(error?: string): string {
  return `w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    error ? "border-destructive" : "border-input"
  }`;
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
