import { supabase } from "../lib/supabase";

const sessionSelection = `
  id,
  customer_id,
  counted_on,
  status,
  notes,
  completed_at,
  created_at,
  updated_at,
  deleted_at,
  deleted_by,
  deletion_reason,
  correction_reason,
  last_edited_by,
  last_edited_at,
  customers (
    id,
    customer_name,
    emirate
  )
`;

const lineSelection = `
  id,
  session_id,
  product_id,
  material_type,
  lot_number,
  quantity,
  expiry_date,
  matched_kit_lot,
  expected_calibrator_lot,
  verification_status,
  assay_name_snapshot,
  product_code_snapshot,
  product_name_snapshot,
  notes
`;

export async function getBioplexCustomers() {
  const { data, error } = await supabase
    .from("instruments")
    .select(`
      customer_id,
      instrument_name,
      customers (
        id,
        customer_name,
        emirate
      )
    `)
    .eq("is_active", true)
    .ilike("instrument_name", "%bioplex%")
    .not("customer_id", "is", null);

  if (error) throw error;

  return Array.from(
    new Map(
      (data ?? [])
        .filter((record) => record.customers)
        .map((record) => [
          String(record.customer_id),
          {
            id: String(record.customer_id),
            name: record.customers.customer_name,
            emirate: record.customers.emirate ?? "",
          },
        ])
    ).values()
  ).sort((first, second) => first.name.localeCompare(second.name));
}

export async function getBioplexSessions({ includeDeleted = false } = {}) {
  let query = supabase
    .from("bioplex_inventory_sessions")
    .select(sessionSelection);
  if (!includeDeleted) query = query.is("deleted_at", null);
  const { data, error } = await query
    .order("counted_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  const sessionIds = (data ?? []).map((session) => session.id);
  if (!sessionIds.length) return [];

  const { data: lines, error: lineError } = await supabase
    .from("bioplex_inventory_lines")
    .select("id, session_id")
    .in("session_id", sessionIds);

  if (lineError) throw lineError;

  const lineCounts = (lines ?? []).reduce((result, line) => {
    result[line.session_id] = (result[line.session_id] ?? 0) + 1;
    return result;
  }, {});

  return (data ?? []).map((session) => ({
    ...session,
    lineCount: lineCounts[session.id] ?? 0,
  }));
}

export async function getBioplexSession(sessionId) {
  const sessionNumber = Number(sessionId);
  if (!Number.isFinite(sessionNumber)) {
    throw new Error("Invalid BioPlex inventory session ID.");
  }

  const { data: session, error } = await supabase
    .from("bioplex_inventory_sessions")
    .select(sessionSelection)
    .eq("id", sessionNumber)
    .single();

  if (error) throw error;

  const { data: lines, error: lineError } = await supabase
    .from("bioplex_inventory_lines")
    .select(lineSelection)
    .eq("session_id", sessionNumber)
    .order("assay_name_snapshot")
    .order("material_type")
    .order("lot_number");

  if (lineError) throw lineError;
  return { session, lines: lines ?? [] };
}

export async function findBioplexKitLots(kitLot) {
  const normalizedLot = String(kitLot ?? "").trim();
  if (!normalizedLot) return [];

  const { data, error } = await supabase
    .from("bioplex_kit_lot_matches")
    .select(`
      id,
      kit_lot,
      kit_release_date,
      kit_expiry_date,
      calibrator_lot,
      calibrator_release_date,
      calibrator_expiry_date,
      product:bioplex_products!bioplex_kit_lot_matches_product_id_fkey (
        id,
        assay_name,
        product_code,
        product_name
      ),
      calibrator_product:bioplex_products!bioplex_kit_lot_matches_calibrator_product_id_fkey (
        id,
        assay_name,
        product_code,
        product_name
      )
    `)
    .eq("kit_lot", normalizedLot)
    .eq("is_current", true)
    .order("kit_expiry_date", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function findBioplexCalibratorLots(calibratorLot) {
  const normalizedLot = String(calibratorLot ?? "").trim();
  if (!normalizedLot) return [];

  const { data, error } = await supabase
    .from("bioplex_kit_lot_matches")
    .select(`
      calibrator_lot,
      calibrator_expiry_date,
      calibrator_product:bioplex_products!bioplex_kit_lot_matches_calibrator_product_id_fkey (
        id,
        assay_name,
        product_code,
        product_name
      )
    `)
    .eq("calibrator_lot", normalizedLot)
    .eq("is_current", true)
    .order("calibrator_expiry_date", { ascending: false });

  if (error) throw error;

  return Array.from(
    new Map(
      (data ?? [])
        .filter((record) => record.calibrator_product)
        .map((record) => [
          [
            record.calibrator_product.id,
            record.calibrator_lot,
            record.calibrator_expiry_date,
          ].join("|"),
          record,
        ])
    ).values()
  );
}

export async function findBioplexQcLots(qcLot) {
  const normalizedLot = String(qcLot ?? "").trim();
  if (!normalizedLot) return [];

  const { data, error } = await supabase
    .from("bioplex_qc_lots")
    .select(`
      id,
      qc_lot,
      release_date,
      expiry_date,
      product:bioplex_products (
        id,
        assay_name,
        product_code,
        product_name
      )
    `)
    .eq("qc_lot", normalizedLot)
    .eq("is_current", true)
    .order("expiry_date", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getBioplexProductsByType(materialType) {
  const allowedTypes = ["kit", "calibrator", "qc", "consumable"];
  if (!allowedTypes.includes(materialType)) {
    throw new Error("Invalid BioPlex material type.");
  }

  const { data, error } = await supabase
    .from("bioplex_products")
    .select("id, assay_name, material_type, product_code, product_name, display_order")
    .eq("material_type", materialType)
    .eq("is_active", true)
    .order("display_order")
    .order("assay_name")
    .order("product_name");

  if (error) throw error;
  return data ?? [];
}

function linePayload(line) {
  return {
    productId: line.productId ? Number(line.productId) : null,
    materialType: line.materialType,
    lotNumber: String(line.lotNumber ?? "").trim(),
    quantity: Number(line.quantity),
    expiryDate: line.expiryDate || null,
    matchedKitLot: line.matchedKitLot || null,
    expectedCalibratorLot: line.expectedCalibratorLot || null,
    verificationStatus: line.verificationStatus || "Matched",
    assayName: String(line.assayName ?? "").trim(),
    productCode: String(line.productCode ?? "").trim() || null,
    productName: String(line.productName ?? "").trim(),
    notes: String(line.notes ?? "").trim() || null,
  };
}

export async function saveBioplexInventory({
  sessionId = null,
  customerId,
  countedOn,
  notes,
  status,
  lines,
}) {
  const { data, error } = await supabase.rpc("save_bioplex_inventory", {
    p_session_id: sessionId ? Number(sessionId) : null,
    p_customer_id: Number(customerId),
    p_counted_on: countedOn,
    p_notes: String(notes ?? ""),
    p_status: status,
    p_lines: lines.map(linePayload),
  });

  if (error) throw error;
  return Number(data);
}
export async function getBioplexComparison(customerId) {
  const customerNumber = Number(customerId);
  const { data: sessions, error } = await supabase
    .from("bioplex_inventory_sessions")
    .select("id, counted_on, completed_at")
    .eq("customer_id", customerNumber)
    .eq("status", "Completed")
    .is("deleted_at", null)
    .order("counted_on", { ascending: false })
    .order("completed_at", { ascending: false })
    .limit(2);
  if (error) throw error;
  if (!sessions?.length) return { current: null, previous: null, rows: [] };

  const sessionIds = sessions.map((session) => session.id);
  const { data: lines, error: lineError } = await supabase
    .from("bioplex_inventory_lines")
    .select("session_id, material_type, lot_number, quantity, assay_name_snapshot, product_code_snapshot, product_name_snapshot")
    .in("session_id", sessionIds);
  if (lineError) throw lineError;

  const currentId = sessions[0].id;
  const previousId = sessions[1]?.id ?? null;
  const values = new Map();
  for (const line of lines ?? []) {
    const key = [line.material_type, line.product_code_snapshot || line.product_name_snapshot, line.lot_number || ""].join("|");
    const existing = values.get(key) ?? {
      key,
      assayName: line.assay_name_snapshot,
      productName: line.product_name_snapshot,
      lotNumber: line.lot_number,
      currentQuantity: null,
      previousQuantity: null,
    };
    if (line.session_id === currentId) existing.currentQuantity = line.quantity;
    if (line.session_id === previousId) existing.previousQuantity = line.quantity;
    values.set(key, existing);
  }
  const rows = Array.from(values.values()).map((row) => ({
    ...row,
    change: row.currentQuantity === null || row.previousQuantity === null ? null : row.currentQuantity - row.previousQuantity,
  })).sort((first, second) => first.assayName.localeCompare(second.assayName) || first.productName.localeCompare(second.productName));
  return { current: sessions[0], previous: sessions[1] ?? null, rows };
}

export async function correctBioplexInventory(payload) {
  const { data, error } = await supabase.rpc("correct_bioplex_inventory", {
    p_session_id: Number(payload.sessionId),
    p_customer_id: Number(payload.customerId),
    p_counted_on: payload.countedOn,
    p_notes: String(payload.notes ?? ""),
    p_reason: String(payload.reason ?? ""),
    p_lines: payload.lines.map(linePayload),
  });
  if (error) throw error;
  return Number(data);
}

export async function deleteBioplexInventory(sessionId, reason) {
  const { data, error } = await supabase.rpc("soft_delete_bioplex_inventory", {
    p_session_id: Number(sessionId),
    p_reason: String(reason ?? ""),
  });
  if (error) throw error;
  return Number(data);
}

export async function restoreBioplexInventory(sessionId, reason) {
  const { data, error } = await supabase.rpc("restore_bioplex_inventory", {
    p_session_id: Number(sessionId),
    p_reason: String(reason ?? ""),
  });
  if (error) throw error;
  return Number(data);
}
