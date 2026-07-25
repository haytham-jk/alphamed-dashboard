import { TERMINAL_CASE_STATUSES } from "../constants/caseOptions";
import { toIdList, toId, toNullableNumber, normalizeText } from "./normalizers";

export function normalizeCaseFormValues(values) {
  const terminal = TERMINAL_CASE_STATUSES.includes(values.status);
  return {
    ...values,
    title: normalizeText(values.title),
    description: normalizeText(values.description),
    customerIds: values.internalCase ? [] : toIdList(values.customerIds),
    primaryCustomerId: values.internalCase ? "" : toId(values.primaryCustomerId),
    source: [...new Set(values.source ?? [])],
    progress: toNullableNumber(values.progress) ?? 0,
    resolvedDate: terminal ? (values.resolvedDate || "") : "",
    resolutionSummary: terminal ? normalizeText(values.resolutionSummary) : "",
  };
}
