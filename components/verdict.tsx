import { BadgeCheck, CircleQuestionMark, Minus, TrendingUp, TriangleAlert } from "lucide-react";

/**
 * Small, reusable evidence badges used across chat, chart, timeline and audit.
 * Colours come from the `verdict-*` design tokens in app/globals.css.
 */

interface Tone {
  /** Tailwind classes for the chip surface, border and text colour. */
  className: string;
  /** Dot colour used by KnowledgeTag. */
  dot: string;
  /** Human readable label shown to the reader. */
  text: string;
  /** Longer explanation exposed through `title` for screen readers. */
  description: string;
}

function normalize(label: string | null | undefined): string {
  return (label ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

const VERDICT_TONES: Record<string, Tone> = {
  SUPPORT: {
    className: "border-verdict-support/40 bg-verdict-support/10 text-verdict-support",
    dot: "bg-verdict-support",
    text: "Supports",
    description: "Independent techniques point the same way for this question.",
  },
  OPPOSES: {
    className: "border-verdict-opposes/40 bg-verdict-opposes/10 text-verdict-opposes",
    dot: "bg-verdict-opposes",
    text: "Opposes",
    description: "Independent techniques point against this question.",
  },
  CONFLICTED: {
    className: "border-verdict-conflicted/40 bg-verdict-conflicted/10 text-verdict-conflicted",
    dot: "bg-verdict-conflicted",
    text: "Conflicted",
    description: "Techniques disagree with each other, so no single reading should be trusted.",
  },
  CORRELATED_NON_INDEPENDENT: {
    className: "border-verdict-correlated/40 bg-verdict-correlated/10 text-verdict-correlated",
    dot: "bg-verdict-correlated",
    text: "Correlated",
    description: "These signals come from the same underlying factor and are not independent confirmations.",
  },
  UNVALIDATED: {
    className: "border-verdict-unvalidated/40 bg-verdict-unvalidated/10 text-verdict-unvalidated",
    dot: "bg-verdict-unvalidated",
    text: "Unvalidated",
    description: "The technique has not been validated against recorded events yet.",
  },
  UNAVAILABLE: {
    className: "border-verdict-unvalidated/40 bg-verdict-unvalidated/10 text-verdict-unvalidated",
    dot: "bg-verdict-unvalidated",
    text: "Unavailable",
    description: "The required inputs or technique are not available for this chart.",
  },
  NEUTRAL: {
    className: "border-border bg-elevated text-muted-foreground",
    dot: "bg-muted-foreground",
    text: "Neutral",
    description: "No directional signal was produced for this question.",
  },
};

const FALLBACK_TONE: Tone = {
  className: "border-verdict-unvalidated/40 bg-verdict-unvalidated/10 text-verdict-unvalidated",
  dot: "bg-verdict-unvalidated",
  text: "Not tested",
  description: "No verdict was recorded for this finding.",
};

export function VerdictChip({ label, className = "" }: { label: string; className?: string }) {
  const tone = VERDICT_TONES[normalize(label)] ?? FALLBACK_TONE;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide ${tone.className} ${className}`}
      title={tone.description}
      aria-label={`Verdict: ${tone.text}. ${tone.description}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {tone.text}
    </span>
  );
}

type ConvergenceIcon = React.ComponentType<{ className?: string }>;

interface ConvergenceTone extends Tone {
  icon: ConvergenceIcon | null;
}

const CONVERGENCE_TONES: Record<string, ConvergenceTone> = {
  HIGH_CONVERGENCE: {
    className: "border-verdict-support/40 bg-verdict-support/10 text-verdict-support",
    dot: "bg-verdict-support",
    text: "High convergence",
    description: "Several independent techniques, including a timing layer, agree on this reading.",
    icon: BadgeCheck,
  },
  MODERATE_CONVERGENCE: {
    className: "border-verdict-correlated/40 bg-verdict-correlated/10 text-verdict-correlated",
    dot: "bg-verdict-correlated",
    text: "Moderate convergence",
    description: "At least two independent techniques agree, without a timing confirmation.",
    icon: TrendingUp,
  },
  LOW_CONVERGENCE: {
    className: "border-verdict-unvalidated/40 bg-verdict-unvalidated/10 text-verdict-unvalidated",
    dot: "bg-verdict-unvalidated",
    text: "Low convergence",
    description: "Only one line of evidence, or correlated signals only.",
    icon: Minus,
  },
  CONFLICTED: {
    className: "border-verdict-conflicted/40 bg-verdict-conflicted/10 text-verdict-conflicted",
    dot: "bg-verdict-conflicted",
    text: "Conflicted",
    description: "Independent techniques contradict each other on this question.",
    icon: TriangleAlert,
  },
  INSUFFICIENT_DATA: {
    className: "border-border bg-elevated text-muted-foreground",
    dot: "bg-muted-foreground",
    text: "Insufficient data",
    description: "Not enough computed or validated evidence to summarise a reading.",
    icon: CircleQuestionMark,
  },
};

const CONVERGENCE_FALLBACK: ConvergenceTone = {
  className: "border-border bg-elevated text-muted-foreground",
  dot: "bg-muted-foreground",
  text: "Insufficient data",
  description: "Not enough computed or validated evidence to summarise a reading.",
  icon: CircleQuestionMark,
};

export function ConvergenceBadge({ label, className = "" }: { label: string; className?: string }) {
  const tone = CONVERGENCE_TONES[normalize(label)] ?? CONVERGENCE_FALLBACK;
  const Icon = tone.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tone.className} ${className}`}
      title={tone.description}
      aria-label={`Convergence: ${tone.text}. ${tone.description}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {tone.text}
    </span>
  );
}

const KNOWLEDGE_TONES: Record<string, Tone> = {
  CLASSICAL_BEDROCK: {
    className: "border-verdict-support/40 bg-verdict-support/10 text-verdict-support",
    dot: "bg-verdict-support",
    text: "Classical bedrock",
    description: "Core classical technique used consistently across the tradition.",
  },
  WIDELY_USED_VARIANT: {
    className: "border-verdict-correlated/40 bg-verdict-correlated/10 text-verdict-correlated",
    dot: "bg-verdict-correlated",
    text: "Widely used variant",
    description: "A recognised variant of a classical technique, widely but not universally used.",
  },
  TRADITION_SPECIFIC: {
    className: "border-accent/40 bg-accent/10 text-accent",
    dot: "bg-accent",
    text: "Tradition specific",
    description: "Belongs to one particular school or lineage rather than the shared tradition.",
  },
  PROJECT_DESIGN_CHOICE: {
    className: "border-verdict-conflicted/40 bg-verdict-conflicted/10 text-verdict-conflicted",
    dot: "bg-verdict-conflicted",
    text: "Project design choice",
    description: "A convention this project selected deliberately; treat it as our choice, not a classical rule.",
  },
  COMPUTED_FACT: {
    className: "border-accent/40 bg-accent/10 text-accent",
    dot: "bg-accent",
    text: "Computed fact",
    description: "Deterministic astronomy or arithmetic output, independent of interpretation.",
  },
  INTERPRETIVE_INFERENCE: {
    className: "border-verdict-unvalidated/40 bg-verdict-unvalidated/10 text-verdict-unvalidated",
    dot: "bg-verdict-unvalidated",
    text: "Interpretive inference",
    description: "An interpretation drawn by the reading layer, not a computed fact.",
  },
  UNKNOWN_NOT_TESTED: {
    className: "border-border bg-elevated text-muted-foreground",
    dot: "bg-muted-foreground",
    text: "Unknown / not tested",
    description: "The status of this technique has not been assessed in this project.",
  },
};

const KNOWLEDGE_FALLBACK: Tone = {
  className: "border-border bg-elevated text-muted-foreground",
  dot: "bg-muted-foreground",
  text: "Unknown / not tested",
  description: "The status of this technique has not been assessed in this project.",
};

export function KnowledgeTag({ status, className = "" }: { status: string; className?: string }) {
  const tone = KNOWLEDGE_TONES[normalize(status)] ?? KNOWLEDGE_FALLBACK;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${tone.className} ${className}`}
      title={tone.description}
      aria-label={`Knowledge status: ${tone.text}. ${tone.description}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {tone.text}
    </span>
  );
}
