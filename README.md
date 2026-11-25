# ResumeIQ

ResumeIQ parses PDF and DOCX resumes, compares candidates with a job description, and returns a ranked, explainable shortlist using Groq.

## Features

- Extracts structured resume details from PDF and DOCX files.
- Compares candidates with a job description and explains match scores.
- Provides a responsive React dashboard backed by a FastAPI API.
- Keeps the original command-line batch parser available.

## Prerequisites

- Python 3.14 or newer
- Node.js and npm
- A Groq API key

## Run locally

1. From the repository root, create the Python virtual environment and install backend dependencies:

   ```powershell
   py -3.14 -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   ```

   Alternatively, install the Python dependencies with [uv](https://docs.astral.sh/uv/):

   ```powershell
   uv sync
   ```

2. Add your Groq API key to `.env`:

   ```env
   GROQ_API_KEY=your_api_key
   ```

3. Start the API using the project interpreter:

   ```powershell
   .\.venv\Scripts\python.exe main.py
   ```

   The API runs at `http://127.0.0.1:8000`.

4. In a second terminal, install and start the React app:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Open the Vite URL shown in the terminal (usually `http://localhost:5173`).

Upload one or more PDF/DOCX resumes, paste a job description, and choose **Analyze resumes**. Each resume is limited to 10 MB. The backend makes one job-description analysis call and two model calls per successfully processed resume.

## Deploying the frontend to Vercel and API to Railway

The Vite development proxy works only locally. Deploy the FastAPI backend as a separate Railway service before connecting the Vercel frontend.

1. In Railway, create a project from this GitHub repository. Use the repository root as the service root; Railway will build the backend from the included `Dockerfile`.
2. Add these Railway service variables:
   - `GROQ_API_KEY`: your Groq API key (keep it in Railway Variables, never in Git).
   - `FRONTEND_ORIGINS`: your exact Vercel origin, such as `https://your-project.vercel.app`. Add custom or preview origins as comma-separated values.
3. Generate a public Railway domain. Confirm `https://<railway-domain>/api/health` responds with `{"status":"ok"}`.
4. In Vercel, set the project root directory to `frontend` and add `VITE_API_BASE_URL` with the Railway origin, such as `https://your-api.up.railway.app` (no `/api` suffix). Redeploy the frontend after setting this build-time variable.

The frontend reports whether the configured API health endpoint is reachable. The Docker build excludes local resumes and environment files.

The batch workflow uses the example job description and reads resumes from `resumes/`:

```powershell
.\.venv\Scripts\python.exe ai_resume_parser.py
```

## Contributing

Contributions are welcome. Open an issue or pull request with suggestions, fixes, or improvements.

## Author

Kalash Hayaran
