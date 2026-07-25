import { supabase } from "../lib/supabase";

export async function getSupportCases() {
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
    .order("case_created_on", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const linkedCustomers = (row.case_customers ?? [])
      .map((link) => ({
        id: link.customers?.id,
        name: link.customers?.customer_name,
        emirate: link.customers?.emirate,
        isPrimary: Boolean(link.is_primary),
      }))
      .filter((customer) => customer.id);

    linkedCustomers.sort((first, second) => {
      if (first.isPrimary !== second.isPrimary) return first.isPrimary ? -1 : 1;
      return String(first.name).localeCompare(String(second.name));
    });

    const customerNames = linkedCustomers.map((customer) => customer.name);
    const emirates = Array.from(
      new Set(linkedCustomers.map((customer) => customer.emirate).filter(Boolean))
    );

    const normalizedStatus = [
      "Waiting on Customer",
      "Waiting on Internal Team",
    ].includes(row.status)
      ? "Pending"
      : row.status ?? "New";

    return {
      databaseId: row.id,
      id: row.case_reference ?? String(row.id),
      customers: linkedCustomers,
      customerNames,
      primaryCustomer:
        linkedCustomers.find((customer) => customer.isPrimary) ??
        linkedCustomers[0] ??
        null,
      customer:
        customerNames.length > 0
          ? customerNames.join(", ")
          : "Internal / No Customer",
      emirates,
      emirate: emirates.length > 0 ? emirates.join(", ") : "Unknown",
      title: row.case_title ?? "",
      description: row.issue_description ?? "",
      source: Array.isArray(row.source) ? row.source : [],
      reportedBy: row.reported_by ?? "",
      priority: row.priority ?? "Low",
      status: normalizedStatus,
      escalatedTo: row.escalated_to ?? "None",
      caseNumber: row.case_number ?? "",
      relatedIssues: row.related_issues ?? "",
      requestType: row.request_type ?? "",
      progress: row.progress ?? 0,
      nextAction: row.next_action ?? "",
      waitingOn: row.waiting_on ?? "",
      created: row.case_created_on ?? null,
      followUpDate: row.follow_up_date ?? null,
      targetResolutionDate: row.target_resolution_date ?? null,
      lastUpdate: row.last_case_update ?? null,
      resolved: row.resolved_date ?? "",
      resolutionSummary: row.resolution_summary ?? "",
    };
  });
}
