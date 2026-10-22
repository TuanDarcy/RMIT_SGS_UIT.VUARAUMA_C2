import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { commonsSnapshot, createAidCase, getEncryptedAidDetails, resetCommonsForTests, voteOnAidCase } from "./commons.js";

const ciphertext = "VGhpcyBpcyBvbmx5IGEgc3ludGhldGljIGNpcGhlcnRleHQ=";
const requester = { subject: "student-1", name: "Student One" };
const stewards = [
  { subject: "steward-1", name: "Steward One", roles: ["steward"] },
  { subject: "steward-2", name: "Steward Two", roles: ["steward"] },
  { subject: "steward-3", name: "Steward Three", roles: ["steward"] },
];

beforeEach(resetCommonsForTests);

function createCase() {
  return createAidCase({ category: "Transport", amount: 45, encryptedDetails: ciphertext }, requester);
}

test("stores only encrypted case details and hides the requester from other members", () => {
  const item = createCase();
  const otherMemberView = commonsSnapshot({ subject: "student-2" });
  assert.equal(item.encryptedDetails, undefined);
  assert.equal(otherMemberView.cases[0].requester.name, "Anonymous student");
  assert.equal("encryptedDetails" in otherMemberView.cases[0], false);
  assert.equal(getEncryptedAidDetails(item.id, stewards[0]).encryptedDetails, ciphertext);
  assert.throws(() => getEncryptedAidDetails(item.id, { roles: ["member"] }), { status: 403 });
});

test("rejects plaintext instead of accepting it as a sealed explanation", () => {
  assert.throws(() => createAidCase({ category: "Transport", amount: 45, encryptedDetails: "This is not encrypted data at all." }, requester), { status: 400 });
});

test("requires two distinct steward approvals and blocks self-approval and duplicate votes", () => {
  const item = createCase();
  assert.throws(() => voteOnAidCase(item.id, { decision: "approve" }, { ...stewards[0], subject: requester.subject }), { status: 403 });
  voteOnAidCase(item.id, { decision: "approve" }, stewards[0]);
  assert.throws(() => voteOnAidCase(item.id, { decision: "approve" }, stewards[0]), { status: 409 });
  assert.equal(commonsSnapshot(requester).cases[0].status, "pending");
  voteOnAidCase(item.id, { decision: "approve" }, stewards[1]);
  assert.equal(commonsSnapshot(requester).cases[0].status, "approved");
  assert.throws(() => voteOnAidCase(item.id, { decision: "decline" }, stewards[2]), { status: 409 });
});

test("closes a split vote with an abstention without inventing a decision", () => {
  const item = createCase();
  voteOnAidCase(item.id, { decision: "approve" }, stewards[0]);
  voteOnAidCase(item.id, { decision: "decline" }, stewards[1]);
  voteOnAidCase(item.id, { decision: "abstain" }, stewards[2]);
  assert.equal(commonsSnapshot(requester).cases[0].status, "no-quorum");
});
