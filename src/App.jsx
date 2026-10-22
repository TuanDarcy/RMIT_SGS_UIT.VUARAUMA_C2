import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { useAuthCallback, useTideCloak } from "@tidecloak/react";
import { ProfileOnboarding } from "./components/ProfileOnboarding.jsx";

const WorkspaceContext = createContext(null);
const roleCopy = { admin: "Workspace Admin", member: "Team Member" };

function initials(name = "TrustFlow User") {
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
          <h1>Move ideas forward.<br /><em>Keep trust intact.</em></h1>
          <p>TrustFlow is a secure student collaboration workspace where identity, roles and every protected operation are enforced with TideCloak.</p>
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
    onSuccess: (returnUrl) => navigate(returnUrl || "/dashboard", { replace: true }),
    onError: () => navigate("/?auth=failed", { replace: true }),
    onMissingVerifierRedirectTo: "/",
  });

  if (callback.isCallback) {
    return <main className="boot-screen"><div className="pulse-logo">TF</div><p>{callback.error ? `Authentication failed: ${callback.error.message}` : "Completing secure sign-in…"}</p></main>;
  }
  if (tide.isInitializing) return <main className="boot-screen"><div className="pulse-logo">TF</div><p>Restoring your secure session…</p></main>;

  return (
    <>
      {tide.authenticated && <ProfileOnboarding />}
      <Routes>
      <Route path="/" element={tide.authenticated ? <Navigate to="/dashboard" replace /> : <LoginPage tide={tide} />} />
      <Route path="/auth/redirect" element={<Navigate to={tide.authenticated ? "/dashboard" : "/"} replace />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route element={<AuthGuard tide={tide} />}>
        <Route element={<WorkspaceLayout tide={tide} />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/admin" element={<RoleGuard tide={tide} role="admin" />}>
            <Route index element={<AdminPanel />} />
          </Route>
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
          <h1>Move ideas forward.<br /><em>Keep trust intact.</em></h1>
          <p>A secure student collaboration workspace for projects, tasks and decisions—built so access is verified, not assumed.</p>
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
  return <div className="landing-visual" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="shield"><span>TF</span><small>{configured ? "TRUST BY DESIGN" : "CONFIGURATION PENDING"}</small></div><div className="signal-card card-a"><b>01</b><span>Ideas</span><small>Organised</small></div><div className="signal-card card-b"><b>02</b><span>People</span><small>Verified</small></div><div className="signal-card card-c"><b>03</b><span>Progress</span><small>Visible</small></div></div>;
}

function AuthGuard({ tide }) {
  return tide.authenticated ? <WorkspaceProvider tide={tide} /> : <Navigate to="/" replace />;
}

function RoleGuard({ tide, role }) {
  return tide.hasRealmRole(role) ? <Outlet /> : <Navigate to="/unauthorized" replace />;
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
    catch (reason) { setError(reason.status === 403 ? "Your account does not have a TrustFlow role." : reason.message); }
    finally { setLoading(false); }
  }, [request]);

  useEffect(() => {
    let active = true;
    request("/api/workspace")
      .then((result) => { if (active) setWorkspace(result); })
      .catch((reason) => { if (active) setError(reason.status === 403 ? "Your account does not have a TrustFlow role." : reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [request]);
  const value = useMemo(() => ({ workspace, request, refresh }), [workspace, request, refresh]);
  if (loading) return <main className="boot-screen"><div className="pulse-logo">TF</div><p>Verifying workspace access…</p></main>;
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
      <aside className="sidebar"><Brand light /><nav className="side-nav"><NavLink to="/dashboard">◫ <span>Overview</span></NavLink><NavLink to="/projects">◆ <span>Projects</span></NavLink><NavLink to="/approvals">✓ <span>Approvals</span></NavLink>{user.roles.includes("admin") && <NavLink to="/admin">⌘ <span>Admin</span></NavLink>}</nav><div className="security-card"><span>◉</span><strong>TideCloak active</strong><small>JWT + DPoP enforced</small></div><button className="logout-link" onClick={() => tide.logout()}>↪ Log out</button></aside>
      <div className="workspace-shell"><header className="workspace-header"><div><small>SECURE WORKSPACE</small><strong>UIT.VUARAUMA</strong></div><div className="profile"><span className="avatar">{initials(user.name)}</span><div><b>{user.name}</b><small>{roleCopy[user.primaryRole] || "Verified user"}</small></div></div></header><main className="workspace-main"><Outlet /></main></div>
    </div>
  );
}

function Dashboard() {
  const { workspace } = useWorkspace();
  const tasks = workspace.projects.flatMap((project) => project.tasks);
  const done = tasks.filter((task) => task.status === "done").length;
  const pendingApprovals = workspace.approvals.filter((approval) => approval.status === "pending").length;
  return <><PageIntro eyebrow="GOOD MORNING" title={`Build with confidence, ${workspace.user.firstName}.`} copy="Your team’s priorities, progress and decisions in one verified workspace." /><section className="metrics"><Metric label="ACTIVE PROJECTS" value={workspace.projects.length} note="Across your workspace" tone="violet" /><Metric label="OPEN TASKS" value={tasks.length - done} note={`${tasks.filter((task) => task.priority === "high" && task.status !== "done").length} high priority`} tone="coral" /><Metric label="COMPLETION" value={`${tasks.length ? Math.round(done / tasks.length * 100) : 0}%`} note={`${done} of ${tasks.length} completed`} tone="mint" /><Metric label="PENDING APPROVALS" value={pendingApprovals} note="Awaiting an Admin decision" tone="blue" /></section><section className="content-grid"><div className="panel"><PanelTitle title="Project pulse" link="/projects" />{workspace.projects.map((project) => <ProjectRow key={project.id} project={project} />)}</div><div className="panel"><PanelTitle title="Recent verified activity" /><div className="activity-list">{workspace.audit.slice(0, 5).map((item) => <div className="activity" key={item.id}><i /><div><strong>{item.action}</strong><p>{item.detail}</p><small>{new Date(item.at).toLocaleString()}</small></div></div>)}</div></div></section></>;
}

function Projects() {
  const { workspace, request, refresh } = useWorkspace();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [task, setTask] = useState({ projectId: workspace.projects[0]?.id || "", title: "", priority: "medium" });

  async function move(projectId, task) {
    const order = ["todo", "in-progress", "done"];
    setBusy(`move-${task.id}`); setError("");
    try { await request(`/api/projects/${projectId}/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status: order[(order.indexOf(task.status) + 1) % order.length] }) }); await refresh(); }
    catch (reason) { setError(reason.message); } finally { setBusy(""); }
  }

  async function addTask(event) {
    event.preventDefault(); setError("");
    try { await request(`/api/projects/${task.projectId}/tasks`, { method: "POST", body: JSON.stringify(task) }); setTask({ ...task, title: "" }); await refresh(); }
    catch (reason) { setError(reason.message); }
  }

  async function removeTask(projectId, taskId) {
    setBusy(`delete-${taskId}`); setError("");
    try { await request(`/api/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" }); await refresh(); }
    catch (reason) { setError(reason.message); } finally { setBusy(""); }
  }

  async function removeProject(projectId) {
    setBusy(`delete-${projectId}`); setError("");
    try { await request(`/api/projects/${projectId}`, { method: "DELETE" }); await refresh(); }
    catch (reason) { setError(reason.message); } finally { setBusy(""); }
  }

  return <>
    <PageIntro eyebrow="PROJECT WORKSPACE" title="Ideas become shared progress." copy="Every update is tied to a verified identity and checked again at the API boundary." />
    <form className="quick-task-form" onSubmit={addTask}>
      <select aria-label="Project" value={task.projectId} onChange={(event) => setTask({ ...task, projectId: event.target.value })}>{workspace.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
      <input aria-label="Task title" required minLength="3" maxLength="100" placeholder="Add a task for the team…" value={task.title} onChange={(event) => setTask({ ...task, title: event.target.value })} />
      <select aria-label="Priority" value={task.priority} onChange={(event) => setTask({ ...task, priority: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
      <button className="primary-button" type="submit">Add task</button>
    </form>
    {error && <div className="inline-error" role="alert">{error}</div>}
    <div className="project-stack">{workspace.projects.map((project) => <article className="project-panel" key={project.id}>
      <div className="project-heading">
        <div><span className={`project-dot ${project.color}`} /><div><h2>{project.name}</h2><p>{project.summary}</p></div></div>
        <div className="project-actions"><span className="member-stack">{project.members.map((member) => <i key={member}>{initials(member)}</i>)}</span>{workspace.user.roles.includes("admin") && <button className="danger-button" disabled={busy === `delete-${project.id}`} onClick={() => removeProject(project.id)}>Delete project</button>}</div>
      </div>
      <div className="kanban">{["todo", "in-progress", "done"].map((status) => <div className="kanban-column" key={status}>
        <h3>{status === "todo" ? "TO DO" : status === "in-progress" ? "IN PROGRESS" : "DONE"}<span>{project.tasks.filter((item) => item.status === status).length}</span></h3>
        {project.tasks.filter((item) => item.status === status).map((item) => <div className="task-card" key={item.id}>
          <span className={`priority ${item.priority}`}>{item.priority}</span><strong>{item.title}</strong><small>{item.assignee}</small>
          <div className="task-actions"><button disabled={busy === `move-${item.id}`} onClick={() => move(project.id, item)}>Advance</button><button className="danger-link" disabled={busy === `delete-${item.id}`} onClick={() => removeTask(project.id, item.id)}>Delete</button></div>
        </div>)}
      </div>)}</div>
    </article>)}</div>
  </>;
}

function Approvals() {
  const { workspace, request, refresh } = useWorkspace();
  const [form, setForm] = useState({ title: "", description: "", risk: "medium" });
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const isAdmin = workspace.user.roles.includes("admin");

  async function submit(event) {
    event.preventDefault(); setBusy("create"); setMessage("");
    try {
      await request("/api/approvals", { method: "POST", body: JSON.stringify(form) });
      setForm({ title: "", description: "", risk: "medium" });
      await refresh();
      setMessage("Approval request created with your verified identity.");
    } catch (reason) { setMessage(reason.message); } finally { setBusy(""); }
  }

  async function decide(approvalId, decision) {
    setBusy(`${decision}-${approvalId}`); setMessage("");
    try { await request(`/api/approvals/${approvalId}/decision`, { method: "PATCH", body: JSON.stringify({ decision }) }); await refresh(); }
    catch (reason) { setMessage(reason.message); } finally { setBusy(""); }
  }

  async function cancel(approvalId) {
    setBusy(`cancel-${approvalId}`); setMessage("");
    try { await request(`/api/approvals/${approvalId}`, { method: "DELETE" }); await refresh(); }
    catch (reason) { setMessage(reason.message); } finally { setBusy(""); }
  }

  return <>
    <PageIntro eyebrow="GOVERNED DECISIONS" title="Important changes need a second set of eyes." copy="Members request changes; a different verified Admin approves or rejects them at the API boundary." />
    <section className="approval-layout">
      <form className="panel approval-form" onSubmit={submit}>
        <PanelTitle title="Request approval" />
        <label>Decision title<input required minLength="3" maxLength="80" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Publish final demo" /></label>
        <label>Why it matters<textarea required minLength="10" maxLength="240" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Explain the change and its impact…" /></label>
        <label>Risk<select value={form.risk} onChange={(event) => setForm({ ...form, risk: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
        <button className="primary-button" disabled={busy === "create"} type="submit">Submit verified request</button>
        {message && <p className="form-message" role="status">{message}</p>}
      </form>
      <div className="approval-list">{workspace.approvals.map((approval) => {
        const isRequester = approval.requestedBy.subject === workspace.user.subject;
        return <article className="approval-card" key={approval.id}>
          <div className="approval-card-top"><span className={`approval-risk ${approval.risk}`}>{approval.risk} risk</span><span className={`approval-status ${approval.status}`}>{approval.status}</span></div>
          <h2>{approval.title}</h2><p>{approval.description}</p>
          <small>Requested by <strong>{approval.requestedBy.name}</strong> · {new Date(approval.createdAt).toLocaleString()}</small>
          {approval.decidedBy && <small>Decision by <strong>{approval.decidedBy.name}</strong></small>}
          {approval.status === "pending" && <div className="approval-actions">
            {isAdmin && !isRequester && <><button disabled={Boolean(busy)} onClick={() => decide(approval.id, "approved")}>Approve</button><button className="reject" disabled={Boolean(busy)} onClick={() => decide(approval.id, "rejected")}>Reject</button></>}
            {(isRequester || isAdmin) && <button className="cancel" disabled={Boolean(busy)} onClick={() => cancel(approval.id)}>Cancel request</button>}
          </div>}
        </article>;
      })}</div>
    </section>
  </>;
}

function AdminPanel() {
  const { workspace, request, refresh } = useWorkspace();
  const [form, setForm] = useState({ name: "", summary: "" });
  const [message, setMessage] = useState("");
  async function submit(event) {
    event.preventDefault(); setMessage("");
    try { await request("/api/projects", { method: "POST", body: JSON.stringify(form) }); setForm({ name: "", summary: "" }); await refresh(); setMessage("Project created through the admin-protected API."); }
    catch (reason) { setMessage(reason.message); }
  }
  return <><PageIntro eyebrow="ADMIN CONTROL" title="Govern the workspace, visibly." copy="This route is hidden for members and the API independently requires the admin role." /><section className="content-grid admin-grid"><form className="panel admin-form" onSubmit={submit}><PanelTitle title="Create project" /><label>Project name<input required minLength="3" maxLength="60" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>One-line purpose<textarea required minLength="10" maxLength="180" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></label><button className="primary-button" type="submit">Create protected project</button>{message && <p className="form-message">{message}</p>}</form><div className="panel security-list"><PanelTitle title="Authorization posture" /><SecurityCheck label="Client session" value="TideCloak restored" /><SecurityCheck label="Sender binding" value="DPoP required" /><SecurityCheck label="API identity" value="Embedded JWK verified" /><SecurityCheck label="Admin operation" value="Realm role enforced" /><small>Subject: {workspace.user.subject.slice(0, 18)}…</small></div></section></>;
}

function Unauthorized() { return <main className="state-page"><div className="state-card"><span className="state-icon">403</span><h1>This space is not assigned to you.</h1><p>Your identity is valid, but the required TideCloak role is missing. Ask a realm administrator to grant access through the governed role workflow.</p><NavLink className="primary-button" to="/dashboard">Return to workspace</NavLink></div></main>; }
function Brand({ light = false }) { return <a className={`brand ${light ? "light" : ""}`} href="/"><span>TF</span><b>TrustFlow</b></a>; }
function PageIntro({ eyebrow, title, copy }) { return <header className="page-intro"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></header>; }
function Metric({ label, value, note, tone }) { return <article className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>; }
function PanelTitle({ title, link }) { return <div className="panel-title"><h2>{title}</h2>{link && <NavLink to={link}>View all →</NavLink>}</div>; }
function ProjectRow({ project }) { const done = project.tasks.filter((task) => task.status === "done").length; const pct = project.tasks.length ? Math.round(done / project.tasks.length * 100) : 0; return <div className="project-row"><span className={`project-icon ${project.color}`}>{project.name[0]}</span><div><strong>{project.name}</strong><small>{project.tasks.length} tasks · {done} complete</small><div className="progress"><i style={{ width: `${pct}%` }} /></div></div><b>{pct}%</b></div>; }
function SecurityCheck({ label, value }) { return <div className="security-check"><span>✓</span><div><small>{label}</small><strong>{value}</strong></div></div>; }
