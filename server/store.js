import { randomUUID } from "node:crypto";

const colors = ["violet", "coral", "mint"];
const state = {
  projects: [
    { id: "project-campus", name: "Campus Connect", summary: "Make student communities easier to discover and join.", color: "violet", members: ["An", "Minh", "Linh"], tasks: [
      { id: "task-research", title: "Validate student pain points", status: "done", priority: "high", assignee: "Linh" },
      { id: "task-prototype", title: "Prototype discovery flow", status: "in-progress", priority: "high", assignee: "Minh" },
      { id: "task-copy", title: "Polish onboarding copy", status: "todo", priority: "medium", assignee: "An" },
    ] },
    { id: "project-trust", name: "TrustFlow Launch", summary: "Deliver the secure collaboration vertical slice.", color: "coral", members: ["Tuấn", "An", "Minh"], tasks: [
      { id: "task-auth", title: "Wire TideCloak authentication", status: "done", priority: "high", assignee: "Tuấn" },
      { id: "task-api", title: "Verify JWT and DPoP at API", status: "in-progress", priority: "high", assignee: "An" },
      { id: "task-demo", title: "Record judge demo", status: "todo", priority: "medium", assignee: "Minh" },
    ] },
  ],
  approvals: [
    {
      id: "approval-demo",
      title: "Publish the final demo",
      description: "Approve the reviewed recording before it is attached to the submission.",
      risk: "high",
      status: "pending",
      requestedBy: { subject: "member-demo", name: "Minh" },
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      decidedBy: null,
      decidedAt: null,
    },
  ],
  audit: [
    { id: "audit-1", action: "Workspace secured", detail: "Protected operations require a verified TideCloak identity.", at: new Date().toISOString() },
    { id: "audit-2", action: "Role boundary enabled", detail: "Admin and Member permissions are enforced at the API.", at: new Date(Date.now() - 3600000).toISOString() },
  ],
};
const baseline = structuredClone(state);

export function workspaceSnapshot(auth) {
  const claims = auth.claims;
  const name = claims.name || claims.preferred_username || "Verified member";
  return { user: { subject: claims.sub, name, firstName: name.split(/\s+/)[0], roles: auth.roles.filter((role) => ["admin", "member"].includes(role)), primaryRole: auth.roles.includes("admin") ? "admin" : "member" }, projects: structuredClone(state.projects), approvals: structuredClone(state.approvals), audit: structuredClone(state.audit) };
}

export function createProject(input, auth) {
  if (!auth.roles.includes("admin")) throw Object.assign(new Error("Admin role required"), { status: 403 });
  const name = String(input.name || "").trim();
  const summary = String(input.summary || "").trim();
  if (name.length < 3 || name.length > 60 || summary.length < 10 || summary.length > 180) throw Object.assign(new Error("Project name or purpose is invalid"), { status: 400 });
  const project = { id: randomUUID(), name, summary, color: colors[state.projects.length % colors.length], members: [auth.claims.name || auth.claims.preferred_username || "Admin"], tasks: [] };
  state.projects.push(project);
  state.audit.unshift({ id: randomUUID(), action: "Project created", detail: `${project.name} was created by ${project.members[0]}.`, at: new Date().toISOString() });
  return structuredClone(project);
}

export function updateTask(projectId, taskId, input, auth) {
  if (!auth.roles.some((role) => role === "admin" || role === "member")) throw Object.assign(new Error("Member role required"), { status: 403 });
  const project = state.projects.find((item) => item.id === projectId);
  const task = project?.tasks.find((item) => item.id === taskId);
  if (!task) throw Object.assign(new Error("Task not found"), { status: 404 });
  if (!new Set(["todo", "in-progress", "done"]).has(input.status)) throw Object.assign(new Error("Invalid task status"), { status: 400 });
  task.status = input.status;
  const actor = auth.claims.name || auth.claims.preferred_username || auth.claims.sub;
  state.audit.unshift({ id: randomUUID(), action: "Task advanced", detail: `${actor} moved “${task.title}” to ${task.status}.`, at: new Date().toISOString() });
  return structuredClone(task);
}

export function createTask(projectId, input, auth) {
  if (!auth.roles.some((role) => role === "admin" || role === "member")) throw Object.assign(new Error("Member role required"), { status: 403 });
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) throw Object.assign(new Error("Project not found"), { status: 404 });
  const title = String(input.title || "").trim();
  const priority = String(input.priority || "medium");
  if (title.length < 3 || title.length > 100 || !new Set(["low", "medium", "high"]).has(priority)) throw Object.assign(new Error("Task title or priority is invalid"), { status: 400 });
  const actor = auth.claims.name || auth.claims.preferred_username || auth.claims.sub;
  const task = { id: randomUUID(), title, status: "todo", priority, assignee: actor };
  project.tasks.push(task);
  state.audit.unshift({ id: randomUUID(), action: "Task created", detail: `${actor} added “${task.title}” to ${project.name}.`, at: new Date().toISOString() });
  return structuredClone(task);
}

export function deleteTask(projectId, taskId, auth) {
  if (!auth.roles.some((role) => role === "admin" || role === "member")) throw Object.assign(new Error("Member role required"), { status: 403 });
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) throw Object.assign(new Error("Project not found"), { status: 404 });
  const taskIndex = project.tasks.findIndex((item) => item.id === taskId);
  if (taskIndex === -1) throw Object.assign(new Error("Task not found"), { status: 404 });
  const [task] = project.tasks.splice(taskIndex, 1);
  const actor = auth.claims.name || auth.claims.preferred_username || auth.claims.sub;
  state.audit.unshift({ id: randomUUID(), action: "Task deleted", detail: `${actor} deleted “${task.title}” from ${project.name}.`, at: new Date().toISOString() });
  return structuredClone(task);
}

export function deleteProject(projectId, auth) {
  if (!auth.roles.includes("admin")) throw Object.assign(new Error("Admin role required"), { status: 403 });
  const projectIndex = state.projects.findIndex((item) => item.id === projectId);
  if (projectIndex === -1) throw Object.assign(new Error("Project not found"), { status: 404 });
  const [project] = state.projects.splice(projectIndex, 1);
  const actor = auth.claims.name || auth.claims.preferred_username || auth.claims.sub;
  state.audit.unshift({ id: randomUUID(), action: "Project deleted", detail: `${actor} deleted ${project.name}.`, at: new Date().toISOString() });
  return structuredClone(project);
}

export function createApproval(input, auth) {
  if (!auth.roles.some((role) => role === "admin" || role === "member")) throw Object.assign(new Error("Member role required"), { status: 403 });
  const title = String(input.title || "").trim();
  const description = String(input.description || "").trim();
  const risk = String(input.risk || "medium");
  if (title.length < 3 || title.length > 80 || description.length < 10 || description.length > 240 || !new Set(["low", "medium", "high"]).has(risk)) throw Object.assign(new Error("Approval request is invalid"), { status: 400 });
  const requester = { subject: auth.claims.sub, name: auth.claims.name || auth.claims.preferred_username || auth.claims.sub };
  const approval = { id: randomUUID(), title, description, risk, status: "pending", requestedBy: requester, createdAt: new Date().toISOString(), decidedBy: null, decidedAt: null };
  state.approvals.unshift(approval);
  state.audit.unshift({ id: randomUUID(), action: "Approval requested", detail: `${requester.name} requested approval for “${approval.title}”.`, at: new Date().toISOString() });
  return structuredClone(approval);
}

export function decideApproval(approvalId, input, auth) {
  if (!auth.roles.includes("admin")) throw Object.assign(new Error("Admin role required"), { status: 403 });
  const approval = state.approvals.find((item) => item.id === approvalId);
  if (!approval) throw Object.assign(new Error("Approval request not found"), { status: 404 });
  if (approval.status !== "pending") throw Object.assign(new Error("Approval request has already been decided"), { status: 409 });
  if (approval.requestedBy.subject === auth.claims.sub) throw Object.assign(new Error("Requesters cannot approve their own change"), { status: 403 });
  const decision = String(input.decision || "");
  if (!new Set(["approved", "rejected"]).has(decision)) throw Object.assign(new Error("Decision must be approved or rejected"), { status: 400 });
  const decisionMaker = { subject: auth.claims.sub, name: auth.claims.name || auth.claims.preferred_username || auth.claims.sub };
  approval.status = decision;
  approval.decidedBy = decisionMaker;
  approval.decidedAt = new Date().toISOString();
  state.audit.unshift({ id: randomUUID(), action: decision === "approved" ? "Change approved" : "Change rejected", detail: `${decisionMaker.name} ${decision === "approved" ? "approved" : "rejected"} “${approval.title}”.`, at: approval.decidedAt });
  return structuredClone(approval);
}

export function cancelApproval(approvalId, auth) {
  const approvalIndex = state.approvals.findIndex((item) => item.id === approvalId);
  if (approvalIndex === -1) throw Object.assign(new Error("Approval request not found"), { status: 404 });
  const approval = state.approvals[approvalIndex];
  const canCancel = auth.roles.includes("admin") || approval.requestedBy.subject === auth.claims.sub;
  if (!canCancel) throw Object.assign(new Error("Only the requester or an Admin can cancel this request"), { status: 403 });
  if (approval.status !== "pending") throw Object.assign(new Error("Only pending requests can be cancelled"), { status: 409 });
  state.approvals.splice(approvalIndex, 1);
  const actor = auth.claims.name || auth.claims.preferred_username || auth.claims.sub;
  state.audit.unshift({ id: randomUUID(), action: "Approval cancelled", detail: `${actor} cancelled “${approval.title}”.`, at: new Date().toISOString() });
  return structuredClone(approval);
}

export function resetStoreForTests() {
  state.projects = structuredClone(baseline.projects);
  state.approvals = structuredClone(baseline.approvals);
  state.audit = structuredClone(baseline.audit);
}
