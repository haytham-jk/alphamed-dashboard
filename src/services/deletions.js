import { supabase } from "../lib/supabase";

export async function deleteSupportCase(caseId) {
  const { data, error } = await supabase.rpc("delete_support_case_atomic", {
    p_case_id: Number(caseId),
  });

  if (error?.code === "42501") throw new Error("You do not have permission to delete this case.");
  if (error) throw error;
  return data;
}

export async function deleteCustomer(customerId) {
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", Number(customerId));

  if (error) throw error;
}

export async function deleteAsset(assetId) {
  const { error } = await supabase
    .from("instruments")
    .delete()
    .eq("id", Number(assetId));

  if (error) throw error;
}

export async function deleteLinearityRecord(recordId) {
  const { error } = await supabase
    .from("linearity_records")
    .delete()
    .eq("id", Number(recordId));

  if (error) throw error;
}
