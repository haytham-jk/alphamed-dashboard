import { supabase } from "../lib/supabase";

const trainingSelection = `
  id,
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

export async function getTrainingRecords() {
  const { data, error } = await supabase
    .from("training_records")
    .select(trainingSelection)
    .order("training_date", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getTrainingRecord(recordId) {
  const { data, error } = await supabase
    .from("training_records")
    .select(trainingSelection)
    .eq("id", Number(recordId))
    .single();

  if (error) throw error;
  return data;
}

function trainingPayload(values, userId) {
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
    instrument_name_snapshot:
      values.instrumentName.trim() || null,
    serial_number_snapshot:
      values.serialNumber.trim() || null,
    notes: values.notes.trim() || null,
    created_by: userId || null,
  };
}

export async function createTrainingRecord(
  values,
  userId
) {
  const { data, error } = await supabase
    .from("training_records")
    .insert(trainingPayload(values, userId))
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function updateTrainingRecord(
  recordId,
  values,
  userId
) {
  const { error } = await supabase
    .from("training_records")
    .update(trainingPayload(values, userId))
    .eq("id", Number(recordId));

  if (error) throw error;
}
