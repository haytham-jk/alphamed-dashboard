import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const source = fs.readFileSync(new URL("../src/pages/BioplexInventoryAttentionPage.jsx", import.meta.url), "utf8");
test("nullable rows use a stable memoized array", () => assert.match(source, /const rows = useMemo\(\(\) => \(Array\.isArray\(data\) \? data : \[\]\), \[data\]\);/));
test("nullable data is not used directly as an array", () => assert.doesNotMatch(source, /data\.(map|filter|length)/));
