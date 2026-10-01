# BlockSystem

Professional Kurdish Sorani construction calculator for estimating masonry and concrete block quantities. The application is RTL-first, uses the bundled NRT font, and keeps project data in the user's browser.

## Technology

- Next.js 16 with App Router
- React 19 and TypeScript
- Tailwind CSS 4
- Lucide icons
- Node's built-in test runner

## Local development

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Architecture

- `src/features/calculator/types` — typed project and calculation models.
- `src/features/calculator/lib` — pure calculation engine, PDF/export helpers, and default state helpers.
- `src/features/calculator/components` — RTL calculator, results, report, 2D/3D preview, and saved-project UI.
- `src/lib/project-storage.ts` — browser-safe localStorage persistence.
- `src/lib/project-schema.ts` — saved-project migration and schema/engine version metadata.

## Local data and privacy

Editable projects are stored in the current browser's `localStorage`. They are not cloud-synced, do not transfer between devices, and should be exported/backed up before clearing browser data.

## Deployment and offline behaviour

Deploy with the standard Vercel Next.js preset after running the quality checks above. The calculator opens directly and keeps projects on the current device.

BlockSystem registers its service worker only in production. Static application assets and the offline fallback are cached; every `/api/` operation remains network-only. `/api/health/live`, `/api/health/ready`, and `/api/health` provide application health reports.
