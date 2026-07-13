# SNHU Course Prerequisites Tool

An unofficial course planning tool for Southern New Hampshire University students.

The SNHU Course Prerequisites Tool helps students search for SNHU courses and visualize prerequisite dependency relationships as an interactive flowchart. It is designed to make it easier to understand which courses may need to come before others while planning a degree path.

## Why This Exists

I built this site as a proud SNHU graduate who knows how important course planning can be, especially when transfer credits, prerequisites, and heavy course loads are involved.

During my time at Southern New Hampshire University, I often needed a clearer way to understand which courses depended on others. Because I transferred in several credits and wanted to make the most of each term, knowing prerequisite relationships helped me plan more confidently and avoid surprises.

This tool was designed to help SNHU students visualize course dependencies as they move through their programs. Search for a course to see the classes that may need to come before it, then use that information as a planning aid while mapping out your degree path.

## Disclaimer

This site is unofficial and is intended for informational purposes only.

Course requirements, transfer evaluations, catalog rules, and program requirements can change. Always confirm your academic plan with your SNHU advisor for official guidance.

## Related Project

I also built [SNHU Transfers](https://snhu-transfers.vercel.app), another tool for SNHU students that makes it easier to explore how certifications may transfer in as credits.

## Features

- Search SNHU courses by course ID or title
- Generate prerequisite dependency graphs for one or more courses
- Visualize prerequisite relationships with an interactive flowchart
- Validate entered course IDs before generating a graph
- Display course titles alongside course IDs
- Provide accessible search, status, error, footer, and modal UI patterns
- Include basic SEO support through metadata, `robots.txt`, and `sitemap.xml`

## Tech Stack

- [Next.js](https://nextjs.org/) App Router
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Flow](https://reactflow.dev/) for graph rendering
- [Dagre](https://github.com/dagrejs/dagre) for graph layout
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) for course and prerequisite data
- [Vercel Analytics](https://vercel.com/docs/analytics) for analytics
- [Honeybadger](https://docs.honeybadger.io/lib/javascript/integration/nextjs/) for error monitoring
- [Lucide React](https://lucide.dev/) for icons

## Architecture Overview

This project is a Next.js application hosted on Vercel.

At a high level, the app is organized around a client-side search and visualization experience backed by server-side API routes:

```text
src/
  app/
    api/
      courses/
        route.ts
      courses/search/
        route.ts
      course-tree/[id]/
        route.ts
      course-trees/[ids]/
        route.ts
    layout.tsx
    page.tsx
    robots.ts
    sitemap.ts

  components/
    AppFooter.tsx
    AppHeader.tsx
    AboutModal.tsx
    CourseSearchInput.tsx

  lib/
    courseGraphLayout.tsx
    site.ts
```

## Catalog data operations

This app owns the shared Postgres catalog. Other apps (for example [SNHU Transfers](https://snhu-transfers.vercel.app)) may read through a stable contract, but must not write catalog tables.

| Data | Owner | Notes |
| --- | --- | --- |
| `courses`, `courses_data`, `prerequisites` | snhu-courses | Live catalog |
| `*_stage` staging tables | snhu-courses | Used during refresh |
| `catalog_sync_state`, `catalog_sync_items` | snhu-courses | Sync lease and PID snapshot |
| `catalog_course_lookup` | snhu-courses | Read-only view for other apps |
| `transfer_*` | snhu-transfers | Do not create, drop, or write from this repo |

### Migrate and bootstrap (required)

CLI scripts load `POSTGRES_URL` from `.env.local`, then `.env`. Shell-exported values still win.

```bash
npm run db:migrate
npm run catalog:bootstrap
```

Or pass the URL explicitly:

```bash
POSTGRES_URL='postgresql://...' npm run db:migrate
POSTGRES_URL='postgresql://...' npm run catalog:bootstrap
```

Bootstrap is a manual production step. Until it finishes, cron returns `not_bootstrapped` and will not import the catalog.

Optional local batch tick (forces lease takeover):

```bash
npm run catalog:sync
```

### Cron

Vercel runs `GET /api/cron/catalog-sync` daily at `17 3 * * *` (see [`vercel.json`](vercel.json)). Set `POSTGRES_URL` and `CRON_SECRET` in the Vercel project. The route requires `Authorization: Bearer $CRON_SECRET`. After bootstrap, cron only refreshes when `next_due_at` is due (about every two months).

## Error monitoring (Honeybadger)

Production error reporting uses Honeybadger. Configure these variables in local `.env` / `.env.local` and in **Vercel Production**:

| Variable | Required | Purpose |
| --- | --- | --- |
| `HONEYBADGER_API_KEY` | Recommended for production | Server-side API key used by Node runtime reporting (instrumentation, catalog sync, `onRequestError`). Never expose this as `NEXT_PUBLIC_*`. |
| `NEXT_PUBLIC_HONEYBADGER_API_KEY` | Optional | Enables browser-side reporting from App Router error boundaries and client init. The app builds and runs when this is absent. |

Honeybadger Check-ins are a Business-plan feature and are not used in this project.

Source-map uploading is intentionally disabled. Honeybadger’s `setupHoneybadger()` Next.js wrapper injects a `webpack()` config that is incompatible with Next.js 16’s default Turbopack build, so this app uses the supported manual path instead: server config via `src/instrumentation.ts` / `honeybadger.server.config.js`, and optional browser config via `HoneybadgerClientInit` plus App Router `error.tsx` / `global-error.tsx`.

### Verifying reporting

Do not add a permanently public error endpoint. To verify:

1. Set `HONEYBADGER_API_KEY` in Vercel Production (and optionally `NEXT_PUBLIC_HONEYBADGER_API_KEY`).
2. Deploy, then temporarily trigger a known failure in a private/staging context (for example a one-off preview deploy that throws inside a server action you remove afterward), or wait for a real catalog-sync failure and confirm a notice tagged `catalog-sync` in Honeybadger.
