import type { AiProvider } from "../contract";

/**
 * Provider abstraction for the admin AI console.
 *
 * Three shapes are supported, all sharing one request builder so the console can
 * swap providers without touching the answer pipeline:
 *   - anthropic         → native Messages API  (x-api-key, /v1/messages)
 *   - ollama            → hosted Ollama, Anthropic-compatible API (Bearer, /v1/messages)
 *   - openai-compatible → any /v1/chat/completions endpoint (Bearer)
 */
export interface ProviderConfig {
  provider: AiProvider;
  baseUrl: string;
  model: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
}

interface ProviderPreset {
  label: string;
  baseUrl: string;
  model: string;
  hint: string;
}

export const PROVIDER_PRESETS: Record<AiProvider, ProviderPreset> = {
  ollama: {
    label: "Ollama Cloud",
    baseUrl: "[REDACTED]",
    model: "[REDACTED]",
    hint: "Hosted Ollama models through the Anthropic-compatible API (Bearer key).",
  },
  anthropic: {
    label: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    model: "claude-sonnet-4-5",
    hint: "Claude models through the native Messages API (x-api-key).",
  },
  "openai-compatible": {
    label: "OpenAI-compatible",
    baseUrl: "https://api.openai.com",
    model: "gpt-4o-mini",
    hint: "Any /v1/chat/completions endpoint — OpenAI, Groq, Together, a local server.",
  },
};

export const PROVIDER_KINDS: AiProvider[] = ["ollama", "anthropic", "openai-compatible"];

export function isAiProvider(value: unknown): value is AiProvider {
  return value === "ollama" || value === "anthropic" || value === "openai-compatible";
}

export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export interface BuiltRequest {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

/** Build the provider-specific chat request for a single system + user turn. */
export function buildChatRequest(
  cfg: ProviderConfig,
  model: string,
  system: string,
  userContent: string,
): BuiltRequest {
  const base = normalizeBaseUrl(cfg.baseUrl);

  if (cfg.provider === "openai-compatible") {
    return {
      url: `${base}/v1/chat/completions`,
      headers: { authorization: `Bearer ${cfg.apiKey}` },
      body: {
        model,
        max_tokens: cfg.maxTokens,
        temperature: cfg.temperature,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
      },
    };
  }

  // anthropic + ollama share the Messages shape.
  const headers: Record<string, string> =
    cfg.provider === "anthropic"
      ? { "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" }
      : { authorization: `Bearer ${cfg.apiKey}`, "anthropic-version": "2023-06-01" };

  return {
    url: `${base}/v1/messages`,
    headers,
    body: {
      model,
      max_tokens: cfg.maxTokens,
      temperature: cfg.temperature,
      system,
      messages: [{ role: "user", content: userContent }],
    },
  };
}

/** Extract the assistant text from a provider response, tolerant of both shapes. */
export function parseChatResponse(provider: AiProvider, data: unknown): string {
  const payload = data as {
    content?: { type?: string; text?: string }[];
    choices?: { message?: { content?: string } }[];
  };

  if (provider === "openai-compatible") {
    return (payload.choices?.[0]?.message?.content ?? "").trim();
  }

  return (payload.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("")
    .trim();
}

/** Endpoint + headers used to enumerate available models for a provider. */
export function buildModelsRequest(cfg: ProviderConfig): { url: string; headers: Record<string, string> } {
  const base = normalizeBaseUrl(cfg.baseUrl);
  if (cfg.provider === "ollama") {
    return { url: `${base}/api/tags`, headers: { authorization: `Bearer ${cfg.apiKey}` } };
  }
  if (cfg.provider === "anthropic") {
    return {
      url: `${base}/v1/models`,
      headers: { "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" },
    };
  }
  return { url: `${base}/v1/models`, headers: { authorization: `Bearer ${cfg.apiKey}` } };
}

/** Parse a model-list response from any provider shape. */
export function parseModelsResponse(provider: AiProvider, data: unknown): string[] {
  const payload = data as {
    models?: { name?: string; model?: string }[];
    data?: { id?: string }[];
  };

  if (provider === "ollama") {
    return (payload.models ?? [])
      .map((m) => m.name ?? m.model ?? "")
      .filter((name) => name.length > 0)
      .sort((a, b) => a.localeCompare(b));
  }

  return (payload.data ?? [])
    .map((m) => m.id ?? "")
    .filter((id) => id.length > 0)
    .sort((a, b) => a.localeCompare(b));
}
