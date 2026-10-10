"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders the advisor's answer, which arrives as Markdown, using the app's own
 * typographic scale rather than raw markup. Element overrides keep headings,
 * lists, tables and emphasis consistent with the rest of the reading surfaces.
 */
const components: Components = {
  h1: ({ children }) => (
    <h3 className="mt-4 mb-1.5 font-heading text-sm font-semibold text-foreground first:mt-0">
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h3 className="mt-4 mb-1.5 font-heading text-sm font-semibold text-foreground first:mt-0">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="mt-4 mb-1.5 text-[13px] font-semibold text-foreground first:mt-0">{children}</h4>
  ),
  h4: ({ children }) => (
    <h4 className="mt-3 mb-1 text-[13px] font-semibold text-foreground first:mt-0">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="text-sm leading-relaxed text-foreground/90">{children}</p>
  ),
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
  ul: ({ children }) => (
    <ul className="my-1.5 space-y-1.5 pl-1 [&>li]:relative [&>li]:pl-4">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1.5 list-decimal space-y-1.5 pl-5 marker:text-accent">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-sm leading-relaxed text-foreground/90 before:absolute before:top-[0.6em] before:left-0 before:h-1 before:w-1 before:rounded-full before:bg-accent/70">
      {children}
    </li>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      className="font-medium text-accent underline underline-offset-2 hover:opacity-80"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-accent/50 pl-3 text-sm text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-t border-border" />,
  code: ({ children }) => (
    <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[0.82em] text-foreground/90">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-xl border border-border bg-elevated p-3 text-xs leading-relaxed">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
  th: ({ children }) => (
    <th className="px-2 py-1.5 text-left font-semibold text-foreground/90">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-t border-border/60 px-2 py-1.5 text-muted-foreground">{children}</td>
  ),
};

export function MarkdownAnswer({ content }: { content: string }) {
  return (
    <div className="space-y-2">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
