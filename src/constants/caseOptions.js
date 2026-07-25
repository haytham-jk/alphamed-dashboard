export const CASE_STATUSES = [
  "New",
  "Pending",
  "In Progress",
  "Escalated",
  "Unresolved",
  "Resolved",
  "Closed",
  "Cancelled",
];

export const CASE_PRIORITIES = ["Critical", "High", "Medium", "Low"];

export const REQUEST_TYPES = [
  "Support Request",
  "Installation - Software",
  "Installation - Instrument",
  "Training Request",
  "Other",
];

export const SOURCE_OPTIONS = [
  "1WA",
  "Bioplex",
  "D10",
  "D100",
  "EQAS",
  "Geenius",
  "Other",
  "QC - Bioplex",
  "QC - Internal",
  "Unity Connect",
  "Unity Real Time",
  "URTO",
  "Variant II",
  "Variant Turbo",
];

export function createEmptyCaseValues() {
  return {
    title: "",
    description: "",
    customerIds: [],
    primaryCustomerId: "",
    internalCase: false,
    source: [],
    reportedBy: "",
    priority: "Medium",
    status: "New",
    escalatedTo: "",
    caseNumber: "",
    relatedIssues: "",
    requestType: "Support Request",
    progress: 10,
    caseCreatedOn: new Date().toISOString().slice(0, 10),
    nextAction: "",
    waitingOn: "",
    followUpDate: "",
    targetResolutionDate: "",
    resolvedDate: "",
    resolutionSummary: "",
  };
}

export const ACTIVE_CASE_STATUSES = ["New", "Pending", "In Progress", "Escalated"];
export const TERMINAL_CASE_STATUSES = ["Resolved", "Closed", "Cancelled"];
