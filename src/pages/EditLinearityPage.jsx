import SelectInput from "../components/ui/SelectInput";
import { useEffect, useState } from "react";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DatePickerInput from "../components/ui/DatePickerInput";
import { getCustomerOptions } from "../services/customers";
import { getInstrumentsForCustomer } from "../services/assets";
import {
  getLinearityRecord,
  updateLinearityRecord,
} from "../services/linearity";
import { deleteLinearityRecord } from "../services/deletions";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30";

export default function EditLinearityPage() {
  const { linearityId } = useParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [values, setValues] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const { confirmDiscard } = useUnsavedChanges(dirty);

  useEffect(() => {
    Promise.all([
      getCustomerOptions(),
      getLinearityRecord(linearityId),
    ])
      .then(async ([customerOptions, record]) => {
        setCustomers(customerOptions);
        const instrumentOptions = record.customer_id
          ? await getInstrumentsForCustomer(record.customer_id)
          : [];
        setInstruments(instrumentOptions);
        setValues({
          customerId: String(record.customer_id || ""),
          instrumentId: String(record.instrument_id || ""),
          instrumentName:
            record.instruments?.instrument_name ||
            record.instrument_name_snapshot ||
            "",
          serialNumber:
            record.instruments?.serial_number ||
            record.serial_number_snapshot ||
            "",
          lotNumber: record.linearity_lot_number || "",
          performedDate: record.performed_date || "",
          frequencyMonths: record.frequency_months || 6,
          status:
            record.status === "Not Required" ? "Not Required" : "Pending",
          notes: record.notes || "",
        });
      })
      .catch((loadError) =>
        setError(loadError?.message || "Unable to load record.")
      );
  }, [linearityId]);

  function patch(field, value) {
    setDirty(true);
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function changeCustomer(customerId) {
    try {
      setDirty(true);
      setError("");
      setInstruments(
        customerId ? await getInstrumentsForCustomer(customerId) : []
      );
      setValues((current) => ({
        ...current,
        customerId,
        instrumentId: "",
        instrumentName: "",
        serialNumber: "",
      }));
    } catch (loadError) {
      setError(
        loadError?.message || "Unable to load customer instruments."
      );
    }
  }

  function changeInstrument(instrumentId) {
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

  async function handleSubmit(event) {
    event.preventDefault();
    const isNotRequired = values.status === "Not Required";

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
      await updateLinearityRecord(linearityId, values);
      setDirty(false);
      navigate("/linearity", {
        state: { message: "Linearity record saved successfully." },
      });
    } catch (saveError) {
      setError(saveError?.message || "Unable to update record.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this linearity entry permanently?")) return;

    try {
      setDeleting(true);
      setError("");
      await deleteLinearityRecord(linearityId);
      setDirty(false);
      navigate("/linearity", {
        state: { message: "Linearity record deleted successfully." },
      });
    } catch (deleteError) {
      setError(deleteError?.message || "Unable to delete record.");
    } finally {
      setDeleting(false);
    }
  }

  if (!values) {
    return <div className="text-slate-400">Loading record...</div>;
  }

  const isNotRequired = values.status === "Not Required";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        to="/linearity"
        onClick={(event) => {
          if (!confirmDiscard()) event.preventDefault();
        }}
        className="inline-flex items-center gap-2 text-slate-400"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Back to linearity
      </Link>

      <h1 className="text-3xl font-semibold">Edit linearity entry</h1>

      {error && (
        <div className="text-red-300" role="alert">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2"
      >
        <label>
          Customer
          <SelectInput
            required
            className={inputClass}
            value={values.customerId}
            onChange={(event) => changeCustomer(event.target.value)}
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
          Installed instrument
          <SelectInput
            required
            className={inputClass}
            value={values.instrumentId}
            disabled={!values.customerId}
            onChange={(event) => changeInstrument(event.target.value)}
          >
            <option value="">Select instrument</option>
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
            Instruments must first be assigned to this customer in Assets.
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
              The system will display N/A for scheduling fields and a
              remaining value of 0.
            </span>
          </span>
        </label>

        {!isNotRequired && (
          <>
            <label>
              Linearity lot number
              <input
                className={inputClass}
                value={values.lotNumber}
                onChange={(event) => patch("lotNumber", event.target.value)}
              />
            </label>

            <label>
              Date linearity performed
              <div className="mt-2">
                <DatePickerInput
                  value={values.performedDate}
                  onChange={(event) =>
                    patch("performedDate", event.target.value)
                  }
                  required
                  ariaLabel="Choose linearity performed date"
                />
              </div>
            </label>

            <label>
              Frequency
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
          </>
        )}

        <label className="md:col-span-2">
          Notes
          <textarea
            rows={4}
            className={inputClass}
            value={values.notes}
            onChange={(event) => patch("notes", event.target.value)}
          />
        </label>

        <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-800 pt-5 md:col-span-2 sm:flex-row">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-800 px-4 py-2 text-red-300 hover:bg-red-950 disabled:opacity-60"
          >
            <Trash2 size={17} aria-hidden="true" />
            {deleting ? "Deleting..." : "Delete entry"}
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 px-4 py-2 font-medium disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
