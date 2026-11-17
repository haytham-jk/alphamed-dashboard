import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
test("Asset Details uses one RPC and expected abort suppression", () => {
  const service = read("../src/services/assets.js");
  const page = read("../src/pages/AssetDetailsPage.jsx");
  assert.match(service, /get_asset_details_v3/);
  assert.doesNotMatch(service, /support_cases!/);
  assert.match(page, /isExpectedAbortError/);
  assert.doesNotMatch(page, /e\.name\s*!==\s*["']AbortError/);
});
