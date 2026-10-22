import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let cached;

export function loadTideConfig() {
  if (cached) return cached;
  const raw = process.env.TIDECLOAK_ADAPTER_JSON
    ? process.env.TIDECLOAK_ADAPTER_JSON
    : readFileSync(resolve(process.env.TIDECLOAK_CONFIG_PATH || "public/tidecloak.json"), "utf8");
  const config = JSON.parse(raw);
  if (!config.realm || !config.resource || !config["auth-server-url"]) throw new Error("TideCloak adapter is missing realm, resource, or auth-server-url");
  if (!config.jwk?.keys?.length) throw new Error("TideCloak adapter has no embedded jwk; remote JWKS fallback is forbidden");
  cached = config;
  return config;
}

export function resetConfigForTests() {
  cached = undefined;
}
