import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  FileText,
  FileUp,
  FolderOpen,
  LayoutDashboard,
  LoaderCircle,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

const ACCEPTED_TYPES = [".pdf", ".docx"];

function getScoreColor(score) {
  if (score >= 80) return "strong";
  if (score >= 60) return "good";
  return "low";
}

function formatKey(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "Not specified";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.map(formatValue).join(", ") : "None listed";
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, nestedValue]) => `${formatKey(key)}: ${formatValue(nestedValue)}`)
      .join(" · ");
  }
  return String(value);
}

function App() {
  const [jobDescription, setJobDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [jobAnalysis, setJobAnalysis] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [activeNav, setActiveNav] = useState("Overview");
  const [query, setQuery] = useState("");
  const [sortDescending, setSortDescending] = useState(true);
  const [apiStatus, setApiStatus] = useState("checking");
  const inputRef = useRef(null);

  useEffect(() => {
    let active = true;
    const checkApi = () => {
      fetch("/api/health", { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error("API health check failed");
          if (active) setApiStatus("online");
        })
        .catch(() => {
          if (active) setApiStatus("offline");
        });
    };
    checkApi();
    const intervalId = window.setInterval(checkApi, 15000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const successfulResults = useMemo(
    () => results.filter((result) => typeof result.score === "number"),
    [results],
  );
  const visibleResults = useMemo(() => {
    const filtered = successfulResults.filter((result) =>
      `${result.name || ""} ${result.email || ""} ${result.filename || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
    return filtered.sort((a, b) =>
      sortDescending ? b.score - a.score : a.score - b.score,
    );
  }, [successfulResults, query, sortDescending]);
  const averageScore = successfulResults.length
    ? Math.round(successfulResults.reduce((sum, item) => sum + item.score, 0) / successfulResults.length)
    : 0;
  const topCandidate = successfulResults.reduce(
    (best, item) => (!best || item.score > best.score ? item : best),
    null,
  );
  const strongMatchCount = successfulResults.filter((item) => item.score >= 80).length;
  const selectedCandidate = results.find((result) => result.filename === selected) || visibleResults[0];

  function addFiles(fileList) {
    const incoming = Array.from(fileList);
    const accepted = incoming.filter((file) =>
      ACCEPTED_TYPES.some((extension) => file.name.toLowerCase().endsWith(extension)) &&
      file.size <= 10 * 1024 * 1024,
    );
    if (accepted.length !== incoming.length) {
      setError("Only PDF/DOCX files up to 10 MB each are supported. Unsupported files were skipped.");
    } else {
      setError("");
    }
    setFiles((current) => {
      const merged = [...current];
      accepted.forEach((file) => {
        if (!merged.some((existing) => existing.name === file.name && existing.size === file.size)) {
          merged.push(file);
        }
      });
      return merged;
    });
  }

  async function analyzeResumes(event) {
    event.preventDefault();
    if (!jobDescription.trim() || files.length === 0) {
      setError("Add a job description and at least one resume to get started.");
      return;
    }
    setLoading(true);
    setError("");
    setResults([]);
    setSelected(null);

    const formData = new FormData();
    formData.append("job_description", jobDescription.trim());
    files.forEach((file) => formData.append("files", file));

    try {
      const response = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Analysis failed. Please try again.");
      setResults(data.results || []);
      setJobAnalysis(data.job || null);
      setSelected(data.results?.find((item) => typeof item.score === "number")?.filename || null);
      if (!data.successful) setError("No resumes could be analyzed. Check the file contents and try again.");
    } catch (requestError) {
      setError(
        requestError.message.includes("Failed to fetch")
          ? "Couldn't reach the analysis server. Start the API and try again."
          : requestError.message,
      );
    } finally {
      setLoading(false);
    }
  }

  function navigate(section) {
    setActiveNav(section);
    document.getElementById(section === "Candidates" ? "candidate-results" : "workspace")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand" aria-label="ResumeIQ">
          <span className="brand-mark"><Sparkles size={20} strokeWidth={2.2} /></span>
          <span>resume<span className="brand-light">IQ</span></span>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">W</div>
          <div className="workspace-copy">
            <span className="eyebrow">WORKSPACE</span>
            <strong>My workspace</strong>
          </div>
        </div>

        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button aria-label="Overview" className={`nav-item ${activeNav === "Overview" ? "active" : ""}`} onClick={() => navigate("Overview")}>
            <LayoutDashboard size={18} /> <span>Overview</span>
          </button>
          <button aria-label="Candidates" className={`nav-item ${activeNav === "Candidates" ? "active" : ""}`} onClick={() => navigate("Candidates")}>
            <Users size={18} /> <span>Candidates</span>
            {successfulResults.length > 0 && <span className="nav-count">{successfulResults.length}</span>}
          </button>
          <button aria-label="Job matching" className={`nav-item ${activeNav === "Job matching" ? "active" : ""}`} onClick={() => {
            setActiveNav("Job matching");
            document.getElementById("job-description")?.focus();
          }}>
            <BriefcaseBusiness size={18} /> <span>Job matching</span>
          </button>
          <button aria-label="Resume library" className={`nav-item ${activeNav === "Resume library" ? "active" : ""}`} onClick={() => {
            setActiveNav("Resume library");
            inputRef.current?.click();
          }}>
            <FolderOpen size={18} /> <span>Resume library</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="plan-card">
            <div className="plan-icon"><Sparkles size={16} /></div>
            <strong>Resume analysis</strong>
            <p>Compare PDF and DOCX resumes with your role.</p>
            <small className={`connection-label ${apiStatus}`}>
              <span className="connection-dot" />
              {apiStatus === "online" ? "API CONNECTED" : apiStatus === "checking" ? "CHECKING API" : "API OFFLINE"}
            </small>
          </div>
          <div className="profile-summary">
            <div className="profile-avatar">R</div>
            <div className="profile-copy"><strong>Recruiter</strong></div>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>{activeNav}</strong></div>
          <div className="topbar-actions">
            <span className={`api-status ${apiStatus}`} role="status">
              <span className="connection-dot" />
              {apiStatus === "online" ? "API connected" : apiStatus === "checking" ? "Checking API…" : "API offline"}
            </span>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row" id="workspace">
            <div>
              <div className="date-line"><span className="date-dot" /> CANDIDATE WORKSPACE <span className="date-divider">/</span> YOUR NEXT GREAT HIRE STARTS HERE</div>
              <h1>Good hiring starts with <span>clarity.</span></h1>
              <p className="subtitle">Turn a stack of resumes into a shortlist you can feel confident about.</p>
            </div>
            <div className="header-decoration">
              <div className="decor-orbit orbit-one" /><div className="decor-orbit orbit-two" />
              <div className="decor-spark"><Sparkles size={22} /></div>
            </div>
          </section>

          <section className="stats-grid" aria-label="Hiring overview">
            <StatCard icon={<Users size={18} />} label="RESUMES REVIEWED" value={successfulResults.length} detail={results.length ? `${results.length} uploaded this round` : "Ready for your first review"} tone="blue" />
            <StatCard icon={<Target size={18} />} label="AVERAGE MATCH" value={`${averageScore}%`} detail={successfulResults.length ? "Across analyzed candidates" : "Your shortlist at a glance"} tone="green" />
            <StatCard icon={<TrendingUp size={18} />} label="TOP MATCH" value={topCandidate ? `${Math.round(topCandidate.score)}%` : "—"} detail={topCandidate?.name || "Your best fit will show here"} tone="purple" />
            <StatCard icon={<CheckCircle2 size={18} />} label="STRONG MATCHES" value={strongMatchCount} detail="Candidates scoring 80% or higher" tone="orange" />
          </section>

          <section className="workspace-grid">
            <form className="setup-card panel" onSubmit={analyzeResumes}>
              <div className="panel-heading">
                <div>
                  <div className="step-label"><span>01</span> SET UP YOUR SEARCH</div>
                  <h2>Tell us who you’re looking for</h2>
                  <p>We’ll compare every resume against the role that matters.</p>
                </div>
                <div className="heading-icon"><ClipboardList size={20} /></div>
              </div>

              <label className="field-label" htmlFor="job-description">
                <span>JOB DESCRIPTION</span><span className="optional-label">PASTE OR TYPE</span>
              </label>
              <div className="textarea-wrap">
                <textarea
                  id="job-description"
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  placeholder={"Paste the job description here…\n\nInclude the role, required skills, experience, and what success looks like."}
                  rows={6}
                  maxLength={20000}
                  required
                />
                <span className="character-count">{jobDescription.length.toLocaleString()} / 20,000</span>
              </div>

              <div className="upload-heading">
                <label className="field-label" htmlFor="resume-files"><span>ADD RESUMES</span></label>
                <span className="format-hint"><FileText size={13} /> PDF or DOCX <span>·</span> up to 10 MB each</span>
              </div>
              <input
                ref={inputRef}
                id="resume-files"
                className="file-input"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                multiple
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <div
                className={`dropzone ${dragging ? "dragging" : ""}`}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  addFiles(event.dataTransfer.files);
                }}
              >
                <div className="upload-icon"><FileUp size={20} /></div>
                <div className="drop-copy">
                  <strong>Drop your resumes here</strong>
                  <span>or <button type="button" className="browse-button" onClick={() => inputRef.current?.click()}>browse files</button> from your computer</span>
                </div>
                <span className="file-counter">{files.length ? `${files.length} selected` : "MULTIPLE FILES"}</span>
              </div>

              {files.length > 0 && (
                <div className="file-list">
                  {files.map((file) => (
                    <div className="file-row" key={`${file.name}-${file.size}`}>
                      <div className="file-type-icon"><FileText size={16} /></div>
                      <div className="file-meta"><strong>{file.name}</strong><span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span></div>
                      <CheckCircle2 size={17} className="file-check" />
                      <button type="button" className="remove-file" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((item) => item !== file))}><X size={15} /></button>
                    </div>
                  ))}
                </div>
              )}

              {error && <div className="error-message" role="alert"><CircleHelp size={16} /> {error}<button type="button" aria-label="Dismiss error" onClick={() => setError("")}><X size={14} /></button></div>}

              <div className="form-footer">
                <div className="secure-note"><span className="secure-check"><Check size={11} /></span> Uploads are processed temporarily</div>
                <button className="analyze-button" type="submit" disabled={loading || !jobDescription.trim() || files.length === 0}>
                  {loading ? <><LoaderCircle size={17} className="spin" /> Analyzing resumes…</> : <><Sparkles size={16} /> Analyze resumes <ArrowRight size={16} /></>}
                </button>
              </div>
            </form>

            <aside className="insight-column">
              <div className="insight-card">
                <div className="insight-topline"><span className="insight-icon"><Sparkles size={16} /></span><span>AI-POWERED MATCHING</span></div>
                <h3>More signal.<br />Less screening.</h3>
                <p>ResumeIQ looks beyond keywords to understand experience, skills, and role fit.</p>
                <div className="insight-divider" />
                <div className="insight-feature"><span className="feature-check"><Check size={12} /></span><span>Skills & experience compared</span></div>
                <div className="insight-feature"><span className="feature-check"><Check size={12} /></span><span>Every match explained clearly</span></div>
                <div className="insight-feature"><span className="feature-check"><Check size={12} /></span><span>Your job description, your criteria</span></div>
                <div className="insight-art" aria-hidden="true">
                  <div className="art-ring ring-a" /><div className="art-ring ring-b" />
                  <div className="art-center"><Target size={22} /></div>
                  <span className="art-dot dot-a" /><span className="art-dot dot-b" /><span className="art-dot dot-c" />
                </div>
              </div>

              <div className="tip-card">
                <div className="tip-icon"><CircleHelp size={17} /></div>
                <div><strong>A better match starts with context</strong><p>Include must-have skills and the experience that matters most.</p></div>
              </div>

              {jobAnalysis && (
                <div className="role-card">
                  <div className="role-card-head"><span className="role-icon"><BriefcaseBusiness size={16} /></span><span>ROLE PROFILE</span></div>
                  <strong>{jobAnalysis.role || "Role analyzed"}</strong>
                  <p>{jobAnalysis.required_skills?.slice(0, 4).join(" · ") || "Skills extracted from your description"}</p>
                  {jobAnalysis.minimum_experience != null && <span className="experience-pill">{jobAnalysis.minimum_experience}+ years experience</span>}
                </div>
              )}
            </aside>
          </section>

          <section className="results-section" id="candidate-results">
            <div className="results-header">
              <div>
                <div className="step-label"><span>02</span> YOUR SHORTLIST</div>
                <h2>Candidate matches <span className="results-count">{successfulResults.length}</span></h2>
                <p>See who lines up best with the role.</p>
              </div>
              <div className="results-tools">
                <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search candidates" /></label>
                <button
                  type="button"
                  className="filter-button"
                  aria-label={`Sort by match score, ${sortDescending ? "highest first" : "lowest first"}`}
                  onClick={() => setSortDescending((value) => !value)}
                >
                  {sortDescending ? <ArrowDown size={15} /> : <ArrowUp size={15} />}
                  {sortDescending ? "Highest match" : "Lowest match"}
                </button>
              </div>
            </div>

            {results.length === 0 ? (
              <div className="empty-state panel">
                <div className="empty-art"><div className="empty-file"><FileText size={25} /></div><span className="empty-star star-one"><Sparkles size={13} /></span><span className="empty-star star-two"><Sparkles size={10} /></span></div>
                <h3>Your next great hire is in here.</h3>
                <p>Add a job description and a few resumes. Your ranked shortlist will appear right here.</p>
                <button className="empty-cta" onClick={() => document.getElementById("job-description")?.focus()}>Start with a job description <ArrowRight size={15} /></button>
              </div>
            ) : (
              <div className="candidate-layout">
                <div className="candidate-table panel">
                  <div className="table-topline"><span><span className="table-live-dot" /> ANALYSIS COMPLETE</span><span>{successfulResults.length} MATCH{successfulResults.length === 1 ? "" : "ES"} FOUND</span></div>
                  {visibleResults.length ? visibleResults.map((candidate, index) => (
                    <button
                      type="button"
                      className={`candidate-row ${selectedCandidate?.filename === candidate.filename ? "selected" : ""}`}
                      key={candidate.filename}
                      onClick={() => setSelected(candidate.filename)}
                    >
                      <span className={`rank rank-${index + 1}`}>{String(index + 1).padStart(2, "0")}</span>
                      <span className={`candidate-avatar avatar-${index % 4}`}>{(candidate.name || "?").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                      <span className="candidate-info"><strong>{candidate.name || candidate.filename}</strong><span>{candidate.email || candidate.filename}</span></span>
                      <span className="score-wrap"><span className={`score-pill ${getScoreColor(candidate.score)}`}>{Math.round(candidate.score)}%</span><span className="score-caption">MATCH</span></span>
                      <ChevronRight size={16} className="row-chevron" />
                    </button>
                  )) : <div className="no-results">No candidates match “{query}”.</div>}
                  {results.filter((result) => result.error).map((result) => (
                    <div className="failed-row" key={result.filename}><X size={15} /><span><strong>{result.filename}</strong><small>{result.error}</small></span><span>NOT ANALYZED</span></div>
                  ))}
                  {successfulResults.length > 0 && (
                    <div className="table-footer">
                      <span>Ranked by overall role fit</span>
                      <span>{sortDescending ? <ArrowDown size={13} /> : <ArrowUp size={13} />} {sortDescending ? "Highest match first" : "Lowest match first"}</span>
                    </div>
                  )}
                </div>

                {selectedCandidate && (
                  <div className="candidate-detail panel">
                    <div className="detail-topline"><span>PROFILE SNAPSHOT</span></div>
                    <div className="detail-profile">
                      <div className={`detail-avatar avatar-${visibleResults.indexOf(selectedCandidate) % 4}`}>{(selectedCandidate.name || "?").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div>
                      <h3>{selectedCandidate.name || selectedCandidate.filename}</h3>
                      <span>{selectedCandidate.email || "Candidate profile"}</span>
                    </div>
                    <div className="detail-score">
                      <div><span>OVERALL MATCH</span><strong>{Math.round(selectedCandidate.score)}<small>%</small></strong></div>
                      <div className={`score-meter ${getScoreColor(selectedCandidate.score)}`}><span style={{ width: `${Math.min(100, Math.max(0, selectedCandidate.score))}%` }} /></div>
                      <p>{selectedCandidate.score >= 80 ? "Strong alignment with this role" : selectedCandidate.score >= 60 ? "Promising fit with some gaps" : "Some requirements may be missing"}</p>
                    </div>
                    <div className="detail-section-title"><span>MATCH INSIGHTS</span><span className="ai-label"><Sparkles size={11} /> AI</span></div>
                    <div className="detail-insights">
                      {selectedCandidate.details && Object.entries(selectedCandidate.details).slice(0, 5).map(([key, value]) => (
                        <div className="detail-insight" key={key}>
                          <span className={`insight-bullet ${key.toLowerCase().includes("missing") ? "negative" : ""}`}>
                            {key.toLowerCase().includes("missing") ? <X size={11} /> : <Check size={11} />}
                          </span>
                          <div><strong>{formatKey(key)}</strong><p>{formatValue(value)}</p></div>
                        </div>
                      ))}
                      {!selectedCandidate.details && <p className="detail-fallback">No additional match notes were returned.</p>}
                    </div>
                    {selectedCandidate.resume && (
                      <div className="resume-highlights">
                        <div className="detail-section-title"><span>RESUME HIGHLIGHTS</span></div>
                        <div className="experience-summary">
                          <span>Experience</span>
                          <strong>
                            {selectedCandidate.resume.total_experience_years == null
                              ? "Not listed"
                              : `${selectedCandidate.resume.total_experience_years} years`}
                          </strong>
                        </div>
                        {selectedCandidate.resume.skills?.length > 0 && (
                          <div className="skill-chips">
                            {selectedCandidate.resume.skills.slice(0, 6).map((skill) => <span key={skill}>{skill}</span>)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          <footer className="page-footer"><span>Thoughtful hiring, powered by <strong>ResumeIQ</strong></span><span><span className="footer-dot" /> Built for better decisions</span></footer>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, detail, tone }) {
  return (
    <div className="stat-card panel">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">{detail}</div>
      <div className={`stat-accent ${tone}`} />
    </div>
  );
}

export default App;
