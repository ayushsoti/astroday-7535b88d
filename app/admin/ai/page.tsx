"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Loader2,
  PlugZap,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react";
import {
  API,
  type AiProvider,
  type AiTestResult,
  type AiUsageSummary,
  type PublicAiSettings,
  type UpdateAiSettingsInput,
} from "@/lib/contract";
import { PROVIDER_KINDS, PROVIDER_PRESETS } from "@/lib/llm/provider";
import { fetchJson, RequestError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

function describeError(error: unknown): string {
  if (error instanceof RequestError) return error.message;
  return "Something went wrong. Please try again.";
}

interface FormState {
  provider: AiProvider;
  baseUrl: string;
  model: string;
  fallbackModel: string;
  maxTokens: string;
  temperature: string;
  timeoutMs: string;
  enabled: boolean;
  systemPromptOverride: string;
}

function toForm(settings: PublicAiSettings): FormState {
  return {
    provider: settings.provider,
    baseUrl: settings.baseUrl,
    model: settings.model,
    fallbackModel: settings.fallbackModel,
    maxTokens: String(settings.maxTokens),
    temperature: String(settings.temperature),
    timeoutMs: String(settings.timeoutMs),
    enabled: settings.enabled,
    systemPromptOverride: settings.systemPromptOverride,
  };
}

export default function AdminAiPage() {
  const [settings, setSettings] = useState<PublicAiSettings | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [clearKey, setClearKey] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [usage, setUsage] = useState<AiUsageSummary | null>(null);
  const [test, setTest] = useState<AiTestResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadUsage = useCallback(async () => {
    try {
      const data = await fetchJson<{ summary: AiUsageSummary }>(API.adminAiUsage);
      setUsage(data.summary);
    } catch {
      setUsage(null);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<{ settings: PublicAiSettings }>(API.adminAiSettings);
      setSettings(data.settings);
      setForm(toForm(data.settings));
      setApiKeyDraft("");
      setClearKey(false);
    } catch (err) {
      setSettings(null);
      setForm(null);
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
    void loadUsage();
  }, [loadUsage]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = useCallback((next: Partial<FormState>) => {
    setForm((current) => (current ? { ...current, ...next } : current));
    setNotice(null);
  }, []);

  const onProviderChange = useCallback((provider: AiProvider) => {
    const preset = PROVIDER_PRESETS[provider];
    setForm((current) =>
      current ? { ...current, provider, baseUrl: preset.baseUrl, model: preset.model } : current,
    );
    setModels([]);
    setTest(null);
    setNotice(null);
  }, []);

  const dirty = useMemo(() => {
    if (!settings || !form) return false;
    return (
      JSON.stringify(toForm(settings)) !== JSON.stringify(form) ||
      apiKeyDraft.trim().length > 0 ||
      clearKey
    );
  }, [settings, form, apiKeyDraft, clearKey]);

  const save = useCallback(async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    const payload: UpdateAiSettingsInput = {
      provider: form.provider,
      baseUrl: form.baseUrl,
      model: form.model,
      fallbackModel: form.fallbackModel,
      maxTokens: Number(form.maxTokens),
      temperature: Number(form.temperature),
      timeoutMs: Number(form.timeoutMs),
      enabled: form.enabled,
      systemPromptOverride: form.systemPromptOverride,
    };
    if (clearKey) payload.apiKey = "";
    else if (apiKeyDraft.trim().length > 0) payload.apiKey = apiKeyDraft.trim();

    try {
      const data = await fetchJson<{ settings: PublicAiSettings }>(API.adminAiSettings, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setSettings(data.settings);
      setForm(toForm(data.settings));
      setApiKeyDraft("");
      setClearKey(false);
      setNotice("Settings saved.");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSaving(false);
    }
  }, [form, apiKeyDraft, clearKey]);

  const runTest = useCallback(async () => {
    setTesting(true);
    setTest(null);
    setError(null);
    try {
      const data = await fetchJson<{ result: AiTestResult }>(API.adminAiTest, { method: "POST" });
      setTest(data.result);
      void loadUsage();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setTesting(false);
    }
  }, [loadUsage]);

  const loadModels = useCallback(async () => {
    setLoadingModels(true);
    try {
      const data = await fetchJson<{ models: string[] }>(API.adminAiModels);
      setModels(data.models);
      if (data.models.length === 0) setNotice("No models were returned. Check the key and base URL, then save and retry.");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoadingModels(false);
    }
  }, []);

  const providerOptions = useMemo(() => {
    const names = new Set(models);
    if (form?.model) names.add(form.model);
    if (form?.fallbackModel) names.add(form.fallbackModel);
    return Array.from(names);
  }, [models, form?.model, form?.fallbackModel]);

  if (loading && !form) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="mt-3 h-4 w-80" />
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!form || !settings) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-verdict-opposes/40 bg-elevated px-4 py-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 text-verdict-opposes" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-medium text-verdict-opposes">Could not load AI settings</p>
            <p className="mt-0.5 text-muted-foreground">{error ?? "Please try again."}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const preset = PROVIDER_PRESETS[form.provider];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Bot className="h-5 w-5 text-primary" aria-hidden="true" />
            AI console
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose the model and provider that write the advisor&rsquo;s answers. Changes apply to the next question.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : undefined} aria-hidden="true" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => void runTest()} disabled={testing}>
            {testing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <PlugZap aria-hidden="true" />}
            Test connection
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={saving || !dirty}>
            {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
            Save
          </Button>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant={form.enabled ? "default" : "secondary"}>
          {form.enabled ? "Live" : "Disabled"}
        </Badge>
        <Badge variant="outline">{preset.label}</Badge>
        <Badge variant="outline">
          {settings.origin === "database" ? "Saved config" : "From environment"}
        </Badge>
        {settings.updatedBy ? (
          <span className="text-xs text-muted-foreground">Last changed by {settings.updatedBy}</span>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-xl border border-verdict-opposes/40 bg-elevated px-4 py-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 text-verdict-opposes" aria-hidden="true" />
          <p className="flex-1 text-muted-foreground">{error}</p>
        </div>
      ) : null}

      {notice ? (
        <div
          role="status"
          className="mt-5 flex items-start gap-3 rounded-xl border border-border bg-elevated px-4 py-3 text-sm"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
          <p className="flex-1 text-muted-foreground">{notice}</p>
        </div>
      ) : null}

      {test ? (
        <div
          role="status"
          className={`mt-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            test.ok ? "border-border bg-elevated" : "border-verdict-opposes/40 bg-elevated"
          }`}
        >
          {test.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 text-verdict-opposes" aria-hidden="true" />
          )}
          <div className="flex-1">
            <p className="font-medium">{test.ok ? "Connection OK" : "Connection failed"}</p>
            <p className="mt-0.5 text-muted-foreground">
              {test.message} · {test.model} · {test.latencyMs} ms
            </p>
            {test.sample ? (
              <p className="mt-1 rounded-lg bg-night px-3 py-2 font-mono text-xs text-muted-foreground">
                {test.sample}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Provider &amp; model</CardTitle>
            <CardDescription>{preset.hint}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="ai-provider">Provider</Label>
              <NativeSelect
                id="ai-provider"
                className="w-full"
                value={form.provider}
                onChange={(event) => onProviderChange(event.target.value as AiProvider)}
              >
                {PROVIDER_KINDS.map((kind) => (
                  <NativeSelectOption key={kind} value={kind}>
                    {PROVIDER_PRESETS[kind].label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-base-url">Base URL</Label>
              <Input
                id="ai-base-url"
                value={form.baseUrl}
                onChange={(event) => patch({ baseUrl: event.target.value })}
                placeholder={preset.baseUrl}
                spellCheck={false}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                The endpoint root only — the console appends the provider&rsquo;s path.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="ai-model">Model</Label>
                <button
                  type="button"
                  onClick={() => void loadModels()}
                  disabled={loadingModels}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {loadingModels ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Sparkles className="h-3 w-3" aria-hidden="true" />}
                  Load available models
                </button>
              </div>
              <Input
                id="ai-model"
                list="ai-model-list"
                value={form.model}
                onChange={(event) => patch({ model: event.target.value })}
                placeholder={preset.model}
                spellCheck={false}
                autoComplete="off"
              />
              <datalist id="ai-model-list">
                {providerOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              {models.length > 0 ? (
                <p className="text-xs text-muted-foreground">{models.length} models available.</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-fallback">Backup model (optional)</Label>
              <Input
                id="ai-fallback"
                list="ai-model-list"
                value={form.fallbackModel}
                onChange={(event) => patch({ fallbackModel: event.target.value })}
                placeholder="Used once if the main model fails"
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="ai-key">API key</Label>
              <Input
                id="ai-key"
                type="password"
                value={apiKeyDraft}
                onChange={(event) => {
                  setApiKeyDraft(event.target.value);
                  if (event.target.value) setClearKey(false);
                  setNotice(null);
                }}
                placeholder={settings.hasApiKey ? `Stored — ${settings.apiKeyHint}` : "Paste the provider key"}
                spellCheck={false}
                autoComplete="off"
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {settings.hasApiKey
                    ? "Leave blank to keep the stored key."
                    : "No key stored yet."}
                </p>
                {settings.hasApiKey ? (
                  <button
                    type="button"
                    onClick={() => {
                      setClearKey((v) => !v);
                      setApiKeyDraft("");
                    }}
                    className={`text-xs font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${clearKey ? "text-verdict-opposes" : "text-muted-foreground"}`}
                  >
                    {clearKey ? "Key will be cleared on save" : "Remove stored key"}
                  </button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Behaviour</CardTitle>
              <CardDescription>How the model is called and how much it may write.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
                <div>
                  <Label htmlFor="ai-enabled">Answers live</Label>
                  <p className="text-xs text-muted-foreground">
                    When off, every answer is the offline engine reading.
                  </p>
                </div>
                <Switch
                  id="ai-enabled"
                  checked={form.enabled}
                  onCheckedChange={(checked) => patch({ enabled: checked })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="ai-max-tokens">Max tokens</Label>
                  <Input
                    id="ai-max-tokens"
                    type="number"
                    min={64}
                    max={8192}
                    value={form.maxTokens}
                    onChange={(event) => patch({ maxTokens: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai-temperature">Temperature</Label>
                  <Input
                    id="ai-temperature"
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    value={form.temperature}
                    onChange={(event) => patch({ temperature: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai-timeout">Timeout (ms)</Label>
                  <Input
                    id="ai-timeout"
                    type="number"
                    min={5000}
                    max={180000}
                    step={1000}
                    value={form.timeoutMs}
                    onChange={(event) => patch({ timeoutMs: event.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="ai-prompt">Custom system prompt (optional)</Label>
                <Textarea
                  id="ai-prompt"
                  value={form.systemPromptOverride}
                  onChange={(event) => patch({ systemPromptOverride: event.target.value })}
                  placeholder="Leave blank to use the built-in Astroday prompt. Use {language} to insert the profile's language."
                  rows={5}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Overriding this changes how answers are written. The built-in prompt enforces the
                  why / how-long / what-to-do structure and grounding rules.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent model activity</CardTitle>
              <CardDescription>
                {usage
                  ? `${usage.llm} live · ${usage.fallback} offline · ${usage.successRate}% served by the model`
                  : "No activity recorded yet."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usage && usage.recent.length > 0 ? (
                <ul className="space-y-2">
                  {usage.recent.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{entry.model}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {entry.provider}
                          {entry.detail ? ` · ${entry.detail}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-muted-foreground">{entry.latencyMs} ms</span>
                        <Badge variant={entry.source === "llm" ? "default" : "secondary"}>
                          {entry.source === "llm" ? "live" : "offline"}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ask a question in chat and the model activity will show up here.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
