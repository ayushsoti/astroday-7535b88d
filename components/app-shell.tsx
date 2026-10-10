"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarClock,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Orbit,
  ScrollText,
  Sparkles,
  Sunrise,
  UserCog,
} from "lucide-react";
import type { PublicUser } from "@/lib/contract";
import { API } from "@/lib/contract";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/today", label: "Today", icon: Sunrise },
  { href: "/chart", label: "Chart", icon: Orbit },
  { href: "/timeline", label: "Timeline", icon: CalendarClock },
  { href: "/audit", label: "Audit", icon: ScrollText },
  { href: "/account", label: "Account", icon: UserCog },
];

export function AppShell({ user, children }: { user: PublicUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch(API.logout, { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 bg-night">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
        <Wordmark className="px-2" />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <NavLink key={item.href} {...item} active={pathname.startsWith(item.href)} />
          ))}
          {user.role === "admin" && (
            <NavLink href="/admin" label="Admin" icon={LayoutDashboard} active={pathname.startsWith("/admin")} />
          )}
        </nav>
        <div className="mt-6 flex items-center justify-between rounded-xl border border-border px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.plan === "paid" ? "Pro" : "Free"} plan</p>
          </div>
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={signOut}
          disabled={busy}
          className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {busy ? "Signing out…" : "Sign out"}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
          <Wordmark />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={signOut}
              disabled={busy}
              aria-label="Sign out"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 pb-20 md:pb-0">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-border bg-surface/95 px-2 py-2 backdrop-blur md:hidden">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] ${active ? "text-accent" : "text-muted-foreground"}`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
        active ? "bg-elevated font-medium text-accent" : "text-muted-foreground hover:bg-elevated hover:text-foreground"
      }`}
    >
      <Icon className="h-4.5 w-4.5" />
      {label}
    </Link>
  );
}

export const _spark = Sparkles;
