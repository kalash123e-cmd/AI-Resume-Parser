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

The batch workflow uses the example job description and reads resumes from `resumes/`:

```powershell
.\.venv\Scripts\python.exe ai_resume_parser.py
```

## Contributing

Contributions are welcome. Open an issue or pull request with suggestions, fixes, or improvements.

## Author

Kalash Hayaran
