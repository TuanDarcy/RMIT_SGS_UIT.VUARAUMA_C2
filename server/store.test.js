import assert from "node:assert/strict";
import test from "node:test";
import { cancelApproval, createApproval, createProject, createTask, decideApproval, deleteProject, deleteTask, resetStoreForTests, updateTask, workspaceSnapshot } from "./store.js";

const admin = { claims: { sub: "admin-1", name: "Admin User" }, roles: ["admin", "member"] };
const member = { claims: { sub: "member-1", name: "Member User" }, roles: ["member"] };
const otherMember = { claims: { sub: "member-2", name: "Other Member" }, roles: ["member"] };

test.afterEach(resetStoreForTests);

test("admin can create a project while member cannot", () => {
  assert.equal(createProject({ name: "Secure Demo", summary: "Prepare the final secure demonstration." }, admin).name, "Secure Demo");
  assert.throws(() => createProject({ name: "No", summary: "Member cannot create this project." }, member), { status: 403 });
});

test("member can advance an existing task", () => {
  const updated = updateTask("project-campus", "task-prototype", { status: "done" }, member);
  assert.equal(updated.status, "done");
  assert.equal(workspaceSnapshot(member).audit[0].action, "Task advanced");
});

test("member can create a validated task", () => {
  const task = createTask("project-campus", { title: "Prepare usability test", priority: "medium" }, member);
  assert.equal(task.status, "todo");
  assert.equal(task.assignee, "Member User");
});

test("invalid task state fails closed", () => {
  assert.throws(() => updateTask("project-campus", "task-prototype", { status: "deleted" }, member), { status: 400 });
});

test("member can delete a task and the action is audited", () => {
  const task = createTask("project-campus", { title: "Disposable demo task", priority: "low" }, member);
  assert.equal(deleteTask("project-campus", task.id, member).id, task.id);
  assert.equal(workspaceSnapshot(member).audit[0].action, "Task deleted");
  assert.throws(() => deleteTask("project-campus", task.id, member), { status: 404 });
});

test("only an admin can delete a project", () => {
  const project = createProject({ name: "Temporary Project", summary: "Created to verify protected deletion." }, admin);
  assert.throws(() => deleteProject(project.id, member), { status: 403 });
  assert.equal(deleteProject(project.id, admin).id, project.id);
  assert.equal(workspaceSnapshot(admin).audit[0].action, "Project deleted");
});

test("member can request approval and admin can decide it", () => {
  const approval = createApproval({ title: "Release project", description: "Publish the reviewed project to the judges.", risk: "high" }, member);
  assert.equal(approval.status, "pending");
  assert.throws(() => decideApproval(approval.id, { decision: "approved" }, member), { status: 403 });
  const decided = decideApproval(approval.id, { decision: "approved" }, admin);
  assert.equal(decided.status, "approved");
  assert.equal(decided.decidedBy.subject, "admin-1");
  assert.throws(() => decideApproval(approval.id, { decision: "rejected" }, admin), { status: 409 });
});

test("requester cannot approve their own change", () => {
  const approval = createApproval({ title: "Admin-authored change", description: "Verify separation between requesting and deciding.", risk: "medium" }, admin);
  assert.throws(() => decideApproval(approval.id, { decision: "approved" }, admin), { status: 403 });
});

test("only requester or admin can cancel a pending request", () => {
  const approval = createApproval({ title: "Cancel test", description: "Verify ownership checks for cancellation.", risk: "low" }, member);
  assert.throws(() => cancelApproval(approval.id, otherMember), { status: 403 });
  assert.equal(cancelApproval(approval.id, member).id, approval.id);
});
