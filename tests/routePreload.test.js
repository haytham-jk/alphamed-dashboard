import test from "node:test";
import assert from "node:assert/strict";
import { preloadRoute, scheduleRoutePreloads } from "../src/utils/routePreload.js";

test("route preloading deduplicates repeated imports", async () => {
  let calls = 0;
  const importer = async () => { calls += 1; return { default: true }; };
  await Promise.all([preloadRoute("cases-test", importer), preloadRoute("cases-test", importer)]);
  assert.equal(calls, 1);
});

test("failed route preload can be retried", async () => {
  let calls = 0;
  const importer = async () => { calls += 1; if (calls === 1) throw new Error("temporary"); return {}; };
  await assert.rejects(preloadRoute("retry-test", importer));
  await preloadRoute("retry-test", importer);
  assert.equal(calls, 2);
});

test("idle scheduling can be cancelled before imports run", () => {
  let scheduled;
  let cancelled = false;
  let calls = 0;
  const fakeWindow = {
    requestIdleCallback(callback) { scheduled = callback; return 9; },
    cancelIdleCallback(id) { cancelled = id === 9; },
  };
  const cancel = scheduleRoutePreloads([["cancel-test", async () => { calls += 1; }]], fakeWindow);
  cancel();
  scheduled();
  assert.equal(cancelled, true);
  assert.equal(calls, 0);
});
