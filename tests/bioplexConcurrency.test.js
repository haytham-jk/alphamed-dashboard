import test from "node:test";
import assert from "node:assert/strict";
import { BIOPLEX_COUNT_CONFLICT_MESSAGE, BIOPLEX_LOT_CONFLICT_MESSAGE, bioplexConflictError, expectedBioplexTimestamp } from "../src/utils/bioplexConcurrency.js";
test("new counts allow null while existing aggregate edits require a timestamp",()=>{assert.equal(expectedBioplexTimestamp("","BioPlex count",false),null);assert.throws(()=>expectedBioplexTimestamp("","BioPlex count",true));});
test("PT409 maps to BioPlex domain messages",()=>{assert.equal(bioplexConflictError({code:"PT409"},BIOPLEX_COUNT_CONFLICT_MESSAGE).message,BIOPLEX_COUNT_CONFLICT_MESSAGE);assert.equal(bioplexConflictError({code:"PT409"},BIOPLEX_LOT_CONFLICT_MESSAGE).message,BIOPLEX_LOT_CONFLICT_MESSAGE);});
