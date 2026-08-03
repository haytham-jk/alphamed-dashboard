import SelectInput from "../ui/SelectInput";
import { useEffect, useMemo, useState } from "react";
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
} from "../../constants/caseOptions";
import { normalizeCaseFormValues } from "../../utils/caseFormHelpers";
import { validateCase } from "../../utils/caseValidation";

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

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const showResolution = useMemo(
    () => ["Resolved", "Closed", "Cancelled"].includes(values.status),
    [values.status]
  );

  function patch(changes) {
    setValues((current) => ({ ...current, ...changes }));
    onDirtyChange?.(true);
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
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
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

      <CaseFormSection
        title="Progress and follow-up"
        description="Record the current progress, next action, and target dates."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Progress (%)" error={errors.progress} fieldKey="progress">
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              className={inputClass}
              value={values.progress}
              onChange={(event) => patch({ progress: event.target.value })}
            />
          </Field>

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
