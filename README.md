# Financial Advisor (Next.js)

A local-first personal finance app built with Next.js App Router.

It focuses on practical budgeting insights from bank CSV exports, tax-oriented planning (`skatt`), and optimization workflows while keeping user data on-device.

## Highlights

- Dual CSV upload (self + partner) with owner-aware analysis
- Household dashboard with Swedish copy, charts, and alerts
- Fiscal-year comparison uploads (same-year or cross-year) with AI explanations
- Spending pattern intelligence, fluctuation alerts, and buffer health tracking
- Goals planner, subscription optimizer, and savings opportunities
- Swedish tax (`skatt`) pages, checklists, and advisor context
- AI Advisor with local data context + configurable providers (OpenAI, Ollama)
- Privacy-first UX: all data stays in-browser with export/import backups

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Recharts
- Papa Parse
- Zod validation, Prisma-ready structure (schema-first workflow)

## App Routes

- `/` - Dashboard
- `/optimize` - Optimization tools
- `/goals` - Goals planner
- `/skatt` - Tax planning view
- `/ai` - AI advisor
- `/settings` - App settings

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Open:

```text
http://localhost:3000
```

## Available Scripts

```bash
npm run dev    # Start local dev server
npm run build  # Production build
npm run start  # Run production server
npm run lint   # Lint the codebase
```

## Project Structure

- `src/app/*` - App Router pages
- `src/components/budget/*` - Budget UI modules and panels
- `src/lib/*` - Parsing, analysis, optimization, and AI helpers
- `src/types/*` - Shared TypeScript types

## Notes

- Designed for Swedish households and supports local terminology.
- Local-storage persistence by default; export backups via Settings → Data.
- Keep sensitive financial exports out of version control.
- Schema-first backlog targets Prisma + Postgres deployment (see ROADMAP).
