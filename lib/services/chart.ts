import { getCustomerRow } from "./customers";
import type { AnalyzeResponse, NatalChart } from "../astro/types";
import type { Customer, PublicUser } from "../contract";
import { toCustomer } from "./customers";

export interface ChartPayload {
  customer: Customer;
  natal: NatalChart;
}

export async function getChart(user: PublicUser, customerId: string): Promise<ChartPayload | null> {
  const row = await getCustomerRow(user, customerId);
  if (!row) return null;
  return { customer: toCustomer(row), natal: JSON.parse(row.natalJson) as NatalChart };
}

export interface DashaPayload {
  customer: Customer;
  dasha: AnalyzeResponse["activeDasha"] & { detailed: unknown };
}

export async function getDasha(user: PublicUser, customerId: string, asOf: string): Promise<DashaPayload | null> {
  const row = await getCustomerRow(user, customerId);
  if (!row) return null;
  const dasha = JSON.parse(row.dashaJson) as { detailed: unknown; balanceYears: number; startLord: string };
  const { activeDashaOn } = await import("../astro/dasha");
  const natal = JSON.parse(row.natalJson) as NatalChart;
  const moonLon = natal.positions.find((p) => p.body === "Moon")!.longitude;
  const active = activeDashaOn(moonLon, row.birthDate, asOf);
  return { customer: toCustomer(row), dasha: { ...active, detailed: dasha.detailed } };
}
