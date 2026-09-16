import test from "node:test";import assert from "node:assert/strict";import{buildFocusState,safeReturnPath}from"../src/utils/returnNavigation.js";
test("allowed list paths retain query state",()=>{assert.equal(safeReturnPath("/cases?status=Active&page=3","/cases","/cases"),"/cases?status=Active&page=3");assert.equal(safeReturnPath("/customers?q=lab&page=2","/customers","/customers"),"/customers?q=lab&page=2");});
test("unsafe return paths fall back",()=>{assert.equal(safeReturnPath("//example.com","/cases","/cases"),"/cases");assert.equal(safeReturnPath("/customers","/cases","/cases"),"/cases");});
test("focus state accepts valid IDs",()=>{assert.deepEqual(buildFocusState("focusCaseId",12,"Saved"),{focusCaseId:12,message:"Saved"});});
