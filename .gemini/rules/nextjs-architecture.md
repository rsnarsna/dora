# Next.js Production Architecture Rules

> These rules apply to ALL Next.js code in this project. Follow them unconditionally.

## 1. Folder Structure

```
src/
├── app/
│   ├── (marketing)/           # public routes, own layout
│   ├── (app)/                 # authenticated routes, own layout
│   │   └── dashboard/
│   ├── api/                   # route handlers only, thin
│   ├── layout.tsx
│   ├── globals.css
│   └── error.tsx / not-found.tsx / loading.tsx
├── components/
│   ├── ui/                    # dumb, reusable (shadcn-style)
│   └── features/              # feature-specific composites
├── lib/
│   ├── db/                    # drizzle/prisma client + queries
│   ├── auth/
│   ├── validations/           # zod schemas
│   └── utils.ts
├── server/
│   ├── actions/               # server actions, grouped by domain
│   └── services/              # business logic, no framework code
├── hooks/
├── types/
├── config/                    # env, constants, site config
└── middleware.ts
```

## 2. Core Rules

### Rendering
- Server Components by default. `"use client"` only at leaf components that need interactivity/state.
- Never fetch data in client components if it can be done server-side and passed down.
- Use `Suspense` + streaming for anything slow (avoid blocking full page).

### Data
- Server Actions for mutations, not API routes, unless exposing to external clients/webhooks.
- Zod validation at every boundary (server action input, API input, env vars).
- One data-access layer (`lib/db/queries`) — components never call ORM directly.

### State
- URL state for filters/pagination (`nuqs` or searchParams).
- Server state via React Query/SWR only if client-heavy polling needed; otherwise rely on RSC + revalidation.
- Zustand for genuine client-only global state (UI toggles, modals) — avoid Redux.

### Caching/Revalidation
- Explicit `fetch` cache tags (`next: { tags: [...] }`) + `revalidateTag` on mutation.
- Avoid `force-dynamic` unless truly required; prefer ISR/tag-based revalidation.

### Performance
- `next/image` everywhere, explicit width/height.
- `next/font` for font loading, no external font CDNs.
- Route-level code splitting via dynamic imports for heavy client libs (charts, editors).
- Bundle analysis in CI (`@next/bundle-analyzer`) with size budgets.

### Type & Config Safety
- `strict: true` in tsconfig, no `any`.
- Env validated via `zod` at build/runtime (`@t3-oss/env-nextjs`).
- Path aliases (`@/*`) enforced via eslint import rules.

### Error Handling
- `error.tsx` per route segment, not just root.
- Server actions return typed `{ data, error }` results, never throw to client.

### Security
- CSRF handled via server actions' built-in origin check — don't disable.
- Rate limit mutations (Upstash/Redis) at action level, not just middleware.
- Sanitize all user-generated HTML (never `dangerouslySetInnerHTML` raw).

### Testing/CI
- Vitest for unit, Playwright for e2e critical paths only.
- Typecheck + lint + build as required CI gates before merge.

## 3. Stack (minimal, efficient)

| Layer | Choice |
|---|---|
| ORM | Drizzle (lighter than Prisma, edge-compatible) |
| DB | Postgres (Neon/Supabase) |
| Auth | Auth.js or Clerk |
| Styling | Tailwind + shadcn/ui |
| Forms | react-hook-form + zod |
| Deployment | Vercel (or self-host w/ standalone output) |
| Monitoring | Sentry + Vercel Analytics |

## 4. Non-negotiables
- No client component fetching data that server could've passed as props.
- No business logic in route handlers/components — lives in `server/services`.
- No unvalidated input crossing a server boundary.
- One source of truth for env vars, typed and validated.
