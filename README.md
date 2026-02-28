# Business Report Agent UI

A Next.js dashboard app that streams markdown responses from the Toolhouse agent and auto-converts final JSON payloads into a business analytics dashboard with cards, tables, and charts.

## Tech stack

- Next.js + React
- Tailwind CSS
- react-markdown
- chart.js + react-chartjs-2
- clsx
- date-fns
- file-saver

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment setup

Copy `.env.local.example` to `.env.local` and configure:

- `TOOLHOUSE_AGENT_URL` for server-side proxy usage
- `NEXT_PUBLIC_TOOLHOUSE_AGENT_URL` for direct browser calls
- `NEXT_PUBLIC_UNSPLASH_IMAGE` (optional background image)
- `NEXT_PUBLIC_DEMO_AGENT_URL` for local demo streaming server

## Strict Report Mode Integration

- Exact trigger phrase: `generate full structured business analytics report`
- The Generate Report button sends that exact phrase and sets `expectJson=true`.
- If a user manually types the exact phrase, the app also switches to strict JSON buffering mode.
- In strict mode, the client buffers stream chunks into `jsonBuffer`, does not render partial JSON/markdown, and only parses when a balanced object is detected or stream completion occurs.
- On parse success, the app appends `Report generated — opening dashboard.` and opens the dashboard.
- On parse failure, the app shows `Agent returned invalid JSON. Ask the agent to retry or try again.` with a Retry action.

## Demo mode (offline-friendly)

1. Start demo streaming server:

```bash
npm run dev-demo
```

2. Start Next.js app:

```bash
npm run dev
```

3. In the UI sidebar, enable `Demo mode`.
4. Click `Generate Report` to exercise strict JSON streaming with `data/fixtures/strict_report.json`.

Fixtures live in `data/fixtures/`:

- `d2c_cupcake.json`
- `private_saas.json`
- `public_co.json`
- `strict_report.json`

## Tests

```bash
npm test
```

This includes `tests/jsonMode.test.js`, which simulates strict-mode chunked streaming and validates buffering, parsing, and dashboard-state population.

## Prompt spec maintenance

- `prompt_full_app_spec.md` now includes the strict Report Mode sysprompt block used for reference.
- If you change the system prompt, update `prompt_full_app_spec.md` and commit.
- Commit link note: include the commit/PR link for this prompt file update in your PR description.

## Vercel deploy

1. Push this repo to GitHub.
2. Import project in Vercel.
3. In Vercel project settings, set env var `TOOLHOUSE_AGENT_URL=https://agents.toolhouse.ai/4e95d8c9-714f-4e6b-a26f-5a445800f04b`.
4. Optionally set `NEXT_PUBLIC_UNSPLASH_IMAGE` for the background image.
5. Deploy (build command is `npm run build`).

### Deployment checklist (recommended)

1. Confirm Vercel uses Node `20+` (project now declares `>=20.9.0`).
2. Keep `TOOLHOUSE_AGENT_URL` configured in all deployed environments (Production/Preview as needed).
3. Do not set `NEXT_PUBLIC_TOOLHOUSE_AGENT_URL` in production unless you explicitly want direct client calls.
4. After deploy, validate:
   - Chat request streams.
   - `X-Toolhouse-Run-ID` is captured.
   - Strict report mode parses JSON and opens dashboard.
5. If streaming fails in browser, keep the app in proxy mode (production defaults to proxy now).

## Security notes

- Optional proxy route: `pages/api/proxy-toolhouse/[[...runId]].js`
- For production, prefer proxying through server-side routes rather than exposing direct agent URLs.
- If adding Google Sheets support, use `spreadsheets.readonly`, avoid persisting OAuth tokens by default, and expose a delete action for stored data.
