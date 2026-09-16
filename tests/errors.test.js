import test from "node:test";
import assert from "node:assert/strict";
import { getErrorMessage, isAbortError } from "../src/utils/appErrors.js";
test("abort errors are detected and hidden",()=>{assert.equal(isAbortError({name:"AbortError"}),true);assert.equal(isAbortError({code:"ABORT_ERR"}),true);assert.equal(getErrorMessage({name:"AbortError",message:"cancelled"},"fallback"),"");});
test("useful messages and fallbacks are preserved",()=>{assert.equal(getErrorMessage(new Error("Network unavailable"),"fallback"),"Network unavailable");assert.equal(getErrorMessage({},"Unable to load data."),"Unable to load data.");});
