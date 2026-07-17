# Wrex.app — CLAUDE.md

Wrex is a writing-authenticity workspace for students: paste a draft, get an
authenticity ("voice signal") score, sentence-level flags, grammar fixes, and —
on Pro — AI rewrites (improve / humanize / rubric-rewrite).

**Product voice:** calm, premium, trustworthy. Benchmarks: Linear, Stripe,
Notion. Motion guides attention; it never decorates. Do not pitch Wrex as an
"AI detector bypass" — copy is always about sounding like yourself.

## Stack & deployment

| Layer | Tech | Deploy |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind | Vercel (static, SPA rewrite in `vercel.json`) |
| Backend | FastAPI + Pydantic v2 (`backend/`) | Render — reach it via `VITE_API_BASE_URL`, never `wrex.app/health` |
| Auth/DB | Supabase (Postgres + JWT) | — |
| Payments | Stripe embedded checkout + billing portal + webhook | — |
| AI (Pro) | OpenAI GPT-4o mini | free tier uses local NLP scorer, no API cost |
| Grammar | LanguageTool public API (free, unauthenticated) | — |

## Commands

- `npm run dev` — frontend on :5173 (backend expected on :8000)
- `npm run build` — `tsc -b && vite build`; **run after every frontend change**
- `npm run test:smoke` — build + backend pytest smoke
- Backend: `cd backend && uvicorn app.main:app --reload`; tests via `python3 -m pytest`

## Architecture map

- `src/App.tsx` — root state machine. Two views for logged-in users:
  `viewMode: "workspace" | "landing"`. Anonymous users only see landing.
  Legal pages (`/privacy`, `/terms`) are matched by pathname (no router lib).
  Owns: auth modal, checkout modal, profile modal, history list, quota.
- `src/components/AnalyzerSection.tsx` — the core editor/analyzer (~1,400
  lines). Dual-mode: landing demo (cached sample result, `CACHED_SAMPLE_RESULT`)
  and full workspace (sticky toolbar, result summary, Pro panel). Contains the
  Pro tools (improve / humanize / rubric-rewrite) and rubric input.
- `src/components/GrammarEditor.tsx` — textarea + transparent backdrop div
  overlay for grammar underlines; backdrop and textarea styles must stay
  pixel-identical or highlights misalign.
- `src/components/ResultsPanel.tsx` — score card, sentence highlighter
  (frontend sentence splitter mirrors `backend .../preprocessor.py`), rubric
  criteria, tips.
- `src/components/WorkspaceSidebar.tsx` — icon rail + collapsible history panel
  (desktop) + mobile drawer.
- `src/components/Motion.tsx` — shared motion primitives (`Reveal`,
  `Entrance`, `FloatCard`) built on the `motion` package; all respect
  `useReducedMotion`.
- `src/lib/api.ts` — typed API client; every call goes through
  `fetchWithApiErrors` → `ApiError` (status carried for UI branching:
  402 = credits exhausted, 403 = not Pro, 503 = unreachable/unconfigured).
- `src/hooks/useAuth.ts` — wraps Supabase `onAuthStateChange`; INITIAL_SESSION
  is the source of truth. **Careful:** email-confirmation links carry the token
  in the URL hash — never `replaceState` the hash away before Supabase init
  reads it (see comments in App.tsx).
- `src/context/toast.tsx` + `Toaster.tsx` — global toasts.

Backend (`backend/app/`): `api/` routes → `services/` (free_detector local NLP,
rubric_matcher, pro_writer GPT calls) with `core/` (config from `WREX_*` env
vars, Supabase JWT auth, slowapi rate limiting, credits). Word limits:
free 500 / Pro 2,000 (enforced both ends).

## Design system

Tokens live in `tailwind.config.js` + CSS vars in `src/styles.css`:

- Colors: `navy` #0F172A (primary ink), `accent` #FBBF24 amber (CTA),
  `charcoal` body text, `mist` #F1F5F9 subtle bg. Warm cream page background
  with radial glows + dot grid, set in `styles.css`.
- Fonts: Outfit (sans, body), Fraunces (`font-heading`, serif display),
  JetBrains Mono (`font-stat` for scores/numbers).
- Radii: `rounded-soft/card/modal/input/score`; panels use `.surface-panel`,
  `.ambient-panel`, `.editor-dock`, `.glass-nav` utility classes.
- Score semantics (lower = better): <40 green "reads naturally",
  40–69 amber, ≥70 red. Shared helpers live in `src/lib/score.ts`.
- Focus: global `:focus-visible` amber ring in styles.css — don't remove
  outlines locally.
- Motion durations 150–600ms, ease `[0.22, 1, 0.36, 1]`; everything must
  respect `prefers-reduced-motion` (global CSS kill-switch exists).

## Conventions & gotchas

- No router library — don't add one lightly; landing/workspace is state-based.
- Modals lazy-load via `React.lazy` + `Suspense fallback={null}`.
- `manualChunks` in `vite.config.ts` splits react/motion/supabase/stripe.
- LanguageTool matches carry `offset/length` into the raw text — any text
  mutation must re-map or clear `grammarMatches` (see `applyGrammarFix`).
- Grammar check debounced 900ms, min 50 chars; skips terms in
  `GRAMMAR_IGNORE_TERMS`.
- `resultsStale` marks the score outdated after edits — keep exactly ONE
  visible stale indicator per view.
- Free-tier analysis quota comes back inside `AnalyzeResponse.quota`.
- Payments: after `?checkout=success`, App calls `/pro/sync-subscription`
  because the Stripe webhook may lag.
- Skills for design/frontend work live in `.claude/skills/` (frontend-design,
  ui-ux-pro-max, react-best-practices, motion-framer, web-design-guidelines…).
  `.agents/skills/` is a legacy copy for other tools; keep them in sync if you
  edit one.
