function orderValue(item) {
  return Number.isFinite(Number(item?.display_order)) ? Number(item.display_order) : 0;
}

function compareItems(first, second) {
  return (
    orderValue(first) - orderValue(second) ||
    String(first?.assay_name_snapshot ?? first?.assayName ?? "").localeCompare(
      String(second?.assay_name_snapshot ?? second?.assayName ?? "")
    ) ||
    String(first?.product_name_snapshot ?? first?.productName ?? "").localeCompare(
      String(second?.product_name_snapshot ?? second?.productName ?? "")
    ) ||
    String(first?.lot_number ?? first?.lotNumber ?? "").localeCompare(
      String(second?.lot_number ?? second?.lotNumber ?? "")
    )
  );
}

function itemId(item) {
  return item?.id ?? item?.clientKey;
}

function parentId(link) {
  return link?.parent_item_id ?? link?.parentKey;
}

function childId(link) {
  return link?.child_item_id ?? link?.childKey;
}

export function buildBioplexInventoryGroups(items = [], links = []) {
  const byId = new Map(items.map((item) => [itemId(item), item]));
  const parentLinks = new Map();
  const childParentCount = new Map();

  for (const link of links) {
    const parent = parentId(link);
    const child = childId(link);
    if (!byId.has(parent) || !byId.has(child)) continue;
    const list = parentLinks.get(parent) ?? [];
    list.push(link);
    parentLinks.set(parent, list);
    childParentCount.set(child, (childParentCount.get(child) ?? 0) + 1);
  }

  const reagentGroups = items
    .filter((item) => item.material_type === "kit" || item.materialType === "kit")
    .sort(compareItems)
    .map((root) => {
      const children = (parentLinks.get(itemId(root)) ?? [])
        .map((link) => ({
          item: byId.get(childId(link)),
          relationshipType: link.relationship_type ?? link.relationshipType,
          shared: (childParentCount.get(childId(link)) ?? 0) > 1,
        }))
        .filter((entry) => entry.item)
        .sort((first, second) => {
          const firstRank = first.item.material_type === "calibrator" || first.item.materialType === "calibrator" ? 0 : 1;
          const secondRank = second.item.material_type === "calibrator" || second.item.materialType === "calibrator" ? 0 : 1;
          return firstRank - secondRank || compareItems(first.item, second.item);
        });
      return { root, children };
    });

  const linkedChildren = new Set(links.map(childId));
  const standalone = items
    .filter((item) => {
      const type = item.material_type ?? item.materialType;
      return type !== "kit" && !linkedChildren.has(itemId(item));
    })
    .sort(compareItems);

  return { reagentGroups, standalone };
}

export function orderedUniqueInventoryItems(items = [], links = []) {
  const groups = buildBioplexInventoryGroups(items, links);
  const output = [];
  const seen = new Set();
  const add = (item) => {
    const key = itemId(item);
    if (seen.has(key)) return;
    seen.add(key);
    output.push(item);
  };
  for (const group of groups.reagentGroups) {
    add(group.root);
    group.children.forEach((entry) => add(entry.item));
  }
  groups.standalone.forEach(add);
  items.slice().sort(compareItems).forEach(add);
  return output;
}
