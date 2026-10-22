import { createLocalJWKSet, jwtVerify } from "jose";
import { loadTideConfig } from "./config.js";

let verifier;

export function extractToken(header) {
  const match = /^(Bearer|DPoP) (.+)$/i.exec(header || "");
  if (!match) throw new Error("Missing or invalid authorization header");
  return { scheme: match[1].toLowerCase(), token: match[2] };
}

export async function verifyTideJwt(token) {
  const config = loadTideConfig();
  verifier ||= createLocalJWKSet(config.jwk);
  const issuer = `${config["auth-server-url"].replace(/\/+$/, "")}/realms/${config.realm}`;
  const { payload } = await jwtVerify(token, verifier, { issuer });
  if (payload.azp !== config.resource) throw new Error("Token client does not match TrustFlow");
  if (payload.iat && payload.iat > Math.floor(Date.now() / 1000) + 60) throw new Error("Token issued in the future");
  return payload;
}

export function rolesFromToken(payload) {
  const roles = new Set(payload.realm_access?.roles || []);
  for (const access of Object.values(payload.resource_access || {})) {
    for (const role of access?.roles || []) roles.add(role);
  }
  return [...roles];
}

export function hasAnyRole(payload, allowedRoles) {
  const roles = rolesFromToken(payload);
  return allowedRoles.some((role) => roles.includes(role));
}
