import { supabase } from "../lib/supabase";
import { normalizeDashboardLinearitySummary } from "../utils/dashboardLinearity";
import {
  LINEARITY_CONFLICT_MESSAGE,
  expectedOperationalTimestamp,
  operationalMutationError,
} from "../utils/operationalConcurrency";

const linearitySelection = `
  id,
  updated_at,
  instrument_id,
  customer_id,
  instrument_name_snapshot,
  serial_number_snapshot,
  linearity_lot_number,
  performed_date,
  frequency_months,
  status,
  applicability,
  notes,
  customers (
    id,
    customer_name
  ),
  instruments (
    id,
    instrument_name,
    serial_number
  )
`;

export async function getLinearityRecords({ signal } = {}) {
  const { data, error } = await supabase
    .from("linearity_records")
    .select(linearitySelection)
    .order("performed_date", { ascending: true })
    .abortSignal(signal);

  if (error) throw error;
  return data ?? [];
}

export async function getLinearityRecord(recordId, { signal } = {}) {
  const { data, error } = await supabase
    .from("linearity_records")
    .select(linearitySelection)
    .eq("id", Number(recordId))
    .abortSignal(signal)
    .single();

  if (error) throw error;
  return data;
}

function linearityPayload(values) {
  const frequency = Number(values.frequencyMonths);
  const isNotRequired = values.status === "Not Required";

  if (frequency !== 6 && frequency !== 12) {
    throw new Error("Frequency must be 6 Months or 1 Year.");
  }

  if (!values.customerId) {
    throw new Error("Select a customer before saving.");
  }

  if (!values.instrumentId) {
    throw new Error("Select an installed instrument before saving.");
  }

  if (!isNotRequired && !values.performedDate) {
    throw new Error("Choose the date linearity was performed before saving.");
  }

  return {
    customer_id: Number(values.customerId),
    instrument_id: Number(values.instrumentId),
    instrument_name_snapshot: values.instrumentName.trim(),
    serial_number_snapshot: values.serialNumber.trim() || null,
    linearity_lot_number: isNotRequired
      ? null
      : values.lotNumber.trim() || null,
    performed_date: isNotRequired ? null : values.performedDate || null,
    frequency_months: frequency,
    status: values.status,
    applicability: isNotRequired
      ? "Not Applicable"
      : values.applicability || "Applicable",
    notes: values.notes.trim() || null,
  };
}

export async function createLinearityRecord(values) {
  const { data, error } = await supabase
    .from("linearity_records")
    .insert(linearityPayload(values))
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function updateLinearityRecord(recordId, values) {
  const { error } = await supabase.rpc("update_linearity_record_atomic", {
    p_record_id: Number(recordId),
    p_values: linearityPayload(values),
    p_expected_updated_at: expectedOperationalTimestamp(
      values.expectedUpdatedAt,
      "linearity record"
    ),
  });
  if (error) throw operationalMutationError(error, LINEARITY_CONFLICT_MESSAGE);
}

export async function getDashboardLinearitySummary(referenceDate, { signal } = {}) {
  const request = supabase.rpc("get_dashboard_linearity_summary", {
    p_reference_date: referenceDate,
    p_limit: 10,
  });
  if (signal) request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return normalizeDashboardLinearitySummary(data);
}

import { normalizeLinearityQuery, normalizePage } from "../utils/operationalListQuery";
export async function getLinearityRecordsPage(values, { signal } = {}) {
  const q = normalizeLinearityQuery(values);
  const request = supabase.rpc("search_linearity_records", { p_query:q.query||null,p_due_status:q.dueStatus,p_page:q.page,p_page_size:q.pageSize,p_reference_date:q.referenceDate });
  if (signal) request.abortSignal(signal);
  const { data, error } = await request; if (error) throw error; return normalizePage(data,q.page);
}
