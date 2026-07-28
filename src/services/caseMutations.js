import { supabase } from "../lib/supabase";

function normalizeCaseCustomers(values) {
  if (values.internalCase) {
    return {
      customerIds: [],
      primaryCustomerId: "",
    };
  }

  const customerIds = [
    ...new Set(
      (values.customerIds || [])
        .map((customerId) =>
          customerId === null || customerId === undefined
            ? ""
            : String(customerId)
        )
        .filter(Boolean)
    ),
  ];

  const requestedPrimaryId =
    values.primaryCustomerId === null ||
    values.primaryCustomerId === undefined
      ? ""
      : String(values.primaryCustomerId);

  const primaryCustomerId = customerIds.includes(requestedPrimaryId)
    ? requestedPrimaryId
    : customerIds[0] || "";

  return {
    customerIds,
    primaryCustomerId,
  };
}

function normalizeRpcValues(values) {
  const customers = normalizeCaseCustomers(values);
  return {
    values: {
      ...values,
      ...customers,
      source: [...new Set(values.source || [])],
      progress: Number(values.progress) || 0,
    },
    customerIds: customers.customerIds.map(Number),
    primaryCustomerId: customers.primaryCustomerId
      ? Number(customers.primaryCustomerId)
      : null,
  };
}

function friendlyMutationError(error) {
  if (error?.code === "22023" || error?.code === "23514") {
    return new Error(error.message || "Check the case details and try again.");
  }
  if (error?.code === "23503") {
    return new Error(
      "One of the selected customers is no longer available. Refresh the page and try again."
    );
  }
  if (error?.code === "42501") {
    return new Error("You do not have permission to save this case.");
  }
  return error;
}

export async function createSupportCase(values) {
  const normalized = normalizeRpcValues(values);
  const { data, error } = await supabase.rpc("create_support_case_atomic", {
    p_values: normalized.values,
    p_customer_ids: normalized.customerIds,
    p_primary_customer_id: normalized.primaryCustomerId,
  });

  if (error) throw friendlyMutationError(error);
  const created = Array.isArray(data) ? data[0] : data;
  if (!created?.id) throw new Error("The case was saved but no case ID was returned.");
  return created;
}

export async function updateSupportCase(caseId, values) {
  const normalized = normalizeRpcValues(values);
  const { error } = await supabase.rpc("update_support_case_atomic", {
    p_case_id: Number(caseId),
    p_values: normalized.values,
    p_customer_ids: normalized.customerIds,
    p_primary_customer_id: normalized.primaryCustomerId,
  });

  if (error) throw friendlyMutationError(error);
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
