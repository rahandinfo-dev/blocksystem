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
npm run build
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

Saved projects are stored only in the current browser’s `localStorage`. They are not cloud-synced, do not transfer between devices, and should be exported/backed up before clearing browser data. The application currently uses no environment variables, API keys, database, authentication, or external services.

## Deployment notes

The NRT font is committed at `src/app/fonts/NRT-Reg.ttf` and loaded using `next/font/local`, so it is bundled during a Vercel build. Use the included `.env.example` as a safe reference if environment variables are introduced later. Do not commit `.env` or `.env.local` files.

Deploy with the standard Vercel Next.js preset after running the quality checks above. No deployment configuration, Git remote, or secrets are required by the current application.
