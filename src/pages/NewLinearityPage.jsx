import SelectInput from "../components/ui/SelectInput";
import { useEffect, useMemo, useState } from "react";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import { ArrowLeft } from "lucide-react";
import DatePickerInput from "../components/ui/DatePickerInput";
import { Link, useNavigate } from "react-router-dom";
import { getCustomerOptions } from "../services/customers";
import { getInstrumentsForCustomer } from "../services/assets";
import { createLinearityRecord } from "../services/linearity";
import {
  calculateDaysRemaining,
  calculateNextDueDate,
  formatFrequency,
  formatRemainingPeriod,
  getLinearityDueStatus,
} from "../utils/linearityDates";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/30";

export default function NewLinearityPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [loadingInstruments, setLoadingInstruments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const { confirmDiscard } = useUnsavedChanges(dirty);
  const [values, setValues] = useState({
    customerId: "",
    instrumentId: "",
    instrumentName: "",
    serialNumber: "",
    lotNumber: "",
    performedDate: "",
    frequencyMonths: 6,
    status: "Pending",
    notes: "",
  });

  const isNotRequired = values.status === "Not Required";

  useEffect(() => {
    getCustomerOptions()
      .then(setCustomers)
      .catch((loadError) =>
        setError(loadError?.message || "Unable to load customers.")
      );
  }, []);

  function patch(field, value) {
    setDirty(true);
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleCustomerChange(customerId) {
    setDirty(true);
    setValues((current) => ({
      ...current,
      customerId,
      instrumentId: "",
      instrumentName: "",
      serialNumber: "",
    }));
    setInstruments([]);
    setError("");

    if (!customerId) return;

    try {
      setLoadingInstruments(true);
      setInstruments(await getInstrumentsForCustomer(customerId));
    } catch (loadError) {
      setError(
        loadError?.message || "Unable to load customer instruments."
      );
    } finally {
      setLoadingInstruments(false);
    }
  }

  function handleInstrumentChange(instrumentId) {
    const selected = instruments.find(
      (item) => String(item.id) === String(instrumentId)
    );

    setDirty(true);
    setValues((current) => ({
      ...current,
      instrumentId,
      instrumentName: selected?.instrument_name || "",
      serialNumber: selected?.serial_number || "",
    }));
  }

  function handleNotRequiredChange(checked) {
    setDirty(true);
    setValues((current) => ({
      ...current,
      status: checked ? "Not Required" : "Pending",
      performedDate: checked ? "" : current.performedDate,
      lotNumber: checked ? "" : current.lotNumber,
    }));
  }

  const calculatedSchedule = useMemo(() => {
    if (isNotRequired) {
      return {
        nextDueDate: null,
        daysRemaining: 0,
        dueStatus: "Not required",
      };
    }

    const nextDueDate = calculateNextDueDate(
      values.performedDate,
      values.frequencyMonths
    );
    const daysRemaining = calculateDaysRemaining(
      values.performedDate,
      values.frequencyMonths
    );

    return {
      nextDueDate,
      daysRemaining,
      dueStatus: getLinearityDueStatus(daysRemaining),
    };
  }, [isNotRequired, values.performedDate, values.frequencyMonths]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!values.instrumentId) {
      setError("Select an installed instrument before saving.");
      return;
    }

    if (!isNotRequired && !values.performedDate) {
      setError("Choose the date linearity was performed before saving.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await createLinearityRecord(values);
      setDirty(false);
      navigate("/linearity", {
        state: { message: "Linearity record saved successfully." },
      });
    } catch (saveError) {
      setError(
        saveError?.message || "Unable to create the linearity record."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        to="/linearity"
        onClick={(event) => {
          if (!confirmDiscard()) event.preventDefault();
        }}
        className="-ml-2 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Back to linearity
      </Link>

      <header>
        <p className="text-sm text-blue-400">Quality schedule</p>
        <h1 className="text-3xl font-semibold">New linearity record</h1>
        <p className="mt-2 text-slate-400">
          Select a customer and an installed instrument from Assets.
        </p>
      </header>

      {error && (
        <div
          className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300"
          role="alert"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2"
      >
        <label>
          <span className="text-sm font-medium">Customer</span>
          <SelectInput
            required
            className={inputClass}
            value={values.customerId}
            onChange={(event) => handleCustomerChange(event.target.value)}
          >
            <option value="">Select customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </SelectInput>
        </label>

        <label>
          <span className="text-sm font-medium">Installed instrument</span>
          <SelectInput
            required
            className={inputClass}
            value={values.instrumentId}
            disabled={!values.customerId || loadingInstruments}
            onChange={(event) => handleInstrumentChange(event.target.value)}
          >
            <option value="">
              {loadingInstruments
                ? "Loading instruments..."
                : instruments.length === 0
                  ? "No installed instruments available"
                  : "Select instrument"}
            </option>
            {instruments.map((instrument) => (
              <option key={instrument.id} value={instrument.id}>
                {instrument.instrument_name}
                {instrument.serial_number
                  ? ` - ${instrument.serial_number}`
                  : ""}
              </option>
            ))}
          </SelectInput>
          <span className="mt-1 block text-xs text-slate-500">
            Only instruments assigned to the selected customer in Assets are
            available.
          </span>
        </label>

        {values.instrumentId && (
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 md:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Selected instrument
            </p>
            <p className="mt-2 font-medium text-slate-100">
              {values.instrumentName}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Serial number: {values.serialNumber || "Not recorded"}
            </p>
          </div>
        )}

        <label className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 md:col-span-2">
          <input
            type="checkbox"
            className="mt-1"
            checked={isNotRequired}
            onChange={(event) =>
              handleNotRequiredChange(event.target.checked)
            }
          />
          <span>
            <span className="block font-medium">
              Linearity not required for this instrument
            </span>
            <span className="mt-1 block text-sm text-slate-500">
              The tracker will show N/A for scheduling fields and a remaining
              value of 0.
            </span>
          </span>
        </label>

        {!isNotRequired && (
          <>
            <label>
              <span className="text-sm font-medium">
                Linearity lot number
              </span>
              <input
                className={inputClass}
                value={values.lotNumber}
                onChange={(event) => patch("lotNumber", event.target.value)}
              />
            </label>

            <label>
              <span className="text-sm font-medium">
                Date linearity performed
              </span>
              <DatePickerInput
                value={values.performedDate}
                onChange={(event) =>
                  patch("performedDate", event.target.value)
                }
                required
                ariaLabel="Choose linearity performed date"
              />
            </label>

            <label>
              <span className="text-sm font-medium">Frequency</span>
              <SelectInput
                className={inputClass}
                value={values.frequencyMonths}
                onChange={(event) =>
                  patch("frequencyMonths", Number(event.target.value))
                }
              >
                <option value={6}>6 Months</option>
                <option value={12}>1 Year</option>
              </SelectInput>
            </label>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 md:col-span-2">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Calculated schedule
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Calculated from the last run date and selected frequency.
                  </p>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                  {formatFrequency(values.frequencyMonths)}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">Next due date</p>
                  <p className="mt-1 font-medium">
                    {calculatedSchedule.nextDueDate ||
                      "Select a performed date"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Remaining period</p>
                  <p
                    className={`mt-1 font-medium ${
                      calculatedSchedule.daysRemaining === null
                        ? "text-slate-400"
                        : calculatedSchedule.daysRemaining < 0
                          ? "text-red-400"
                          : calculatedSchedule.daysRemaining <= 30
                            ? "text-amber-400"
                            : "text-emerald-400"
                    }`}
                  >
                    {formatRemainingPeriod(
                      calculatedSchedule.daysRemaining
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Due status</p>
                  <p className="mt-1 font-medium">
                    {calculatedSchedule.dueStatus}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        <label className="md:col-span-2">
          <span className="text-sm font-medium">Notes</span>
          <textarea
            rows={4}
            className={inputClass}
            value={values.notes}
            onChange={(event) => patch("notes", event.target.value)}
          />
        </label>

        <div className="flex justify-end gap-3 md:col-span-2">
          <button
            type="button"
            onClick={() => confirmDiscard() && navigate("/linearity")}
            className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Create record"}
          </button>
        </div>
      </form>
    </div>
  );
}
