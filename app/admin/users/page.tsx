"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, Search, Users } from "lucide-react";
import { API, type AdminUserRow, type Plan, type Role } from "@/lib/contract";
import { fetchJson, RequestError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function describeError(error: unknown): string {
  if (error instanceof RequestError) return error.message;
  return "Something went wrong. Please try again.";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<{ users: AdminUserRow[] }>(API.adminUsers);
      setUsers(data.users);
    } catch (err) {
      setUsers(null);
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchUser = useCallback(
    async (id: string, patch: { role?: Role; plan?: Plan }) => {
      const previous = users;
      setRowError(null);
      setSavingId(id);
      setUsers((current) =>
        current ? current.map((row) => (row.id === id ? { ...row, ...patch } : row)) : current,
      );
      try {
        const data = await fetchJson<{ user: AdminUserRow }>(API.adminUser(id), {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
        setUsers((current) =>
          current ? current.map((row) => (row.id === id ? data.user : row)) : current,
        );
      } catch (err) {
        setUsers(previous);
        setRowError({ id, message: describeError(err) });
      } finally {
        setSavingId(null);
      }
    },
    [users],
  );

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const rows = users ?? [];
    if (!term) return rows;
    return rows.filter(
      (row) => row.email.toLowerCase().includes(term) || row.name.toLowerCase().includes(term),
    );
  }, [users, query]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Change a plan or grant admin access. Updates apply immediately.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : undefined} aria-hidden="true" />
          Refresh
        </Button>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or email"
            aria-label="Search users by name or email"
            className="pl-8"
          />
        </div>
        {users ? (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {visible.length} of {users.length} accounts
          </p>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-xl border border-verdict-opposes/40 bg-elevated px-4 py-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 text-verdict-opposes" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-medium text-verdict-opposes">Could not load users</p>
            <p className="mt-0.5 text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      {loading && !users ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-border bg-surface p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-3 h-3 w-56" />
            </div>
          ))}
        </div>
      ) : null}

      {users && visible.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
          <Users className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium">
            {users.length === 0 ? "No accounts yet" : "No accounts match that search"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {users.length === 0
              ? "Accounts appear here as soon as someone signs up."
              : "Try a different name or email address."}
          </p>
        </div>
      ) : null}

      {visible.length > 0 ? (
        <>
          <div className="mt-6 hidden overflow-hidden rounded-2xl border border-border bg-surface md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Name</TableHead>
                  <TableHead scope="col">Email</TableHead>
                  <TableHead scope="col">Role</TableHead>
                  <TableHead scope="col">Plan</TableHead>
                  <TableHead scope="col" className="text-right">
                    Profiles
                  </TableHead>
                  <TableHead scope="col">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-muted-foreground">{row.email}</TableCell>
                    <TableCell>
                      <Segmented<Role>
                        ariaLabel={`Role for ${row.name}`}
                        value={row.role}
                        disabled={savingId === row.id}
                        onSelect={(role) => void patchUser(row.id, { role })}
                        options={[
                          { value: "user", label: "User" },
                          { value: "admin", label: "Admin" },
                        ]}
                      />
                    </TableCell>
                    <TableCell>
                      <Segmented<Plan>
                        ariaLabel={`Plan for ${row.name}`}
                        value={row.plan}
                        disabled={savingId === row.id}
                        onSelect={(plan) => void patchUser(row.id, { plan })}
                        options={[
                          { value: "free", label: "Free" },
                          { value: "paid", label: "Pro" },
                        ]}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.customerCount}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(row.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="mt-6 space-y-3 md:hidden">
            {visible.map((row) => (
              <li key={row.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {row.customerCount} {row.customerCount === 1 ? "profile" : "profiles"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Segmented<Plan>
                    ariaLabel={`Plan for ${row.name}`}
                    value={row.plan}
                    disabled={savingId === row.id}
                    onSelect={(plan) => void patchUser(row.id, { plan })}
                    options={[
                      { value: "free", label: "Free" },
                      { value: "paid", label: "Pro" },
                    ]}
                  />
                  <Segmented<Role>
                    ariaLabel={`Role for ${row.name}`}
                    value={row.role}
                    disabled={savingId === row.id}
                    onSelect={(role) => void patchUser(row.id, { role })}
                    options={[
                      { value: "user", label: "User" },
                      { value: "admin", label: "Admin" },
                    ]}
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Joined {formatDate(row.createdAt)}</p>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {rowError ? (
        <div
          role="alert"
          aria-live="polite"
          className="mt-4 flex items-center gap-2 rounded-xl border border-verdict-opposes/40 bg-elevated px-4 py-3 text-sm text-verdict-opposes"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          Update failed and was rolled back: {rowError.message}
        </div>
      ) : null}
    </div>
  );
}

function Segmented<T extends string>({
  ariaLabel,
  value,
  options,
  disabled,
  onSelect,
}: {
  ariaLabel: string;
  value: T;
  options: { value: T; label: string }[];
  disabled?: boolean;
  onSelect: (value: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border border-border bg-elevated p-0.5"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onSelect(option.value)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
              active ? "bg-accent text-night" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
