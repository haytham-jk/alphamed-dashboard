import { useEffect, useState } from "react";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import { Link, useNavigate, useParams } from "react-router-dom";
import CaseForm from "../components/cases/CaseForm";
import { createEmptyCaseValues } from "../constants/caseOptions";
import { getCustomerOptions } from "../services/customers";
import { getSupportCaseForEdit, updateSupportCase, } from "../services/caseMutations";
import { ArrowLeft } from "lucide-react";

function toFormValues(row) {
  const customerIds = (row.case_customers ?? []).map(
    (link) => link.customer_id
  );
  const primary = (row.case_customers ?? []).find(
    (link) => link.is_primary
  );

  return {
    ...createEmptyCaseValues(),
    title: row.case_title ?? "",
    description: row.issue_description ?? "",
    customerIds,
    primaryCustomerId: primary
      ? String(primary.customer_id)
      : customerIds[0]
        ? String(customerIds[0])
        : "",
    internalCase: customerIds.length === 0,
    source: row.source ?? [],
    reportedBy: row.reported_by ?? "",
    priority: row.priority ?? "Medium",
    status: row.status ?? "New",
    escalatedTo: row.escalated_to ?? "",
    caseNumber: row.case_number ?? "",
    relatedIssues: row.related_issues ?? "",
    requestType: row.request_type ?? "Support Request",
    progress: row.progress ?? 0,
    caseCreatedOn: row.case_created_on ?? "",
    nextAction: row.next_action ?? "",
    waitingOn: row.waiting_on ?? "",
    followUpDate: row.follow_up_date ?? "",
    targetResolutionDate: row.target_resolution_date ?? "",
    resolvedDate: row.resolved_date ?? "",
    resolutionSummary: row.resolution_summary ?? "",
  };
}

export default function EditCasePage({ session }) {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [initialValues, setInitialValues] = useState(null);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const { confirmDiscard } = useUnsavedChanges(dirty);

  useEffect(() => {
    Promise.all([
      getCustomerOptions(),
      getSupportCaseForEdit(caseId),
    ])
      .then(([customerOptions, row]) => {
        setCustomers(customerOptions);
        setInitialValues(toFormValues(row));
      })
      .catch((err) => setError(err.message));
  }, [caseId]);

  function handleCancel() {
    if (confirmDiscard()) navigate(`/cases/${caseId}`);
  }

  async function handleSubmit(values) {
    await updateSupportCase(caseId, values, session.user.id);
    setDirty(false);
      navigate(`/cases/${caseId}`, { state: { message: "Case saved successfully." } });
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">
        {error}
      </div>
    );
  }

  if (!initialValues) {
    return <div className="text-slate-400">Loading case...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <p className="text-sm text-blue-400">Cases</p>
        <h1 className="text-3xl font-semibold">Edit case</h1>
      </header>
      <CaseForm
        mode="edit"
        initialValues={initialValues}
        customers={customers}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onDirtyChange={setDirty}
      />
      <Link
        to="/cases"
        onClick={(event) => {
          if (!confirmDiscard()) event.preventDefault();
        }}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      ><ArrowLeft size={18} />Back to cases</Link>
    </div>
  );
}
