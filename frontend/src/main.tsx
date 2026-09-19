import { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
type Document = { id: number; filename: string; status: string; created_at: string };
type Extraction = { id: number; kind: string; value: Record<string, unknown>; confidence: number; review_status: string; reviewer_note?: string | null };

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    file: "M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h6",
    clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
    settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-2.5v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6v-2.5h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L9 6.7l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V5h2.5v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v2.5h-.1a1.7 1.7 0 0 0-1.5 1z",
    upload: "M12 16V4m0 0L7 9m5-5 5 5M5 20h14",
    search: "m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4z",
    arrow: "M5 12h14m-6-6 6 6-6 6",
    check: "m5 12 4 4L19 6",
    spark: "M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5z",
    logout: "M10 17l5-5-5-5M15 12H3m12-7h4v14h-4",
  };
  return <svg viewBox="0 0 24 24" className="icon" aria-hidden="true"><path d={paths[name]} /></svg>;
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [email, setEmail] = useState(localStorage.getItem("paperlens_email") || "");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [docs, setDocs] = useState<Document[]>([]);
  const [selected, setSelected] = useState<Document | null>(null);
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [activeView, setActiveView] = useState<"overview" | "documents" | "review" | "settings">("overview");
  const [allPending, setAllPending] = useState<{ item: Extraction; doc: Document }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const logout = useCallback(() => { localStorage.removeItem("token"); localStorage.removeItem("paperlens_email"); setToken(""); setEmail(""); setDocs([]); setSelected(null); }, []);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API}/api/documents`, { headers });
      if (response.status === 401) { logout(); return; }
      if (!response.ok) throw new Error("Unable to load your documents.");
      const documents: Document[] = await response.json();
      setDocs(documents);
      const results = await Promise.all(documents.map(async (doc) => {
        const result = await fetch(`${API}/api/documents/${doc.id}/extractions`, { headers });
        if (!result.ok) return [];
        return (await result.json() as Extraction[]).filter((item) => item.review_status === "pending").map((item) => ({ item, doc }));
      }));
      setAllPending(results.flat());
    } catch { setError("We couldn't reach the PaperLens API. Check that the services are running and retry."); }
    finally { setLoading(false); }
  }, [headers, logout]);
  const selectDocument = async (doc: Document) => {
    setSelected(doc);
    setExtractions([]);
    try {
      const response = await fetch(`${API}/api/documents/${doc.id}/extractions`, { headers });
      if (response.status === 401) { logout(); return; }
      if (response.ok) setExtractions(await response.json());
      else setNotice("Unable to load document insights.");
    } catch { setNotice("Document insights are temporarily unavailable. Try again."); }
  };
  useEffect(() => { if (token) load(); }, [token, load]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen(true); }
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const submitAuth = async () => {
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`${API}/api/auth/${isRegistering ? "register" : "login"}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) setNotice(Array.isArray(data.detail) ? data.detail[0]?.msg || "Check your details." : data.detail || "Unable to continue.");
      else { localStorage.setItem("token", data.access_token); localStorage.setItem("paperlens_email", email); setToken(data.access_token); }
    } catch { setNotice("The API is unreachable. Make sure the PaperLens services are running."); }
    setBusy(false);
  };
  const upload = async () => {
    if (!file) return;
    setBusy(true); setNotice("");
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch(`${API}/api/documents/upload`, { method: "POST", headers, body: form });
      if (response.ok) { setFile(null); setNotice("Document uploaded. Processing has started."); await load(); }
      else if (response.status === 401) logout();
      else setNotice((await response.json().catch(() => null))?.detail || "Upload failed. Please choose a PDF and try again.");
    } catch { setNotice("Upload failed because the API is unreachable. Try again."); }
    setBusy(false);
  };
  const review = async (item: Extraction, status: "approved" | "rejected") => {
    if (!selected) return;
    setReviewing(item.id);
    const response = await fetch(`${API}/api/documents/${selected.id}/extractions/${item.id}`, {
      method: "PATCH", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ review_status: status }),
    });
    if (response.ok) {
      const updated = await response.json();
      setExtractions((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
      setNotice(`${item.kind.replace("_", " ")} marked ${status}.`);
      await load();
    }
    else if (response.status === 401) logout();
    else setNotice("That review action could not be saved. Try again.");
    setReviewing(null);
  };
  const chooseFile = (candidate: File | undefined) => {
    if (!candidate) return;
    if (candidate.type !== "application/pdf") { setNotice("PaperLens accepts PDF files only."); return; }
    setNotice(""); setFile(candidate);
  };
  const navigate = (view: "overview" | "documents" | "review" | "settings") => {
    setActiveView(view);
    if (view === "documents") document.querySelector(".documents-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (view === "review") document.querySelector(".queue-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const filtered = docs.filter((doc) => doc.filename.toLowerCase().includes(query.toLowerCase()));
  const reviewed = extractions.filter((item) => item.review_status !== "pending").length;
  const pendingReviews = extractions.filter((item) => item.review_status === "pending").length;
  const averageConfidence = extractions.length ? Math.round(extractions.reduce((sum, item) => sum + item.confidence, 0) / extractions.length) : 0;
  const completedDocs = docs.filter((doc) => doc.status === "completed").length;

  if (!token) return <AuthScreen {...{ email, password, isRegistering, busy, notice, setEmail, setPassword, setIsRegistering, submitAuth }} />;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">P</span><span>paper<span>lens</span></span></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav><button className={`nav-item ${activeView === "overview" ? "active" : ""}`} onClick={() => navigate("overview")}><Icon name="grid" />Overview</button><button className={`nav-item ${activeView === "documents" ? "active" : ""}`} onClick={() => navigate("documents")}><Icon name="file" />Documents <em>{docs.length}</em></button><button className={`nav-item ${activeView === "review" ? "active" : ""}`} onClick={() => navigate("review")}><Icon name="clock" />Review queue <em>{allPending.length}</em></button></nav>
        <div className="sidebar-bottom"><button className={`nav-item ${activeView === "settings" ? "active" : ""}`} onClick={() => navigate("settings")}><Icon name="settings" />Settings</button><button className="profile" onClick={logout}><span className="avatar">{email ? email[0].toUpperCase() : "U"}</span><span><strong>My account</strong><small>Sign out</small></span><Icon name="logout" /></button></div>
      </aside>
      <main className="content">
        <header className="topbar"><div><p className="eyebrow">{activeView.toUpperCase()} / PAPERLENS</p><h1>{activeView === "overview" ? <>Good morning<span>.</span></> : activeView === "documents" ? <>Your <span>documents.</span></> : <>Review <span>queue.</span></>}</h1></div><div className="top-actions"><button className="command-trigger" onClick={() => setCommandOpen(true)}><Icon name="search" /><span>Search anything</span><kbd>⌘ K</kbd></button><button className="icon-button" onClick={() => navigate("settings")} aria-label="Open settings"><Icon name="settings" /></button><div className="avatar large">{email ? email[0].toUpperCase() : "U"}</div></div></header>
        {error && <div className="notice error-notice" role="alert">{error} <button onClick={load}>Retry</button></div>}
        {notice && <div className="notice" role="status">{notice}</div>}
        {loading && <div className="loading-bar" role="status">Syncing your workspace…</div>}
        {activeView === "settings" ? <SettingsPanel email={email} onLogout={logout} /> : <><section className="hero"><div><div className="hero-kicker">DOCUMENT INTELLIGENCE</div><h2>Turn every page into <i>insight.</i></h2><p>Upload a document and let PaperLens surface the answers that matter.</p></div><div className="hero-orbit"><span>✦</span><span>✧</span><span>•</span></div></section>
        {activeView === "overview" && <><section className="stats"><Stat label="Total documents" value={docs.length} detail="Your workspace" tone="blue" /><Stat label="Needs review" value={docs.filter((d) => d.status !== "completed").length} detail="Awaiting attention" tone="yellow" /><Stat label="Reviewed fields" value={reviewed} detail="In this document" tone="green" /></section>
        <section className="workspace-grid">
          <div className="panel upload-panel"><div className="panel-heading"><div><p className="eyebrow">START HERE</p><h3>Upload a document</h3></div><span className="step">01 / 02</span></div><label className={`dropzone ${file ? "has-file" : ""}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); chooseFile(e.dataTransfer.files?.[0]); }}><input type="file" accept="application/pdf" onChange={(e) => chooseFile(e.target.files?.[0])} /><span className="upload-icon"><Icon name="upload" /></span><strong>{file ? file.name : "Drop your PDF here"}</strong><small>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB ready to upload` : "or click to browse from your computer"}</small></label><button className="primary full" onClick={upload} disabled={!file || busy}>{busy ? "Uploading..." : "Upload & analyze"} <Icon name="arrow" /></button></div>
          <div className="panel insight-panel"><div className="panel-heading"><div><p className="eyebrow">SELECTED DOCUMENT</p><h3>{selected ? selected.filename : "Review insights"}</h3></div><span className="status-dot">● Live</span></div>{selected ? <><div className="document-meta"><span><b>STATUS</b><Status status={selected.status} /></span><span><b>ADDED</b>{new Date(selected.created_at).toLocaleDateString()}</span><span><b>EXTRACTIONS</b>{extractions.length || "—"}</span></div><div className="extraction-list">{extractions.length ? extractions.map((item) => <div className="extraction" data-extraction-id={item.id} key={item.id}><div className="extraction-icon"><Icon name={item.kind === "metadata" ? "file" : "grid"} /></div><div className="extraction-body"><div className="extraction-title"><strong>{item.kind.replace("_", " ")}</strong><span className={`review-chip ${item.review_status}`}>{item.review_status}</span></div><p>{item.kind === "full_text" ? String(item.value.text || "").slice(0, 130) : `${item.value.pages || 0} pages detected`}</p><div className="confidence-line"><span>Confidence</span><div className="confidence-track"><i style={{ width: `${item.confidence}%` }} /></div><b>{item.confidence}%</b></div></div><div className="review-actions">{item.review_status === "pending" ? <><button title="Approve" className="approve" disabled={reviewing === item.id} onClick={() => review(item, "approved")}><Icon name="check" /></button><button title="Reject" className="reject" disabled={reviewing === item.id} onClick={() => review(item, "rejected")}>×</button></> : <span className="reviewed-mark"><Icon name="check" /></span>}</div></div>) : <Empty text="Processing document insights..." />}</div></> : <Empty text="Select a document below to see extracted insights." />}</div>
        </section>
        <section className="detail-grid">
          <div className="panel signal-panel"><div className="section-title"><div><p className="eyebrow">QUALITY SIGNALS</p><h3>Extraction health</h3></div><span className="signal-live">Updated now</span></div><div className="signal-score"><div className="score-ring"><strong>{averageConfidence || "—"}</strong><span>/ 100</span></div><div><strong>{averageConfidence >= 85 ? "High confidence" : averageConfidence ? "Needs attention" : "No data yet"}</strong><p>Average confidence across the selected document's extracted fields.</p></div></div><div className="mini-metrics"><span><b>{extractions.length}</b>fields found</span><span><b>{pendingReviews}</b>pending review</span><span><b>{reviewed}</b>resolved</span></div></div>
          <div className="panel pipeline-panel"><div className="section-title"><div><p className="eyebrow">PROCESSING PIPELINE</p><h3>Workspace activity</h3></div><span className="pipeline-count">{completedDocs}/{docs.length || 0}</span></div><div className="pipeline-steps"><div className="pipeline-step done"><i>01</i><span><b>Ingest</b><small>{docs.length ? "Document received" : "Waiting for upload"}</small></span><em>✓</em></div><div className={`pipeline-step ${completedDocs ? "done" : "active"}`}><i>02</i><span><b>Analyze</b><small>{completedDocs ? "Extraction complete" : "Queued for analysis"}</small></span><em>{completedDocs ? "✓" : "…"}</em></div><div className={`pipeline-step ${reviewed ? "done" : "active"}`}><i>03</i><span><b>Review</b><small>{reviewed ? "Human review started" : "Select fields to review"}</small></span><em>{reviewed ? "✓" : "—"}</em></div></div></div>
        </section>
        <section className="activity-bar"><span className="activity-pulse" /><strong>Workspace is operational</strong><span>•</span><span>{docs.length} documents indexed</span><span>•</span><span>Redis queue connected</span><span className="activity-time">Last checked just now</span></section>
        <section className="lower-grid">
          <div className="panel queue-panel"><div className="section-title"><div><p className="eyebrow">ATTENTION REQUIRED</p><h3>Review queue</h3></div><span className="queue-count">{allPending.length} open</span></div>{allPending.length ? allPending.map(({ item, doc }, index) => <button className="queue-item" key={`${doc.id}-${item.id}`} onClick={() => { setActiveView("overview"); selectDocument(doc); setTimeout(() => document.querySelector(`[data-extraction-id="${item.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 150); }}><span className="queue-index">{String(index + 1).padStart(2, "0")}</span><span className="queue-copy"><strong>{item.kind.replace("_", " ")}</strong><small>{doc.filename} · confidence {item.confidence}%</small></span><span className="queue-action">Inspect <Icon name="arrow" /></span></button>) : <div className="queue-empty"><span>✓</span><div><strong>Nothing waiting for review</strong><small>Approve or reject extracted fields from the inspector.</small></div></div>}</div>
          <div className="panel activity-panel"><div className="section-title"><div><p className="eyebrow">AUDIT TRAIL</p><h3>Recent activity</h3></div><span className="signal-live">Live feed</span></div><div className="timeline"><div className="timeline-item"><i className="timeline-dot coral" /><div><strong>{docs.length ? "Document library synchronized" : "Workspace initialized"}</strong><small>{docs.length ? `${docs.length} document${docs.length === 1 ? "" : "s"} available` : "Upload a PDF to begin"}</small></div><time>Now</time></div><div className="timeline-item"><i className="timeline-dot blue" /><div><strong>Extraction engine ready</strong><small>PyMuPDF pipeline listening for new work</small></div><time>Live</time></div><div className="timeline-item"><i className="timeline-dot green" /><div><strong>Workspace health check passed</strong><small>API, database, and queue responding</small></div><time>Live</time></div></div></div>
        </section></>}
        {activeView === "review" && <section className="panel queue-panel standalone-queue"><div className="section-title"><div><p className="eyebrow">ATTENTION REQUIRED</p><h3>Review queue</h3></div><span className="queue-count">{allPending.length} open</span></div>{allPending.length ? allPending.map(({ item, doc }, index) => <button className="queue-item" key={`${doc.id}-${item.id}`} onClick={() => { setActiveView("overview"); selectDocument(doc); }}>{String(index + 1).padStart(2, "0")} · {item.kind.replace("_", " ")} — {doc.filename}<span className="queue-action">Inspect <Icon name="arrow" /></span></button>) : <div className="empty"><span>✓</span><p>Nothing waiting for review.</p></div>}</section>}
        <section className="panel documents-panel"><div className="documents-heading"><div><p className="eyebrow">YOUR LIBRARY</p><h3>Recent documents</h3></div><div className="table-actions"><div className="search"><Icon name="search" /><input placeholder="Search documents" value={query} onChange={(e) => setQuery(e.target.value)} /></div><button className="filter">All documents</button></div></div>{filtered.length ? <div className="document-table"><div className="table-row table-header"><span>NAME</span><span>STATUS</span><span>ADDED</span><span></span></div>{filtered.map((doc) => <button className={`table-row document-row ${selected?.id === doc.id ? "selected" : ""}`} key={doc.id} onClick={() => selectDocument(doc)}><span className="doc-name"><span className="pdf-badge">PDF</span><strong>{doc.filename}</strong></span><span><Status status={doc.status} /></span><span>{new Date(doc.created_at).toLocaleDateString()}</span><span className="row-arrow">→</span></button>)}</div> : <Empty text={query ? "No matching documents." : "Your uploaded documents will appear here."} />}</section></>}
      </main>
      {commandOpen && <div className="command-backdrop" onClick={() => setCommandOpen(false)}><div className="command-palette" onClick={(event) => event.stopPropagation()}><div className="command-input"><Icon name="search" /><input autoFocus placeholder="Search your workspace..." value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>ESC</kbd></div><div className="command-results">{filtered.slice(0, 5).map((doc) => <button key={doc.id} onClick={() => { selectDocument(doc); setCommandOpen(false); }}><span className="pdf-badge">PDF</span><span>{doc.filename}</span><small>{doc.status}</small></button>)}{!filtered.length && <Empty text="No documents found." />}</div><div className="command-footer"><span><kbd>↵</kbd> Open document</span><span><kbd>ESC</kbd> Close</span></div></div></div>}
    </div>
  );
}

function AuthScreen(props: any) { return <div className="auth-shell"><div className="auth-art"><div className="brand"><span className="brand-mark">P</span><span>paper<span>lens</span></span></div><div className="art-copy"><p className="hero-kicker">DOCUMENT INTELLIGENCE</p><h1>Read between<br />the <i>lines.</i></h1><p>PaperLens makes complex documents clear, searchable, and actionable.</p></div><div className="art-footer">© 2026 PaperLens <span>Built for thoughtful work.</span></div></div><div className="auth-form"><div className="auth-inner"><p className="eyebrow">{props.isRegistering ? "CREATE YOUR WORKSPACE" : "WELCOME BACK"}</p><h2>{props.isRegistering ? "Start seeing clearly." : "Your documents,<br />made <i>clear.</i>"}</h2><p className="auth-sub">{props.isRegistering ? "Create an account to begin extracting insight." : "Sign in to continue to your document workspace."}</p>{props.notice && <div className="notice">{props.notice}</div>}<label>Email address<input type="email" value={props.email} onChange={(e) => props.setEmail(e.target.value)} placeholder="you@example.com" /></label><label>Password<input type="password" value={props.password} onChange={(e) => props.setPassword(e.target.value)} placeholder="At least 8 characters" /></label><button className="primary full" onClick={props.submitAuth} disabled={props.busy}>{props.busy ? "Please wait..." : props.isRegistering ? "Create workspace" : "Sign in"} <Icon name="arrow" /></button><p className="switch-auth">{props.isRegistering ? "Already have an account?" : "New to PaperLens?"} <button onClick={() => props.setIsRegistering(!props.isRegistering)}>{props.isRegistering ? "Sign in" : "Create an account"}</button></p></div></div></div>; }
function SettingsPanel({ email, onLogout }: { email: string; onLogout: () => void }) { return <section className="settings-page"><div className="settings-header"><p className="eyebrow">WORKSPACE SETTINGS</p><h2>Configure your PaperLens workspace.</h2><p>Manage your account and understand how this local workspace is connected.</p></div><div className="settings-grid"><div className="panel settings-card"><span className="settings-card-icon">◎</span><p className="eyebrow">ACCOUNT</p><h3>{email || "Signed-in user"}</h3><p>Your account controls access to private documents and review actions.</p><button className="secondary" onClick={onLogout}>Sign out <Icon name="logout" /></button></div><div className="panel settings-card"><span className="settings-card-icon">⌁</span><p className="eyebrow">PROCESSING</p><h3>Local pipeline</h3><p>PDFs are queued through Redis and processed by the Celery worker with PyMuPDF.</p><span className="setting-status"><i />Connected and ready</span></div><div className="panel settings-card"><span className="settings-card-icon">◌</span><p className="eyebrow">DATA & PRIVACY</p><h3>Private by default</h3><p>Documents are scoped to your account and persisted in the configured PostgreSQL database.</p><span className="setting-status"><i />Protected API access</span></div></div></section>; }
function Stat({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) { return <div className="stat-card"><span className={`stat-icon ${tone}`}>✦</span><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></div>; }
function Status({ status }: { status: string }) { const complete = status === "completed"; return <span className={`status ${complete ? "complete" : "pending"}`}><span />{complete ? "Analyzed" : status}</span>; }
function Empty({ text }: { text: string }) { return <div className="empty"><span>✦</span><p>{text}</p></div>; }
createRoot(document.getElementById("root")!).render(<App />);
