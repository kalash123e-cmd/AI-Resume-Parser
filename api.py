from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from ai_resume_parser import (
    final_score,
    get_client,
    parse_job_description,
    parse_resume,
    read_resume,
)

MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".docx"}

app = FastAPI(title="ResumeIQ API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/analyze")
async def analyze_resumes(
    job_description: str = Form(...),
    files: list[UploadFile] = File(...),
) -> dict[str, Any]:
    description = job_description.strip()
    if not description:
        raise HTTPException(status_code=422, detail="Add a job description before analyzing.")
    if len(description) > 20_000:
        raise HTTPException(status_code=422, detail="The job description must be under 20,000 characters.")
    if not files:
        raise HTTPException(status_code=422, detail="Upload at least one PDF or DOCX resume.")

    for file in files:
        suffix = Path(file.filename or "").suffix.lower()
        if suffix not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=415,
                detail=f"{file.filename or 'A file'} is not supported. Upload PDF or DOCX resumes.",
            )

    try:
        get_client()
        job = parse_job_description(description)
    except ValueError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Could not analyze the job description: {error}",
        ) from error

    results = []
    with TemporaryDirectory() as temp_dir:
        for index, uploaded_file in enumerate(files):
            filename = uploaded_file.filename or f"resume-{index + 1}"
            suffix = Path(filename).suffix.lower()
            content = await uploaded_file.read(MAX_FILE_SIZE + 1)
            if len(content) > MAX_FILE_SIZE:
                results.append({
                    "filename": filename,
                    "error": "File exceeds the 10 MB upload limit.",
                })
                continue

            path = Path(temp_dir) / f"resume-{index}{suffix}"
            path.write_bytes(content)
            try:
                resume_text = read_resume(path)
                if not resume_text or not resume_text.strip():
                    raise ValueError("No readable text was found in this file.")
                resume = parse_resume(resume_text)
                match = final_score(job, resume)
                results.append({
                    "filename": filename,
                    "name": resume.name or Path(filename).stem,
                    "email": resume.email,
                    "score": match.score,
                    "details": match.details,
                    "resume": resume.model_dump(mode="json"),
                })
            except Exception as error:
                results.append({"filename": filename, "error": str(error)})

    results.sort(key=lambda result: result.get("score", -1), reverse=True)
    return {
        "job": job.model_dump(mode="json"),
        "results": results,
        "total": len(files),
        "successful": sum("score" in result for result in results),
    }
