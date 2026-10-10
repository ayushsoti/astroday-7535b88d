import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth/session";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/upgrade-requests", label: "Upgrade requests", icon: Sparkles },
] as const;

/** Clears the signed session (same effect as POST /api/auth/logout) and returns to sign-in. */
async function signOutAction(): Promise<void> {
  "use server";
  await clearSessionCookie();
  redirect("/login");
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/chat");

  return (
    <div className="flex min-h-full flex-1 bg-night">
      <aside
        aria-label="Admin navigation"
        className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 md:flex"
      >
        <Wordmark className="px-2" />
        <p className="mt-1 px-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Admin console
        </p>

        <nav aria-label="Admin sections" className="mt-8 flex flex-1 flex-col gap-1">
          {ADMIN_NAV.map((item) => (
            <AdminNavLink key={item.href} {...item} />
          ))}
        </nav>

        <Link
          href="/chat"
          className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Back to chat
        </Link>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-border px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <ThemeToggle />
        </div>

        <form action={signOutAction} className="mt-3">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </form>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 md:hidden">
          <Wordmark />
          <div className="flex items-center gap-2">
            <Link
              href="/chat"
              aria-label="Back to chat"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
            <ThemeToggle />
            <form action={signOutAction}>
              <button
                type="submit"
                aria-label="Sign out"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 pb-20 md:pb-0">{children}</main>

        <nav
          aria-label="Admin sections"
          className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-border bg-surface/95 px-2 py-2 backdrop-blur md:hidden"
        >
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function AdminNavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
