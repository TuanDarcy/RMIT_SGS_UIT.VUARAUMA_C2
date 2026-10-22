import assert from "node:assert/strict";
import test from "node:test";
import { calculateJwkThumbprint, exportJWK, generateKeyPair, SignJWT } from "jose";
import { DpopError, MemoryJtiStore, verifyDpop } from "./dpop.js";

const accessToken = "header.test-access-token.signature";

async function fixture(overrides = {}) {
  const { publicKey, privateKey } = await generateKeyPair("ES256", { extractable: true });
  const jwk = await exportJWK(publicKey);
  const jkt = await calculateJwkThumbprint(jwk, "sha256");
  const ath = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(accessToken))).toString("base64url");
  const payload = { jti: crypto.randomUUID(), htm: "GET", htu: "https://app.example/api/workspace", iat: Math.floor(Date.now() / 1000), ath, ...overrides };
  const proof = await new SignJWT(payload).setProtectedHeader({ alg: "ES256", typ: "dpop+jwt", jwk: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y } }).sign(privateKey);
  return { proof, claims: { cnf: { jkt } } };
}

function request(proof, authorization = `DPoP ${accessToken}`) {
  const values = { authorization, dpop: proof, "x-forwarded-host": "app.example", "x-forwarded-proto": "https" };
  return { url: "http://internal:4000/api/workspace", method: "GET", headers: { get: (name) => values[name.toLowerCase()] || null } };
}

test("accepts a valid sender-bound proof", async () => {
  const { proof, claims } = await fixture();
  await assert.doesNotReject(verifyDpop(request(proof), accessToken, claims, { jtiStore: new MemoryJtiStore() }));
});

test("rejects a bound token replayed as Bearer", async () => {
  const { proof, claims } = await fixture();
  await assert.rejects(verifyDpop(request(proof, `Bearer ${accessToken}`), accessToken, claims), DpopError);
});

test("rejects wrong method and URL", async () => {
  const wrongMethod = await fixture({ htm: "POST" });
  await assert.rejects(verifyDpop(request(wrongMethod.proof), accessToken, wrongMethod.claims), DpopError);
  const wrongUrl = await fixture({ htu: "https://evil.example/api/workspace" });
  await assert.rejects(verifyDpop(request(wrongUrl.proof), accessToken, wrongUrl.claims), DpopError);
});

test("rejects reuse of the same proof jti", async () => {
  const { proof, claims } = await fixture();
  const store = new MemoryJtiStore();
  await verifyDpop(request(proof), accessToken, claims, { jtiStore: store });
  await assert.rejects(verifyDpop(request(proof), accessToken, claims, { jtiStore: store }), DpopError);
});
