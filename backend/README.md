# Business Copilot Backend

FastAPI backend scaffold for Business Copilot.

## Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Run

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Migrations

```powershell
alembic revision --autogenerate -m "create initial tables"
alembic upgrade head
```
