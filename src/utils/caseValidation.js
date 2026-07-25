const VALID_PRIORITIES = ["Critical", "High", "Medium", "Low"];
const VALID_STATUSES = [
  "New",
  "Pending",
  "In Progress",
  "Escalated",
  "Unresolved",
  "Resolved",
  "Closed",
  "Cancelled",
];
const TERMINAL_STATUSES = ["Resolved", "Closed", "Cancelled"];

function normalizeId(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  return String(value);
}

function normalizeIds(values) {
  return [...new Set((values || []).map(normalizeId).filter(Boolean))];
}

export function validateCase(values) {
  const errors = {};
  const customerIds = normalizeIds(values.customerIds);
  const primaryCustomerId = normalizeId(values.primaryCustomerId);
  const progress = Number(values.progress);

  if (!String(values.title || "").trim()) {
    errors.title = "Case title is required.";
  }

  if (!String(values.description || "").trim()) {
    errors.description = "Case description is required.";
  }

  if (!VALID_PRIORITIES.includes(values.priority)) {
    errors.priority = "Select a valid priority.";
  }

  if (!VALID_STATUSES.includes(values.status)) {
    errors.status = "Select a valid status.";
  }

  if (!values.caseCreatedOn) {
    errors.caseCreatedOn = "Case created date is required.";
  }

  // Preserve the single-customer fix: one selected customer is valid.
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

  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    errors.progress = "Progress must be between 0 and 100.";
  }

  // Preserve resolution validation for normal create/edit workflows.
  if (TERMINAL_STATUSES.includes(values.status)) {
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
