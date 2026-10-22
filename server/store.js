import { randomUUID } from "node:crypto";

const allowedRecordStatuses = new Set(["draft", "final"]);
const allowedRecordTypes = new Set(["consultation", "diagnosis", "prescription", "lab-result"]);

const initialState = {
  patients: [
    { id: "PT-1001", ownerSubject: "patient-1", displayName: "Nguyen Minh Anh", dateOfBirth: "2001-08-14", bloodType: "O+", allergies: ["Penicillin"], emergencyContact: "0900 000 001" },
    { id: "PT-1002", ownerSubject: "patient-2", displayName: "Tran Gia Han", dateOfBirth: "1999-03-22", bloodType: "A+", allergies: [], emergencyContact: "0900 000 002" },
  ],
  records: [
    { id: "MR-2001", patientId: "PT-1001", doctorSubject: "doctor-1", doctorName: "Dr. Le Thanh", type: "consultation", title: "Annual health review", clinicalNote: "Routine examination completed. Vital signs are within the expected range.", status: "final", recordedAt: "2026-10-18T08:30:00.000Z", updatedAt: "2026-10-18T08:30:00.000Z" },
    { id: "MR-2002", patientId: "PT-1001", doctorSubject: "doctor-1", doctorName: "Dr. Le Thanh", type: "prescription", title: "Seasonal allergy care", clinicalNote: "Non-drowsy antihistamine recommended as needed. Review if symptoms persist.", status: "draft", recordedAt: "2026-10-20T03:15:00.000Z", updatedAt: "2026-10-20T03:15:00.000Z" },
  ],
  assignments: [
    { id: "AS-3001", patientId: "PT-1001", doctorSubject: "doctor-1", doctorName: "Dr. Le Thanh", createdAt: "2026-10-17T04:00:00.000Z" },
  ],
  accessRequests: [
    { id: "AR-4001", patientId: "PT-1002", doctorSubject: "doctor-1", doctorName: "Dr. Le Thanh", reason: "Follow-up consultation and care coordination.", status: "pending", createdAt: "2026-10-21T06:30:00.000Z", decidedAt: null },
  ],
  audit: [
    { id: "AU-5001", subject: "patient-1", action: "Medical record viewed", detail: "Patient opened their own protected record timeline.", at: "2026-10-21T09:05:00.000Z" },
    { id: "AU-5002", subject: "doctor-1", action: "Consent requested", detail: "Dr. Le Thanh requested access to patient PT-1002.", at: "2026-10-21T06:30:00.000Z" },
  ],
};

const state = structuredClone(initialState);

function appRole(auth) {
  if (auth.roles.includes("admin")) return "admin";
  if (auth.roles.includes("doctor")) return "doctor";
  if (auth.roles.some((role) => role === "patient" || role === "member")) return "patient";
  throw Object.assign(new Error("Patient, Doctor, or Admin role required"), { status: 403 });
}

function actorName(auth) {
  return auth.claims.name || auth.claims.preferred_username || auth.claims.sub;
}

function fail(message, status) {
  throw Object.assign(new Error(message), { status });
}

function findPatient(patientId) {
  const patient = state.patients.find((item) => item.id === patientId);
  if (!patient) fail("Patient not found", 404);
  return patient;
}

function ensurePatientProfile(auth) {
  let patient = state.patients.find((item) => item.ownerSubject === auth.claims.sub);
  if (patient) return patient;
  const suffix = String(state.patients.length + 1001).padStart(4, "0");
  patient = { id: `PT-${suffix}`, ownerSubject: auth.claims.sub, displayName: actorName(auth), dateOfBirth: "Not provided", bloodType: "Unknown", allergies: [], emergencyContact: "Not provided" };
  state.patients.push(patient);
  state.audit.unshift({ id: randomUUID(), subject: auth.claims.sub, action: "Patient profile created", detail: `${patient.id} was linked to a verified TideCloak identity.`, at: new Date().toISOString() });
  return patient;
}

function isAssigned(patientId, doctorSubject) {
  return state.assignments.some((item) => item.patientId === patientId && item.doctorSubject === doctorSubject);
}

function assertAssignedDoctor(patientId, auth) {
  if (appRole(auth) !== "doctor" || !isAssigned(patientId, auth.claims.sub)) fail("You are not assigned to this patient", 403);
}

function visibleAudit(auth, role, patientIds) {
  if (role === "admin") return state.audit.filter((item) => item.action.includes("assignment") || item.action.includes("Consent"));
  if (role === "patient") return state.audit.filter((item) => item.subject === auth.claims.sub);
  return state.audit.filter((item) => item.subject === auth.claims.sub || patientIds.some((id) => item.detail.includes(id)));
}

export function workspaceSnapshot(auth) {
  const role = appRole(auth);
  const name = actorName(auth);
  let patients;
  let records;
  let accessRequests;

  if (role === "patient") {
    const patient = ensurePatientProfile(auth);
    patients = [patient];
    records = state.records.filter((item) => item.patientId === patient.id);
    accessRequests = state.accessRequests.filter((item) => item.patientId === patient.id);
  } else if (role === "doctor") {
    const patientIds = state.assignments.filter((item) => item.doctorSubject === auth.claims.sub).map((item) => item.patientId);
    patients = state.patients.filter((item) => patientIds.includes(item.id));
    records = state.records.filter((item) => patientIds.includes(item.patientId));
    accessRequests = state.accessRequests.filter((item) => item.doctorSubject === auth.claims.sub);
  } else {
    patients = state.patients.map(({ ownerSubject: _ownerSubject, ...patient }) => patient);
    records = [];
    accessRequests = state.accessRequests;
  }

  const patientIds = patients.map((item) => item.id);
  return {
    user: { subject: auth.claims.sub, name, firstName: name.split(/\s+/)[0], roles: [role], primaryRole: role },
    patients: structuredClone(patients),
    records: structuredClone(records),
    assignments: role === "admin" ? structuredClone(state.assignments) : [],
    accessRequests: structuredClone(accessRequests),
    audit: structuredClone(visibleAudit(auth, role, patientIds)),
  };
}

export function createMedicalRecord(patientId, input, auth) {
  findPatient(patientId);
  assertAssignedDoctor(patientId, auth);
  const title = String(input.title || "").trim();
  const clinicalNote = String(input.clinicalNote || "").trim();
  const type = String(input.type || "consultation");
  const status = String(input.status || "draft");
  if (title.length < 3 || title.length > 100 || clinicalNote.length < 10 || clinicalNote.length > 1000 || !allowedRecordTypes.has(type) || !allowedRecordStatuses.has(status)) fail("Medical record fields are invalid", 400);
  const now = new Date().toISOString();
  const record = { id: `MR-${randomUUID()}`, patientId, doctorSubject: auth.claims.sub, doctorName: actorName(auth), type, title, clinicalNote, status, recordedAt: now, updatedAt: now };
  state.records.unshift(record);
  state.audit.unshift({ id: randomUUID(), subject: auth.claims.sub, action: "Medical record created", detail: `${record.id} was added to ${patientId}.`, at: now });
  return structuredClone(record);
}

export function updateMedicalRecord(patientId, recordId, input, auth) {
  findPatient(patientId);
  assertAssignedDoctor(patientId, auth);
  const record = state.records.find((item) => item.id === recordId && item.patientId === patientId);
  if (!record) fail("Medical record not found", 404);
  const title = String(input.title ?? record.title).trim();
  const clinicalNote = String(input.clinicalNote ?? record.clinicalNote).trim();
  const type = String(input.type ?? record.type);
  const status = String(input.status ?? record.status);
  if (title.length < 3 || title.length > 100 || clinicalNote.length < 10 || clinicalNote.length > 1000 || !allowedRecordTypes.has(type) || !allowedRecordStatuses.has(status)) fail("Medical record fields are invalid", 400);
  Object.assign(record, { title, clinicalNote, type, status, updatedAt: new Date().toISOString() });
  state.audit.unshift({ id: randomUUID(), subject: auth.claims.sub, action: "Medical record updated", detail: `${record.id} in ${patientId} was updated.`, at: record.updatedAt });
  return structuredClone(record);
}

export function deleteMedicalRecord(patientId, recordId, auth) {
  findPatient(patientId);
  assertAssignedDoctor(patientId, auth);
  const index = state.records.findIndex((item) => item.id === recordId && item.patientId === patientId);
  if (index === -1) fail("Medical record not found", 404);
  if (state.records[index].status !== "draft") fail("Only draft records can be deleted", 409);
  const [record] = state.records.splice(index, 1);
  state.audit.unshift({ id: randomUUID(), subject: auth.claims.sub, action: "Draft record deleted", detail: `${record.id} was removed from ${patientId}.`, at: new Date().toISOString() });
  return structuredClone(record);
}

export function createAccessRequest(input, auth) {
  if (appRole(auth) !== "doctor") fail("Doctor role required", 403);
  const patientId = String(input.patientId || "").trim();
  const reason = String(input.reason || "").trim();
  findPatient(patientId);
  if (isAssigned(patientId, auth.claims.sub)) fail("You already have access to this patient", 409);
  if (reason.length < 10 || reason.length > 240) fail("Access reason must be between 10 and 240 characters", 400);
  if (state.accessRequests.some((item) => item.patientId === patientId && item.doctorSubject === auth.claims.sub && item.status === "pending")) fail("A pending request already exists", 409);
  const request = { id: `AR-${randomUUID()}`, patientId, doctorSubject: auth.claims.sub, doctorName: actorName(auth), reason, status: "pending", createdAt: new Date().toISOString(), decidedAt: null };
  state.accessRequests.unshift(request);
  state.audit.unshift({ id: randomUUID(), subject: auth.claims.sub, action: "Consent requested", detail: `${request.doctorName} requested access to patient ${patientId}.`, at: request.createdAt });
  return structuredClone(request);
}

export function decideAccessRequest(requestId, input, auth) {
  if (appRole(auth) !== "patient") fail("Only the patient can decide this request", 403);
  const patient = ensurePatientProfile(auth);
  const request = state.accessRequests.find((item) => item.id === requestId);
  if (!request) fail("Access request not found", 404);
  if (request.patientId !== patient.id) fail("This request belongs to another patient", 403);
  if (request.status !== "pending") fail("Access request has already been decided", 409);
  const decision = String(input.decision || "");
  if (!new Set(["approved", "rejected"]).has(decision)) fail("Decision must be approved or rejected", 400);
  request.status = decision;
  request.decidedAt = new Date().toISOString();
  if (decision === "approved" && !isAssigned(request.patientId, request.doctorSubject)) {
    state.assignments.push({ id: `AS-${randomUUID()}`, patientId: request.patientId, doctorSubject: request.doctorSubject, doctorName: request.doctorName, createdAt: request.decidedAt });
  }
  state.audit.unshift({ id: randomUUID(), subject: auth.claims.sub, action: `Consent ${decision}`, detail: `${patient.id} ${decision} access for ${request.doctorName}.`, at: request.decidedAt });
  return structuredClone(request);
}

export function createAssignment(input, auth) {
  if (appRole(auth) !== "admin") fail("Admin role required", 403);
  const patientId = String(input.patientId || "").trim();
  const doctorSubject = String(input.doctorSubject || "").trim();
  const doctorName = String(input.doctorName || "").trim();
  findPatient(patientId);
  if (doctorSubject.length < 3 || doctorName.length < 2 || doctorName.length > 80) fail("Doctor assignment is invalid", 400);
  if (isAssigned(patientId, doctorSubject)) fail("Doctor is already assigned to this patient", 409);
  const assignment = { id: `AS-${randomUUID()}`, patientId, doctorSubject, doctorName, createdAt: new Date().toISOString() };
  state.assignments.push(assignment);
  state.audit.unshift({ id: randomUUID(), subject: auth.claims.sub, action: "Doctor assignment created", detail: `${doctorName} was assigned to ${patientId}.`, at: assignment.createdAt });
  return structuredClone(assignment);
}

export function deleteAssignment(assignmentId, auth) {
  if (appRole(auth) !== "admin") fail("Admin role required", 403);
  const index = state.assignments.findIndex((item) => item.id === assignmentId);
  if (index === -1) fail("Assignment not found", 404);
  const [assignment] = state.assignments.splice(index, 1);
  state.audit.unshift({ id: randomUUID(), subject: auth.claims.sub, action: "Doctor assignment removed", detail: `${assignment.doctorName} was removed from ${assignment.patientId}.`, at: new Date().toISOString() });
  return structuredClone(assignment);
}

export function resetStoreForTests() {
  Object.assign(state, structuredClone(initialState));
}
