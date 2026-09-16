import { TERMINAL_CASE_STATUSES } from "../constants/caseOptions.js";
import { normalizeText, toId, toIdList } from "./normalizers.js";
import { getCaseProgress } from "./caseProgress.js";

export function normalizeCaseCustomers(values = {}) {
  if (values.internalCase) {
    return { customerIds: [], primaryCustomerId: "" };
  }

  const customerIds = toIdList(values.customerIds);
  const requestedPrimaryId = toId(values.primaryCustomerId);
  const primaryCustomerId = customerIds.includes(requestedPrimaryId)
    ? requestedPrimaryId
    : customerIds[0] || "";

  return { customerIds, primaryCustomerId };
}

export function normalizeCaseSources(values) {
  return [
    ...new Set(
      (values ?? [])
        .map(normalizeText)
        .filter(Boolean)
    ),
  ];
}

export function normalizeCaseFormValues(values) {
  const terminal = TERMINAL_CASE_STATUSES.includes(values.status);
  return {
    ...values,
    ...normalizeCaseCustomers(values),
    title: normalizeText(values.title),
    description: normalizeText(values.description),
    source: normalizeCaseSources(values.source),
    progress: getCaseProgress(values.status),
    resolvedDate: terminal ? values.resolvedDate || "" : "",
    resolutionSummary: terminal
      ? normalizeText(values.resolutionSummary)
      : "",
  };
}
