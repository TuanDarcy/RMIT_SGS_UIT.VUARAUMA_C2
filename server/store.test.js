import assert from "node:assert/strict";
import test from "node:test";
import {
  createAccessRequest,
  createAssignment,
  createMedicalRecord,
  decideAccessRequest,
  deleteAssignment,
  deleteMedicalRecord,
  resetStoreForTests,
  updateMedicalRecord,
  workspaceSnapshot,
} from "./store.js";

const patient = { claims: { sub: "patient-1", name: "Patient One" }, roles: ["patient"] };
const otherPatient = { claims: { sub: "patient-2", name: "Patient Two" }, roles: ["patient"] };
const legacyMember = { claims: { sub: "legacy-member", name: "Legacy Patient" }, roles: ["member"] };
const doctor = { claims: { sub: "doctor-1", name: "Doctor One" }, roles: ["doctor"] };
const unassignedDoctor = { claims: { sub: "doctor-2", name: "Doctor Two" }, roles: ["doctor"] };
const admin = { claims: { sub: "admin-1", name: "Admin User" }, roles: ["admin"] };

test.afterEach(resetStoreForTests);

test("patient sees only their own profile and records", () => {
  const snapshot = workspaceSnapshot(patient);
  assert.deepEqual(snapshot.patients.map((item) => item.id), ["PT-1001"]);
  assert.ok(snapshot.records.every((item) => item.patientId === "PT-1001"));
  assert.equal(snapshot.user.primaryRole, "patient");
});

test("legacy member is safely mapped to a patient profile", () => {
  const snapshot = workspaceSnapshot(legacyMember);
  assert.equal(snapshot.user.primaryRole, "patient");
  assert.equal(snapshot.patients.length, 1);
  assert.equal(snapshot.patients[0].ownerSubject, "legacy-member");
});

test("assigned doctor sees only assigned patients", () => {
  const snapshot = workspaceSnapshot(doctor);
  assert.deepEqual(snapshot.patients.map((item) => item.id), ["PT-1001"]);
  assert.ok(snapshot.records.every((item) => item.patientId === "PT-1001"));
});

test("admin receives directory metadata but no clinical records", () => {
  const snapshot = workspaceSnapshot(admin);
  assert.equal(snapshot.patients.length, 2);
  assert.equal(snapshot.records.length, 0);
  assert.ok(snapshot.patients.every((item) => !("ownerSubject" in item)));
});

test("assigned doctor can create and update a medical record", () => {
  const record = createMedicalRecord("PT-1001", { title: "Follow-up visit", clinicalNote: "Patient recovery is progressing as expected.", type: "consultation", status: "draft" }, doctor);
  assert.equal(record.patientId, "PT-1001");
  const updated = updateMedicalRecord("PT-1001", record.id, { status: "final" }, doctor);
  assert.equal(updated.status, "final");
});

test("unassigned doctor cannot read through workspace or mutate another patient", () => {
  assert.equal(workspaceSnapshot(unassignedDoctor).patients.length, 0);
  assert.throws(() => createMedicalRecord("PT-1001", { title: "Forbidden record", clinicalNote: "This operation must be blocked by assignment checks.", type: "diagnosis" }, unassignedDoctor), { status: 403 });
  assert.throws(() => updateMedicalRecord("PT-1001", "MR-2001", { title: "Forbidden update" }, unassignedDoctor), { status: 403 });
});

test("only draft records may be deleted", () => {
  assert.equal(deleteMedicalRecord("PT-1001", "MR-2002", doctor).id, "MR-2002");
  assert.throws(() => deleteMedicalRecord("PT-1001", "MR-2001", doctor), { status: 409 });
});

test("doctor can request access but cannot approve it", () => {
  const request = createAccessRequest({ patientId: "PT-1002", reason: "A specialist consultation has been requested by the patient." }, unassignedDoctor);
  assert.equal(request.status, "pending");
  assert.throws(() => decideAccessRequest(request.id, { decision: "approved" }, unassignedDoctor), { status: 403 });
});

test("only the matching patient can decide an access request", () => {
  const request = createAccessRequest({ patientId: "PT-1002", reason: "Review recent results and coordinate the next appointment." }, unassignedDoctor);
  assert.throws(() => decideAccessRequest(request.id, { decision: "approved" }, patient), { status: 403 });
  assert.equal(decideAccessRequest(request.id, { decision: "approved" }, otherPatient).status, "approved");
  assert.deepEqual(workspaceSnapshot(unassignedDoctor).patients.map((item) => item.id), ["PT-1002"]);
});

test("admin can create and remove a doctor assignment", () => {
  const assignment = createAssignment({ patientId: "PT-1002", doctorSubject: "doctor-2", doctorName: "Doctor Two" }, admin);
  assert.equal(workspaceSnapshot(unassignedDoctor).patients[0].id, "PT-1002");
  assert.equal(deleteAssignment(assignment.id, admin).id, assignment.id);
  assert.equal(workspaceSnapshot(unassignedDoctor).patients.length, 0);
});

test("patient and doctor cannot perform admin assignment operations", () => {
  const input = { patientId: "PT-1002", doctorSubject: "doctor-2", doctorName: "Doctor Two" };
  assert.throws(() => createAssignment(input, patient), { status: 403 });
  assert.throws(() => createAssignment(input, doctor), { status: 403 });
});
