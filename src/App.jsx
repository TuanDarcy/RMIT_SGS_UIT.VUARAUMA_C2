import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { useAuthCallback, useTideCloak } from "@tidecloak/react";
import { ProfileOnboarding } from "./components/ProfileOnboarding.jsx";

const WorkspaceContext = createContext(null);
const roleCopy = { admin: "Workspace Admin", member: "Community Member", steward: "Community Steward" };

function initials(name = "CommonGround User") {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function App({ configurationError = "" }) {
  if (configurationError) return <ConfigurationRequired message={configurationError} />;
  return <AuthenticatedApp />;
}

function ConfigurationRequired({ message }) {
  return (
    <main className="public-shell">
      <nav className="public-nav"><Brand /><span className="secure-pill"><i /> TideCloak configuration required</span></nav>
      <section className="landing-grid">
        <div className="landing-copy">
          <span className="eyebrow">UIT.VUARAUMA · RMIT HACKATHON 2026</span>
          <h1>Shared support.<br /><em>No master key.</em></h1>
          <p>CommonGround lets students request help privately and gives the community a transparent way to decide together.</p>
          <div className="config-card" role="alert"><strong>Connect your TideCloak realm</strong><p>{message}. Copy the exported adapter to <code>public/tidecloak.json</code>, then reload.</p></div>
        </div>
        <LandingVisual configured={false} />
      </section>
    </main>
  );
}

function AuthenticatedApp() {
  const tide = useTideCloak();
  const navigate = useNavigate();
  const callback = useAuthCallback({
    onSuccess: (returnUrl) => navigate(returnUrl || "/commons", { replace: true }),
    onError: () => navigate("/?auth=failed", { replace: true }),
    onMissingVerifierRedirectTo: "/",
  });

  if (callback.isCallback) {
    return <main className="boot-screen"><div className="pulse-logo">CG</div><p>{callback.error ? `Authentication failed: ${callback.error.message}` : "Completing secure sign-in…"}</p></main>;
  }
  if (tide.isInitializing) return <main className="boot-screen"><div className="pulse-logo">CG</div><p>Restoring your secure session…</p></main>;

  return (
    <>
      {tide.authenticated && <ProfileOnboarding />}
      <Routes>
      <Route path="/" element={tide.authenticated ? <Navigate to="/commons" replace /> : <LoginPage tide={tide} />} />
      <Route path="/auth/redirect" element={<Navigate to={tide.authenticated ? "/commons" : "/"} replace />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route element={<AuthGuard tide={tide} />}>
        <Route element={<WorkspaceLayout tide={tide} />}>
          <Route path="/commons" element={<CommonsPage />} />
          <Route path="/dashboard" element={<Navigate to="/commons" replace />} />
          <Route path="/projects" element={<Navigate to="/commons" replace />} />
          <Route path="/admin" element={<Navigate to="/commons" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function LoginPage({ tide }) {
  const [error, setError] = useState("");
  async function login() {
    setError("");
    try { await tide.login(); } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
  }
  return (
    <main className="public-shell">
      <nav className="public-nav"><Brand /><span className="secure-pill"><i /> Secured by TideCloak</span></nav>
      <section className="landing-grid">
        <div className="landing-copy">
          <span className="eyebrow">UIT.VUARAUMA · RMIT HACKATHON 2026</span>
          <h1>Help without handing anyone the keys.</h1>
          <p>A community support fund where private requests stay encrypted and no single steward can decide alone.</p>
          <button className="primary-button login-button" onClick={login} disabled={tide.isLoading}>{tide.isLoading ? "Opening TideCloak…" : "Continue with TideCloak"}<span>→</span></button>
          {error && <div className="inline-error" role="alert">{error}</div>}
          {tide.initError && <div className="inline-error" role="alert">TideCloak initialization failed: {tide.initError.message}</div>}
          <div className="trust-row"><span>✓ Tide identity</span><span>✓ Server roles</span><span>✓ Sender-bound sessions</span></div>
        </div>
        <LandingVisual configured />
      </section>
    </main>
  );
}

function LandingVisual({ configured }) {
  return <div className="landing-visual" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="shield"><span>CG</span><small>{configured ? "COMMUNITY GOVERNED" : "CONFIGURATION PENDING"}</small></div><div className="signal-card card-a"><b>01</b><span>Private</span><small>Requests</small></div><div className="signal-card card-b"><b>02</b><span>Independent</span><small>Stewards</small></div><div className="signal-card card-c"><b>03</b><span>Shared</span><small>Decisions</small></div></div>;
}

function AuthGuard({ tide }) {
  return tide.authenticated ? <WorkspaceProvider tide={tide} /> : <Navigate to="/" replace />;
}

function WorkspaceProvider({ tide }) {
  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const secureFetch = tide.secureFetch;
  const request = useCallback(async (path, options = {}) => {
    const url = new URL(path, window.location.origin).toString();
    const response = await secureFetch(url, { ...options, headers: { "Content-Type": "application/json", ...options.headers } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const problem = new Error(body.error || `Request failed (${response.status})`);
      problem.status = response.status;
      throw problem;
    }
    return body;
  }, [secureFetch]);

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try { setWorkspace(await request("/api/workspace")); }
    catch (reason) { setError(reason.status === 403 ? "Your account does not have a CommonGround role." : reason.message); }
    finally { setLoading(false); }
  }, [request]);

  useEffect(() => {
    let active = true;
    request("/api/workspace")
      .then((result) => { if (active) setWorkspace(result); })
      .catch((reason) => { if (active) setError(reason.status === 403 ? "Your account does not have a CommonGround role." : reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [request]);
  const value = useMemo(() => ({ workspace, request, refresh }), [workspace, request, refresh]);
  if (loading) return <main className="boot-screen"><div className="pulse-logo">CG</div><p>Verifying workspace access…</p></main>;
  if (error) return <main className="state-page"><div className="state-card"><span className="state-icon">!</span><h1>Access could not be verified</h1><p>{error}</p><button className="primary-button" onClick={refresh}>Try again</button></div></main>;
  return <WorkspaceContext.Provider value={value}><Outlet /></WorkspaceContext.Provider>;
}

function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Workspace context is unavailable");
  return value;
}

function WorkspaceLayout({ tide }) {
  const { workspace } = useWorkspace();
  const user = workspace.user;
  return (
    <div className="app-shell">
      <aside className="sidebar"><Brand light /><nav className="side-nav"><NavLink to="/commons">◎ <span>Campus Commons</span></NavLink></nav><div className="security-card"><span>◉</span><strong>TideCloak active</strong><small>Encrypted requests</small></div><button className="logout-link" onClick={() => tide.logout()}>↪ Log out</button></aside>
      <div className="workspace-shell"><header className="workspace-header"><div><small>SECURE WORKSPACE</small><strong>UIT.VUARAUMA</strong></div><div className="profile"><span className="avatar">{initials(user.name)}</span><div><b>{user.name}</b><small>{roleCopy[user.primaryRole] || "Verified user"}</small></div></div></header><main className="workspace-main"><Outlet /></main></div>
    </div>
  );
}

function CommonsPage() {
  const { workspace, request } = useWorkspace();
  const tide = useTideCloak();
  const [snapshot, setSnapshot] = useState(null);
  const [form, setForm] = useState({ category: "Transport", amount: "45", details: "" });
  const [revealed, setRevealed] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const isSteward = workspace.user.roles.includes("steward");

  const refresh = useCallback(async () => setSnapshot(await request("/api/commons")), [request]);
  useEffect(() => {
    let active = true;
    request("/api/commons")
      .then((result) => { if (active) setSnapshot(result); })
      .catch((error) => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [request]);

  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const [encryptedDetails] = await tide.doEncrypt([{ data: form.details.trim(), tags: ["commons-case"] }]);
      await request("/api/commons/cases", { method: "POST", body: JSON.stringify({ category: form.category, amount: Number(form.amount), encryptedDetails }) });
      setForm({ ...form, details: "" }); await refresh();
      setMessage("Your private request was encrypted by TideCloak and submitted for community review.");
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }

  async function reveal(caseId) {
    setBusy(true); setMessage("");
    try {
      const item = await request(`/api/commons/cases/${caseId}/private`);
      const [details] = await tide.doDecrypt([{ encrypted: item.encryptedDetails, tags: item.tags }]);
      setRevealed((current) => ({ ...current, [caseId]: details }));
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }

  async function vote(caseId, decision) {
    setBusy(true); setMessage("");
    try {
      await request(`/api/commons/cases/${caseId}/votes`, { method: "POST", body: JSON.stringify({ decision }) });
      await refresh(); setMessage("Vote recorded under your verified TideCloak identity.");
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }

  return <>
    <PageIntro eyebrow="COMMUNITY-LED STUDENT SUPPORT" title="Help without handing anyone the keys." copy="Students can ask for help privately. Independent stewards decide together, while TideCloak keeps the sensitive story encrypted beyond the app server." />
    <section className="commons-rules"><div><span className="eyebrow">SHARED CHARTER</span><strong>{snapshot?.rules.requiredApprovals ?? 2} independent steward approvals</strong><small>Requester cannot vote. One verified identity, one vote.</small></div><div><span className="commons-status"><i /> TideCloak protected</span><small>Private details are encrypted before they reach this server.</small></div></section>
    {!isSteward && <form className="panel commons-form" onSubmit={submit}>
      <PanelTitle title="Request support" />
      <p className="commons-note">Share only what the stewards need to understand. Your explanation is encrypted in your TideCloak session before submission.</p>
      <div className="commons-fields"><label>Support area<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Transport</option><option>Food</option><option>Course materials</option><option>Emergency</option></select></label><label>Amount (USD)<input type="number" min="10" max="500" step="5" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label><label className="commons-details">Private explanation<textarea required minLength="20" maxLength="1200" value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} placeholder="Explain the need. This text is encrypted with TideCloak before it is stored." /></label></div>
      <div className="commons-form-footer"><span>Do not include medical records or highly sensitive documents.</span><button className="primary-button" disabled={busy || !form.details.trim()}>Encrypt & submit</button></div>
    </form>}
    {message && <div className="commons-message" role="status">{message}</div>}
    <section className="commons-cases"><div className="panel-title"><h2>{isSteward ? "Requests to review" : "Community decisions"}</h2><span>{snapshot?.cases.length ?? 0} requests</span></div>
      {snapshot?.cases.length ? snapshot.cases.map((item) => <article className="commons-case" key={item.id}>
        <div className="commons-case-heading"><div><span className="case-category">{item.category}</span><h3>${item.amount} support request</h3><small>Submitted by {item.requester.name} · {new Date(item.createdAt).toLocaleDateString()}</small></div><span className={`case-status ${item.status}`}>{item.status}</span></div>
        <div className="case-privacy"><strong>Private explanation</strong>{revealed[item.id] ? <p>{revealed[item.id]}</p> : <span>Encrypted by TideCloak; the app server cannot read it.</span>}</div>
        <div className="case-votes"><span>{item.approvals.filter((vote) => vote.decision === "approve").length} approve · {item.approvals.filter((vote) => vote.decision === "decline").length} decline · {item.approvals.filter((vote) => vote.decision === "abstain").length} abstain</span>{item.approvals.map((vote) => <small key={vote.subject}>{vote.name}: {vote.decision}</small>)}</div>
        {isSteward && item.status === "pending" && <div className="case-actions"><button className="secondary-button" onClick={() => reveal(item.id)} disabled={busy || Boolean(revealed[item.id])}>Reveal with TideCloak</button><button className="primary-button" onClick={() => vote(item.id, "approve")} disabled={busy}>Approve</button><button className="secondary-button" onClick={() => vote(item.id, "decline")} disabled={busy}>Decline</button><button className="secondary-button" onClick={() => vote(item.id, "abstain")} disabled={busy}>Abstain</button></div>}
      </article>) : <p className="commons-empty">No requests yet. Submit a synthetic support request to start a community decision.</p>}
    </section>
    <p className="commons-disclaimer">Prototype: support requests and votes use synthetic data; no payments or university records are connected. The API quorum is application logic. TideCloak encrypts and decrypts the private explanation through its distributed network; configure the <code>commons-case</code> Tide roles before demonstrating.</p>
  </>;
}

function Unauthorized() { return <main className="state-page"><div className="state-card"><span className="state-icon">403</span><h1>This space is not assigned to you.</h1><p>Your identity is valid, but the required TideCloak role is missing. Ask a realm administrator to grant access through the governed role workflow.</p><NavLink className="primary-button" to="/dashboard">Return to workspace</NavLink></div></main>; }
function Brand({ light = false }) { return <a className={`brand ${light ? "light" : ""}`} href="/"><span>CG</span><b>CommonGround</b></a>; }
function PageIntro({ eyebrow, title, copy }) { return <header className="page-intro"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></header>; }
function PanelTitle({ title, link }) { return <div className="panel-title"><h2>{title}</h2>{link && <NavLink to={link}>View all →</NavLink>}</div>; }
