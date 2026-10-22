import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { useAuthCallback, useTideCloak } from "@tidecloak/react";
import { ProfileOnboarding } from "./components/ProfileOnboarding.jsx";

const WorkspaceContext = createContext(null);
const roleCopy = { admin: "Care Administrator", doctor: "Verified Doctor", patient: "Patient" };
const recordTypeCopy = { consultation: "Consultation", diagnosis: "Diagnosis", prescription: "Prescription", "lab-result": "Lab result" };

function initials(name = "TrustCare User") {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function App({ configurationError = "" }) {
  if (configurationError) return <ConfigurationRequired message={configurationError} />;
  return <AuthenticatedApp />;
}

function ConfigurationRequired({ message }) {
  return <main className="public-shell"><nav className="public-nav"><Brand /><span className="secure-pill"><i /> TideCloak configuration required</span></nav><section className="landing-grid"><div className="landing-copy"><span className="eyebrow">UIT.VUARAUMA · RMIT HACKATHON 2026</span><h1>Private care.<br /><em>Verified access.</em></h1><p>TrustCare protects medical records with verified identity, explicit consent and server-enforced authorization.</p><div className="config-card" role="alert"><strong>Connect your TideCloak realm</strong><p>{message}. Copy the exported adapter to <code>public/tidecloak.json</code>, then reload.</p></div></div><LandingVisual configured={false} /></section></main>;
}

function AuthenticatedApp() {
  const tide = useTideCloak();
  const navigate = useNavigate();
  const callback = useAuthCallback({
    onSuccess: (returnUrl) => navigate(returnUrl || "/dashboard", { replace: true }),
    onError: () => navigate("/?auth=failed", { replace: true }),
    onMissingVerifierRedirectTo: "/",
  });

  if (callback.isCallback) return <BootScreen copy={callback.error ? `Authentication failed: ${callback.error.message}` : "Completing secure sign-in…"} />;
  if (tide.isInitializing) return <BootScreen copy="Restoring your secure session…" />;

  return <><>{tide.authenticated && <ProfileOnboarding />}</><Routes>
    <Route path="/" element={tide.authenticated ? <Navigate to="/dashboard" replace /> : <LoginPage tide={tide} />} />
    <Route path="/auth/redirect" element={<Navigate to={tide.authenticated ? "/dashboard" : "/"} replace />} />
    <Route path="/unauthorized" element={<Unauthorized />} />
    <Route element={<AuthGuard tide={tide} />}>
      <Route element={<WorkspaceLayout tide={tide} />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/records" element={<Records />} />
        <Route path="/access" element={<AccessControl />} />
        <Route path="/admin" element={<AppRoleGuard role="admin" />}><Route index element={<AdminPanel />} /></Route>
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></>;
}

function LoginPage({ tide }) {
  const [error, setError] = useState("");
  const [action, setAction] = useState("");

  async function login() {
    setError(""); setAction("login");
    try { await tide.login(); } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); setAction(""); }
  }

  async function register() {
    setError(""); setAction("register");
    try {
      const client = tide.IAMService?._tc;
      if (!client?.register) throw new Error("TideCloak registration is not available. Enable realm self-registration and reload.");
      await client.register({ redirectUri: `${window.location.origin}/auth/redirect` });
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); setAction(""); }
  }

  return <main className="public-shell"><nav className="public-nav"><Brand /><span className="secure-pill"><i /> Secured by TideCloak</span></nav><section className="landing-grid"><div className="landing-copy"><span className="eyebrow">UIT.VUARAUMA · RMIT HACKATHON 2026</span><h1>Your health story.<br /><em>Yours to control.</em></h1><p>A privacy-first medical record workspace where patients own access, doctors work only with assigned cases, and every protected operation is verified again at the API.</p><div className="auth-actions"><button className="primary-button login-button" onClick={login} disabled={Boolean(action)}>{action === "login" ? "Opening TideCloak…" : "Sign in securely"}<span>→</span></button><button className="secondary-button register-button" onClick={register} disabled={Boolean(action)}>{action === "register" ? "Opening registration…" : "Create patient account"}</button></div>{error && <div className="inline-error" role="alert">{error}</div>}{tide.initError && <div className="inline-error" role="alert">TideCloak initialization failed: {tide.initError.message}</div>}<p className="registration-note">Self-registration creates a Patient account only. Doctor and Admin permissions are granted by a TideCloak administrator.</p><div className="trust-row"><span>✓ Patient consent</span><span>✓ Server authorization</span><span>✓ Sender-bound sessions</span></div></div><LandingVisual configured /></section></main>;
}

function LandingVisual({ configured }) {
  return <div className="landing-visual" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="shield"><span>TC</span><small>{configured ? "CARE BY CONSENT" : "CONFIGURATION PENDING"}</small></div><div className="signal-card card-a"><b>01</b><span>Identity</span><small>Verified</small></div><div className="signal-card card-b"><b>02</b><span>Records</span><small>Private</small></div><div className="signal-card card-c"><b>03</b><span>Access</span><small>Consented</small></div></div>;
}

function BootScreen({ copy }) { return <main className="boot-screen"><div className="pulse-logo">TC</div><p>{copy}</p></main>; }
function AuthGuard({ tide }) { return tide.authenticated ? <WorkspaceProvider tide={tide} /> : <Navigate to="/" replace />; }

function AppRoleGuard({ role }) {
  const { workspace } = useWorkspace();
  return workspace.user.roles.includes(role) ? <Outlet /> : <Navigate to="/unauthorized" replace />;
}

function WorkspaceProvider({ tide }) {
  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const secureFetch = tide.secureFetch;
  const request = useCallback(async (path, options = {}) => {
    const response = await secureFetch(new URL(path, window.location.origin).toString(), { ...options, headers: { "Content-Type": "application/json", ...options.headers } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { const problem = new Error(body.error || `Request failed (${response.status})`); problem.status = response.status; throw problem; }
    return body;
  }, [secureFetch]);
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try { setWorkspace(await request("/api/workspace")); } catch (reason) { setError(reason.status === 403 ? "Your account does not have a TrustCare role." : reason.message); } finally { setLoading(false); }
  }, [request]);
  useEffect(() => { let active = true; request("/api/workspace").then((result) => { if (active) setWorkspace(result); }).catch((reason) => { if (active) setError(reason.status === 403 ? "Your account does not have a TrustCare role." : reason.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [request]);
  const value = useMemo(() => ({ workspace, request, refresh }), [workspace, request, refresh]);
  if (loading) return <BootScreen copy="Verifying protected health access…" />;
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
  const { user } = workspace;
  const isAdmin = user.primaryRole === "admin";
  return <div className="app-shell"><aside className="sidebar"><Brand light /><nav className="side-nav"><NavLink to="/dashboard">◫ <span>Overview</span></NavLink><NavLink to="/records">✚ <span>{isAdmin ? "Patients" : "Medical records"}</span></NavLink><NavLink to="/access">✓ <span>Access & consent</span></NavLink>{isAdmin && <NavLink to="/admin">⌘ <span>Administration</span></NavLink>}</nav><div className="security-card"><span>◉</span><strong>TideCloak active</strong><small>JWT + DPoP enforced</small></div><button className="logout-link" onClick={() => tide.logout()}>↪ Log out</button></aside><div className="workspace-shell"><header className="workspace-header"><div><small>PROTECTED HEALTH WORKSPACE</small><strong>UIT.VUARAUMA</strong></div><div className="profile"><span className="avatar">{initials(user.name)}</span><div><b>{user.name}</b><small>{roleCopy[user.primaryRole]}</small></div></div></header><main className="workspace-main"><Outlet /></main></div></div>;
}

function Dashboard() {
  const { workspace } = useWorkspace();
  const pending = workspace.accessRequests.filter((item) => item.status === "pending").length;
  const finalRecords = workspace.records.filter((item) => item.status === "final").length;
  const patientLabel = workspace.user.primaryRole === "patient" ? "My patient profile" : "Accessible patients";
  return <><PageIntro eyebrow="SECURE CARE OVERVIEW" title={`Welcome, ${workspace.user.firstName}.`} copy="Only the minimum information allowed by your verified identity and care relationship appears here." /><section className="metrics"><Metric label={patientLabel.toUpperCase()} value={workspace.patients.length} note="Filtered at the API" tone="violet" /><Metric label="VISIBLE RECORDS" value={workspace.records.length} note={`${finalRecords} finalised`} tone="mint" /><Metric label="PENDING CONSENTS" value={pending} note="Patient-controlled access" tone="coral" /><Metric label="SECURITY LAYERS" value="3" note="JWT · DPoP · object checks" tone="blue" /></section><section className="content-grid"><div className="panel"><PanelTitle title={workspace.user.primaryRole === "admin" ? "Patient directory" : "Care access"} link="/records" />{workspace.patients.length ? workspace.patients.map((patient) => <PatientRow key={patient.id} patient={patient} recordCount={workspace.records.filter((item) => item.patientId === patient.id).length} />) : <EmptyState copy="No patient has granted access yet." />}</div><div className="panel"><PanelTitle title="Recent verified activity" /><div className="activity-list">{workspace.audit.length ? workspace.audit.slice(0, 5).map((item) => <div className="activity" key={item.id}><i /><div><strong>{item.action}</strong><p>{item.detail}</p><small>{new Date(item.at).toLocaleString()}</small></div></div>) : <EmptyState copy="No visible activity for this identity." />}</div></div></section></>;
}

function Records() {
  const { workspace, request, refresh } = useWorkspace();
  const role = workspace.user.primaryRole;
  const [form, setForm] = useState({ patientId: workspace.patients[0]?.id || "", title: "", clinicalNote: "", type: "consultation", status: "draft" });
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function createRecord(event) {
    event.preventDefault(); setBusy("create"); setMessage("");
    try { await request(`/api/patients/${form.patientId}/records`, { method: "POST", body: JSON.stringify(form) }); setForm({ ...form, title: "", clinicalNote: "", status: "draft" }); await refresh(); setMessage("Medical record created through the doctor-protected API."); } catch (reason) { setMessage(reason.message); } finally { setBusy(""); }
  }
  async function finalise(record) {
    setBusy(record.id); setMessage("");
    try { await request(`/api/patients/${record.patientId}/records/${record.id}`, { method: "PATCH", body: JSON.stringify({ status: "final" }) }); await refresh(); } catch (reason) { setMessage(reason.message); } finally { setBusy(""); }
  }
  async function remove(record) {
    setBusy(record.id); setMessage("");
    try { await request(`/api/patients/${record.patientId}/records/${record.id}`, { method: "DELETE" }); await refresh(); } catch (reason) { setMessage(reason.message); } finally { setBusy(""); }
  }

  if (role === "admin") return <><PageIntro eyebrow="MINIMUM NECESSARY ACCESS" title="Patient directory, without clinical contents." copy="Administrators can manage care assignments but do not automatically receive permission to read medical notes." /><div className="patient-grid">{workspace.patients.map((patient) => <PatientCard key={patient.id} patient={patient} />)}</div></>;
  return <><PageIntro eyebrow={role === "patient" ? "MY MEDICAL RECORD" : "ASSIGNED CARE"} title={role === "patient" ? "Your health history stays under your control." : "Document care for assigned patients."} copy={role === "patient" ? "This timeline is returned only when the verified TideCloak subject matches the patient owner." : "The API checks your Doctor role and assignment before every create, update or delete operation."} />{role === "doctor" && <form className="panel medical-form" onSubmit={createRecord}><PanelTitle title="Add medical record" /><div className="form-grid"><label>Patient<select required value={form.patientId} onChange={(event) => setForm({ ...form, patientId: event.target.value })}>{workspace.patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.id} · {patient.displayName}</option>)}</select></label><label>Record type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{Object.entries(recordTypeCopy).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Title<input required minLength="3" maxLength="100" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Follow-up consultation" /></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">Draft</option><option value="final">Final</option></select></label><label className="full-field">Clinical note<textarea required minLength="10" maxLength="1000" value={form.clinicalNote} onChange={(event) => setForm({ ...form, clinicalNote: event.target.value })} placeholder="Use synthetic data only for this demo…" /></label></div><button className="primary-button" disabled={busy === "create" || !workspace.patients.length} type="submit">Create protected record</button>{!workspace.patients.length && <p className="form-message">Request patient consent before creating a record.</p>}</form>}{message && <div className="inline-status" role="status">{message}</div>}<div className="record-list">{workspace.records.length ? workspace.records.map((record) => <article className="record-card" key={record.id}><div className="record-card-top"><span className={`record-status ${record.status}`}>{record.status}</span><span>{recordTypeCopy[record.type]}</span></div><h2>{record.title}</h2><p>{record.clinicalNote}</p><div className="record-meta"><span><b>Patient</b>{record.patientId}</span><span><b>Clinician</b>{record.doctorName}</span><span><b>Updated</b>{new Date(record.updatedAt).toLocaleDateString()}</span></div>{role === "doctor" && record.status === "draft" && <div className="record-actions"><button onClick={() => finalise(record)} disabled={busy === record.id}>Mark final</button><button className="danger-link" onClick={() => remove(record)} disabled={busy === record.id}>Delete draft</button></div>}</article>) : <EmptyState copy="No medical records are visible to this account." />}</div></>;
}

function AccessControl() {
  const { workspace, request, refresh } = useWorkspace();
  const role = workspace.user.primaryRole;
  const [form, setForm] = useState({ patientId: "", reason: "" });
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event) { event.preventDefault(); setBusy("create"); setMessage(""); try { await request("/api/access-requests", { method: "POST", body: JSON.stringify(form) }); setForm({ patientId: "", reason: "" }); await refresh(); setMessage("Consent request sent to the patient."); } catch (reason) { setMessage(reason.message); } finally { setBusy(""); } }
  async function decide(id, decision) { setBusy(id); setMessage(""); try { await request(`/api/access-requests/${id}/decision`, { method: "PATCH", body: JSON.stringify({ decision }) }); await refresh(); } catch (reason) { setMessage(reason.message); } finally { setBusy(""); } }
  return <><PageIntro eyebrow="ACCESS & CONSENT" title={role === "patient" ? "You decide who joins your care team." : "Care access is explicit and auditable."} copy={role === "patient" ? "Approve only clinicians you recognise. A decision is checked against your patient identity at the API." : "A Doctor requests access; only the matching Patient can approve or reject it."} /><section className={`access-layout ${role !== "doctor" ? "single" : ""}`}>{role === "doctor" && <form className="panel medical-form" onSubmit={submit}><PanelTitle title="Request patient access" /><label>Patient ID<input required pattern="PT-[A-Za-z0-9-]+" value={form.patientId} onChange={(event) => setForm({ ...form, patientId: event.target.value })} placeholder="PT-1002" /></label><label>Clinical reason<textarea required minLength="10" maxLength="240" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Explain why access is necessary…" /></label><button className="primary-button" disabled={busy === "create"} type="submit">Send consent request</button></form>}<div className="approval-list">{workspace.accessRequests.length ? workspace.accessRequests.map((item) => <article className="approval-card" key={item.id}><div className="approval-card-top"><span className="approval-risk">{item.patientId}</span><span className={`approval-status ${item.status}`}>{item.status}</span></div><h2>{item.doctorName}</h2><p>{item.reason}</p><small>Requested {new Date(item.createdAt).toLocaleString()}</small>{role === "patient" && item.status === "pending" && <div className="approval-actions"><button disabled={busy === item.id} onClick={() => decide(item.id, "approved")}>Approve access</button><button className="reject" disabled={busy === item.id} onClick={() => decide(item.id, "rejected")}>Reject</button></div>}</article>) : <EmptyState copy="No access requests are visible to this identity." />}</div></section>{message && <div className="inline-status" role="status">{message}</div>}</>;
}

function AdminPanel() {
  const { workspace, request, refresh } = useWorkspace();
  const [form, setForm] = useState({ patientId: workspace.patients[0]?.id || "", doctorSubject: "", doctorName: "" });
  const [message, setMessage] = useState("");
  async function submit(event) { event.preventDefault(); setMessage(""); try { await request("/api/admin/assignments", { method: "POST", body: JSON.stringify(form) }); setForm({ ...form, doctorSubject: "", doctorName: "" }); await refresh(); setMessage("Doctor assignment created through the Admin-protected API."); } catch (reason) { setMessage(reason.message); } }
  async function remove(id) { setMessage(""); try { await request(`/api/admin/assignments/${id}`, { method: "DELETE" }); await refresh(); } catch (reason) { setMessage(reason.message); } }
  return <><PageIntro eyebrow="CARE ADMINISTRATION" title="Manage assignments without opening medical notes." copy="This route and every operation independently require the TideCloak Admin role." /><section className="content-grid admin-grid"><form className="panel medical-form" onSubmit={submit}><PanelTitle title="Assign doctor" /><label>Patient<select required value={form.patientId} onChange={(event) => setForm({ ...form, patientId: event.target.value })}>{workspace.patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.id} · {patient.displayName}</option>)}</select></label><label>Doctor TideCloak subject<input required minLength="3" value={form.doctorSubject} onChange={(event) => setForm({ ...form, doctorSubject: event.target.value })} placeholder="Verified token subject" /></label><label>Doctor display name<input required minLength="2" maxLength="80" value={form.doctorName} onChange={(event) => setForm({ ...form, doctorName: event.target.value })} placeholder="Dr. Nguyen" /></label><button className="primary-button" type="submit">Create protected assignment</button>{message && <p className="form-message">{message}</p>}</form><div className="panel"><PanelTitle title="Active assignments" />{workspace.assignments.length ? workspace.assignments.map((item) => <div className="assignment-row" key={item.id}><div><strong>{item.doctorName}</strong><small>{item.patientId} · {item.doctorSubject}</small></div><button className="danger-button" onClick={() => remove(item.id)}>Remove</button></div>) : <EmptyState copy="No active care assignments." />}<div className="security-list"><SecurityCheck label="Clinical content" value="Hidden from Admin" /><SecurityCheck label="API identity" value="Embedded JWK verified" /><SecurityCheck label="Sender binding" value="DPoP required" /><SecurityCheck label="Object access" value="Patient assignment checked" /></div></div></section></>;
}

function Unauthorized() { return <main className="state-page"><div className="state-card"><span className="state-icon">403</span><h1>This health record is not assigned to you.</h1><p>Your identity is valid, but the required role or patient relationship is missing. TrustCare blocks access at the API even if someone guesses the URL.</p><NavLink className="primary-button" to="/dashboard">Return to overview</NavLink></div></main>; }
function Brand({ light = false }) { return <a className={`brand ${light ? "light" : ""}`} href="/"><span>TC</span><b>TrustCare</b></a>; }
function PageIntro({ eyebrow, title, copy }) { return <header className="page-intro"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></header>; }
function Metric({ label, value, note, tone }) { return <article className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>; }
function PanelTitle({ title, link }) { return <div className="panel-title"><h2>{title}</h2>{link && <NavLink to={link}>View all →</NavLink>}</div>; }
function PatientRow({ patient, recordCount }) { return <div className="project-row"><span className="project-icon">{patient.bloodType === "Unknown" ? "?" : patient.bloodType}</span><div><strong>{patient.displayName}</strong><small>{patient.id} · {patient.allergies.length ? `Allergy: ${patient.allergies.join(", ")}` : "No known allergies"}</small><div className="progress"><i style={{ width: recordCount ? "100%" : "18%" }} /></div></div><b>{recordCount} records</b></div>; }
function PatientCard({ patient }) { return <article className="patient-card"><div className="patient-card-head"><span>{patient.bloodType}</span><div><h2>{patient.displayName}</h2><small>{patient.id}</small></div></div><dl><div><dt>Date of birth</dt><dd>{patient.dateOfBirth}</dd></div><div><dt>Allergy flags</dt><dd>{patient.allergies.length}</dd></div><div><dt>Clinical notes</dt><dd>Restricted</dd></div></dl></article>; }
function EmptyState({ copy }) { return <div className="empty-state"><span>＋</span><p>{copy}</p></div>; }
function SecurityCheck({ label, value }) { return <div className="security-check"><span>✓</span><div><small>{label}</small><strong>{value}</strong></div></div>; }
