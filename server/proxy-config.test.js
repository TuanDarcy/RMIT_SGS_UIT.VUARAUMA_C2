import assert from "node:assert/strict";
import test from "node:test";
import viteConfig from "../vite.config.js";

test("development proxy preserves the public URL for DPoP verification", () => {
  const apiProxy = viteConfig.server?.proxy?.["/api"];

  assert.equal(apiProxy?.target, "http://localhost:4000");
  assert.equal(apiProxy?.xfwd, true);
});
