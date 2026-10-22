import { extractToken, hasAnyRole, rolesFromToken, verifyTideJwt } from "./jwt.js";
import { verifyDpop } from "./dpop.js";

function requestAdapter(request) {
  const origin = `${request.protocol}://${request.get("host")}`;
  return {
    url: new URL(request.originalUrl, origin).href,
    method: request.method,
    headers: { get: (name) => request.get(name) || null },
  };
}

export async function authenticate(request, response, next) {
  try {
    const { token } = extractToken(request.get("authorization"));
    const claims = await verifyTideJwt(token);
    await verifyDpop(requestAdapter(request), token, claims, { trustForwardedHeaders: true });
    request.auth = { claims, roles: rolesFromToken(claims) };
    next();
  } catch (error) {
    console.warn("Authentication rejected:", error instanceof Error ? error.message : "unknown error");
    response.status(401).json({ error: "Authentication required" });
  }
}

export function requireRoles(...roles) {
  return (request, response, next) => {
    if (!request.auth || !hasAnyRole(request.auth.claims, roles)) return response.status(403).json({ error: "You do not have permission for this operation" });
    next();
  };
}
