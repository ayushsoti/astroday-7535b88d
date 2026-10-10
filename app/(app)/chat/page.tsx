"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { MessageCircle, RefreshCw, Send } from "lucide-react";
import { API, type AskResponse, type ChatMessage, type Conversation } from "@/lib/contract";
import { fetchJson, RequestError } from "@/lib/client/api";
import { useCustomers } from "@/components/customer-provider";
import { AnswerCard } from "@/components/chat/answer-card";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

const QUICK_PROMPTS = ["Aaj kya karu?", "Next 6 months", "Kab shaadi hogi?", "Career"] as const;

function errorMessage(err: unknown): string {
  if (err instanceof RequestError) return err.message;
  return err instanceof Error ? err.message : "Something went wrong.";
}

export default function ChatPage() {
  const { selected, loading: customersLoading, error: customersError, refresh } = useCustomers();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<{ customerId: string; message: string } | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<{ question: string; pendingId: string; message: string } | null>(null);
  const [answerSources, setAnswerSources] = useState<Record<string, "llm" | "fallback">>({});
  const [answerAnalysis, setAnswerAnalysis] = useState<Record<string, AskResponse["analysis"]>>({});
  const endRef = useRef<HTMLDivElement | null>(null);

  const customerId = selected?.id ?? null;

  const load = useCallback(async (id: string) => {
    try {
      const { conversations } = await fetchJson<{ conversations: Conversation[] }>(API.conversations(id));
      const conversation = conversations[0] ?? null;
      if (!conversation) {
        setConversationId(null);
        setMessages([]);
        setLoadError(null);
        setLoadedFor(id);
        return;
      }
      const { messages: rows } = await fetchJson<{ messages: ChatMessage[] }>(API.messages(conversation.id));
      setConversationId(conversation.id);
      setMessages(rows);
      const loadedAnalysis: Record<string, AskResponse["analysis"]> = {};
      for (const row of rows) {
        if (row.analysis) loadedAnalysis[row.id] = row.analysis;
      }
      setAnswerAnalysis((prev) => ({ ...prev, ...loadedAnalysis }));
      setLoadError(null);
      setLoadedFor(id);
    } catch (err) {
      setLoadError({ customerId: id, message: errorMessage(err) });
    }
  }, []);

  useEffect(() => {
    if (!customerId) return;
    void load(customerId);
  }, [customerId, load]);

  useEffect(() => {
    if (messages.length === 0 && !sending) return;
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, sending]);

  const send = useCallback(
    async (question: string, pendingId?: string) => {
      const text = question.trim();
      if (!text || !customerId || sending) return;
      setFailed(null);
      setInput("");
      setSending(true);
      const id = pendingId ?? `pending-${Math.random().toString(36).slice(2)}`;
      if (!pendingId) {
        const optimistic: ChatMessage = {
          id,
          conversationId: conversationId ?? "",
          role: "user",
          content: text,
          questionCategory: null,
          domains: [],
          convergenceLabel: null,
          supportingFindingIds: [],
          uncertaintyNotes: [],
          knowledgeStatusSummary: {},
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimistic]);
      }
      try {
        const answer = await fetchJson<AskResponse>(API.ask, {
          method: "POST",
          body: JSON.stringify({ customerId, question: text }),
        });
        const assistant: ChatMessage = {
          id: answer.messageId,
          conversationId: conversationId ?? "",
          role: "assistant",
          content: answer.answerText,
          questionCategory: answer.questionCategory,
          domains: answer.domains,
          convergenceLabel: answer.convergenceLabel,
          supportingFindingIds: answer.supportingFindingIds,
          uncertaintyNotes: answer.uncertaintyNotes,
          knowledgeStatusSummary: answer.knowledgeStatusSummary,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistant]);
        setAnswerSources((prev) => ({ ...prev, [assistant.id]: answer.answerSource }));
        setAnswerAnalysis((prev) => ({ ...prev, [assistant.id]: answer.analysis }));
        // The first question creates the conversation on the server.
        if (!conversationId) void load(customerId);
      } catch (err) {
        setFailed({ question: text, pendingId: id, message: errorMessage(err) });
      } finally {
        setSending(false);
      }
    },
    [customerId, conversationId, load, sending],
  );

  let thread: ReactNode;
  if (customersLoading) {
    thread = <ThreadSkeleton />;
  } else if (customersError) {
    thread = (
      <ErrorState message={customersError} onRetry={() => void refresh()} retryLabel="Reload profiles" />
    );
  } else if (!selected) {
    thread = <NoProfileState />;
  } else if (loadError && loadError.customerId === selected.id) {
    thread = <ErrorState message={loadError.message} onRetry={() => void load(selected.id)} retryLabel="Retry" />;
  } else if (loadedFor !== selected.id) {
    thread = <ThreadSkeleton />;
  } else if (messages.length === 0) {
    thread = <EmptyThread onPick={(prompt) => void send(prompt)} disabled={sending} />;
  } else {
    thread = messages.map((message) =>
      message.role === "user" ? (
        <UserBubble key={message.id} message={message} />
      ) : (
        <AnswerCard
          key={message.id}
          message={message}
          answerSource={answerSources[message.id]}
          analysis={answerAnalysis[message.id]}
        />
      ),
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-surface px-4 py-4 sm:px-6">
        <h1 className="font-heading text-xl font-semibold">Chat</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {selected ? `Reading for ${selected.name}` : "Ask about your chart in plain language."}
        </p>
      </header>

      <div className="flex-1 px-4 py-5 sm:px-6">
        <div
          role="log"
          aria-live="polite"
          aria-label="Conversation"
          className="mx-auto flex w-full max-w-3xl flex-col gap-4"
        >
          {thread}
          {sending && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
              <Spinner className="h-3.5 w-3.5" />
              Working through your chart…
            </p>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <footer className="sticky bottom-16 z-10 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur sm:px-6 md:bottom-0">
        <div className="mx-auto w-full max-w-3xl">
          <ul className="mb-3 flex flex-wrap gap-2" aria-label="Quick questions">
            {QUICK_PROMPTS.map((prompt) => (
              <li key={prompt}>
                <button
                  type="button"
                  onClick={() => void send(prompt)}
                  disabled={!selected || sending}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50"
                >
                  {prompt}
                </button>
              </li>
            ))}
          </ul>

          {failed && (
            <div
              role="alert"
              className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-verdict-opposes/40 bg-verdict-opposes/10 px-3 py-2 text-xs text-verdict-opposes"
            >
              <span>{failed.message}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void send(failed.question, failed.pendingId)}
              >
                Retry
              </Button>
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
            className="flex items-end gap-2"
          >
            <label htmlFor="chat-question" className="sr-only">
              Your question
            </label>
            <Textarea
              id="chat-question"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
              rows={2}
              placeholder="Ask about timing, career, relationships…"
              disabled={!selected || sending}
              className="min-h-[52px] flex-1 resize-none"
            />
            <Button
              type="submit"
              size="icon-lg"
              aria-label="Send question"
              disabled={!selected || sending || input.trim().length === 0}
            >
              {sending ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" aria-hidden />}
            </Button>
          </form>
        </div>
      </footer>
    </div>
  );
}

function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] rounded-2xl rounded-br-sm border border-border bg-elevated px-4 py-2.5 text-sm leading-relaxed text-foreground">
        {message.content}
      </p>
    </div>
  );
}

function EmptyThread({ onPick, disabled }: { onPick: (prompt: string) => void; disabled: boolean }) {
  return (
    <Empty className="border border-dashed border-border bg-surface/60">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MessageCircle aria-hidden />
        </EmptyMedia>
        <EmptyTitle>Ask your first question</EmptyTitle>
        <EmptyDescription>
          Pick a starting point or type your own. Every answer arrives with the findings behind it.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <ul className="flex flex-wrap justify-center gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <li key={prompt}>
              <Button type="button" variant="outline" size="sm" onClick={() => onPick(prompt)} disabled={disabled}>
                {prompt}
              </Button>
            </li>
          ))}
        </ul>
      </EmptyContent>
    </Empty>
  );
}

function NoProfileState() {
  return (
    <Empty className="border border-dashed border-border bg-surface/60">
      <EmptyHeader>
        <EmptyTitle>No birth profile yet</EmptyTitle>
        <EmptyDescription>
          Add your birth date, time and place so the chart can be computed before you ask anything.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild size="lg">
          <Link href="/onboarding">Add a profile</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function ErrorState({
  message,
  onRetry,
  retryLabel,
}: {
  message: string;
  onRetry: () => void;
  retryLabel: string;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-2xl border border-verdict-opposes/40 bg-verdict-opposes/10 p-4 text-sm text-verdict-opposes"
    >
      <p>{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        {retryLabel}
      </Button>
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <Skeleton className="ml-auto h-12 w-2/3 rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="ml-auto h-12 w-1/2 rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
