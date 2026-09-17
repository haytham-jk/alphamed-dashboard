import { handleInvalidCapture } from "../../utils/formFocus";
import SelectInput from "../ui/SelectInput";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import DatePickerInput from "../ui/DatePickerInput";
import CaseFormSection from "./CaseFormSection";
import CaseCustomerSelector from "./CaseCustomerSelector";
import CaseSourceSelector from "./CaseSourceSelector";
import {
  CASE_PRIORITIES,
  CASE_STATUSES,
  REQUEST_TYPES,
  SOURCE_OPTIONS,
  TERMINAL_CASE_STATUSES,
} from "../../constants/caseOptions";
import { normalizeCaseFormValues } from "../../utils/caseFormHelpers";
import { validateCase } from "../../utils/caseValidation";
import { getInstrumentsForCustomers } from "../../services/assets";
import { isExpectedAbortError } from "../../utils/requestErrors";

const INSTRUMENT_MATCHERS = [
  ["d100", /\bd\s*100\b/],
  ["d10", /\bd\s*10\b/],
  ["variant turbo", /\bvariant\s+turbo\b/],
  ["variant ii", /\bvariant\s+(?:ii|2)\b/],
  ["bioplex", /\bbio\s*plex\b/],
  ["geenius", /\bgeenius\b/],
  ["1wa", /\b1\s*wa\b/],
];

function normalizeInstrumentLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getInstrumentFamily(value) {
  const normalized = normalizeInstrumentLabel(value);
  return INSTRUMENT_MATCHERS.find(([, pattern]) => pattern.test(normalized))?.[0] || "";
}

function sourceMatchesInstrument(source, instrumentName) {
  const sourceFamily = getInstrumentFamily(source);
  return Boolean(sourceFamily) && sourceFamily === getInstrumentFamily(instrumentName);
}

const escalationOptions = [
  "",
  "CDG",
  "Bio-Rad Local Support",
  "Customer Service",
  "Service Team",
  "1WA Support",
];

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/30";

function Field({ label, error, fieldKey, className = "", children }) {
  return (
    <label className={className} data-field-key={fieldKey}>
      <span className="mb-2 block text-sm font-medium">{label}</span>
      {children}
      {error && (
        <span className="mt-1 block text-sm text-red-300" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

export default function CaseForm({
  mode,
  initialValues,
  customers,
  onSubmit,
  onCancel,
  onDirtyChange,
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [instruments, setInstruments] = useState([]);
  const [instrumentError, setInstrumentError] = useState("");
  const [pendingInstrumentId, setPendingInstrumentId] = useState("");

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const patch = useCallback((changes) => {
    setValues((current) => ({ ...current, ...changes }));
    onDirtyChange?.(true);
  }, [onDirtyChange]);

  const showResolution = useMemo(
    () => TERMINAL_CASE_STATUSES.includes(values.status),
    [values.status]
  );
  const selectedCustomerIds = useMemo(() => (values.customerIds || []).map(Number).filter(Number.isFinite), [values.customerIds]);
  const relevantInstruments = useMemo(() => {
    const selectedSources = values.source || [];
    return instruments.filter((item) =>
      selectedSources.some((source) =>
        sourceMatchesInstrument(source, item.instrument_name)
      )
    );
  }, [instruments, values.source]);
  const selectedInstrumentIds = useMemo(
    () => [...new Set((values.instrumentIds || []).map(String).filter(Boolean))],
    [values.instrumentIds]
  );
  const selectedInstruments = useMemo(
    () => selectedInstrumentIds
      .map((instrumentId) => instruments.find((item) => String(item.id) === instrumentId))
      .filter(Boolean),
    [instruments, selectedInstrumentIds]
  );
  const availableInstruments = useMemo(
    () => relevantInstruments.filter((item) => !selectedInstrumentIds.includes(String(item.id))),
    [relevantInstruments, selectedInstrumentIds]
  );
  useEffect(() => {
    const controller = new AbortController();
    if (values.internalCase || selectedCustomerIds.length === 0) {
      setInstruments([]);
      if (selectedInstrumentIds.length > 0) patch({ instrumentIds: [] });
      setPendingInstrumentId("");
      return () => controller.abort();
    }
    getInstrumentsForCustomers(selectedCustomerIds, { signal: controller.signal })
      .then((rows) => { setInstruments(rows); setInstrumentError(""); })
      .catch((loadError) => { if (!isExpectedAbortError(loadError)) setInstrumentError(loadError?.message || "Unable to load customer instruments."); });
    return () => controller.abort();
  }, [patch, selectedCustomerIds, selectedInstrumentIds.length, values.internalCase]);
  useEffect(() => {
    if (selectedInstrumentIds.length === 0 || instruments.length === 0) return;
    const validIds = selectedInstrumentIds.filter((instrumentId) =>
      relevantInstruments.some((item) => String(item.id) === instrumentId)
    );
    if (validIds.length !== selectedInstrumentIds.length) {
      patch({ instrumentIds: validIds });
      setPendingInstrumentId("");
    }
  }, [instruments.length, patch, relevantInstruments, selectedInstrumentIds]);
  function addInstrument() {
    const instrumentId = String(pendingInstrumentId || "");
    if (!instrumentId || selectedInstrumentIds.includes(instrumentId)) return;
    patch({ instrumentIds: [...selectedInstrumentIds, instrumentId] });
    setPendingInstrumentId("");
  }
  function removeInstrument(instrumentId) {
    patch({ instrumentIds: selectedInstrumentIds.filter((id) => id !== String(instrumentId)) });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    const normalizedValues = normalizeCaseFormValues(values);
    const nextErrors = validateCase(normalizedValues);

    setValues(normalizedValues);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      const firstErrorKey = Object.keys(nextErrors)[0];
      window.requestAnimationFrame(() => {
        const container = document.querySelector(`[data-field-key="${firstErrorKey}"]`);
        if (!container) return;
        container.scrollIntoView({ behavior: "smooth", block: "center" });
        const control = container.querySelector("input, select, textarea, button, [tabindex]");
        control?.focus({ preventScroll: true });
      });
      return;
    }

    try {
      setSaving(true);
      setSubmitError("");
      await onSubmit(normalizedValues);
    } catch (error) {
      setSubmitError(error?.message || "Unable to save the case.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} onInvalidCapture={handleInvalidCapture} noValidate className="space-y-5">
      <CaseFormSection
        title="Case overview"
        description="Record the issue, priority, status, and request type."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Case title" error={errors.title} fieldKey="title" className="md:col-span-2">
            <input
              required
              className={inputClass}
              value={values.title}
              onChange={(event) => patch({ title: event.target.value })}
            />
          </Field>

          <Field
            label="Issue description"
            error={errors.description}
            fieldKey="description"
            className="md:col-span-2"
          >
            <textarea
              required
              rows={6}
              className={inputClass}
              value={values.description}
              onChange={(event) => patch({ description: event.target.value })}
            />
          </Field>

          <Field label="Priority" error={errors.priority} fieldKey="priority">
            <SelectInput
              className={inputClass}
              value={values.priority}
              onChange={(event) => patch({ priority: event.target.value })}
            >
              {CASE_PRIORITIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Status" error={errors.status} fieldKey="status">
            <SelectInput
              className={inputClass}
              value={values.status}
              onChange={(event) => patch({ status: event.target.value })}
            >
              {CASE_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Request type">
            <SelectInput
              className={inputClass}
              value={values.requestType}
              onChange={(event) => patch({ requestType: event.target.value })}
            >
              {REQUEST_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Case created on" error={errors.caseCreatedOn} fieldKey="caseCreatedOn">
            <DatePickerInput
              value={values.caseCreatedOn}
              onChange={(event) => patch({ caseCreatedOn: event.target.value })}
              required
              ariaLabel="Choose case created date"
              invalid={Boolean(errors.caseCreatedOn)}
            />
          </Field>
        </div>
      </CaseFormSection>

      <CaseFormSection
        title="Customers"
        description="Choose one or more customers and identify the primary customer."
      >
        <div data-field-key={errors.customerIds ? "customerIds" : errors.primaryCustomerId ? "primaryCustomerId" : undefined}>
        <CaseCustomerSelector
          customers={customers}
          customerIds={values.customerIds}
          primaryCustomerId={values.primaryCustomerId}
          internalCase={values.internalCase}
          errors={errors}
          onChange={patch}
        />
        </div>
      </CaseFormSection>

      <CaseFormSection
        title="Source and escalation"
        description="Identify the product areas, reporter, and escalation destination."
      >
        <div className="space-y-4">
          <CaseSourceSelector
            options={SOURCE_OPTIONS}
            value={values.source}
            onChange={(source) => patch({ source })}
          />
          {relevantInstruments.length > 0 && (
            <div className="space-y-3 pb-4" data-field-key="instrumentIds">
              <span className="block text-sm font-medium">Related instruments (optional)</span>
              {selectedInstruments.length > 0 && (
                <div className="grid gap-2 md:grid-cols-2">
                  {selectedInstruments.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-blue-900 bg-blue-950/25 p-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-100">{item.customers?.customer_name || "Customer"}</p>
                        <p className="truncate text-sm text-slate-400">{item.instrument_name} · SN: {item.serial_number || "Not recorded"}</p>
                      </div>
                      <button type="button" onClick={() => removeInstrument(item.id)} className="shrink-0 rounded-lg border border-red-900 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-950">Remove</button>
                    </div>
                  ))}
                </div>
              )}
              {availableInstruments.length > 0 && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <SelectInput className={inputClass} value={pendingInstrumentId} onChange={(event) => setPendingInstrumentId(event.target.value)}>
                    <option value="">Select another instrument</option>
                    {availableInstruments.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.customers?.customer_name ? `${item.customers.customer_name} · ` : ""}{item.instrument_name} · SN: {item.serial_number || "Not recorded"}{item.is_active ? "" : " · Inactive"}
                      </option>
                    ))}
                  </SelectInput>
                  <button type="button" onClick={addInstrument} disabled={!pendingInstrumentId} className="h-9 self-start whitespace-nowrap rounded-lg border border-blue-700 px-3 text-sm font-medium text-blue-200 hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-50 sm:self-center">Add instrument</button>
                </div>
              )}
              {instrumentError && <p className="text-sm text-red-300" role="alert">{instrumentError}</p>}
              {selectedInstruments.length > 0 && availableInstruments.length === 0 && <p className="text-xs text-slate-500">All matching instruments are selected.</p>}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Reported by">
              <input
                className={inputClass}
                value={values.reportedBy}
                onChange={(event) => patch({ reportedBy: event.target.value })}
              />
            </Field>

            <Field label="Escalated to">
              <SelectInput
                className={inputClass}
                value={values.escalatedTo}
                onChange={(event) => patch({ escalatedTo: event.target.value })}
              >
                {escalationOptions.map((item) => (
                  <option key={item || "none"} value={item}>
                    {item || "Not escalated"}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Case number">
              <input
                className={inputClass}
                value={values.caseNumber}
                onChange={(event) => patch({ caseNumber: event.target.value })}
              />
            </Field>

            <Field label="Related issues">
              <input
                className={inputClass}
                value={values.relatedIssues}
                onChange={(event) => patch({ relatedIssues: event.target.value })}
              />
            </Field>
          </div>
        </div>
      </CaseFormSection>

      {!showResolution && (
      <CaseFormSection
        title="Follow-up"
        description="Record the next action, waiting party, and target dates."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Waiting on">
            <input
              className={inputClass}
              value={values.waitingOn}
              onChange={(event) => patch({ waitingOn: event.target.value })}
            />
          </Field>

          <Field label="Next action" className="md:col-span-2">
            <textarea
              rows={3}
              className={inputClass}
              value={values.nextAction}
              onChange={(event) => patch({ nextAction: event.target.value })}
            />
          </Field>

          <Field label="Follow-up date">
            <DatePickerInput
              value={values.followUpDate}
              onChange={(event) => patch({ followUpDate: event.target.value })}
              ariaLabel="Choose follow-up date"
            />
          </Field>

          <Field label="Target resolution date">
            <DatePickerInput
              value={values.targetResolutionDate}
              onChange={(event) =>
                patch({ targetResolutionDate: event.target.value })
              }
              ariaLabel="Choose target resolution date"
            />
          </Field>
        </div>
      </CaseFormSection>
      )}

      {showResolution && (
        <div className="rounded-2xl border border-emerald-900/70 bg-emerald-950/25 p-4 text-sm text-emerald-200">No follow-up required for terminal cases.</div>
      )}

      {showResolution && (
        <CaseFormSection
          title={values.status === "Cancelled" ? "Cancellation" : "Resolution"}
          description="Terminal cases require a date and summary."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label={values.status === "Cancelled" ? "Cancellation date" : "Resolved date"}
              error={errors.resolvedDate}
              fieldKey="resolvedDate"
            >
              <DatePickerInput
                value={values.resolvedDate}
                onChange={(event) => patch({ resolvedDate: event.target.value })}
                ariaLabel="Choose resolved date"
                invalid={Boolean(errors.resolvedDate)}
              />
            </Field>

            <Field
              label={
                values.status === "Cancelled"
                  ? "Cancellation reason"
                  : "Resolution summary"
              }
              error={errors.resolutionSummary}
              fieldKey="resolutionSummary"
              className="md:col-span-2"
            >
              <textarea
                rows={4}
                className={inputClass}
                value={values.resolutionSummary}
                onChange={(event) =>
                  patch({ resolutionSummary: event.target.value })
                }
              />
            </Field>
          </div>
        </CaseFormSection>
      )}

      {submitError && (
        <div
          className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300"
          role="alert"
        >
          {submitError}
        </div>
      )}

      <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
        <Link
          to="/cases"
          className="rounded-xl border border-slate-700 px-4 py-2 text-center text-slate-300 hover:bg-slate-800"
        >
          Back to cases
        </Link>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {saving
              ? "Saving..."
              : mode === "edit"
                ? "Save changes"
                : "Create case"}
          </Button>
        </div>
      </div>
    </form>
  );
}
