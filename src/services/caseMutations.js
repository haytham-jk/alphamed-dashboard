import { supabase } from "../lib/supabase";

function normalizePayload(values, userId) {
  return {
    case_title: values.title.trim(),
    issue_description: values.description.trim(),
    source: values.source,
    reported_by: values.reportedBy.trim() || null,
    priority: values.priority,
    status: values.status,
    escalated_to: values.escalatedTo.trim() || null,
    case_number: values.caseNumber.trim() || null,
    related_issues: values.relatedIssues.trim() || null,
    request_type: values.requestType || null,
    progress: Number(values.progress) || 0,
    case_created_on: values.caseCreatedOn,
    next_action: values.nextAction.trim() || null,
    waiting_on: values.waitingOn.trim() || null,
    follow_up_date: values.followUpDate || null,
    target_resolution_date: values.targetResolutionDate || null,
    resolved_date: values.resolvedDate || null,
    resolution_summary: values.resolutionSummary.trim() || null,
    last_case_update: new Date().toISOString(),
    updated_by: userId || null,
  };
}

async function replaceCaseCustomers(caseId, values) {
  const { error: deleteError } = await supabase
    .from("case_customers")
    .delete()
    .eq("support_case_id", caseId);

  if (deleteError) throw deleteError;
  if (values.internalCase || values.customerIds.length === 0) return;

  const links = values.customerIds.map((customerId) => ({
    support_case_id: Number(caseId),
    customer_id: Number(customerId),
    is_primary: Number(customerId) === Number(values.primaryCustomerId),
  }));

  const { error: insertError } = await supabase
    .from("case_customers")
    .insert(links);

  if (insertError) throw insertError;
}

export async function createSupportCase(values, userId) {
  const primaryCustomerId = values.internalCase
    ? null
    : Number(values.primaryCustomerId) || null;

  const { data, error } = await supabase
    .from("support_cases")
    .insert({
      ...normalizePayload(values, userId),
      customer_id: primaryCustomerId,
    })
    .select("id, case_reference")
    .single();

  if (error) throw error;

  try {
    await replaceCaseCustomers(data.id, values);
  } catch (relationError) {
    await supabase.from("support_cases").delete().eq("id", data.id);
    throw relationError;
  }

  return data;
}

export async function updateSupportCase(caseId, values, userId) {
  const primaryCustomerId = values.internalCase
    ? null
    : Number(values.primaryCustomerId) || null;

  const { error } = await supabase
    .from("support_cases")
    .update({
      ...normalizePayload(values, userId),
      customer_id: primaryCustomerId,
    })
    .eq("id", Number(caseId));

  if (error) throw error;
  await replaceCaseCustomers(caseId, values);
}

export async function getSupportCaseForEdit(caseId) {
  const { data, error } = await supabase
    .from("support_cases")
    .select(`
      id,
      case_reference,
      case_title,
      issue_description,
      source,
      reported_by,
      priority,
      status,
      escalated_to,
      case_number,
      related_issues,
      request_type,
      progress,
      next_action,
      waiting_on,
      case_created_on,
      follow_up_date,
      target_resolution_date,
      last_case_update,
      resolved_date,
      resolution_summary,
      case_customers (
        customer_id,
        is_primary,
        customers (
          id,
          customer_name,
          emirate
        )
      )
    `)
    .eq("id", Number(caseId))
    .single();

  if (error) throw error;
  return data;
}
