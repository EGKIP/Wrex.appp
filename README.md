# Wrex.app

> **Write to your rubric. Every time.**

A writing coach for students — not just an AI detector. Wrex scores your draft against your assignment rubric, flags weak sentences, checks grammar, and (for Pro) rewrites your text to actually hit your criteria.

---

## What it does

| Tier | Feature |
|---|---|
| **Free** | AI-pattern score (0–100), flagged sentences with signal strength, rubric alignment check, writing tips, grammar & spelling highlights (LanguageTool) |
| **Pro ($9/mo)** | Sentence-level improvement suggestions, full humanized rewrite, rubric-aligned rewrite — all powered by GPT-4o mini |

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | FastAPI + Pydantic v2 + Uvicorn |
| Auth & DB | Supabase (Postgres + JWT) |
| Payments | Stripe Checkout + webhook |
| AI (Pro) | OpenAI GPT-4o mini |
| Grammar (Free) | LanguageTool public API |

---

## Local dev

**Frontend**
```bash
npm install
npm run dev          # http://localhost:5173
```

**Backend**
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload   # http://localhost:8000
```

**Required env — `backend/.env`**
```
WREX_SUPABASE_URL=
WREX_SUPABASE_SERVICE_KEY=
WREX_STRIPE_SECRET_KEY=
WREX_STRIPE_WEBHOOK_SECRET=
WREX_OPENAI_API_KEY=
```

**Stripe webhook (local)**
```bash
stripe listen --forward-to localhost:8000/pro/webhook
```

---

## API routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/analyze` | optional | AI score + rubric check |
| POST | `/grammar-check` | none | LanguageTool grammar pass |
| GET | `/history` | required | User's past analyses |
| POST | `/pro/improve` | Pro | GPT-4o mini improvement suggestions |
| POST | `/pro/humanize` | Pro | Full humanized rewrite |
| POST | `/pro/rubric-rewrite` | Pro | Rewrite aligned to rubric criteria |
| POST | `/pro/checkout` | required | Create Stripe checkout session |
| POST | `/pro/webhook` | Stripe sig | Handle subscription events |

---

## Project structure

```
src/
  components/       React UI components
  lib/api.ts        Typed API client
  types.ts          Shared TypeScript types

backend/app/
  api/              Route handlers (free, pro, auth, history)
  services/
    free_detector/  Local NLP scorer (no API needed)
    rubric_matcher/ Keyword-based rubric alignment
    pro_writer/     GPT-4o mini services (improve, humanize, rubric rewrite)
  core/             Config, auth, rate limiting, logging
  schemas/          Pydantic request/response models
```
