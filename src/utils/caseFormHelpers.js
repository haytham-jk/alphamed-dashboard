import { TERMINAL_CASE_STATUSES } from "../constants/caseOptions";
import { toIdList, toId, normalizeText } from "./normalizers";
import { getCaseProgress } from "./caseProgress";

export function normalizeCaseFormValues(values) {
  const terminal = TERMINAL_CASE_STATUSES.includes(values.status);
  return {
    ...values,
    title: normalizeText(values.title),
    description: normalizeText(values.description),
    customerIds: values.internalCase ? [] : toIdList(values.customerIds),
    primaryCustomerId: values.internalCase ? "" : toId(values.primaryCustomerId),
    source: [...new Set(values.source ?? [])],
    progress: getCaseProgress(values.status),
    resolvedDate: terminal ? (values.resolvedDate || "") : "",
    resolutionSummary: terminal ? normalizeText(values.resolutionSummary) : "",
  };
}
