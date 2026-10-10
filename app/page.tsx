import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

const STEPS = [
  {
    n: "01",
    title: "Compute",
    body: "Your birth data resolves to a Lahiri sidereal chart — positions, nakshatra padas, whole-sign houses, divisional charts and the Vimshottari dasha, all from a deterministic engine.",
  },
  {
    n: "02",
    title: "Group the evidence",
    body: "Every technique contributes a finding in its own independence group. Correlated evidence is never double-counted, and opposing evidence is reported as a conflict — never averaged away.",
  },
  {
    n: "03",
    title: "Answer plainly",
    body: "The reasoning layer writes the prose. It can restate a finding; it can never invent a degree, a date or a yoga. Every answer opens to the evidence behind it.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col bg-night text-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Wordmark />
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Create account
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="starfield relative overflow-hidden border-b border-border">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-20 md:grid-cols-[1.2fr_1fr] md:py-28">
            <div className="flex flex-col justify-center">
              <p className="mb-5 text-sm text-accent">Vedic astrology, kept honest</p>
              <h1 className="max-w-2xl text-5xl font-semibold leading-[1.05] text-balance md:text-6xl">
                Your chart, reasoned — not recited.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Astroday turns a birth chart into auditable evidence, then explains what it means for the
                decision in front of you. Every claim is traceable. Every conflict is named instead of smoothed
                over.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Start with your birth details
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-elevated"
                >
                  I already have an account
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <SampleAnswer />
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-semibold md:text-4xl">How an answer is built</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Three stages, in order. Nothing is skipped, and nothing is invented along the way.
          </p>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="border-t border-border pt-6">
                <span className="font-mono text-sm text-accent">{s.n}</span>
                <h3 className="mt-3 text-xl font-semibold">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <h2 className="text-3xl font-semibold md:text-4xl">Plans</h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Start free. Upgrade when you want the full picture — plans are set by us, and you can request an
              upgrade from your account at any time.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <PlanCard
                name="Free"
                price="₹0"
                cadence="forever"
                features={[
                  "One birth profile",
                  "Daily guidance and the live dasha timeline",
                  "Full chart and divisional tables",
                  "Ask questions with evidence attached",
                ]}
                cta="Create free account"
                highlight={false}
              />
              <PlanCard
                name="Pro"
                price="₹699"
                cadence="per month"
                features={[
                  "Everything in Free",
                  "The audit loop — predictions tracked to hit or miss",
                  "Calibration events from your own history",
                  "Priority on new techniques as they are validated",
                ]}
                cta="Request an upgrade"
                highlight
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 py-10 text-sm text-muted-foreground">
        <p className="max-w-2xl">
          Astroday is an interpretive tool, not financial, legal, medical or safety advice. Where the chart does
          not resolve a question, it says so.
        </p>
      </footer>
    </div>
  );
}

function SampleAnswer() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl">
      <p className="text-xs text-muted-foreground">Relationships · Saturn / Jupiter / Ketu</p>
      <p className="mt-3 text-sm leading-relaxed">
        The promise is conflicted: the 7th-house lord runs weak, while its nakshatra dispositor is strong. Timing
        opens in the Jupiter sub-period.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Chip label="relationships · conflicted" tone="conflicted" />
        <Chip label="career · support" tone="support" />
        <Chip label="education · unvalidated" tone="unvalidated" />
      </div>
      <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
        Convergence: low. Two independent groups disagree.
      </p>
    </div>
  );
}

function Chip({ label, tone }: { label: string; tone: "support" | "conflicted" | "unvalidated" }) {
  const toneClass = {
    support: "bg-verdict-support/15 text-verdict-support",
    conflicted: "bg-verdict-conflicted/15 text-verdict-conflicted",
    unvalidated: "bg-verdict-unvalidated/15 text-verdict-unvalidated",
  }[tone];
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${toneClass}`}>{label}</span>;
}

function PlanCard({
  name,
  price,
  cadence,
  features,
  cta,
  highlight,
}: {
  name: string;
  price: string;
  cadence: string;
  features: string[];
  cta: string;
  highlight: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border p-8 ${highlight ? "border-primary/60 bg-elevated" : "border-border bg-surface"}`}
    >
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="mt-4 text-4xl font-semibold">
        {price}
        <span className="ml-2 text-sm font-normal text-muted-foreground">{cadence}</span>
      </p>
      <ul className="mt-6 flex-1 space-y-3 text-sm text-muted-foreground">
        {features.map((f) => (
          <li key={f} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            {f}
          </li>
        ))}
      </ul>
      <Link
        href="/signup"
        className={`mt-8 inline-flex justify-center rounded-full px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90 ${highlight ? "bg-primary text-primary-foreground" : "border border-border"}`}
      >
        {cta}
      </Link>
    </div>
  );
}
