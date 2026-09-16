import { supabase } from "../lib/supabase";
import {
  EQAS_CONFLICT_MESSAGE,
  expectedOperationalTimestamp,
  operationalMutationError,
} from "../utils/operationalConcurrency";

function clean(value) {
  return String(value || "").trim();
}

function payload(values) {
  return {
    customer_id: Number(values.customerId),
    qcnet_id: clean(values.qcnetId),
    lab_number: clean(values.labNumber),
    lab_name: clean(values.labName) || null,
  };
}

function friendlyError(error) {
  if (error?.code === "23505") {
    return new Error("This Lab Number is already assigned to another EQAS record.");
  }
  if (error?.code === "23514") {
    return new Error("Check that the QCnet ID and Lab Name are not blank, and that the Lab Number contains digits only.");
  }
  return error;
}

export async function getEqasOnlineRecords() {
  const { data, error } = await supabase
    .from("eqas_online_records_overview")
    .select("id, customer_id, customer_name, emirate, qcnet_id, lab_number, lab_name, created_at, updated_at")
    .order("customer_name", { ascending: true })
    .order("lab_number", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getEqasOnlineRecord(recordId) {
  const { data, error } = await supabase
    .from("eqas_online_records")
    .select("id, customer_id, qcnet_id, lab_number, lab_name, updated_at")
    .eq("id", Number(recordId))
    .single();
  if (error) throw error;
  return data;
}

export async function createEqasOnlineRecord(values) {
  const { data, error } = await supabase
    .from("eqas_online_records")
    .insert(payload(values))
    .select("id")
    .single();
  if (error) throw friendlyError(error);
  return data;
}

export async function updateEqasOnlineRecord(recordId, values) {
  const { error } = await supabase.rpc("update_eqas_online_record_atomic", {
    p_record_id: Number(recordId),
    p_values: payload(values),
    p_expected_updated_at: expectedOperationalTimestamp(
      values.expectedUpdatedAt,
      "EQAS Online record"
    ),
  });
  if (error) {
    throw friendlyError(operationalMutationError(error, EQAS_CONFLICT_MESSAGE));
  }
}

export async function deleteEqasOnlineRecord(recordId) {
  const { error } = await supabase
    .from("eqas_online_records")
    .delete()
    .eq("id", Number(recordId));
  if (error) throw error;
}
