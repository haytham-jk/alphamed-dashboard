import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getSupportCaseForEdit } from "../services/caseMutations";
import { deleteSupportCase } from "../services/deletions";
import { supabase } from "../lib/supabase";
import { formatDateOnly, getDateUrgency } from "../utils/dateDisplay";

function getLocalDateOnly(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function Detail({ label, children, wide = false }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-slate-200">
        {children || "Not recorded"}
      </dd>
    </div>
  );
}

function ResolveCaseDialog({
  open,
  resolution,
  error,
  saving,
  onResolutionChange,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onCancel();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="resolve-case-title"
        aria-describedby="resolve-case-description"
        className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="resolve-case-title" className="text-xl font-semibold">
              Resolve case
            </h2>
            <p
              id="resolve-case-description"
              className="mt-2 text-sm text-slate-400"
            >
              Today&apos;s date will be recorded as the resolution date. Enter
              the resolution before confirming.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            aria-label="Close resolve case dialog"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-60"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-medium">
            Resolution summary <span className="text-red-300">*</span>
          </span>
          <textarea
            autoFocus
            rows={6}
            value={resolution}
            onChange={(event) => onResolutionChange(event.target.value)}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? "quick-resolution-error" : undefined}
            placeholder="Describe how the case was resolved..."
            className={`mt-2 w-full rounded-xl border bg-slate-950 px-3 py-3 text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
              error ? "border-red-700" : "border-slate-700"
            }`}
          />
        </label>

        {error && (
          <p
            id="quick-resolution-error"
            className="mt-2 text-sm text-red-300"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 size={18} aria-hidden="true" />
            {saving ? "Resolving..." : "Confirm resolution"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function CaseDetailsPage({ canEdit }) {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolution, setResolution] = useState("");
  const [resolutionError, setResolutionError] = useState("");
  const [resolving, setResolving] = useState(false);

  function loadRecord() {
    setLoading(true);
    setError("");

    getSupportCaseForEdit(caseId)
      .then(setRecord)
      .catch((loadError) =>
        setError(loadError?.message || "Unable to load case.")
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadRecord();
  }, [caseId]);

  function openResolveDialog() {
    setResolution(record?.resolution_summary || "");
    setResolutionError("");
    setSuccessMessage("");
    setResolveDialogOpen(true);
  }

  function closeResolveDialog() {
    if (resolving) return;
    setResolveDialogOpen(false);
    setResolutionError("");
  }

  async function handleQuickResolve() {
    const summary = resolution.trim();

    if (!summary) {
      setResolutionError(
        "Enter a resolution summary before resolving the case."
      );
      return;
    }

    try {
      setResolving(true);
      setResolutionError("");
      setError("");

      const resolvedDate = getLocalDateOnly();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      const updateValues = {
        status: "Resolved",
        progress: 100,
        resolved_date: resolvedDate,
        resolution_summary: summary,
        last_case_update: new Date().toISOString(),
        updated_by: user?.id || null,
      };

      const { data, error: updateError } = await supabase
        .from("support_cases")
        .update(updateValues)
        .eq("id", caseId)
        .select()
        .single();

      if (updateError) throw updateError;

      setRecord((current) => ({
        ...current,
        ...data,
        status: "Resolved",
        progress: 100,
        resolved_date: resolvedDate,
        resolution_summary: summary,
      }));
      setResolveDialogOpen(false);
      setSuccessMessage("Case resolved successfully.");
    } catch (resolveError) {
      setResolutionError(
        resolveError?.message || "Unable to resolve the case."
      );
    } finally {
      setResolving(false);
    }
  }

  async function handleDelete() {
    if (
      deleting ||
      !window.confirm("Delete this case permanently?")
    ) {
      return;
    }

    try {
      setDeleting(true);
      await deleteSupportCase(caseId);
      navigate("/cases?status=Active", {
        state: { message: "Case deleted successfully." },
      });
    } catch (deleteError) {
      setError(deleteError?.message || "Unable to delete case.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400" role="status">
        Loading case...
      </div>
    );
  }

  if (!record) {
    return <div className="text-red-300">{error || "Case not found."}</div>;
  }

  const customers = (record.case_customers || [])
    .map((link) => link.customers?.customer_name)
    .filter(Boolean);
  const followUp = getDateUrgency(record.follow_up_date);
  const isTerminal = ["Resolved", "Closed", "Cancelled"].includes(
    record.status
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <ResolveCaseDialog
        open={resolveDialogOpen}
        resolution={resolution}
        error={resolutionError}
        saving={resolving}
        onResolutionChange={(value) => {
          setResolution(value);
          if (resolutionError) setResolutionError("");
        }}
        onCancel={closeResolveDialog}
        onConfirm={handleQuickResolve}
      />

      <Link
        to="/cases?status=Active"
        className="inline-flex items-center gap-2 text-slate-400"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Back to cases
      </Link>

      {successMessage && (
        <div
          className="rounded-xl border border-emerald-900 bg-emerald-950/50 p-4 text-emerald-300"
          role="status"
        >
          {successMessage}
        </div>
      )}

      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm text-blue-400">
            {record.case_reference || "Case details"}
          </p>
          <h1 className="text-3xl font-semibold">{record.case_title}</h1>
        </div>

        <div className="flex flex-wrap items-stretch gap-2">
          <button
            type="button"
            onClick={loadRecord}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-center"
          >
            <RefreshCw size={17} aria-hidden="true" />
            Refresh
          </button>

          {canEdit && !isTerminal && (
            <button
              type="button"
              onClick={openResolveDialog}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-center font-medium text-white hover:bg-emerald-500"
            >
              <CheckCircle2 size={18} aria-hidden="true" />
              Resolve case
            </button>
          )}

          {canEdit && (
            <>
              <Link
                to={`/cases/${caseId}/edit`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-center font-medium text-white"
              >
                Edit case
              </Link>

              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-800 px-4 py-2 text-center text-red-300 disabled:opacity-60"
              >
                <Trash2 size={17} aria-hidden="true" />
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </>
          )}
        </div>
      </header>

      {error && (
        <div className="text-red-300" role="alert">
          {error}
        </div>
      )}

      <dl className="grid gap-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2">
        <Detail label="Customers">
          {customers.join(", ") || "Internal / No customer"}
        </Detail>
        <Detail label="Status">{record.status}</Detail>
        <Detail label="Priority">{record.priority}</Detail>
        <Detail label="Progress">{record.progress ?? 0}%</Detail>
        <Detail label="Created">
          {formatDateOnly(record.case_created_on)}
        </Detail>
        <Detail label="Follow-up">
          <span
            className={`inline-flex h-8 items-center justify-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium leading-none ${followUp.className}`}
          >
            {followUp.label}
          </span>
        </Detail>
        <Detail label="Target resolution">
          {formatDateOnly(record.target_resolution_date)}
        </Detail>
        <Detail label="Resolved">
          {formatDateOnly(record.resolved_date)}
        </Detail>
        <Detail label="Request type">{record.request_type}</Detail>
        <Detail label="Sources">{(record.source || []).join(", ")}</Detail>
        <Detail label="Reported by">{record.reported_by}</Detail>
        <Detail label="Escalated to">{record.escalated_to}</Detail>
        <Detail label="Case number">{record.case_number}</Detail>
        <Detail label="Waiting on">{record.waiting_on}</Detail>
        <Detail label="Next action" wide>{record.next_action}</Detail>
        <Detail label="Related issues" wide>{record.related_issues}</Detail>
        <Detail label="Description" wide>{record.issue_description}</Detail>
        <Detail label="Resolution summary" wide>
          {record.resolution_summary}
        </Detail>
      </dl>
    </div>
  );
}
