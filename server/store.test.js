import assert from "node:assert/strict";
import test from "node:test";
import { createProject, createTask, resetStoreForTests, updateTask, workspaceSnapshot } from "./store.js";

const admin = { claims: { sub: "admin-1", name: "Admin User" }, roles: ["admin", "member"] };
const member = { claims: { sub: "member-1", name: "Member User" }, roles: ["member"] };

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
