"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, CircleQuestionMark, LoaderCircle, Sparkles } from "lucide-react";
import { API, type PublicUser, type UpgradeRequest } from "@/lib/contract";
import { fetchJson, RequestError } from "@/lib/client/api";

export default function AccountPage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    void fetchJson<{ user: PublicUser | null }>(API.auth).then(
      (data) => {
        if (!active) return;
        setUser(data.user);
        setLoadError(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : "Could not load your account.");
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [reloadToken]);

  function retry() {
    setLoading(true);
    setLoadError(null);
    setReloadToken((token) => token + 1);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Account</h1>
        <p className="text-sm text-muted-foreground">Your plan, access level and upgrade requests.</p>
      </header>

      {loading ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          Loading account…
        </p>
      ) : loadError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <p role="alert" className="text-destructive">
            {loadError}
          </p>
          <button
            type="button"
            onClick={retry}
            className="mt-3 rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Try again
          </button>
        </div>
      ) : !user ? (
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
          No signed-in account was found. Sign in again to view this page.
        </p>
      ) : (
        <>
          <section aria-label="Account details" className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Name</dt>
                <dd className="mt-1 text-sm font-medium">{user.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Email</dt>
                <dd className="mt-1 truncate text-sm font-medium">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Plan</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      user.plan === "paid"
                        ? "border-verdict-support/40 bg-verdict-support/10 text-verdict-support"
                        : "border-border bg-elevated text-muted-foreground"
                    }`}
                    aria-label={`Current plan: ${user.plan === "paid" ? "Pro" : "Free"}`}
                  >
                    {user.plan === "paid" ? <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> : null}
                    {user.plan === "paid" ? "Pro" : "Free"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Role</dt>
                <dd className="mt-1 text-sm font-medium capitalize">{user.role}</dd>
              </div>
            </dl>
          </section>

          {user.plan === "paid" ? (
            <section
              aria-label="Pro status"
              className="flex items-start gap-3 rounded-2xl border border-verdict-support/40 bg-verdict-support/10 p-4 sm:p-6"
            >
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-verdict-support" aria-hidden />
              <div>
                <h2 className="font-heading text-lg font-semibold">Pro is active</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your account already has Pro access, so no upgrade request is needed.
                </p>
              </div>
            </section>
          ) : (
            <UpgradeForm />
          )}
        </>
      )}
    </div>
  );
}

function UpgradeForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<UpgradeRequest | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const trimmed = message.trim();
    if (!trimmed) {
      setError("Add a short note so we know what you need Pro for.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const data = await fetchJson<{ request: UpgradeRequest }>(API.upgradeRequests, {
        method: "POST",
        body: JSON.stringify({ message: trimmed.slice(0, 500) }),
      });
      setSent(data.request);
      setMessage("");
    } catch (err) {
      setError(err instanceof RequestError ? err.message : "Could not send the request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-busy={busy}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-6"
    >
      <div className="flex items-start gap-2">
        <CircleQuestionMark className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <div>
          <h2 className="font-heading text-lg font-semibold">Request upgrade</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Free accounts keep the core chart and conversation. Pro unlocks the full reading set. Tell us briefly what
            you need it for.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="upgrade-message" className="text-sm font-medium">
          Message
        </label>
        <textarea
          id="upgrade-message"
          name="message"
          rows={4}
          maxLength={500}
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            setError(null);
          }}
          placeholder="I want to use the full timeline and audit views for my research."
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "upgrade-message-error" : "upgrade-message-hint"}
          className={`w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            error ? "border-destructive" : "border-input"
          }`}
        />
        <p id="upgrade-message-hint" className="text-xs text-muted-foreground">
          Up to 500 characters. {message.length}/500
        </p>
        {error && (
          <p id="upgrade-message-error" role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      <div aria-live="polite">
        {sent && (
          <p className="rounded-lg bg-verdict-support/10 px-3 py-2 text-sm text-verdict-support">
            Request received on {new Date(sent.createdAt).toLocaleDateString()} — status {sent.status}. You will see the
            plan change here once it is approved.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-fit items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50"
      >
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {busy ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
