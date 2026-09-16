import test from "node:test";
import assert from "node:assert/strict";
import { ASSET_CONFLICT_MESSAGE, UNITY_CONFLICT_MESSAGE, assetMutationError, unityMutationError, expectedUpdateTimestamp } from "../src/utils/assetUnityConcurrency.js";
test("timestamps are required",()=>{assert.equal(expectedUpdateTimestamp("2026-09-15T00:00:00Z","asset"),"2026-09-15T00:00:00Z");assert.throws(()=>expectedUpdateTimestamp("","asset"));});
test("PT409 maps to domain messages",()=>{assert.equal(assetMutationError({code:"PT409"}).message,ASSET_CONFLICT_MESSAGE);assert.equal(unityMutationError({code:"PT409"}).message,UNITY_CONFLICT_MESSAGE);});
