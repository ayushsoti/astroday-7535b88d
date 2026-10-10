import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { aiSettings, aiUsageLog } from "../db/schema";
import type {
  AiProvider,
  AiTestResult,
  AiUsageEntry,
  AiUsageSummary,
  PublicAiSettings,
  UpdateAiSettingsInput,
} from "../contract";
import {
  buildChatRequest,
  buildModelsRequest,
  isAiProvider,
  normalizeBaseUrl,
  parseChatResponse,
  parseModelsResponse,
  PROVIDER_PRESETS,
  type ProviderConfig,
} from "../llm/provider";

const SINGLETON_ID = "default";
const MAX_LOG_ROWS = 500;

const DEFAULT_MAX_TOKENS = 1800;
const DEFAULT_TEMPERATURE = 0.6;
const DEFAULT_TIMEOUT_MS = 60000;

export interface ResolvedSettings extends ProviderConfig {
  enabled: boolean;
  systemPromptOverride: string;
  fallbackModel: string;
  origin: "database" | "environment";
}

/** Derive a starting configuration from the environment when no DB row exists yet. */
function envDefaults(): ResolvedSettings {
  const ollamaKey = process.env.OLLAMA_API_KEY ?? "";
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
  const provider: AiProvider = ollamaKey ? "ollama" : anthropicKey ? "anthropic" : "ollama";
  const preset = PROVIDER_PRESETS[provider];
  return {
    provider,
    baseUrl: provider === "ollama" ? (process.env.OLLAMA_BASE_URL ?? preset.baseUrl) : preset.baseUrl,
    model: provider === "ollama" ? (process.env.OLLAMA_MODEL ?? preset.model) : preset.model,
    apiKey: ollamaKey || anthropicKey,
    fallbackModel: "",
    maxTokens: DEFAULT_MAX_TOKENS,
    temperature: DEFAULT_TEMPERATURE,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    enabled: true,
    systemPromptOverride: "",
    origin: "environment",
  };
}

/** Load the effective settings — the DB row if present, otherwise environment defaults. */
export async function resolveSettings(): Promise<ResolvedSettings> {
  const rows = await db.select().from(aiSettings).where(eq(aiSettings.id, SINGLETON_ID)).limit(1);
  const row = rows[0];
  if (!row) return envDefaults();
  const provider: AiProvider = isAiProvider(row.provider) ? row.provider : "ollama";
  return {
    provider,
    baseUrl: row.baseUrl || PROVIDER_PRESETS[provider].baseUrl,
    model: row.model || PROVIDER_PRESETS[provider].model,
    apiKey: row.apiKey,
    fallbackModel: row.fallbackModel,
    maxTokens: row.maxTokens,
    temperature: row.temperature,
    timeoutMs: row.timeoutMs,
    enabled: row.enabled,
    systemPromptOverride: row.systemPromptOverride,
    origin: "database",
  };
}

function maskKey(key: string): string {
  if (!key) return "";
  const tail = key.length >= 4 ? key.slice(-4) : "";
  return tail ? `••••${tail}` : "••••••••";
}

function toPublic(cfg: ResolvedSettings, updatedAt: string, updatedBy: string | null): PublicAiSettings {
  return {
    provider: cfg.provider,
    baseUrl: cfg.baseUrl,
    model: cfg.model,
    hasApiKey: cfg.apiKey.length > 0,
    apiKeyHint: maskKey(cfg.apiKey),
    fallbackModel: cfg.fallbackModel,
    maxTokens: cfg.maxTokens,
    temperature: cfg.temperature,
    timeoutMs: cfg.timeoutMs,
    enabled: cfg.enabled,
    systemPromptOverride: cfg.systemPromptOverride,
    updatedAt,
    updatedBy,
    origin: cfg.origin,
  };
}

export async function getAiSettings(): Promise<PublicAiSettings> {
  const rows = await db.select().from(aiSettings).where(eq(aiSettings.id, SINGLETON_ID)).limit(1);
  const cfg = await resolveSettings();
  return toPublic(cfg, rows[0]?.updatedAt ?? new Date().toISOString(), rows[0]?.updatedBy ?? null);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export class AiSettingsError extends Error {}

/** Upsert the singleton settings row from a partial patch. */
export async function updateAiSettings(
  patch: UpdateAiSettingsInput,
  updatedBy: string,
): Promise<PublicAiSettings> {
  const current = await resolveSettings();
  const provider: AiProvider = isAiProvider(patch.provider) ? patch.provider : current.provider;
  const preset = PROVIDER_PRESETS[provider];

  const baseUrl = normalizeBaseUrl(patch.baseUrl ?? current.baseUrl ?? preset.baseUrl);
  if (!isValidHttpUrl(baseUrl)) throw new AiSettingsError("Base URL must be a valid http(s) address.");

  const model = (patch.model ?? current.model).trim();
  if (!model) throw new AiSettingsError("A model name is required.");

  // apiKey: omitted → keep the stored key; empty string → clear it.
  const apiKey = patch.apiKey === undefined ? current.apiKey : patch.apiKey.trim();

  const maxTokens = clamp(Math.round(patch.maxTokens ?? current.maxTokens), 64, 8192);
  const temperature = clamp(patch.temperature ?? current.temperature, 0, 2);
  const timeoutMs = clamp(Math.round(patch.timeoutMs ?? current.timeoutMs), 5000, 180000);

  const values = {
    id: SINGLETON_ID,
    provider,
    baseUrl,
    model,
    apiKey,
    fallbackModel: (patch.fallbackModel ?? current.fallbackModel).trim(),
    maxTokens,
    temperature,
    timeoutMs,
    enabled: patch.enabled ?? current.enabled,
    systemPromptOverride: patch.systemPromptOverride ?? current.systemPromptOverride,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  await db
    .insert(aiSettings)
    .values(values)
    .onConflictDoUpdate({ target: aiSettings.id, set: values });

  const cfg = await resolveSettings();
  return toPublic(cfg, values.updatedAt, updatedBy);
}

const TEST_SYSTEM = "You are a connectivity probe. Reply with exactly one short sentence.";
const TEST_USER = "Say 'connection ok' and nothing else.";

export async function testAiSettings(): Promise<AiTestResult> {
  const cfg = await resolveSettings();
  const started = Date.now();

  if (!cfg.apiKey) {
    return {
      ok: false,
      message: "No API key is set for this provider.",
      latencyMs: 0,
      model: cfg.model,
      provider: cfg.provider,
    };
  }

  try {
    const request = buildChatRequest(cfg, cfg.model, TEST_SYSTEM, TEST_USER);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(cfg.timeoutMs, 30000));
    const res = await fetch(request.url, {
      method: "POST",
      headers: { "content-type": "application/json", ...request.headers },
      body: JSON.stringify({ ...request.body, max_tokens: 512 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const latencyMs = Date.now() - started;

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        ok: false,
        message: `Provider returned ${res.status}. ${summarizeProviderError(detail)}`.trim(),
        latencyMs,
        model: cfg.model,
        provider: cfg.provider,
      };
    }

    const data = await res.json();
    const sample = parseChatResponse(cfg.provider, data);
    return {
      ok: true,
      message: sample ? "Connection succeeded." : "Connection succeeded but the reply was empty.",
      latencyMs,
      model: cfg.model,
      provider: cfg.provider,
      sample: sample.slice(0, 200),
    };
  } catch (err) {
    const latencyMs = Date.now() - started;
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "The provider did not respond before the timeout."
        : "Could not reach the provider. Check the base URL and key.";
    return { ok: false, message, latencyMs, model: cfg.model, provider: cfg.provider };
  }
}

/** Pull a short, safe hint out of a provider error body without leaking the key. */
function summarizeProviderError(body: string): string {
  if (!body) return "";
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } | string; message?: string };
    const message =
      typeof parsed.error === "string" ? parsed.error : parsed.error?.message ?? parsed.message;
    if (message) return message.slice(0, 160);
  } catch {
    /* not JSON */
  }
  return body.slice(0, 160);
}

export async function listAiModels(): Promise<string[]> {
  const cfg = await resolveSettings();
  if (!cfg.apiKey) return [];
  try {
    const { url, headers } = buildModelsRequest(cfg);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    return parseModelsResponse(cfg.provider, data);
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------- usage log */

export interface UsageLogInput {
  provider: string;
  model: string;
  source: "llm" | "fallback";
  ok: boolean;
  latencyMs: number;
  detail?: string;
}

export async function logAiUsage(input: UsageLogInput): Promise<void> {
  try {
    await db.insert(aiUsageLog).values({
      id: crypto.randomUUID(),
      provider: input.provider,
      model: input.model,
      source: input.source,
      ok: input.ok,
      latencyMs: input.latencyMs,
      detail: input.detail ?? null,
    });
    await db.delete(aiUsageLog).where(
      sql`${aiUsageLog.id} NOT IN (SELECT id FROM ai_usage_log ORDER BY created_at DESC LIMIT ${MAX_LOG_ROWS})`,
    );
  } catch {
    // Usage logging must never break an answer.
  }
}

export async function getAiUsageSummary(): Promise<AiUsageSummary> {
  const rows = await db.select().from(aiUsageLog).orderBy(desc(aiUsageLog.createdAt)).limit(MAX_LOG_ROWS);
  const total = rows.length;
  const llm = rows.filter((r) => r.source === "llm").length;
  const fallback = total - llm;
  const okRows = rows.filter((r) => r.ok);
  const avgLatencyMs =
    okRows.length > 0 ? Math.round(okRows.reduce((sum, r) => sum + r.latencyMs, 0) / okRows.length) : 0;

  const recent: AiUsageEntry[] = rows.slice(0, 20).map((r) => ({
    id: r.id,
    provider: r.provider,
    model: r.model,
    source: r.source,
    ok: r.ok,
    latencyMs: r.latencyMs,
    detail: r.detail,
    createdAt: r.createdAt,
  }));

  return {
    total,
    llm,
    fallback,
    successRate: total > 0 ? Math.round((llm / total) * 100) : 0,
    avgLatencyMs,
    recent,
  };
}
