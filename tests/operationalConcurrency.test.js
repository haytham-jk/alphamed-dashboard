import test from "node:test";
import assert from "node:assert/strict";
import { TRAINING_CONFLICT_MESSAGE, LINEARITY_CONFLICT_MESSAGE, EQAS_CONFLICT_MESSAGE, expectedOperationalTimestamp, operationalMutationError } from "../src/utils/operationalConcurrency.js";
test("operational edit timestamps are required",()=>{assert.equal(expectedOperationalTimestamp("2026-09-16T00:00:00Z","record"),"2026-09-16T00:00:00Z");assert.throws(()=>expectedOperationalTimestamp("","record"));});
test("PT409 maps to each domain message",()=>{for(const message of [TRAINING_CONFLICT_MESSAGE,LINEARITY_CONFLICT_MESSAGE,EQAS_CONFLICT_MESSAGE])assert.equal(operationalMutationError({code:"PT409"},message).message,message);});
