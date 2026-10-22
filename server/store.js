export function workspaceSnapshot(auth) {
  const claims = auth.claims;
  const name = claims.name || claims.preferred_username || "Verified member";
  const roles = auth.roles.filter((role) => ["admin", "member", "steward"].includes(role));
  const primaryRole = roles.includes("steward") ? "steward" : roles.includes("admin") ? "admin" : "member";
  return { user: { subject: claims.sub, name, firstName: name.split(/\s+/)[0], roles, primaryRole } };
}
