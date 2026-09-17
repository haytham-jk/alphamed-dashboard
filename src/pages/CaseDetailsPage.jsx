import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  RefreshCw,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  getSupportCaseForEdit,
  resolveSupportCase,
} from "../services/caseMutations";
import { deleteSupportCase } from "../services/deletions";
import { formatDateOnly, getDateUrgency } from "../utils/dateDisplay";
import { getCaseProgress } from "../utils/caseProgress";
import { buildFocusState, safeReturnPath } from "../utils/returnNavigation";
import {
  CASE_BADGE_CLASS,
  getCasePriorityClass,
  getCaseStatusClass,
} from "../constants/caseDisplay";

function Detail({ label, children, wide = false }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 whitespace-pre-wrap text-slate-200">
        {children || "Not recorded"}
      </div>
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
  resolutionRef,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resolve-case-title"
        className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="resolve-case-title" className="text-xl font-semibold">
              Resolve case
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Today's date will be recorded as the resolution date. Enter the
              resolution before confirming.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            aria-label="Close resolve case dialog"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 disabled:opacity-60"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <label className="mt-5 block">
          Resolution summary *
          <textarea
            ref={resolutionRef}
            autoFocus
            rows={5}
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

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-xl border border-slate-700 px-4 py-2 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-medium disabled:opacity-60"
          >
            <CheckCircle2 size={17} aria-hidden="true" />
            {saving ? "Resolving..." : "Confirm resolution"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CaseDetailsPage({ canEdit }) {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const casesReturnTo = safeReturnPath(location.state?.casesReturnTo, "/cases?status=Active", "/cases");
  const casesReturnState = buildFocusState("focusCaseId", caseId);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolution, setResolution] = useState("");
  const [resolutionError, setResolutionError] = useState("");
  const [resolving, setResolving] = useState(false);
  const resolutionRef = useRef(null);

  const loadRecord = useCallback(() => {
    setLoading(true);
    setError("");
    getSupportCaseForEdit(caseId)
      .then(setRecord)
      .catch((loadError) => {
        setError(loadError?.message || "Unable to load case.");
      })
      .finally(() => setLoading(false));
  }, [caseId]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

  function openResolveDialog() {
    setResolution(record?.resolution_summary || "");
    setResolutionError("");
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
      window.requestAnimationFrame(() => {
        resolutionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        resolutionRef.current?.focus({ preventScroll: true });
      });
      return;
    }

    try {
      setResolving(true);
      setResolutionError("");
      setError("");

      await resolveSupportCase(caseId, summary);

      setResolveDialogOpen(false);
      navigate(casesReturnTo, { state: buildFocusState("focusCaseId", caseId, "Case resolved successfully.") });
    } catch (resolveError) {
      setResolutionError(
        resolveError?.message || "Unable to resolve the case."
      );
    } finally {
      setResolving(false);
    }
  }

  async function handleDelete() {
    if (deleting || !window.confirm("Delete this case permanently?")) return;

    try {
      setDeleting(true);
      await deleteSupportCase(caseId);
      navigate(casesReturnTo, { state: { message: "Case deleted successfully." } });
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
  const progress = getCaseProgress(record.status);
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
        resolutionRef={resolutionRef}
      />

      <Link
        to={casesReturnTo}
        state={casesReturnState}
        className="-ml-2 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Back to cases
      </Link>

      <header className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-end">
        <div className="min-w-0 space-y-4">
          <div>
            <p className="text-sm text-blue-400">
              {record.case_reference || "Case details"}
            </p>
            <h1 className="text-3xl font-semibold">{record.case_title}</h1>
          </div>

          <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadRecord}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2"
          >
            <RefreshCw size={17} aria-hidden="true" />
            Refresh
          </button>
          {canEdit && !isTerminal && (
            <button
              type="button"
              onClick={openResolveDialog}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-medium"
            >
              <CheckCircle2 size={17} aria-hidden="true" />
              Resolve case
            </button>
          )}
          {canEdit && (
            <>
              <Link
                to={`/cases/${caseId}/edit`}
                state={{ casesReturnTo }}
                className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 font-medium"
              >
                Edit case
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl border border-red-800 px-4 py-2 text-red-300 disabled:opacity-60"
              >
                <Trash2 size={17} aria-hidden="true" />
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </>
          )}
          </div>
        </div>

        <section
          aria-label={`Case progress: ${progress}%`}
          className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 px-5 py-4 shadow-lg shadow-black/10"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Case progress
              </p>
            </div>
            <span className="text-3xl font-semibold tabular-nums text-blue-300">
              {progress}%
            </span>
          </div>
          <div
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-800 ring-1 ring-inset ring-slate-700/70"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={progress}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400 transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
            <span>{record.status}</span>
            <span>{progress === 100 ? "Complete" : "Status driven"}</span>
          </div>
        </section>
      </header>

      {error && (
        <div
          className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300"
          role="alert"
        >
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">Case overview</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Customers and current state</h2>
        </div>

        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Customers</p>
            {customers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {customers.map((customer) => (
                  <span key={customer} className="inline-flex rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-100">
                    {customer}
                  </span>
                ))}
              </div>
            ) : (
              <span className="inline-flex rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-400">Internal / No customer</span>
            )}
          </div>

          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-3">
            <Detail label="Status">
              <span className={`${CASE_BADGE_CLASS} ${getCaseStatusClass(record.status)}`}>{record.status}</span>
            </Detail>
            <Detail label="Priority">
              <span className={`${CASE_BADGE_CLASS} ${getCasePriorityClass(record.priority)}`}>{record.priority}</span>
            </Detail>
            <Detail label="Follow-up">
              <span className={`${CASE_BADGE_CLASS} ${isTerminal ? "border-emerald-900 bg-emerald-950 text-emerald-300" : followUp.className}`}>
                {isTerminal ? "No follow-up required" : followUp.label}
              </span>
            </Detail>
          </div>
          <div className="grid gap-4 border-t border-slate-800 pt-5 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-blue-950 p-2 text-blue-300"><CalendarDays size={18} aria-hidden="true" /></span>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Created date</p><p className="mt-1 font-medium text-slate-100">{formatDateOnly(record.case_created_on)}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-amber-950 p-2 text-amber-300"><Target size={18} aria-hidden="true" /></span>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Target resolution</p><p className="mt-1 font-medium text-slate-100">{formatDateOnly(record.target_resolution_date)}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-emerald-950 p-2 text-emerald-300"><CheckCircle2 size={18} aria-hidden="true" /></span>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Resolved date</p><p className="mt-1 font-medium text-slate-100">{formatDateOnly(record.resolved_date)}</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">Equipment</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Related instruments</h2>
        </div>
        {(record.case_instruments || []).length > 0 ? (
          <div className="space-y-2">
            {(record.case_instruments || []).map((link) => {
              const instrument = link.instruments;
              if (!instrument) return null;
              return (
                <Link key={instrument.id} to={`/assets/${instrument.id}/edit`} className="flex w-full flex-col gap-1 rounded-xl border border-blue-900 bg-blue-950/30 px-4 py-3 text-blue-100 transition-colors hover:border-blue-600 hover:bg-blue-950/50 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium">{instrument.customers?.customer_name || "Customer not recorded"}</span>
                  <span className="text-sm text-blue-200">{instrument.instrument_name} · SN: {instrument.serial_number || "Not recorded"}</span>
                </Link>
              );
            })}
          </div>
        ) : <p className="text-slate-500">No related instruments.</p>}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-400">Classification</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Request and escalation</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Detail label="Request type">{record.request_type}</Detail>
            <Detail label="Source">{(record.source || []).join(", ")}</Detail>
            <Detail label="Reported by">{record.reported_by}</Detail>
            <Detail label="Escalated to">{record.escalated_to}</Detail>
            <Detail label="Case number">{record.case_number}</Detail>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400">Actions</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Follow-up and next steps</h2>
          </div>
          <div className="space-y-5">
            <Detail label="Waiting on">{isTerminal ? "No follow-up required" : record.waiting_on}</Detail>
            <Detail label="Next action">{isTerminal ? "No follow-up required" : record.next_action}</Detail>
            <Detail label="Related issues">{record.related_issues}</Detail>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">Case narrative</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Issue and outcome</h2>
        </div>
        <div className="space-y-6">
          <Detail label="Issue description">{record.issue_description}</Detail>
          {isTerminal && <div className="border-t border-slate-800 pt-5"><Detail label="Resolution summary">{record.resolution_summary}</Detail></div>}
        </div>
      </section>


    </div>
  );
}
