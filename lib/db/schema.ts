import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
  plan: text("plan", { enum: ["free", "paid"] }).notNull().default("free"),
  preferredLanguage: text("preferred_language").notNull().default("hinglish"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  birthDate: text("birth_date").notNull(),
  birthTime: text("birth_time").notNull(),
  birthPlace: text("birth_place").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  timezone: text("timezone").notNull(),
  birthUtc: text("birth_utc").notNull(),
  status: text("status", { enum: ["READY", "BLOCKED"] }).notNull().default("READY"),
  natalJson: text("natal_json").notNull(),
  dashaJson: text("dasha_json").notNull(),
  limitationsJson: text("limitations_json").notNull().default("[]"),
  calculatedAt: text("calculated_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  title: text("title").notNull().default("New conversation"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const engineRuns = sqliteTable("engine_runs", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  asOfDate: text("as_of_date").notNull(),
  requestJson: text("request_json").notNull(),
  responseJson: text("response_json").notNull(),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  questionCategory: text("question_category"),
  domainsJson: text("domains_json").notNull().default("[]"),
  convergenceLabel: text("convergence_label"),
  supportingFindingIdsJson: text("supporting_finding_ids_json").notNull().default("[]"),
  uncertaintyNotesJson: text("uncertainty_notes_json").notNull().default("[]"),
  knowledgeStatusSummaryJson: text("knowledge_status_summary_json").notNull().default("{}"),
  engineRunId: text("engine_run_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const statedFacts = sqliteTable("stated_facts", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  messageId: text("message_id"),
  text: text("text").notNull(),
  category: text("category"),
  eventDate: text("event_date"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const aiConclusions = sqliteTable("ai_conclusions", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  messageId: text("message_id"),
  text: text("text").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const calibrationEvents = sqliteTable("calibration_events", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  eventDate: text("event_date").notNull(),
  datePrecision: text("date_precision", { enum: ["day", "month", "year"] }).notNull().default("month"),
  category: text("category").notNull(),
  description: text("description").notNull(),
  confirmed: integer("confirmed", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const predictions = sqliteTable("predictions", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  statement: text("statement").notNull(),
  category: text("category").notNull(),
  windowStart: text("window_start"),
  windowEnd: text("window_end"),
  convergenceLabel: text("convergence_label"),
  source: text("source", { enum: ["app", "legacy_pdf"] }).notNull().default("app"),
  outcome: text("outcome", { enum: ["pending", "hit", "miss", "partial", "unknown"] }).notNull().default("pending"),
  outcomeNotes: text("outcome_notes"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const upgradeRequests = sqliteTable("upgrade_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  message: text("message").notNull().default(""),
  status: text("status", { enum: ["pending", "approved", "declined"] }).notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
