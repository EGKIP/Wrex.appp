# Wrex.app Backend

Run the API locally:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Available routes:

- `GET /health`
- `POST /analyze`
- `POST /waitlist`
- `POST /pro/improve`
- `POST /pro/humanize`
- `POST /pro/grammar-check`
- `POST /pro/rubric-rewrite`
- `POST /pro/templates`
