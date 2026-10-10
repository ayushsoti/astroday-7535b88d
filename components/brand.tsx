import Link from "next/link";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 ${className}`}>
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full border border-accent/50">
        <span className="h-2 w-2 rounded-full bg-accent" />
        <span className="absolute h-7 w-7 rounded-full border border-accent/20" />
      </span>
      <span className="font-heading text-lg font-semibold tracking-tight">Astroday</span>
    </Link>
  );
}
