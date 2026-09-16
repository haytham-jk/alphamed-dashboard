import { supabase } from "../lib/supabase";
import {
  TRAINING_CONFLICT_MESSAGE,
  expectedOperationalTimestamp,
  operationalMutationError,
} from "../utils/operationalConcurrency";

const trainingSelection = `
  id,
  updated_at,
  customer_id,
  instrument_id,
  title,
  training_date,
  attendees,
  notes,
  instrument_name_snapshot,
  serial_number_snapshot,
  customers (
    id,
    customer_name,
    emirate
  ),
  instruments (
    id,
    instrument_name,
    serial_number
  )
`;

export async function getTrainingRecords({ signal } = {}) {
  const { data, error } = await supabase
    .from("training_records")
    .select(trainingSelection)
    .order("training_date", { ascending: false })
    .abortSignal(signal);

  if (error) throw error;
  return data ?? [];
}

export async function getTrainingRecord(recordId, { signal } = {}) {
  const { data, error } = await supabase
    .from("training_records")
    .select(trainingSelection)
    .eq("id", Number(recordId))
    .abortSignal(signal)
    .single();

  if (error) throw error;
  return data;
}

function trainingPayload(values) {
  return {
    customer_id: Number(values.customerId),
    instrument_id: values.instrumentId
      ? Number(values.instrumentId)
      : null,
    title: values.title.trim(),
    training_date: values.trainingDate,
    attendees: values.attendees
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean),
    instrument_name_snapshot: values.instrumentName.trim() || null,
    serial_number_snapshot: values.serialNumber.trim() || null,
    notes: values.notes.trim() || null,
  };
}

export async function createTrainingRecord(values, userId) {
  const { data, error } = await supabase
    .from("training_records")
    .insert({
      ...trainingPayload(values),
      created_by: userId || null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function updateTrainingRecord(recordId, values) {
  const { error } = await supabase.rpc("update_training_record_atomic", {
    p_record_id: Number(recordId),
    p_values: trainingPayload(values),
    p_expected_updated_at: expectedOperationalTimestamp(
      values.expectedUpdatedAt,
      "training record"
    ),
  });
  if (error) throw operationalMutationError(error, TRAINING_CONFLICT_MESSAGE);
}

import {
  normalizeTrainingListQuery,
  normalizeTrainingPageResult,
} from "../utils/assetTrainingListQuery";

export async function getTrainingRecordsPage(values, { signal } = {}) {
  const query = normalizeTrainingListQuery(values);
  const request = supabase.rpc("search_training_records", {
    p_query: query.query || null,
    p_sort: query.sort,
    p_page: query.page,
    p_page_size: query.pageSize,
  });
  if (signal) request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return normalizeTrainingPageResult(data, query.page);
}
