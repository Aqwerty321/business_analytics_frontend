ROLE / SYSPROMPT (Reference Only)

Note: The Toolhouse agent already has this system prompt wired in. This block is included for referential purposes only so we can verify the exact instructed input/output behavior.

ROLE:
You are an Advanced Business Analytics Agent that generates structured, source-traceable business intelligence reports for private and public companies.

=================================================
MODE SWITCHING RULE (CRITICAL)
=================================================
You operate in two modes:

1️⃣ Conversational Mode (Default)
- Behave as a professional business analyst.
- Respond in clean Markdown.
- Provide structured but readable explanations.
- Do NOT output the final JSON schema in this mode.
- You may discuss insights, ask clarifying questions, or summarize findings.
- All orchestration, validation, and deterministic computation rules still apply internally.

2️⃣ Report Generation Mode (STRICT JSON MODE)
If the user's message contains any of the following phrases (case insensitive):
- "generate report"
- "generate the report"
- "generate full report"
- "generate structured report"
- "generate full structured business analytics report"
- "produce final report"
- "output final report"
- "create the full report now"

Then you MUST:
- Switch to Report Generation Mode.
- Output ONLY valid JSON.
- Do NOT include markdown.
- Do NOT include explanations.
- Do NOT include triple backticks.
- Do NOT prepend or append text.
- Do NOT apologize.
- Do NOT explain what you are doing.
- Return strictly the FINAL REPORT JSON SCHEMA object.

=================================================
CORE PRINCIPLES (NON-NEGOTIABLE)
=================================================
1. LLM = interpretation, classification, and schema mapping ONLY.
2. ALL numeric calculations MUST be executed deterministically using code_interpreter (Python/pandas).
3. STRICT separation between:
   - Observed Facts
   - Inferred Insights
   - Assumptions
4. EVERY claim MUST include provenance references mapped to a sources[] array.
5. In Report Generation Mode, output MUST strictly follow the FINAL REPORT JSON SCHEMA defined below.
6. Design for <30s runtime and hackathon reliability. Avoid heavy crawling and full PDF corpus parsing.

=====================================
INPUT CONTRACT
=====================================
Inputs:
- business_name (required)
- website_url (required)
- sheet_url (optional)
- mode ∈ {quick, deep, investor, acquisition}

=====================================
TOOL ORCHESTRATION STRATEGY
=====================================

STAGE 1 — DISCOVERY
Emit event: {stage:"discovery"}
- Attempt metascraper on prioritized paths:
  /, /about, /pricing, /product, /docs, /press, /investors
- If blocked or JS failure, fallback to search using exa_web_search_with_contents.
- Log retrieval_method per source: "http_fetch", "search_fallback".
- Respect rate limits. If blocked → emit error ERR_SCRAPE_BLOCKED.

STAGE 2 — PUBLIC COMPANY DETECTION
Emit event: {stage:"render"}
- Use search to detect ticker & exchange.
- If public:
  - Prefer structured financial data from reliable finance sources surfaced via search.
  - Extract structured metrics (revenue, EBITDA, net income, market cap).
  - DO NOT compute financials via LLM.

STAGE 3 — EXTRACTION (STRICT JSON PER PAGE)
Emit event: {stage:"extract"}
For each page, return:
{
  page_url,
  extracted_schema: {
    revenue_model,
    pricing,
    target_audience,
    positioning,
    product_categories
  },
  source_ids: []
}
LLM maps text → schema only.

STAGE 4 — GOOGLE SHEETS (IF PROVIDED)
Emit event: {stage:"analytics"}
- Use google_sheet_to_csv (read-only).
- Auto-map columns.
- If mapping confidence <0.85 → emit ERR_SHEET_UNMAPPED with recoverable:true.
- Normalize dates & numeric formats.
- Send data to code_interpreter.
- Deterministically compute:
  - MoM growth
  - CAGR
  - volatility
  - segment breakdowns
  - LTV/CAC (if inputs exist)
Return structured raw_metrics and computed_metrics.

STAGE 5 — SYNTHESIS
Emit event: {stage:"synthesis"}
Compose explanations using structured numbers.
Each section MUST include:
{
  explanation,
  evidence:[],
  confidence: number 0-1,
  confidence_breakdown:{
    data_quality,
    source_reliability,
    extraction_confidence,
    inference_penalty
  }
}

=====================================
FINAL REPORT JSON SCHEMA (MANDATORY IN REPORT MODE)
=====================================
{
  executive_summary:{...},
  observed_facts:[],
  inferred_insights:[],
  assumptions:[],
  market_positioning:{...},
  competitive_comparison_table:[],
  swot_analysis:{strengths:[], weaknesses:[], opportunities:[], threats:[]},
  financial_analysis_if_public:{...},
  internal_data_analysis_if_provided:{...},
  risk_assessment:{...},
  30_60_90_day_growth_plan:{...},
  confidence_scores:{section_scores:{}},
  sources:[
    {
      id,
      url,
      snippet,
      retrieval_method,
      credibility_score 0-1,
      fetched_at
    }
  ],
  meta:{
    mode,
    generated_at,
    processing_time_seconds
  }
}

=====================================
CONFIDENCE COMPUTATION
=====================================
Compute section_confidence =
0.35*data_quality +
0.30*source_reliability +
0.20*extraction_confidence -
0.15*inference_penalty
Clamp between 0 and 1.

=====================================
ERROR CODES
=====================================
ERR_SCRAPE_BLOCKED
ERR_NO_DATA
ERR_SHEET_UNMAPPED
ERR_PUBLIC_DATA_MISSING

Each error must return structured JSON with:
{
  error_code,
  message,
  recoverable:boolean,
  suggested_user_action
}

=====================================
SECURITY
=====================================
- Default ephemeral storage (24h)
- Encrypt persisted sheet data
- Request minimal OAuth scopes
- Provide optional PII redaction notice

NEVER fabricate data.
NEVER compute numbers in natural language.
ALWAYS use deterministic analytics for numeric computation............................................................................................................................................


---

Project summary (one line)

Build a polished, Vercel-deployable Next.js app that provides a streaming chat interface to the Toolhouse agent and, when the agent emits a final JSON business report, automatically converts that JSON into a full dashboard (cards, tables, and Chart.js graphs). The UI must feel serious and product-grade.

Tech stack (exact)

Next.js (latest stable)

React

Tailwind CSS

react-markdown

chart.js + react-chartjs-2

clsx

date-fns

file-saver (for JSON export)

Optional: Headless UI (for accessible modals & toggles)

Optional serverless proxy via Next.js API routes

Top-level behavior / network interaction (must be followed exactly)
Toolhouse endpoints (exact)

POST https://agents.toolhouse.ai/4e95d8c9-714f-4e6b-a26f-5a445800f04b
Body: { "message": "the user message" }
Response: streams Markdown chunks; response headers include X-Toolhouse-Run-ID (save value as runId).

PUT https://agents.toolhouse.ai/4e95d8c9-714f-4e6b-a26f-5a445800f04b/<runId>
Body: { "message": "the user message" }
Response: streams Markdown chunks (continuation of the same run).

Streaming rules (required)

Use browser fetch(); read response.body.getReader() and TextDecoder to stream chunks.

As soon as a chunk arrives, append it to the currently streaming message and render (progressive render). Do not wait until stream completes.

On POST response, read resp.headers.get('X-Toolhouse-Run-ID') and save into React state and localStorage as runId. Use this runId for subsequent PUT calls.

Implement AbortController so user can cancel streaming. Provide a Cancel button visible while streaming.

Show loading/typing indicator while streaming and a subtle micro-interaction of the agent bubble receiving text.

Response format note

The agent will stream Markdown. Use react-markdown to render all streamed content progressively (support code blocks, lists, links).

The agent may produce a final structured JSON report in two forms:

As a fenced code block with language json:

```json
{ "executive_summary": {...}, ... }

Or as inline/unfenced JSON starting with { and ending with matching }.

Your client must detect either form, parse into a JSON object, and then switch to dashboard mode.

JSON detection & parsing rules (robust, implementable)

Maintain a parseBuffer string that accumulates chunks for the currently streaming agent message.

For each new chunk:

Append chunk to parseBuffer.

Try to find fenced JSON blocks first:

Regex: /json([\s\S]*?)/i

If found, extract group(1). Attempt JSON.parse(). If parse succeeds → set reportJson = parsed object → remove this block from parseBuffer and stop attempting further chunks for JSON detection for this message.

If no fenced block found, attempt brace-balanced extraction:

Find the index of the first { in parseBuffer. If none, continue accumulating.

From that index, perform brace matching to find the corresponding closing } (account for nested braces). If a candidate substring is found, attempt JSON.parse() on it.

If parse fails, keep accumulating.

If valid JSON parsed:

Mark the chat message as containing a report payload. Display a short agent chat line like: “🔎 Report detected — opening dashboard.” Do not print raw JSON into the chat area.

Save the parsed JSON into currentReport React state and into localStorage under reports.<runId>.

Render dashboard UI mapped from the parsed JSON.

If buffer grows beyond a safe limit (e.g., 2 MB) without successful JSON parse, stop trying to parse JSON and continue rendering as normal markdown (avoid OOM).

Important: be tolerant — the agent may stream JSON in multiple chunks; only parse when the whole JSON block has been accumulated.

Frontend behavior & user flows
Primary flows

Chat-first: user types message → Send → POST → stream chunks → render markdown. Save runId.

Follow-up messages: user types subsequent message → PUT .../<runId> → stream chunks → render.

Generate Report button: button inserts a canonical message (e.g., Please generate the full structured business analytics report now.) and sends. When JSON detected, auto-open dashboard.

Secondary flows (cool demo UX)

Mode selector (Quick / Deep / Investor / Acquisition) near input. When selected, prefix the outgoing message or include as meta in the POST body (e.g., { message, mode }—choose to include as message prefix to avoid backend changes).

Saved runs list (left sidebar): list previous runIds with timestamps; clicking restores transcript and associated parsed report. Store transcripts & parsed reports in localStorage for demo persistence.

Inline override: in dashboard, numeric fields (e.g., revenue estimate) can be edited; editing triggers local recompute of dependent visualizations (no remote call required). Show “manual override” badge.

Frontend architecture & file layout (required)
/ (repo root)
├─ README.md
├─ package.json
├─ next.config.js
├─ tailwind.config.js
├─ postcss.config.js
├─ .env.local.example
├─ pages/
│  ├─ _app.js
│  └─ index.jsx
├─ components/
│  ├─ Chat/
│  │  ├─ ChatWindow.jsx
│  │  ├─ MessageBubble.jsx
│  │  ├─ InputBar.jsx
│  │  └─ PipelineIndicator.jsx
│  ├─ Dashboard/
│  │  ├─ ExecutiveSummaryCard.jsx
│  │  ├─ FactsList.jsx
│  │  ├─ InsightsList.jsx
│  │  ├─ ComparisonTable.jsx
│  │  ├─ SWOTQuad.jsx
│  │  ├─ ChartsPanel.jsx
│  │  └─ SourcesPanel.jsx
│  └─ UI/
│     ├─ Modal.jsx
│     └─ ConfidenceBadge.jsx
├─ lib/
│  ├─ toolhouse.js             // streaming helper for POST / PUT
│  └─ jsonParser.js            // robust JSON detection helpers
├─ styles/
│  └─ globals.css
├─ public/
│  └─ placeholder images
├─ data/
│  └─ fixtures/                // demo fixtures for offline demo mode
└─ utils/
   └─ analytics.js             // local recompute helpers
lib/toolhouse.js — required streaming helper (pseudocode + required features)

Include this helper file verbatim in the project. Copilot should generate working code from it.

// lib/toolhouse.js
export async function startRun({ message, endpoint }) {
  // POST request to start a run. Return { runId, streamReader }
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });

  const runId = resp.headers.get('X-Toolhouse-Run-ID') || null;
  if (!resp.body) throw new Error('No stream in response');

  const reader = resp.body.getReader();
  return { runId, reader, response: resp };
}

export async function continueRun({ message, endpoint, runId }) {
  // PUT to existing runId
  const url = `${endpoint.replace(/\/$/, '')}/${encodeURIComponent(runId)}`;
  const resp = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  const reader = resp.body.getReader();
  return { reader, response: resp };
}

// Helper to read stream
export async function streamToChunks({ reader, onChunk, onDone, onError, signal }) {
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
      if (signal?.aborted) break;
    }
    onDone?.();
  } catch (err) {
    onError?.(err);
  }
}

Copilot: implement this exactly and wire into the Chat components. Use AbortController to support cancel.

JSON → Dashboard mapping (explicit)

Map these expected keys (from FINAL REPORT JSON SCHEMA) to UI components:

executive_summary.thesis → ExecutiveSummaryCard.jsx (display thesis and confidence meter).

executive_summary.confidence → ConfidenceBadge.jsx + radial gauge.

observed_facts[] → FactsList.jsx: each fact shows text, sources[] with clickable link; show timestamp.

inferred_insights[] → InsightsList.jsx: each item shows text, confidence, assumptions[], Show evidence button (opens Modal showing sources snippets).

competitive_comparison_table[] → ComparisonTable.jsx (columns: name | price | segment | differentiation | sources).

swot_analysis → SWOTQuad.jsx (4 columns).

financial_analysis_if_public.latest_quarter → KPI card(s) + show "source" link.

internal_data_analysis_if_provided.computed_metrics.revenue_timeseries → ChartsPanel.jsx: line chart (time series), bar chart (segments), MoM growth chart.

30_60_90_day_growth_plan[] → Timeline cards.

sources[] → SourcesPanel.jsx: renders url, snippet, retrieval_method, credibility_score.

If any field missing or empty, hide the section and show a friendly “No data available” CTA that suggests actions (upload sheet / ask agent for deeper analysis).

UI design cues — color palette, typography, and micro-interactions

Design goal: seriousness, credibility, product maturity. Minimalist, low-contrast polished look. Avoid bright playful palettes.

Typography (serious)

Primary font: Inter (variable) — weights 400, 600, 700.

Secondary: Source Sans Pro or Roboto for body fallback.

Headline sizes: xl = 20–24px bold; h1 = 28–36px for hero, use sparingly.

Line-height: 1.4 for body, 1.2 for headings.

Color palette (Tailwind tokens & hex)

--bg-900 / slate: #0b1220 (deep navy/charcoal) — app background.

--bg-700 / charcoal: #111827 (cards base)

--glass overlay: rgba(255,255,255,0.04) (glass panels).

Primary accent (serious pop): --accent — electric blue: #1f8fff or #0ea5e9.

Secondary accent: muted teal #14b8a6.

Neutral text: #e6eef8 (light) and #94a3b8 (muted).

Danger/low-confidence: amber #f59e0b (for warnings) and #ef4444 for critical.

Confidence high: green #10b981 (success).

Tailwind sample theme (you can include in tailwind.config.js):

module.exports = {
  theme: {
    extend: {
      colors: {
        deep: "#0b1220",
        charcoal: "#111827",
        accent: "#1f8fff",
        mint: "#14b8a6",
        muted: "#94a3b8"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"]
      }
    }
  }
}
Layout & micro interactions

Full-screen unsplash image background (use /pages/index to render background as background-image: url('https://images.unsplash.com/...'); filter: blur(10px) saturate(80%);) with a dark gradient overlay.

Chat & dashboard are glass cards with backdrop-filter: blur(6px) and soft shadows.

Animated confidence badges: radial progress animate when data arrives.

Streaming typing: subtle shimmer and dot animation.

Panels should be responsive and stack vertically on small screens. Use grid with draggable/resizable ability as a bonus.

Accessibility & UX must-haves

Keyboard navigation for input and shortcuts: Enter send, Shift+Enter newline, Ctrl+G generate report.

All actionable elements have accessible labels.

Color contrast: ensure text contrast ratio ≥ 4.5:1 for key text.

Provide alt text for images and aria roles for chat messages.

Demo fixtures & testing

Include data/fixtures/*.json with three sample reports:

d2c_cupcake.json — small D2C business with basic pricing and no public financials.

private_saas.json — private SaaS with internal_data_analysis_if_provided containing revenue_timeseries.

public_co.json — public company with financial_analysis_if_public.

Provide a dev-demo script that simulates streaming: it emits chunks (with setTimeout) to the client so judges can demo without hitting the live agent.

Local env & deployment settings

.env.local.example

TOOLHOUSE_AGENT_URL=https://agents.toolhouse.ai/4e95d8c9-714f-4e6b-a26f-5a445800f04b
NEXT_PUBLIC_UNSPLASH_IMAGE=https://images.unsplash.com/photo-...

package.json snippet (include in repo)

{
  "name": "business-report-agent-ui",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "dev-demo": "node scripts/run_demo_server.js"
  },
  "dependencies": {
    "next": "latest",
    "react": "latest",
    "react-dom": "latest",
    "tailwindcss": "^3.4.0",
    "react-markdown": "^8.0.0",
    "chart.js": "^4.0.0",
    "react-chartjs-2": "^5.0.0",
    "clsx": "^1.2.1",
    "date-fns": "^2.29.0",
    "file-saver": "^2.0.5"
  }
}
Security & privacy (explicit)

For the hackathon/demo, the client may call Toolhouse endpoints directly. Add an optional proxy /api/proxy-toolhouse in Next.js for production use. Comment this option in code.

If enabling Google Sheets integration: use spreadsheets.readonly only. Do not persist OAuth tokens by default. If storing sheet data, encrypt at rest, show retention policy clearly, and provide a delete button.

Redact PII in UI unless user consents (show redaction notice).

Acceptance criteria (automated or manual QA)

Chat streams and renders Markdown progressively.

X-Toolhouse-Run-ID captured on POST and used for subsequent PUTs.

JSON detection works for both fenced and unfenced JSON; when JSON report is parsed, dashboard populates automatically.

Charts render from time-series data (line chart for revenue).

“Generate Report” button inserts the canonical message and triggers full report generation.

Demo mode works offline using fixtures.

UI uses the specified typography and color tokens and presents a serious, product-grade look.

README bullets for Copilot to generate (concise)

Project overview & tech stack.

How to run locally (npm install, npm run dev).

ENV setup: TOOLHOUSE_AGENT_URL, optional NEXT_PUBLIC_UNSPLASH_IMAGE.

How to demo (use dev-demo or fixtures).

Vercel deploy steps (connect repo, set env var TOOLHOUSE_AGENT_URL in Vercel Dashboard).

Security notes (proxy recommendation, OAuth scopes).

Extra “nice-to-have” features (implement if time permits)

Export to PDF (server-side render using @react-pdf/renderer or client-side print styling).

Resizable dashboard panels (use react-grid-layout).

Shareable snapshot link (upload JSON to a pastebin / gist or create blob URL).

Basic analytics “what-if” sandbox: sliders to adjust revenue growth and see reapplied KPI projections instantly.

Final instruction to GitHub Copilot

Generate a full Next.js project consistent with this spec. Create every file in the layout above with functional code. Implement streaming using fetch + response.body.getReader() + TextDecoder. Implement JSON detection and dashboard mapping exactly as specified. Use Tailwind and the color/typography tokens given. Include demo fixtures and a dev-demo script to simulate streaming. Include a clear README and package.json.