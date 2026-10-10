import { randomUUID } from "node:crypto";
import { db } from "./index";
import { conversations, customers, predictions, users } from "./schema";
import { hashPassword } from "../auth/password";
import { buildNatal } from "../astro/natal";
import { buildDashaTimeline } from "../astro/dasha";
import { LIMITATIONS } from "../astro/constants";
import { SAHAJ_BIRTH } from "../astro/fixture";
import type { PredictionOutcome, PredictionSource } from "../contract";

interface LegacyRow {
  statement: string;
  category: string;
  windowStart: string | null;
  windowEnd: string | null;
}

const LEGACY: LegacyRow[] = [
  { statement: "Career breakthrough", category: "career", windowStart: "2028-02-01", windowEnd: "2028-02-28" },
  { statement: "Marriage (primary window)", category: "relationships", windowStart: "2028-11-01", windowEnd: "2029-02-28" },
  { statement: "Marriage (alternate window)", category: "relationships", windowStart: "2032-01-01", windowEnd: "2032-04-30" },
  { statement: "Next significant car", category: "vehicle", windowStart: "2028-10-01", windowEnd: "2028-12-31" },
  { statement: "EMI manageable", category: "money", windowStart: "2029-05-01", windowEnd: "2029-08-31" },
  { statement: "Property acquisition", category: "property", windowStart: "2031-12-01", windowEnd: "2032-02-28" },
  { statement: "Substantial debt clearance", category: "money", windowStart: "2032-12-01", windowEnd: "2033-05-31" },
  { statement: "First child", category: "family", windowStart: "2033-01-01", windowEnd: "2033-06-30" },
  { statement: "Financial stability", category: "money", windowStart: "2033-05-01", windowEnd: "2033-08-31" },
  { statement: "Sade Sati (Saturn 12th/1st/2nd from Moon)", category: "health", windowStart: "2030-01-01", windowEnd: "2037-12-31" },
  { statement: "Rahu over natal lagna / Ketu over 7th Mars-Rahu", category: "career", windowStart: "2026-01-01", windowEnd: "2027-12-31" },
];

async function seed(): Promise<void> {
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length > 0) {
    console.log("seed: database already seeded, skipping");
    return;
  }

  const adminId = randomUUID();
  await db.insert(users).values({
    id: adminId,
    email: "admin@astroday.app",
    name: "Sahaj Sharma",
    passwordHash: hashPassword("astroday-admin"),
    role: "admin",
    plan: "paid",
    preferredLanguage: "hinglish",
  });

  const demoId = randomUUID();
  await db.insert(users).values({
    id: demoId,
    email: "demo@astroday.app",
    name: "Demo Seeker",
    passwordHash: hashPassword("astroday-demo"),
    role: "user",
    plan: "free",
    preferredLanguage: "hinglish",
  });

  const natal = buildNatal(SAHAJ_BIRTH);
  const moonLon = natal.positions.find((p) => p.body === "Moon")!.longitude;
  const dasha = buildDashaTimeline(moonLon, SAHAJ_BIRTH.birthDate);
  const customerId = randomUUID();
  await db.insert(customers).values({
    id: customerId,
    userId: adminId,
    name: SAHAJ_BIRTH.name,
    birthDate: SAHAJ_BIRTH.birthDate,
    birthTime: SAHAJ_BIRTH.birthTime,
    birthPlace: SAHAJ_BIRTH.placeText,
    latitude: SAHAJ_BIRTH.latitude,
    longitude: SAHAJ_BIRTH.longitude,
    timezone: SAHAJ_BIRTH.timezone,
    birthUtc: "1998-10-12T10:30:00Z",
    status: "READY",
    natalJson: JSON.stringify(natal),
    dashaJson: JSON.stringify(dasha),
    limitationsJson: JSON.stringify([...LIMITATIONS]),
    calculatedAt: new Date().toISOString(),
  });

  await db.insert(conversations).values({
    id: randomUUID(),
    customerId,
    title: "Welcome",
  });

  for (const row of LEGACY) {
    await db.insert(predictions).values({
      id: randomUUID(),
      customerId,
      statement: row.statement,
      category: row.category,
      windowStart: row.windowStart,
      windowEnd: row.windowEnd,
      convergenceLabel: null,
      source: "legacy_pdf" as PredictionSource,
      outcome: "pending" as PredictionOutcome,
      outcomeNotes: "Loaded from the legacy PDF as an auditable hypothesis, not engine output.",
    });
  }

  console.log("seed: created admin + demo users, Sahaj customer and legacy predictions");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("seed failed:", err);
    process.exit(1);
  });
