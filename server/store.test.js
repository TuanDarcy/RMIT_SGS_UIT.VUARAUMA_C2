import assert from "node:assert/strict";
import test from "node:test";
import { workspaceSnapshot } from "./store.js";

test("workspace trusts only roles from the verified Tide token", () => {
  const snapshot = workspaceSnapshot({
    claims: { sub: "steward-1", name: "Steward One" },
    roles: ["steward", "unrelated-role"],
  });
  assert.deepEqual(snapshot.user.roles, ["steward"]);
  assert.equal(snapshot.user.primaryRole, "steward");
  assert.equal("projects" in snapshot, false);
});
