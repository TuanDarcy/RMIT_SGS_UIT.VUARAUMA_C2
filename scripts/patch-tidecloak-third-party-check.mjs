import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const targets = [
  "node_modules/@tidecloak/js/dist/esm/lib/tidecloak.js",
  "node_modules/@tidecloak/js/dist/cjs/lib/tidecloak.js",
];
const original = "return await applyTimeoutToPromise(promise, this.messageReceiveTimeout, 'Timeout when waiting for 3rd party check iframe message.');";
const defaultTimeoutCall = "applyTimeoutToPromise(promise, this.messageReceiveTimeout, 'Timeout when waiting for 3rd party check iframe message.')";
const boundedTimeoutCall = "applyTimeoutToPromise(promise, Math.min(this.messageReceiveTimeout, 1500), 'Timeout when waiting for 3rd party check iframe message.')";
const marker = "Third-party cookie capability check timed out; continuing without silent SSO.";
const replacement = `try {
        return await ${boundedTimeoutCall};
    }
    catch (error) {
        console.warn('[TIDECLOAK] ${marker}');
        this.silentCheckSsoRedirectUri = undefined;
        __classPrivateFieldGet(this, _TideCloak_loginIframe, \"f\").enable = false;
        return;
    }`;

for (const relativePath of targets) {
  const path = resolve(relativePath);
  const source = await readFile(path, "utf8");
  if (source.includes(marker)) {
    const upgraded = source.replace(defaultTimeoutCall, boundedTimeoutCall);
    if (upgraded !== source) {
      await writeFile(path, upgraded, "utf8");
      console.log(`Bounded TideCloak third-party-cookie probe: ${relativePath}`);
    }
    continue;
  }
  if (!source.includes(original)) {
    throw new Error(`Unsupported @tidecloak/js build: third-party check site not found in ${relativePath}`);
  }
  await writeFile(path, source.replace(original, replacement), "utf8");
  console.log(`Patched TideCloak third-party-cookie fallback: ${relativePath}`);
}
