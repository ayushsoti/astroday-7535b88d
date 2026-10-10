"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { API, type Customer } from "@/lib/contract";
import { fetchJson } from "@/lib/client/api";

interface CustomerContextValue {
  customers: Customer[];
  selected: Customer | null;
  loading: boolean;
  error: string | null;
  select: (id: string) => void;
  refresh: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextValue | null>(null);
const STORAGE_KEY = "astroday.selectedCustomer";

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<{ customers: Customer[] }>(API.customers);
      setCustomers(data.customers);
      const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      const next = data.customers.find((c) => c.id === stored)?.id ?? data.customers[0]?.id ?? null;
      setSelectedId(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your profiles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const value = useMemo<CustomerContextValue>(() => {
    const selected = customers.find((c) => c.id === selectedId) ?? customers[0] ?? null;
    return { customers, selected, loading, error, select, refresh };
  }, [customers, selectedId, loading, error, select, refresh]);

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

export function useCustomers(): CustomerContextValue {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error("useCustomers must be used inside CustomerProvider");
  return ctx;
}
