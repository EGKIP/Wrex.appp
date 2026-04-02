# Wrex.app — Backend

FastAPI backend deployed as Vercel serverless functions. Handles AI scoring, Pro rewrites, Stripe billing, and Supabase auth.

---

## Local setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload   # → http://localhost:8000
```

Create `backend/.env`:
```
WREX_SUPABASE_URL=
WREX_SUPABASE_SERVICE_KEY=
WREX_STRIPE_SECRET_KEY=
WREX_STRIPE_PRICE_ID=
WREX_STRIPE_WEBHOOK_SECRET=
WREX_OPENAI_API_KEY=
```

Stripe webhook (local):
```bash
stripe listen --forward-to localhost:8000/pro/webhook
```

---

## Routes

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | none | Uptime check |
| POST | `/analyze` | optional | AI-pattern score + rubric. Free: 500 words, Pro: 2,000 words |
| POST | `/grammar-check` | none | LanguageTool pass |
| GET | `/history` | JWT | User analysis history |
| POST | `/pro/improve` | Pro JWT | GPT-4o mini sentence suggestions |
| POST | `/pro/humanize` | Pro JWT | Full tone-shift rewrite |
| POST | `/pro/rubric-rewrite` | Pro JWT | Rubric-aligned rewrite |
| POST | `/pro/checkout` | JWT | Stripe embedded checkout session |
| POST | `/pro/billing-portal` | JWT | Stripe Customer Portal session (manage/cancel) |
| POST | `/pro/webhook` | Stripe-sig | Handles `customer.subscription.created/deleted` |

---

## Word limits

Enforced in both `free_routes.py` (backend) and `AnalyzerSection.tsx` (frontend):

| Tier | Limit |
|---|---|
| Free | 500 words |
| Pro | 2,000 words |
