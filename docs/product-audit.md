# Wrex product audit — Phase 0

Date: 2026-08-07

## Executive summary

Wrex already has the right functional ingredients for a document-first writing product: a live text editor, inline grammar offsets, sentence-level feedback, suggestion acceptance, saved user content, authentication, billing, and metered Pro writing services. The main problem is not missing capability. It is the product model and presentation.

Today Wrex is organized around an **analysis event**. A user pastes text, runs a detector-style analysis, receives a prominent score, then visits separate blocks for results, rewrites, rubric work, and history. The proposed product needs to be organized around a **document that persists while feedback comes and goes**.

The safest restructuring is therefore evolutionary:

1. Introduce a real document model and a stable workspace shell.
2. Extract the existing editor, grammar, analysis, and rewrite logic from the monolithic analyzer.
3. Present those capabilities as contextual review actions inside the document.
4. De-emphasize authenticity scoring, rubric work, pricing, and AI implementation language without deleting the underlying services.

The current warm cream and serif/sans direction is a useful starting point, but the navy/yellow logo, detector score hierarchy, card density, marketing length, and mixed visual vocabulary still conflict with the new positioning.

## Current architecture

| Area | Current implementation | Audit note |
|---|---|---|
| Frontend | React 18, TypeScript, Vite 5 | Appropriate for the redesign; no framework migration needed. |
| Styling | Tailwind CSS 3 plus a 266-line global stylesheet | Tokens exist in both Tailwind and CSS variables and already disagree in places. Consolidate before broad UI work. |
| Routing | No router library; `App.tsx` switches landing/workspace in local state and handles legal paths manually | Adequate for the current site, but insufficient for addressable documents, settings, and reliable reload/back behavior. |
| Main UI composition | `App.tsx` owns auth, billing, history, landing/workspace mode, legal pages, and major modal state | Too much orchestration in one component, though its integrations can be extracted without replacing them. |
| Editor | `AnalyzerSection.tsx` (1,404 lines) plus `GrammarEditor.tsx` | The editor contains analysis, grammar debounce, history loading, rubric input, Pro tools, tone, quota, results, and landing/workspace variants. This is the primary frontend restructuring target. |
| Motion | `motion` package plus custom IntersectionObserver/CSS reveal systems | Two animation systems create avoidable complexity. Keep one restrained system with reduced-motion support. |
| Icons | Lucide and Phosphor | Mixed icon families and weights; standardize during component-system work. |
| Auth | Supabase JS in the browser; email/password, Google OAuth, confirmation, recovery | A separate uncommitted auth-hardening change in the worktree moves callbacks to PKCE and immediate URL cleanup. Keep it isolated from redesign commits and verify it before merging. |
| Backend | FastAPI with Pydantic, SlowAPI, structured logging, CORS | Clear service boundaries and reusable endpoints; no redesign-driven backend rewrite is necessary. |
| Primary database | Supabase/Postgres via the backend service-role client | Stores profiles, submissions, usage/credit data. Only credit tables/RPCs are represented in this repository; core profile/submission schema and policies are not versioned here. |
| Secondary database | SQLite | Waitlist and legacy anonymous-usage tracking only. |
| Writing analysis | Local Python feature extraction/scoring plus rubric matcher | Fast and reusable, but response semantics are detector-led (`score`, `confidence`, `red_flags`). Add an outcome-oriented adapter rather than discarding the engine. |
| Grammar | LanguageTool through `/grammar-check` | Reusable free capability. The frontend already maps character offsets to inline underlines and accepts replacements. |
| Pro writing | OpenAI-backed improve, humanize, and rubric rewrite endpoints | Reusable engines; rename and reorganize their UI around outcomes. Exact-string sentence replacement is fragile and should evolve toward stable ranges/issue IDs. |
| Billing | Stripe embedded checkout, billing portal, webhook, subscription sync | Functional foundation can remain. Upgrade presentation should become contextual and quieter. |
| Usage | Free/Pro word limits plus token-credit RPCs for paid endpoints | Current frontend still carries quota UI for a daily quota system that the backend explicitly marks legacy and does not attach to analysis responses. |
| Deployment | Static Vite frontend on Vercel; FastAPI hosted separately (documented as Render) | Vercel SPA rewrite exists. No Render manifest or infrastructure-as-code file is present. |
| Testing | Four backend smoke tests, a production smoke script, TypeScript/Vite build | No frontend unit tests, auth tests, editor interaction tests, accessibility tests, visual tests, lint script, or checked-in CI workflow. |

## Current product flows

### Anonymous visitor

Landing hero → how it works → pricing → analyzer → prominent authenticity result → FAQ.

The live mobile review found that the editor starts roughly **4,100 px below the top of the page** at 390 px width. Pricing appears before the user reaches the product. This is the opposite of the requested “open Wrex and start writing” experience.

### Signed-in user

Authentication → workspace view → analysis-history sidebar + analyzer → run analysis → results → optional Pro panel.

The workspace looks like a writing surface, but its durable object is still a `submission`. Opening history loads text from an analysis record; there is no document title, document ID in the URL, draft save/update operation, autosave state, or document lifecycle.

### Review and improve

- Grammar runs after a 900 ms debounce and appears as inline textarea-backdrop underlines.
- Authenticity feedback appears primarily in a separate results panel with a large score and clickable sentence blocks.
- Pro suggestions render below the editor and can replace an exact matching sentence.
- Whole-draft “Humanize” and rubric rewrites create separate result cards, then replace the editor text.

Useful behavior exists, but the user repeatedly moves between editor, score card, results sections, and Pro tool sections instead of staying in a single document/review loop.

## UX audit

### Highest-priority issues

1. **The product object is an analysis, not a document.** `submissions` are append-only snapshots limited to the latest 20. This prevents credible document creation, naming, updating, autosave, versioning, and direct links.
2. **Detector semantics dominate.** The UI repeatedly uses score, “voice signal,” confidence, red/amber/green risk, patterns detected, “AI-assisted writing,” scans, and score trends. Even softened labels still make the score the product’s center of gravity.
3. **The editor logic is monolithic.** `AnalyzerSection.tsx` handles too many unrelated states and two product contexts. Any redesign performed inside it will be difficult to test and risky to review.
4. **Feedback is adjacent rather than truly inline.** Grammar is highlighted in the editor, but analysis feedback is reconstructed as sentence buttons in a separate panel. There is no unified issue model, selected issue state, next/previous navigation, category filtering, or reject/dismiss behavior.
5. **The landing page delays the core action.** The hero contains a large mock browser, three metric cards, trust labels, and floating evidence cards; it is followed by process and pricing sections before the real editor.
6. **Pricing appears too early and too often.** Pricing has a primary nav item and full comparison section, and Pro cards/locked surfaces repeat within the workspace. The brief calls for value before monetization.

### Navigation and context

- Landing navigation exposes How it works, Pricing, Try it free, and FAQ. The proposed product can reduce this to brand, sign in/account, and one primary writing action.
- Authenticated navigation is split between a top floating navbar and a history sidebar. Account, home, support, history, upgrade, and usage appear across both.
- `viewMode` is in-memory state rather than a route. Back/reload/deep-link behavior cannot represent a particular workspace or document.
- Legal pages are manual pathname branches inside `App.tsx`; unknown paths silently render the landing page instead of a 404.

### Cards, statistics, and cognitive load

- The landing hero includes three stat-like benefit cards and three floating UI cards before the product is used.
- History exists twice: `HistoryPanel` on the landing analyzer and `WorkspaceSidebar` in the signed-in workspace. Both implement search, scoring metadata, and deletion.
- History promotes average score, best score, total scans, and a trend sparkline. These are analytics patterns that do not help a user finish the current document.
- Results divide score, summary, sentence analysis, tips, patterns, rubric results, and Pro rewrites into multiple bordered containers.
- The workspace Pro area exposes three tool tabs (`Improve`, `Humanize`, `Rewrite`) instead of contextual actions attached to text or document goals.

### Language

Current user-facing language that conflicts with the new direction includes:

- authenticity score
- AI-assisted writing / sounds AI-written
- voice-signal risk
- analysis / re-analyze / scans
- Humanize
- Pro AI credits
- AI writing tools / OpenAI key

Recommended product vocabulary:

- Review or Improve instead of Analyze
- Overview instead of score snapshot
- Needs attention / clear / specific instead of AI risk
- Keep my voice / match my tone instead of Humanize
- Suggestions remaining instead of AI credits where the implementation detail is not necessary
- Documents instead of submissions/history

### Visual system

Strengths:

- Fraunces + Outfit already moves toward editorial expression.
- Warm cream backgrounds and restrained body color are closer to the target than the original pure dashboard palette.
- Focus-visible styles, reduced-motion CSS, a skip link, semantic main/aside landmarks, and responsive drawers provide a useful accessibility base.

Conflicts and inconsistencies:

- The old navy square/yellow-highlight `W` logo still anchors the visual identity.
- Tailwind tokens remain navy/yellow/cool-slate while CSS variables introduce warmer surfaces and a different ink/accent system.
- Heavy rounded cards, floating glass navigation, glow shadows, gradients, blobs, dotted/grid textures, spotlight cards, and shine effects create a designed SaaS landing page rather than a calm writing desk.
- Fraunces is used effectively for expressive headings but also appears in compact utility/card contexts where the hierarchy becomes noisy.
- Google Fonts are loaded through CSS at runtime, adding a third-party request and potential font/layout flash.

### Responsive behavior

Verified at 1440 × 1000 and 390 × 844:

- No horizontal document overflow was detected at 390 px.
- The mobile hero is readable, but its eyebrow runs to the viewport edge and three benefit cards create a long first screen sequence.
- The sticky floating navbar occupies substantial vertical space and overlays content while scrolling.
- Editor and results stack vertically; the selected sentence and its explanation cannot be viewed together on a phone.
- The score receives nearly a full viewport before actionable sentence feedback.
- The authenticated sidebar has desktop rail/drawer behavior, but the core workspace still lacks a purpose-built mobile feedback mode such as editor/review tabs or a bottom sheet.

### Accessibility gaps to verify or fix

- The custom textarea/backdrop technique needs screen-reader and selection/caret regression tests.
- Highlight colors cannot be the only category signal; a unified issue model should expose labels and descriptions programmatically.
- Mobile navigation and custom workspace drawers need focus containment and focus return validation.
- Icon-only history/delete/settings controls need consistent visible tooltips and accessible names.
- The skip link always targets `#analyzer`, including routes where that target may not exist.
- The editor/review redesign needs keyboard issue navigation and accept/reject commands from the outset.

## Reusable functionality to preserve

| Capability | Preserve | Adapt |
|---|---|---|
| Supabase auth and session handling | Yes | Finish and separately verify PKCE callback hardening. Keep auth UI visually compatible until the new shell is ready. |
| Stripe checkout, portal, sync, and webhooks | Yes | Move upgrade prompts to contextual Pro actions and account/plan settings. |
| Local analysis engine | Yes | Map raw score/flags into Overview, Clarity, Flow, Voice, and Structure guidance. Make the raw score secondary or advanced. |
| LanguageTool grammar endpoint | Yes | Normalize matches into the same issue model used by all review categories. |
| Grammar offset highlighting and replacement | Yes | Extract from `GrammarEditor`; improve robustness as the editor evolves. |
| Pro improve suggestions | Yes | Give suggestions IDs/ranges and present them in the contextual feedback panel. |
| Tone/whole-document rewrite | Yes | Rename to outcome-oriented actions and show a reviewable diff before replacement. |
| Rubric matcher and rewrite | Yes | Move under document tools/advanced settings; do not feature it in primary navigation. |
| Saved full text and delete behavior | Temporarily | Use as a migration source/fallback while introducing documents. Do not pretend submissions are documents long term. |
| Auth, profile, and checkout modals | Temporarily | Keep during shell work, then consolidate simple account actions into an account panel. Checkout can remain modal/embedded. |
| Toast provider and modal primitive | Yes | Retheme and standardize; remove decorative success punctuation and ensure action recovery. |
| Legal content and metadata | Yes | Move legal copy out of `App.tsx`; preserve URLs and update brand language later. |

## Consolidation and removal candidates

These are candidates, not deletion instructions.

| Candidate | Recommendation | Reason |
|---|---|---|
| `HistoryPanel.tsx` and history portions of `WorkspaceSidebar.tsx` | Consolidate into one Documents surface | Duplicate search, list, delete, score metadata, and empty/loading states. |
| Landing-page embedded analyzer | Replace with immediate editor entry or a much smaller interactive preview | It duplicates workspace logic and makes `AnalyzerSection` support two contexts. |
| Large authenticity score and history score analytics | Hide behind Overview/advanced details | Scores compete with actionable feedback and reinforce detector positioning. |
| Free-vs-paid section in the primary landing flow | Move lower, reduce, or move to a dedicated pricing route | Users should experience writing value first. |
| Rubric input/presets in the core editor | Move to Document tools → Rubric | Useful but not core. |
| Pro tool tabs | Replace with contextual Improve actions and a compact document-level menu | Current structure feels like a feature marketplace. |
| Backend `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me` routes | Audit for removal after confirming no external clients | The frontend authenticates directly with Supabase; these duplicate the auth surface. |
| Waitlist client/API/model | Remove if the launch waitlist is no longer active | `joinWaitlist`, `WaitlistEntry`, and list helpers have no frontend caller. |
| Legacy daily quota module and quota UI | Remove or place behind an explicit future flag | Backend documentation says it is not wired to `/analyze`, yet UI types and navbar states remain. |
| `template_service.py` | Remove or implement only when a real template feature exists | It is a two-line placeholder with no product behavior. |
| Mixed Lucide/Phosphor dependencies | Standardize on one system or a tiny custom editorial set | Visual consistency and bundle simplicity. |
| Dual CSS/JS reveal systems | Consolidate | Reduced complexity and calmer motion. |

## Data-model gap: submissions are not documents

A document-first product needs a durable record separate from an analysis run.

Proposed minimum model:

### `documents`

- `id`
- `user_id`
- `title`
- `content`
- `created_at`
- `updated_at`
- `last_opened_at`
- optional `archived_at`
- optional `word_count`

### `document_reviews`

- `id`
- `document_id`
- `content_version` or content hash
- raw analysis response
- created timestamp
- optional model/engine version

### `document_issues`

Initially this can remain client-derived from a review response. If persistence becomes useful, store stable issue IDs, category, range, original text, explanation, replacement, status, and review ID.

### Future voice profile

Reserve product and API boundaries now, but do not build retrieval/embedding infrastructure in this phase. A later schema can separate `voice_profiles`, `voice_samples`, processing status, extracted traits, exclusions, and deletion state. Original samples should have explicit retention/deletion rules and never be mixed into general document history implicitly.

Migration strategy: create documents without deleting `submissions`; allow a submission to seed a new document, then retire analysis-history UI only after document save/open/delete paths are proven.

## Recommended information architecture

### Public

- `/` — concise positioning, product preview, Start writing
- `/pricing` — secondary
- `/privacy`
- `/terms`

### Signed in

- `/documents` — recent documents, search, new document
- `/documents/:id` — primary writing workspace
- Account panel — profile, plan, billing, sign out
- Voice profile — later; initially a clearly marked preview/onboarding surface

### Document workspace

- Left: collapsible documents navigation and search
- Center: title, editor, save state, word count, minimal document actions
- Right: contextual review panel with Overview, Clarity, Grammar, Style, Flow, Voice, Structure
- Mobile: editor/review tabs; documents drawer; selected issue in a bottom sheet or dedicated review view

The raw authenticity score and rubric tools should live under Overview/advanced document tools, not primary navigation.

## Target frontend boundaries

Before visual restructuring, split responsibilities approximately as follows:

- `DocumentWorkspace` — responsive shell only
- `DocumentsNav` — list/search/new/archive/delete
- `DocumentHeader` — title, save state, compact actions
- `WritingEditor` — editable content and highlight rendering
- `ReviewPanel` — category filters, issue list, selected issue, next/previous
- `SuggestionCard` — explain, accept, reject
- `DocumentTools` — rubric, export, later voice settings
- `useDocument` — load/save/autosave/conflict state
- `useDocumentReview` — run/cancel/stale review state
- `useWritingIssues` — normalize grammar, local analysis, and Pro suggestions
- `useAuth`, `usePlan`, and checkout services — integrations kept separate from editor state

Avoid a new all-purpose workspace component that simply recreates `AnalyzerSection` under another name.

## Revised implementation phases

### Phase 0 — audit and safeguards

- Approve this audit and target information architecture.
- Finish the existing auth-hardening work separately.
- Add missing frontend test/lint foundations before high-risk editor extraction.
- Capture baseline desktop/mobile screenshots and core flow checks.

### Phase 1 — design foundation

- Define one warm editorial token source: paper, ink, brown brand, taupe line, restrained state colors.
- Decide the UI font delivery strategy and serif/sans roles.
- Standardize buttons, fields, panels, menus, tabs, tooltips, loading, empty, error, toast, and focus states.
- Create logo concepts as a separate reviewable brand task; do not block shell engineering on the final mark.

### Phase 2 — document domain

- Add versioned Supabase migrations and RLS for documents.
- Add authenticated document CRUD endpoints or a carefully reviewed direct-client/RLS path.
- Add typed frontend document services and tests.
- Seed documents from existing submissions without deleting submission history.

### Phase 3 — app shell and documents

- Introduce addressable document routes.
- Build responsive Documents navigation, new-document flow, search, empty/loading/error states, and account access.
- Keep the current analyzer reachable as a compatibility path until parity is proven.

### Phase 4 — editor extraction

- Extract controlled editor behavior, word count, grammar debounce, save state, and keyboard shortcuts.
- Add autosave with explicit saving/saved/error feedback.
- Verify mobile typing, selection, paste, IME, undo/redo, and screen-reader behavior.

### Phase 5 — unified review and highlighting

- Define a common issue shape and normalize grammar/analysis/Pro responses.
- Render all issue types through one highlight layer.
- Add selection synchronization, filters, accept/reject, next/previous, stale-review behavior, and keyboard navigation.
- Make actionable guidance primary; keep scores secondary.

### Phase 6 — advanced and Pro actions

- Reframe Improve, tone matching, and whole-document rewrites as contextual outcomes.
- Add reviewable diffs for large replacements.
- Move rubric behavior into Document tools.
- Show subtle upgrade prompts only when a locked action is invoked.

### Phase 7 — concise landing page

- Replace the current long sequence with a short hero, Start writing, a credible product view, three concise benefits, restrained trust, and footer.
- Move pricing out of the primary path.
- Align all copy with “Write better. Keep your voice.”

### Phase 8 — voice profile preview

- Add a privacy-forward onboarding/empty state and architecture boundary only.
- Defer extraction, embeddings, RAG, and production upload processing until requirements and retention policy are approved.

### Phase 9 — responsive, accessibility, and cleanup

- Complete editor/review mobile modes and tablet behavior.
- Run keyboard, focus, contrast, reduced-motion, zoom, and screen-reader checks.
- Remove the compatibility analyzer, duplicate history, dead waitlist/quota/auth code, mixed icon system, and obsolete copy only after parity.

### Phase 10 — regression and release

- Build, lint, unit/integration tests, browser flows, backend tests, production smoke, console review, and visual breakpoint checks.
- Verify sign-in, signup confirmation, recovery, document CRUD, grammar, review, suggestion acceptance/rejection, checkout, billing, and migration behavior.

## Testing and delivery gaps to close

Minimum additions before the editor rewrite:

- Frontend unit test runner and DOM testing library
- Tests for text/range replacement and issue normalization
- Auth callback tests for OAuth, signup confirmation, recovery, and URL scrubbing
- Document service tests including autosave errors and stale responses
- Browser tests for anonymous start, authenticated document open/save, review, accept/reject, and mobile panel behavior
- Accessibility checks for core routes and modal/drawer focus
- Lint script and checked-in CI workflow
- Supabase schema migrations for every application table and policies, plus advisor checks

## Immediate next increment

After review of this audit, the recommended first implementation PR is **design foundation + component primitives only**. It should not change backend behavior or remove current flows. In parallel only after the data model is approved, a separate focused PR can introduce document migrations and services. This keeps visual direction, persistence risk, and editor extraction independently reviewable.

