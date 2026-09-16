import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../src/pages/BioplexInventoryAttentionPage.jsx", import.meta.url),
  "utf8"
);

test("attention page normalizes nullable async data with a stable memoized array", () => {
  assert.match(
    source,
    /const rows = useMemo\(\(\) => \(Array\.isArray\(data\) \? data : \[\]\), \[data\]\);/
  );
  assert.doesNotMatch(source, /data\.(map|filter|length)/);
});

test("matching warning reasons tolerate absent values", () => {
  assert.match(source, /row\.blockingReasons \?\? \[\]/);
});
