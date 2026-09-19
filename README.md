# PaperLens

PaperLens is a runnable document extraction vertical slice. PDFs are uploaded through a JWT-protected FastAPI API, queued through Redis/Celery, processed via PyMuPDF with optional Pillow/Tesseract OCR, and persisted as confidence-scored extractions requiring review.

## Run with Docker (recommended)

Install Docker Desktop with WSL2 integration, then from PowerShell:

```powershell
New-Item -ItemType Directory -Force uploads
docker compose up --build
```

API docs: http://localhost:8000/docs ? UI: http://localhost:5173

Register with `POST /api/auth/register` JSON `{ "email": "you@example.com", "password": "a-strong-password" }`, then sign in. Run migrations with `docker compose exec api alembic upgrade head` (the API also creates tables for a first-run convenience).

The Compose file waits for PostgreSQL and Redis health checks before starting the API and worker. If Docker's CLI is not on `PATH` in PowerShell, use the Docker Desktop binaries at `C:\Program Files\Docker\Docker\resources\bin` or restart the shell after installing Docker Desktop.

## Local backend setup

Python 3.12+ is recommended. Python 3.14 is supported with the current `psycopg` and Pillow pins:

```powershell
py -3.14 -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
backend\.venv\Scripts\python.exe -m pytest backend\tests
```

The local API still requires PostgreSQL and Redis; use Docker Compose for those services.

## Local frontend setup

```powershell
Set-Location frontend
npm ci
npm run build
```

The extraction pipeline is deliberately an abstraction: replace `backend/app/pipeline.py` with domain-specific parsers. No secrets are committed; configure `JWT_SECRET` and connection URLs through environment variables.

## Publish the frontend to GitHub Pages

GitHub Pages can host the static React frontend, but it cannot run FastAPI, PostgreSQL, Redis, or Celery. Deploy those backend services separately (for example on a container host), then add the public API origin as a repository variable named `VITE_API_URL` under **Settings → Secrets and variables → Actions → Variables**.

The included `.github/workflows/deploy-pages.yml` builds and deploys the frontend automatically on pushes to `main`. Enable **Settings → Pages → Source: GitHub Actions** once after creating the repository. The resulting URL is:

```text
https://<github-user>.github.io/<repository-name>/
```

For local development, leave `VITE_API_URL` unset to use `http://localhost:8000`.

## Tests

Backend dependencies are in `backend/requirements.txt`; run `python -m pytest backend/tests` after installing them.
