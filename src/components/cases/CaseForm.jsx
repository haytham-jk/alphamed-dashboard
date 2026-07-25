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

function Field({ label, error, className = "", children }) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-medium">
        {label}
      </span>
      {children}
      {error && (
        <span className="mt-1 block text-sm text-red-400">
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
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const showResolution = useMemo(
    () =>
      ["Resolved", "Closed", "Cancelled"].includes(
        values.status
      ),
    [values.status]
  );

  function patch(changes) {
    setValues((current) => ({ ...current, ...changes }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateCase(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setSaving(true);
      setSubmitError("");
      await onSubmit(values);
    } catch (error) {
      setSubmitError(
        error?.message || "Unable to save the case."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <CaseFormSection
        title="Case information"
        description="Capture the core issue and workflow status."
      >
        <Field
          label="Case title"
          error={errors.title}
          className="md:col-span-2"
        >
          <input
            className={inputClass}
            value={values.title}
            onChange={(event) =>
              patch({ title: event.target.value })
            }
          />
        </Field>

        <Field
          label="Issue description"
          error={errors.description}
          className="md:col-span-2"
        >
          <textarea
            rows={6}
            className={inputClass}
            value={values.description}
            onChange={(event) =>
              patch({ description: event.target.value })
            }
          />
        </Field>

        <Field label="Priority">
          <select
            className={inputClass}
            value={values.priority}
            onChange={(event) =>
              patch({ priority: event.target.value })
            }
          >
            {CASE_PRIORITIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <select
            className={inputClass}
            value={values.status}
            onChange={(event) =>
              patch({ status: event.target.value })
            }
          >
            {CASE_STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>

        <Field label="Request type">
          <select
            className={inputClass}
            value={values.requestType}
            onChange={(event) =>
              patch({ requestType: event.target.value })
            }
          >
            {REQUEST_TYPES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>

        <Field
          label="Case created on"
          error={errors.caseCreatedOn}
        >
          <DatePickerInput
            value={values.caseCreatedOn}
            onChange={(event) =>
              patch({ caseCreatedOn: event.target.value })
            }
            required
            ariaLabel="Choose case created date"
          />
        </Field>
      </CaseFormSection>

      <CaseFormSection
        title="Customers"
        description="Select one or more customers and mark one as primary."
      >
        <CaseCustomerSelector
          customers={customers}
          customerIds={values.customerIds}
          primaryCustomerId={values.primaryCustomerId}
          internalCase={values.internalCase}
          errors={errors}
          onChange={patch}
        />
      </CaseFormSection>

      <CaseFormSection title="Product and source">
        <CaseSourceSelector
          options={SOURCE_OPTIONS}
          value={values.source}
          onChange={(source) => patch({ source })}
        />
      </CaseFormSection>

      <CaseFormSection title="Reporting and escalation">
        <Field label="Reported by">
          <input
            className={inputClass}
            value={values.reportedBy}
            onChange={(event) =>
              patch({ reportedBy: event.target.value })
            }
          />
        </Field>

        <Field label="Escalated to">
          <select
            className={inputClass}
            value={values.escalatedTo}
            onChange={(event) =>
              patch({ escalatedTo: event.target.value })
            }
          >
            {escalationOptions.map((item) => (
              <option key={item || "none"} value={item}>
                {item || "Not escalated"}
              </option>
            ))}
          </select>
        </Field>

        <Field label="External case number">
          <input
            className={inputClass}
            value={values.caseNumber}
            onChange={(event) =>
              patch({ caseNumber: event.target.value })
            }
          />
        </Field>
      </CaseFormSection>

      <CaseFormSection
        title="Workflow"
        description="Track next actions and important dates."
      >
        <Field label="Progress percentage">
          <input
            type="number"
            min="0"
            max="100"
            className={inputClass}
            value={values.progress}
            onChange={(event) =>
              patch({ progress: event.target.value })
            }
          />
        </Field>

        <Field label="Waiting on">
          <input
            className={inputClass}
            value={values.waitingOn}
            onChange={(event) =>
              patch({ waitingOn: event.target.value })
            }
          />
        </Field>

        <Field label="Next action" className="md:col-span-2">
          <textarea
            rows={3}
            className={inputClass}
            value={values.nextAction}
            onChange={(event) =>
              patch({ nextAction: event.target.value })
            }
          />
        </Field>

        <Field label="Follow-up date">
          <DatePickerInput
            value={values.followUpDate}
            onChange={(event) =>
              patch({ followUpDate: event.target.value })
            }
            ariaLabel="Choose follow-up date"
          />
        </Field>

        <Field label="Target resolution date">
          <DatePickerInput
            value={values.targetResolutionDate}
            onChange={(event) =>
              patch({
                targetResolutionDate: event.target.value,
              })
            }
            ariaLabel="Choose target resolution date"
          />
        </Field>
      </CaseFormSection>

      {showResolution && (
        <CaseFormSection title="Resolution">
          <Field
            label="Resolved date"
            error={errors.resolvedDate}
          >
            <DatePickerInput
              value={values.resolvedDate}
              onChange={(event) =>
                patch({ resolvedDate: event.target.value })
              }
              ariaLabel="Choose resolved date"
            />
          </Field>

          <Field
            label="Resolution summary"
            className="md:col-span-2"
          >
            <textarea
              rows={4}
              className={inputClass}
              value={values.resolutionSummary}
              onChange={(event) =>
                patch({
                  resolutionSummary: event.target.value,
                })
              }
            />
          </Field>
        </CaseFormSection>
      )}

      {submitError && (
        <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">
          {submitError}
        </div>
      )}

      <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-800 pt-5 sm:flex-row">
        <Link
          to="/cases"
          className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
        >
          Back to cases
        </Link>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>

          <Button type="submit" disabled={saving}>
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
