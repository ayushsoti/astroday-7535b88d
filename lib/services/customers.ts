import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { conversations, customers } from "../db/schema";
import { buildNatal } from "../astro/natal";
import { buildDashaTimeline } from "../astro/dasha";
import { resolvePlace } from "../astro/place";
import { LIMITATIONS } from "../astro/constants";
import type { BirthInput } from "../astro/types";
import type { CreateCustomerRequest, Customer, PublicUser } from "../contract";

type CustomerRow = typeof customers.$inferSelect;

export function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    birthDate: row.birthDate,
    birthTime: row.birthTime,
    birthPlace: row.birthPlace,
    latitude: row.latitude,
    longitude: row.longitude,
    timezone: row.timezone,
    birthUtc: row.birthUtc,
    status: row.status,
    limitations: JSON.parse(row.limitationsJson) as string[],
    calculatedAt: row.calculatedAt,
    createdAt: row.createdAt,
  };
}

export function birthOf(row: CustomerRow): BirthInput {
  return {
    name: row.name,
    birthDate: row.birthDate,
    birthTime: row.birthTime,
    placeText: row.birthPlace,
    latitude: row.latitude,
    longitude: row.longitude,
    timezone: row.timezone,
  };
}

export async function listCustomers(user: PublicUser): Promise<Customer[]> {
  const rows =
    user.role === "admin"
      ? await db.select().from(customers).orderBy(desc(customers.createdAt))
      : await db.select().from(customers).where(eq(customers.userId, user.id)).orderBy(desc(customers.createdAt));
  return rows.map(toCustomer);
}

export async function getCustomerRow(user: PublicUser, customerId: string): Promise<CustomerRow | null> {
  const rows = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  if (rows.length === 0) return null;
  if (user.role !== "admin" && rows[0].userId !== user.id) return null;
  return rows[0];
}

export async function getCustomer(user: PublicUser, customerId: string): Promise<Customer | null> {
  const row = await getCustomerRow(user, customerId);
  return row ? toCustomer(row) : null;
}

/** Create a birth profile; resolves the place (throws typed errors) and runs the engine. */
export async function createCustomer(userId: string, input: CreateCustomerRequest): Promise<Customer> {
  let latitude = input.latitude;
  let longitude = input.longitude;
  let timezone = input.timezone;
  let placeText = input.placeText;

  if (latitude == null || longitude == null || !timezone) {
    const place = resolvePlace(input.placeText);
    latitude = place.latitude;
    longitude = place.longitude;
    timezone = place.timezone;
    placeText = `${place.name}, ${place.country}`;
  }

  const birth: BirthInput = {
    name: input.name,
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    placeText,
    latitude,
    longitude,
    timezone,
  };
  const natal = buildNatal(birth);
  const moonLon = natal.positions.find((p) => p.body === "Moon")!.longitude;
  const dasha = buildDashaTimeline(moonLon, input.birthDate);

  const id = randomUUID();
  const now = new Date().toISOString();
  await db.insert(customers).values({
    id,
    userId,
    name: input.name,
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    birthPlace: placeText,
    latitude,
    longitude,
    timezone,
    birthUtc: new Date(`${input.birthDate}T${input.birthTime}:00`).toISOString(),
    status: "READY",
    natalJson: JSON.stringify(natal),
    dashaJson: JSON.stringify(dasha),
    limitationsJson: JSON.stringify([...LIMITATIONS]),
    calculatedAt: now,
  });

  await db.insert(conversations).values({ id: randomUUID(), customerId: id, title: "Welcome" });
  const row = (await db.select().from(customers).where(eq(customers.id, id)).limit(1))[0];
  return toCustomer(row);
}

export async function findConversation(customerId: string): Promise<{ id: string; title: string } | null> {
  const rows = await db.select().from(conversations).where(eq(conversations.customerId, customerId)).limit(1);
  return rows.length ? { id: rows[0].id, title: rows[0].title } : null;
}

export async function ensureConversation(customerId: string): Promise<{ id: string; title: string }> {
  const existing = await findConversation(customerId);
  if (existing) return existing;
  const id = randomUUID();
  await db.insert(conversations).values({ id, customerId, title: "New conversation" });
  return { id, title: "New conversation" };
}

export const _and = and;
