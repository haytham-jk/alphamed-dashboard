import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("3.0 rebuild registers asset details and operational reports", () => {
  const app = read("../src/App.jsx");
  const asset = read("../src/pages/AssetDetailsPage.jsx");
  const report = read("../src/pages/BioplexInventoryReportPage.jsx");

  assert.match(app, /AssetDetailsPage/);
  assert.ok(app.indexOf('/assets/:assetId"') < app.indexOf('/assets/:assetId/edit'));
  assert.match(asset, /Customer ownership history/);
  assert.match(asset, /Case history/);

  for (const label of [
    "Current inventory",
    "Expiring lots",
    "Count history",
    "Availability",
    "Maintenance audit",
  ]) {
    assert.match(report, new RegExp(label));
  }
});

test("asset service uses atomic mutations and the protected Asset Details RPC", () => {
  const service = read("../src/services/assets.js");

  assert.match(service, /create_asset_atomic/);
  assert.match(service, /update_asset_atomic/);
  assert.match(service, /get_asset_details_v3/);
  assert.doesNotMatch(service, /support_cases!/);
  assert.doesNotMatch(service, /select\(["']\*["']\)/);
});
