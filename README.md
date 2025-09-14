# Monopereo - A FastAPI and React Monorepo

Welcome to Monopereo! This project is a full-stack application featuring a Python/FastAPI backend and a React/Vite frontend. It has been scaffolded to support deployment across a wide variety of cloud platforms.

## Tech Stack

**Backend:**
- Python
- FastAPI
- Uvicorn

**Frontend:**
- Vite
- React
- Tailwind CSS
- shadcn/ui (ready to be added)

**Deployment & DevOps:**
- Docker & Docker Compose
- Multi-platform support (Vercel, Netlify, Fly.io, Heroku, etc.)
- GitHub Actions for CI/CD

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI app entrypoint
│   │   ├── routes/         # API routers
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # Business logic
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── App.jsx         # Root component
│   │   └── main.jsx        # App entrypoint
│   ├── package.json
│   └── vite.config.js
├── .github/
│   └── workflows/
│       └── deploy.yml      # Example GitHub Action
├── Dockerfile              # For backend service
├── docker-compose.yml
└── ... (other deployment config files)
```

## Local Development Setup

### Prerequisites
- Python 3.9+ and `pip`
- Node.js 18+ and `npm`
- Docker (optional, for containerized development)

### Backend Setup
1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Create a virtual environment:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Run the development server:
    ```bash
    uvicorn app.main:app --reload
    ```
    The backend will be running at `http://localhost:8000`.

### Frontend Setup
1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env.local` file and add the backend API URL:
    ```
    VITE_API_URL=http://localhost:8000
    ```
4.  Run the development server:
    ```bash
    npm run dev
    ```
    The frontend will be running at `http://localhost:5173`.

## Deployment

This project is pre-configured for deployment on multiple platforms. Please refer to the specific configuration file (e.g., `vercel.json`, `fly.toml`) and the platform's documentation for detailed deployment steps. Generally, you will need to:
1.  Connect your Git repository to the platform.
2.  Configure environment variables (like `VITE_API_URL` for the frontend) in the platform's dashboard.
3.  Trigger a deployment.

---
*This project was scaffolded by an AI agent.*
