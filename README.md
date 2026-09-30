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
