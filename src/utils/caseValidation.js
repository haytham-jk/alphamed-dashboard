import {
  CASE_PRIORITIES,
  CASE_STATUSES,
  TERMINAL_CASE_STATUSES,
} from "../constants/caseOptions.js";
import { normalizeCaseCustomers } from "./caseFormHelpers.js";

export function validateCase(values) {
  const errors = {};
  const { customerIds, primaryCustomerId } = normalizeCaseCustomers(values);

  if (!String(values.title || "").trim()) {
    errors.title = "Case title is required.";
  }
  if (!String(values.description || "").trim()) {
    errors.description = "Case description is required.";
  }
  if (!CASE_PRIORITIES.includes(values.priority)) {
    errors.priority = "Select a valid priority.";
  }
  if (!CASE_STATUSES.includes(values.status)) {
    errors.status = "Select a valid status.";
  }
  if (!values.caseCreatedOn) {
    errors.caseCreatedOn = "Case created date is required.";
  }

  if (!values.internalCase) {
    if (customerIds.length === 0) {
      errors.customerIds = "Select at least one customer.";
    } else if (!primaryCustomerId) {
      errors.primaryCustomerId = "Primary customer must be selected.";
    } else if (!customerIds.includes(primaryCustomerId)) {
      errors.primaryCustomerId =
        "Primary customer must be one of the selected customers.";
    }
  }

  if (TERMINAL_CASE_STATUSES.includes(values.status)) {
    if (!values.resolvedDate) {
      errors.resolvedDate =
        values.status === "Cancelled"
          ? "Cancellation date is required."
          : "Resolved date is required.";
    }
    if (!String(values.resolutionSummary || "").trim()) {
      errors.resolutionSummary =
        values.status === "Cancelled"
          ? "Enter a cancellation reason before saving the case."
          : "Enter a resolution summary before saving the case.";
    }
  }

  return errors;
}
