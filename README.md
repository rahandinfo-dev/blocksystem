# سیستەمی بلۆکی براندی یەک

Professional Kurdish Sorani construction calculator for estimating masonry and concrete block quantities. The application is RTL-first, uses the bundled NRT font, and keeps project data in the user’s browser.

## Technology

- Next.js 16 with App Router
- React 19 and TypeScript
- Tailwind CSS 4
- Lucide icons
- Node’s built-in test runner

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

PowerShell environments that block `npm.ps1` can use `npm.cmd run dev` without changing system policy.

## Quality checks

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run test:documents
```

`npm run build` includes the production TypeScript check.

## Architecture

- `src/features/calculator/types` — typed project and calculation models.
- `src/features/calculator/lib` — pure calculation engine, test suite, and default state helpers.
- `src/features/calculator/config` — editable block and mortar assumptions.
- `src/features/calculator/components` — RTL calculator, results, report, preview, and saved-project UI.
- `src/lib/project-storage.ts` — browser-safe localStorage persistence.
- `src/lib/project-schema.ts` — saved-project migration and schema/engine version metadata.

## Calculation methodology

Block quantity is based only on exposed block face dimensions:

1. Gross wall area is calculated from room perimeter × height, or wall length × height.
2. Doors, windows, other openings, and explicit structural deductions are subtracted.
3. Block face area is `(length cm / 100) × (height cm / 100)`.
4. Required blocks are `Math.ceil(net wall area / block face area)`.
5. Waste blocks are rounded upward separately and added to the required quantity.

Block thickness is descriptive and is never used as a blocks-per-square-metre shortcut.

## Local data and privacy

Editable projects are stored in the current browser’s `localStorage`. They are not cloud-synced, do not transfer between devices, and should be exported/backed up before clearing browser data. Issued quotations/reports are immutable server-side snapshots in a persistent verification database. Only protected administrators can issue, retrieve private documents, or revoke records. Public verification pages expose safe metadata only, never customer details or editable project data.

## Deployment notes

The NRT font is committed at `src/app/fonts/NRT-Reg.ttf` and bundled for both web and multilingual PDF rendering. Use `.env.example` and the [verification deployment guide](docs/verification-deployment.md) to configure server-side persistence, administrator access and the trusted verification origin. Do not commit `.env` or `.env.local` files.

Deploy with the standard Vercel Next.js preset after running the quality checks above. The calculator remains usable without verification configuration; issuance fails closed and public verification reports unavailable until its production database and server-only environment variables are configured.

## PWA and offline behaviour

BlockSystem registers its service worker only in production. Supported browsers can offer installation after the user has dismissed neither the browser nor the in-app install option. Static application assets and the offline fallback are cached; project data remains in browser storage as before.

Verification pages and every `/api/` operation are intentionally excluded from the service-worker cache. A verification result is therefore always live, and an unavailable connection is never presented as a valid document. Creating documents, revoking verification, administration and new server-issued records require a successful network request.

When a deployment provides a newer worker, the app presents an **Update now** control. Updating is user-initiated so the app does not reload while someone may have unsaved edits. After changing any Vercel environment variable from `.env.example` (especially `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `VERIFICATION_ADMIN_SECRET`, or `VERIFICATION_PUBLIC_ORIGIN`), redeploy the production site. `VERIFICATION_PUBLIC_ORIGIN` must be the HTTPS production origin without a path.

## Production health and diagnostics

`/api/health/live` is a lightweight process liveness probe. `/api/health/ready` checks verification configuration and performs a bounded persistence probe; it returns `503` when that subsystem is not ready while leaving local calculator functionality unaffected. `/api/health` provides the readiness report without configuration values, credentials, or project data.

Server failures use a safe structured error payload with an `X-Request-ID` correlation header. Structured logs redact secrets, authentication data, tokens and project payloads. A signed-in verification administrator can open the Diagnostics section in the document workspace for the safe version and dependency state. Set the required variables from `.env.example` in Vercel and redeploy before treating verification readiness as production-ready.
