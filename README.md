# Business Copilot

This repository contains the Business Copilot frontend and backend scaffolding.

## Project Structure

- `frontend/` — React + Tailwind UI application
- `backend/` — FastAPI backend service
- `docker-compose.yml` — Local development containers
- `.env.example` — Environment variable templates

## Setup

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Docker

```powershell
docker-compose up --build
```
