import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { calibrationEvents, predictions } from "../db/schema";
import { getCustomerRow } from "./customers";
import type { CalibrationEvent, Prediction, PredictionOutcome, PublicUser } from "../contract";

type PredictionRow = typeof predictions.$inferSelect;
type CalibrationRow = typeof calibrationEvents.$inferSelect;

export function toPrediction(row: PredictionRow): Prediction {
  return {
    id: row.id,
    customerId: row.customerId,
    statement: row.statement,
    category: row.category,
    windowStart: row.windowStart,
    windowEnd: row.windowEnd,
    convergenceLabel: row.convergenceLabel,
    source: row.source,
    outcome: row.outcome,
    outcomeNotes: row.outcomeNotes,
    createdAt: row.createdAt,
  };
}

export function toCalibration(row: CalibrationRow): CalibrationEvent {
  return {
    id: row.id,
    customerId: row.customerId,
    eventDate: row.eventDate,
    datePrecision: row.datePrecision,
    category: row.category,
    description: row.description,
    confirmed: row.confirmed,
    createdAt: row.createdAt,
  };
}

export async function listPredictions(user: PublicUser, customerId: string): Promise<Prediction[] | null> {
  const customer = await getCustomerRow(user, customerId);
  if (!customer) return null;
  const rows = await db
    .select()
    .from(predictions)
    .where(eq(predictions.customerId, customerId))
    .orderBy(desc(predictions.createdAt));
  return rows.map(toPrediction);
}

export async function updatePredictionOutcome(
  user: PublicUser,
  predictionId: string,
  outcome: PredictionOutcome,
  outcomeNotes: string | null,
): Promise<Prediction | null> {
  const rows = await db.select().from(predictions).where(eq(predictions.id, predictionId)).limit(1);
  if (rows.length === 0) return null;
  const customer = await getCustomerRow(user, rows[0].customerId);
  if (!customer) return null;
  await db
    .update(predictions)
    .set({ outcome, outcomeNotes })
    .where(eq(predictions.id, predictionId));
  const updated = (await db.select().from(predictions).where(eq(predictions.id, predictionId)).limit(1))[0];
  return toPrediction(updated);
}

export async function createCalibrationEvent(
  user: PublicUser,
  input: { customerId: string; eventDate: string; datePrecision?: "day" | "month" | "year"; category: string; description: string; confirmed?: boolean },
): Promise<CalibrationEvent | null> {
  const customer = await getCustomerRow(user, input.customerId);
  if (!customer) return null;
  const id = randomUUID();
  await db.insert(calibrationEvents).values({
    id,
    customerId: input.customerId,
    eventDate: input.eventDate,
    datePrecision: input.datePrecision ?? "month",
    category: input.category,
    description: input.description,
    confirmed: input.confirmed ?? false,
  });
  const row = (await db.select().from(calibrationEvents).where(eq(calibrationEvents.id, id)).limit(1))[0];
  return toCalibration(row);
}

export async function listCalibrationEvents(user: PublicUser, customerId: string): Promise<CalibrationEvent[] | null> {
  const customer = await getCustomerRow(user, customerId);
  if (!customer) return null;
  const rows = await db
    .select()
    .from(calibrationEvents)
    .where(eq(calibrationEvents.customerId, customerId))
    .orderBy(desc(calibrationEvents.eventDate));
  return rows.map(toCalibration);
}
