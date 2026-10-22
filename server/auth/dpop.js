import { calculateJwkThumbprint, decodeProtectedHeader, importJWK, jwtVerify } from "jose";

export class DpopError extends Error {
  constructor(message) { super(message); this.name = "DpopError"; }
}

export class MemoryJtiStore {
  constructor() { this.seen = new Map(); }
  async claim(jti, expiresAtMs) {
    const now = Date.now();
    for (const [key, expiry] of this.seen) if (expiry < now) this.seen.delete(key);
    if (this.seen.has(jti)) return false;
    this.seen.set(jti, expiresAtMs);
    return true;
  }
}

const defaultStore = new MemoryJtiStore();

export function requestHtu(request, trustForwardedHeaders = true) {
  const url = new URL(request.url);
  if (trustForwardedHeaders) {
    const host = request.headers.get("x-forwarded-host");
    const protocol = request.headers.get("x-forwarded-proto");
    if (host) return `${(protocol?.split(",")[0].trim()) || url.protocol.replace(":", "")}://${host.split(",")[0].trim()}${url.pathname}`;
  }
  return `${url.origin}${url.pathname}`;
}

export async function verifyDpop(request, accessToken, claims, options = {}) {
  const jkt = claims.cnf?.jkt;
  if (!jkt) throw new DpopError("Access token is not sender-constrained");
  if (!/^DPoP /i.test(request.headers.get("authorization") || "")) throw new DpopError("A bound token must use the DPoP authorization scheme");
  const proof = request.headers.get("dpop");
  if (!proof) throw new DpopError("Missing DPoP proof");

  let header;
  try { header = decodeProtectedHeader(proof); } catch { throw new DpopError("DPoP proof is not a compact JWS"); }
  if (header.typ !== "dpop+jwt" || !header.jwk) throw new DpopError("Invalid DPoP protected header");

  let payload;
  try {
    const key = await importJWK(header.jwk, header.alg);
    ({ payload } = await jwtVerify(proof, key));
  } catch { throw new DpopError("Invalid DPoP proof signature"); }

  if (await calculateJwkThumbprint(header.jwk, "sha256") !== jkt) throw new DpopError("DPoP key does not match cnf.jkt");
  const expectedAth = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(accessToken))).toString("base64url");
  if (payload.ath !== expectedAth) throw new DpopError("DPoP ath does not match the access token");
  if (typeof payload.htm !== "string" || payload.htm.toUpperCase() !== request.method.toUpperCase()) throw new DpopError("DPoP method mismatch");
  if (payload.htu !== requestHtu(request, options.trustForwardedHeaders ?? true)) throw new DpopError("DPoP URL mismatch");
  const skew = options.iatSkewSeconds ?? 300;
  if (typeof payload.iat !== "number" || Math.abs(Date.now() / 1000 - payload.iat) > skew) throw new DpopError("DPoP proof is outside the accepted time window");
  if (typeof payload.jti !== "string" || !payload.jti) throw new DpopError("DPoP proof has no jti");
  if (!(await (options.jtiStore || defaultStore).claim(payload.jti, Date.now() + skew * 1000))) throw new DpopError("DPoP proof replay detected");
}
