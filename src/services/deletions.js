import { supabase } from "../lib/supabase";

export async function deleteSupportCase(caseId) {
  const numericId = Number(caseId);

  const { error: customerLinkError } = await supabase
    .from("case_customers")
    .delete()
    .eq("support_case_id", numericId);

  if (customerLinkError) throw customerLinkError;

  const { error } = await supabase
    .from("support_cases")
    .delete()
    .eq("id", numericId);

  if (error) throw error;
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
