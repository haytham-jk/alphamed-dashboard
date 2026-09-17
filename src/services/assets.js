import { supabase } from "../lib/supabase";
import { assetMutationError, expectedUpdateTimestamp } from "../utils/assetUnityConcurrency";

const assetSelection = `
  id,
  customer_id,
  instrument_name,
  serial_number,
  installation_date,
  is_active,
  notes,
  updated_at,
  customers (
    id,
    customer_name,
    emirate
  )
`;

export async function getAssets({ signal } = {}) {
  let assetsRequest = supabase
    .from("instruments")
    .select(assetSelection)
    .order("instrument_name")
    .order("serial_number");
  let linksRequest = supabase
    .from("case_instruments")
    .select("support_case_id, instrument_id");

  if (signal) {
    assetsRequest = assetsRequest.abortSignal(signal);
    linksRequest = linksRequest.abortSignal(signal);
  }

  const [assetsResult, linksResult] = await Promise.all([
    assetsRequest,
    linksRequest,
  ]);

  if (assetsResult.error) throw assetsResult.error;
  if (linksResult.error) throw linksResult.error;

  const relatedCaseCounts = new Map();
  for (const link of linksResult.data ?? []) {
    const instrumentId = Number(link.instrument_id);
    relatedCaseCounts.set(
      instrumentId,
      (relatedCaseCounts.get(instrumentId) ?? 0) + 1
    );
  }

  return (assetsResult.data ?? []).map((asset) => ({
    ...asset,
    related_case_count: relatedCaseCounts.get(Number(asset.id)) ?? 0,
  }));
}

export async function getAsset(assetId, { signal } = {}) {
  const { data, error } = await supabase
    .from("instruments")
    .select(assetSelection)
    .eq("id", Number(assetId))
    .abortSignal(signal)
    .single();

  if (error) throw error;
  return data;
}

export async function getInstrumentsForCustomer(customerId, { signal } = {}) {
  const { data, error } = await supabase
    .from("instruments")
    .select("id, instrument_name, serial_number, installation_date")
    .eq("customer_id", Number(customerId))
    .eq("is_active", true)
    .order("instrument_name")
    .abortSignal(signal);

  if (error) throw error;
  return data ?? [];
}

function assetPayload(values) {
  return {
    customer_id: values.customerId
      ? Number(values.customerId)
      : null,
    instrument_name: values.instrumentName.trim(),
    serial_number: values.serialNumber.trim() || null,
    installation_date: values.installationDate || null,
    is_active: values.isActive,
    notes: values.notes.trim() || null,
  };
}

export async function createAsset(values) {
  if (!values.instrumentName.trim()) {
    throw new Error("An instrument type is required.");
  }

  const { data, error } = await supabase
    .from("instruments")
    .insert(assetPayload(values))
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function updateAsset(assetId, values) {
  if (!values.instrumentName.trim()) {
    throw new Error("An instrument type is required.");
  }
  const { error } = await supabase.rpc("update_asset_atomic", {
    p_asset_id: Number(assetId),
    p_values: assetPayload(values),
    p_expected_updated_at: expectedUpdateTimestamp(values.expectedUpdatedAt, "asset"),
  });
  if (error) throw assetMutationError(error);
}

export async function getInstrumentsForCustomers(customerIds, { signal } = {}) {
  const ids = [...new Set((customerIds || []).map(Number).filter(Number.isFinite))];
  if (ids.length === 0) return [];
  let request = supabase
    .from("instruments")
    .select("id, customer_id, instrument_name, serial_number, is_active, customers(id, customer_name)")
    .in("customer_id", ids)
    .order("instrument_name")
    .order("serial_number");
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return data || [];
}
