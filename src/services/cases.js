import { supabase } from "../lib/supabase";

export async function getSupportCases({ signal } = {}) {
  const { data, error } = await supabase
    .from("support_cases")
    .select(`
      id,
      case_reference,
      updated_at,
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
      case_instruments (
        instrument_id,
        instruments (
          id,
          customer_id,
          instrument_name,
          serial_number,
          customers (
            id,
            customer_name
          )
        )
      ),
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
    .order("case_created_on", { ascending: false })
    .abortSignal(signal);

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
      updatedAt: row.updated_at ?? "",
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
      instruments: (row.case_instruments || []).map((link) => link.instruments).filter(Boolean),
      instrumentIds: (row.case_instruments || []).map((link) => link.instrument_id).filter(Boolean),
    };
  });
}

import {
  normalizeCaseListQuery,
  normalizeCasePageResult,
} from "../utils/caseListQuery";

export async function getSupportCasesPage(values, { signal } = {}) {
  const query = normalizeCaseListQuery(values);
  const request = supabase.rpc("search_support_cases", {
    p_query: query.query || null,
    p_status: query.status,
    p_escalated_only: query.escalatedOnly,
    p_overdue_only: query.overdueOnly,
    p_sort: query.sort,
    p_page: query.page,
    p_page_size: query.pageSize,
    p_reference_date: query.referenceDate,
  });
  if (signal) request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return normalizeCasePageResult(data, query.page);
}

export async function getDashboardCaseSummary(referenceDate, { signal } = {}) {
  const request = supabase.rpc("get_dashboard_case_summary", {
    p_reference_date: referenceDate,
    p_limit: 10,
  });
  if (signal) request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return {
    active: Math.max(0, Number(data?.active) || 0),
    overdue: Math.max(0, Number(data?.overdue) || 0),
    unresolved: Math.max(0, Number(data?.unresolved) || 0),
    escalated: Math.max(0, Number(data?.escalated) || 0),
    overdueCases: Array.isArray(data?.overdueCases) ? data.overdueCases : [],
  };
}
