import { supabase } from "../lib/supabase";

const linearitySelection = `
  id,
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

export async function getLinearityRecords() {
  const { data, error } = await supabase
    .from("linearity_records")
    .select(linearitySelection)
    .order("performed_date", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getLinearityRecord(recordId) {
  const { data, error } = await supabase
    .from("linearity_records")
    .select(linearitySelection)
    .eq("id", Number(recordId))
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
  const { error } = await supabase
    .from("linearity_records")
    .update(linearityPayload(values))
    .eq("id", Number(recordId));

  if (error) throw error;
}
