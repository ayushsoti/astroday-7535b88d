# AGENTS.md

## Project Template — Next.js 16 Base Template

This project was created from the Mayson Next.js base template. Its conventions
differ from stock create-next-app — follow them exactly.

### Layout & paths
- The App Router lives at `app/` in the REPO ROOT — there is NO `src/` directory. Do not create one.
- `components/` (UI), `lib/` (utilities, data layer), `hooks/` (React hooks) all live at the root.
- Path alias: `@/*` → `./*` (root-relative). Example: `@/components/ui/button`, `@/lib/utils`.
- shadcn config lives in `components.json`; the `cn()` helper is in `lib/utils.ts`.

### Next.js 16 — breaking changes
This project uses Next.js 16, which has BREAKING CHANGES vs Next.js 14/15 training data:
- Typed layout/page props (e.g. `LayoutProps<"/">`, `PageProps`) — check the existing
  signatures in `app/layout.tsx` before editing them.
- BEFORE writing or editing any framework API you are not 100% sure of, read the
  relevant guide in `node_modules/next/dist/docs/`. Do not assume Next.js 14/15 patterns.
- Turbopack is the default for dev AND build — never add webpack config or flags.
- Build with node (`node node_modules/.bin/next build`), never with bun — Bun's CJS
  loader crashes Next 16 production builds.

### Styling
- Tailwind CSS v4, CSS-first: `@import "tailwindcss"` in `app/globals.css` — never
  delete that line, never create `tailwind.config.ts`.
- Prefer existing components in `components/` before adding new ones; add shadcn
  components with `bunx shadcn@latest add <name>`.

### Data layer (frontend-only apps)
- When no backend is required, create `lib/store.ts` (NOT `src/lib/store.ts`) with
  typed in-memory stores and realistic seed data.

### Starter files
- `app/page.tsx` is a disposable starter page — overwrite it entirely with the
  requested app; do not preserve the starter layout or branding.
- `app/layout.tsx` already exists (fonts + metadata) — edit the title/description
  in place; do not replace the file.

### Installs & commands
- bun for installs (`bun add <pkg>`, `bunx <cmd>`); node for Next.js build/dev.

