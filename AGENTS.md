# Volleyball Fest Website — Agent Guide

This document helps AI agents and new contributors understand the project at a glance.

## What This Project Is

**Volleyball Fest** is a web app for managing and publishing a recreational volleyball league in Cuauhtémoc, Mexico. It serves two audiences:

1. **Public visitors** — landing page, team directory, standings, team signup, schedule
2. **League admins** (authenticated) — team management, season setup, schedule generation/building, live scorecard, PDF exports, CMS-style content

The app was bootstrapped from [react-tanstarter](https://github.com/dotnize/react-tanstarter) but is now a domain-specific league management platform.

### Core Domain Concepts

| Concept             | Description                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| **Season**          | A league period with states: `draft` → `signup_open` → `signup_closed` → `active` → `completed` |
| **Category**        | Skill/division tier (e.g. recreational levels)                                                  |
| **Group**           | Sub-division within a category for a season (A, B, C…)                                          |
| **Team**            | Registered squad with captain info, logo, unavailable dates, players                            |
| **Matchup**         | Two teams scheduled to play; has scores, court, time slot                                       |
| **Schedule Event**  | A game night (date + start time) containing multiple matchups across courts                     |
| **Schedule Config** | Per-season defaults (start time, games per evening) for auto-generation                         |

### Admin Season Workflow

Typical league operator flow:

```
Create season → Open signup → Teams register (public form)
     → Configure groups (drag teams into groups)
     → Generate matchups + auto-schedule (algorithm)
     → Build schedule (drag-and-drop schedule builder, autosave)
     → Set season to active → Enter scores via scorecard
     → Public pages show standings + schedule
```

Key admin routes under `/seasons/$seasonId/`:

- **`/`** — season overview (events + matchups tabs, PDF links)
- **`/configure`** — assign teams to groups (DnD)
- **`/generate`** — generate round-robin matchups and auto-schedule onto dates
- **`/build`** — visual schedule builder (courts, time slots, drag matchups)

## Tech Stack

| Layer           | Technology                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| Framework       | [TanStack Start](https://tanstack.com/start) (React 19 + Vite 8 beta)                                     |
| Routing         | [TanStack Router](https://tanstack.com/router) (file-based)                                               |
| Data fetching   | [TanStack Query](https://tanstack.com/query) + [tRPC v11](https://trpc.io/)                               |
| Forms           | [TanStack Form](https://tanstack.com/form) + Zod                                                          |
| Database        | SQLite via [libsql](https://github.com/tursodatabase/libsql) / [Turso](https://turso.tech/) in production |
| ORM             | [Drizzle ORM](https://orm.drizzle.team/)                                                                  |
| Auth            | [Better Auth](https://www.better-auth.com/) (email/password + GitHub/Google OAuth)                        |
| Styling         | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)                         |
| Server          | [Nitro v3](https://v3.nitro.build/) (alpha) via Vite plugin                                               |
| File storage    | Cloudflare R2 (S3-compatible, team logos)                                                                 |
| PDF             | [@react-pdf/renderer](https://react-pdf.org/)                                                             |
| DnD             | [@dnd-kit](https://dndkit.com/) (schedule builder, group config)                                          |
| Client state    | [Zustand](https://zustand.docs.pmnd.rs/) (schedule builder store)                                         |
| Testing         | [Vitest](https://vitest.dev/)                                                                             |
| Package manager | **pnpm** (preferred; see `package.json` scripts)                                                          |

> **Note:** `README.md` still mentions PostgreSQL from the upstream template. This project uses **Turso/SQLite**. The `docker-compose.yml` Postgres service is leftover template config and is not used by the app.

## Architecture

Follow the layered pattern documented in `.cursor/rules/architecture.md`:

```
Request flow:
  routes/*.tsx  →  tRPC router  →  db/queries  →  db/schema

src/
├── lib/db/schema/*.schema.ts    # Drizzle tables + relations
├── lib/db/queries/*.ts          # Database query functions (db as first arg)
├── validators/*.validators.ts   # Zod schemas
├── trpc/router/*.trpc.ts        # tRPC procedures (publicProcedure / protectedProcedure)
└── routes/*.tsx                 # TanStack Router pages
```

### tRPC Routers

| Router           | Purpose                                                  |
| ---------------- | -------------------------------------------------------- |
| `season`         | Season CRUD and state transitions                        |
| `team`           | Team management, public listing, signup                  |
| `category`       | Category CRUD                                            |
| `group`          | Group assignment per season                              |
| `matchup`        | Matchups, scheduling, scores, standings, public schedule |
| `scheduleConfig` | Per-season scheduling defaults                           |
| `cms`            | Hero/landing page content                                |
| `position`       | Player positions                                         |
| `user`           | User-related procedures                                  |

### Auth

- Config: `src/lib/auth/auth.ts`
- Session enforced on `(authenticated)/` routes via `beforeLoad` redirect to `/login`
- tRPC uses `protectedProcedure` for admin mutations
- Auth API: `src/routes/api/auth.$.ts`
- **Admin access is invite-only:** new accounts require `VITE_SIGNUP_INVITE_CODE` at `/signup` (see `src/routes/(auth-pages)/signup.tsx`). Only manually approved users who know the invite code can register.

## Routes Map

### Public

| Route             | Purpose                                                   |
| ----------------- | --------------------------------------------------------- |
| `/`               | Landing page — hero, upcoming schedule, standings preview |
| `/equipos`        | Public team directory (current active season)             |
| `/posiciones`     | Public standings table                                    |
| `/signup-form`    | Team registration / edit form                             |
| `/signup-success` | Post-signup confirmation                                  |

### Auth pages

| Route     | Purpose     |
| --------- | ----------- |
| `/login`  | Admin login |
| `/signup` | User signup |

### Authenticated (admin)

| Route                  | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `/teams`               | Team management table                                  |
| `/seasons`             | Season list                                            |
| `/seasons/$seasonId/*` | Season workflow (overview, configure, generate, build) |
| `/scorecard`           | Live score entry for a game night                      |
| `/settings`            | App settings                                           |
| `/dashboard`           | Dashboard (if used)                                    |

### API

| Route               | Purpose                      |
| ------------------- | ---------------------------- |
| `/api/trpc/$`       | tRPC handler                 |
| `/api/auth/$`       | Better Auth handler          |
| `/api/upload-image` | R2 image upload (team logos) |
| `/api/event-pdf`    | Event schedule PDF           |
| `/api/team-pdf`     | Team roster PDF              |

## Development Workflows

### Setup

```bash
pnpm install
cp .env.example .env   # fill in DATABASE_URL, DATABASE_AUTH_TOKEN, auth secrets, R2 vars
pnpm db push           # push schema to Turso/local libsql
pnpm dev               # http://localhost:3000
```

### Common Commands

| Command                   | Purpose                                                 |
| ------------------------- | ------------------------------------------------------- |
| `pnpm dev`                | Dev server on port 3000                                 |
| `pnpm build`              | Production build                                        |
| `pnpm start`              | Run production server (`.output/server/index.mjs`)      |
| `pnpm check`              | Format + lint + typecheck                               |
| `pnpm test`               | Run Vitest                                              |
| `pnpm db push`            | Push schema changes (drizzle-kit)                       |
| `pnpm db generate`        | Generate SQL migrations                                 |
| `pnpm db studio`          | Drizzle Studio                                          |
| `pnpm auth:generate`      | Regenerate Better Auth schema after auth config changes |
| `pnpm ui add <component>` | Add shadcn/ui component                                 |

### Database Migrations

- Migrations live in `drizzle/`
- Config: `drizzle.config.ts` (Turso dialect, snake_case casing)
- After schema changes: `pnpm db generate` then apply via `pnpm db push` or migration SQL

### Code Conventions

- Path alias: `~/` → `src/`
- UUIDs generated in query layer (`uuid` v4), stored as `text` primary keys
- Query naming: `getXs`, `getXById`, `createX`, `updateX`, `deleteX`
- Validator naming: `createXSchema`, `updateXSchema`
- UI: shadcn components in `src/components/ui/`
- Tables: TanStack Table patterns in `src/components/tables/<entity>/`

### Git / PR Workflow

- **`main`** is the default branch — do not commit directly to it
- Create **feature branches** for all work, open a **PR**, merge when ready
- Use `gh pr create` for pull requests
- **No CI** for now — run `pnpm check` locally before opening a PR

### Deployment

- **Hosting:** Vercel (via Nitro v3 Vite plugin)
- **Database:** Turso (libsql web client in production)
- **File storage:** Cloudflare R2 (team logos via `/api/upload-image`)
- **Env vars:** see `src/env/server.ts` and `src/env/client.ts`
- Build: `pnpm build` → run with `pnpm start` locally to smoke-test production output

### Language Policy

- **Public pages** (`/`, `/equipos`, `/posiciones`, signup flow): **Spanish** (`es-MX`)
- **Admin area** (`/(authenticated)/*`): **English**
- Do not mix languages within the same surface without explicit request

### Testing Expectations

- Run **`pnpm check`** (format + lint + typecheck) before finishing work
- Vitest exists but is not a gate — only `src/lib/standings/ranking.test.ts` today
- No requirement to add tests unless the task specifically calls for it

## Known Gotchas

- **`season-2026-spring` hardcoded** in some routes (`index.tsx`, `scorecard.tsx`, `posiciones.tsx` loader). Prefer resolving the active season dynamically (as `/equipos` and `/posiciones` do in components).
- **`.env.example` is stale** — missing R2 vars and Turso `DATABASE_AUTH_TOKEN`; use `src/env/server.ts` as source of truth.
- **`docker-compose.yml`** is unused (Postgres template leftover).
- **Public UI is Spanish** (`es-MX`); **admin UI is English** — see Language Policy above.
- **Tests are minimal** — only `src/lib/standings/ranking.test.ts` exists today.

## Project Tree

```
volleyball-fest-website-2/
├── .cursor/rules/
│   └── architecture.md          # Layer conventions (schema → queries → tRPC → routes)
├── drizzle/                       # SQL migrations
│   ├── 0000_init.sql
│   └── 0001_hesitant_king_bedlam.sql
├── public/                        # Static assets (hero, icons, manifest)
├── src/
│   ├── components/
│   │   ├── navbar/                # Public site navigation
│   │   ├── pdf/                   # React-PDF templates (event, team sheets)
│   │   ├── schedule/              # Public schedule display + score table
│   │   ├── schedule-builder/      # Admin drag-and-drop schedule builder (Zustand store)
│   │   ├── standings/             # Standings table components
│   │   ├── tables/                # Admin data tables (events, matchups, seasons, teams)
│   │   └── ui/                    # shadcn/ui primitives
│   ├── env/
│   │   ├── client.ts              # Client-safe env (VITE_*)
│   │   └── server.ts              # Server env validation (T3 env + Zod)
│   ├── hooks/                     # use-file-upload, use-image-upload-handler, use-table-scroll
│   ├── lib/
│   │   ├── auth/                  # Better Auth config, client, middleware
│   │   ├── canvas/                # Schedule image generation
│   │   ├── db/
│   │   │   ├── schema/            # Drizzle schemas (auth, cms, schedule, team)
│   │   │   ├── queries/           # Query functions per domain
│   │   │   └── index.ts           # DB client (libsql dev / libsql web prod)
│   │   ├── standings/             # Ranking algorithm + tests
│   │   └── unavailable-dates.ts   # Team date availability parsing
│   ├── routes/
│   │   ├── (auth-pages)/          # login, signup
│   │   ├── (authenticated)/       # Admin area (teams, seasons, scorecard, settings)
│   │   ├── api/                   # tRPC, auth, upload, PDF endpoints
│   │   ├── __root.tsx             # Root layout
│   │   ├── index.tsx              # Public landing page
│   │   ├── equipos.tsx            # Public teams page
│   │   ├── posiciones.tsx         # Public standings page
│   │   ├── signup-form.tsx        # Team registration
│   │   └── signup-success.tsx
│   ├── trpc/
│   │   ├── router/                # tRPC routers (*.trpc.ts)
│   │   ├── init.ts                # Procedures, context, router factory
│   │   └── react.tsx              # Client hooks (useTRPC)
│   ├── validators/                # Zod schemas per domain
│   ├── routeTree.gen.ts           # Generated route tree (do not edit)
│   ├── router.tsx
│   └── styles.css
├── components.json                # shadcn/ui config
├── drizzle.config.ts
├── eslint.config.js
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## Related Docs

- `.cursor/rules/architecture.md` — detailed layer conventions with code examples
- `README.md` — upstream TanStarter setup (partially outdated for this fork)
- `src/components/navbar/README.md` — navbar component notes
