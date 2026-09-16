import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
test("Dashboard BioPlex cards use actionable destinations",()=>{const source=read("../src/pages/DashboardPage.jsx");["attention?type=expired","attention?type=expiring","attention?type=missing-expiry","status=Draft","attention?type=matching-warnings"].forEach((value)=>assert.match(source,new RegExp(value.replace(/[?]/g,"\\?"))));});
test("App registers attention before dynamic count route",()=>{const source=read("../src/App.jsx");assert.ok(source.indexOf('/bioplex-inventory/attention')<source.indexOf('/bioplex-inventory/:sessionId'));});
test("active sibling matching excludes expired and missing expiry",()=>{const source=read("../src/services/bioplexMatching.js");assert.match(source,/not\("expiry_date","is",null\)\.gte\("expiry_date"/);});
test("historical details use stored links and corrected separator",()=>{const source=read("../src/pages/BioplexInventoryDetailsPage.jsx");assert.match(source,/buildBioplexPdfGroups\(record\)/);assert.doesNotMatch(source,/ยท/);assert.match(source,/Shared calibrator/);});
test("PDF uses relationship table and shared matching lots",()=>{const source=read("../src/utils/bioplexPdf.js");assert.match(source,/Matching Group/);assert.match(source,/Matches reagent lots/);assert.match(source,/Assay-compatible QC/);});
