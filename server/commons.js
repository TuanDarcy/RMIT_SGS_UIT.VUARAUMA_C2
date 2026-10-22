import { randomUUID } from "node:crypto";

const cases = [];
const audit = [];
const REQUIRED_APPROVALS = 2;

export function commonsSnapshot(actor) {
  return {
    rules: { requiredApprovals: REQUIRED_APPROVALS, stewardCount: 3 },
    cases: cases.map((item) => ({
      id: item.id,
      requester: { subject: actor.subject === item.requester.subject ? item.requester.subject : undefined, name: actor.subject === item.requester.subject ? "You" : "Anonymous student" },
      category: item.category,
      amount: item.amount,
      approvals: structuredClone(item.approvals),
      status: item.status,
      createdAt: item.createdAt,
      sealed: true,
    })),
    audit: structuredClone(audit),
  };
}

export function createAidCase(input, actor) {
  const categories = new Set(["Transport", "Food", "Course materials", "Emergency"]);
  const amount = Number(input.amount);
  const encryptedDetails = String(input.encryptedDetails || "");
  if (!categories.has(input.category) || !Number.isInteger(amount) || amount < 10 || amount > 500) {
    throw Object.assign(new Error("Choose a valid category and an amount from $10 to $500."), { status: 400 });
  }
  const isBase64Ciphertext = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encryptedDetails);
  if (encryptedDetails.length < 24 || encryptedDetails.length > 20000 || !isBase64Ciphertext) {
    throw Object.assign(new Error("The private details must be encrypted with TideCloak before submission."), { status: 400 });
  }

  const item = {
    id: randomUUID(),
    requester: { subject: actor.subject, name: actor.name },
    category: input.category,
    amount,
    encryptedDetails,
    approvals: [],
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  cases.unshift(item);
  audit.unshift({ id: randomUUID(), caseId: item.id, actor: actor.name, action: "Support request submitted", at: item.createdAt });
  return { ...item, encryptedDetails: undefined };
}

export function voteOnAidCase(caseId, input, actor) {
  const item = cases.find((entry) => entry.id === caseId);
  if (!item) throw Object.assign(new Error("Support request not found."), { status: 404 });
  if (item.status !== "pending") throw Object.assign(new Error("This request already has a final decision."), { status: 409 });
  if (item.requester.subject === actor.subject) throw Object.assign(new Error("Requesters cannot vote on their own case."), { status: 403 });
  if (item.approvals.some((vote) => vote.subject === actor.subject)) {
    throw Object.assign(new Error("Each steward may vote once."), { status: 409 });
  }
  if (!["approve", "decline", "abstain"].includes(input.decision)) throw Object.assign(new Error("Choose approve, decline or abstain."), { status: 400 });

  const vote = { subject: actor.subject, name: actor.name, decision: input.decision };
  item.approvals.push(vote);
  const sameDecision = item.approvals.filter((entry) => entry.decision === input.decision);
  if (input.decision !== "abstain" && sameDecision.length >= REQUIRED_APPROVALS) item.status = input.decision === "approve" ? "approved" : "declined";
  else if (item.approvals.length === 3) item.status = "no-quorum";
  audit.unshift({
    id: randomUUID(),
    caseId: item.id,
    actor: actor.name,
    action: item.status === "pending" ? `Steward ${input.decision} vote recorded` : item.status === "no-quorum" ? "Request closed without quorum" : `Request ${item.status}`,
    at: new Date().toISOString(),
  });
  return { ...item, encryptedDetails: undefined };
}

export function getEncryptedAidDetails(caseId, actor) {
  const item = cases.find((entry) => entry.id === caseId);
  if (!item) throw Object.assign(new Error("Support request not found."), { status: 404 });
  if (!actor.roles.includes("steward")) throw Object.assign(new Error("Steward role required."), { status: 403 });
  return { id: item.id, encryptedDetails: item.encryptedDetails, tags: ["commons-case"] };
}

export function resetCommonsForTests() {
  cases.splice(1);
  audit.splice(0);
}
