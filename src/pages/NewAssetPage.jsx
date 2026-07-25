import { useEffect, useMemo, useState } from "react";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createAsset } from "../services/assets";
import { getCustomerOptions } from "../services/customers";
import DatePickerInput from "../components/ui/DatePickerInput";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30";

const instrumentTypes = [
  "Bio-Rad D10",
  "Bio-Rad D100",
  "Bio-Rad Variant II",
  "Bio-Rad Variant Turbo",
  "Bio-Rad Vnbs",
  "Bioplex 2200",
  "Geenius",
  "Other",
];

export default function NewAssetPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const { confirmDiscard } = useUnsavedChanges(dirty);
  const [values, setValues] = useState({
    customerId: "",
    instrumentType: "",
    customInstrumentName: "",
    serialNumber: "",
    installationDate: "",
    isActive: true,
    notes: "",
  });

  useEffect(() => {
    getCustomerOptions()
      .then(setCustomers)
      .catch((loadError) => setError(loadError.message));
  }, []);

  const instrumentName = useMemo(() => {
    return values.instrumentType === "Other"
      ? values.customInstrumentName
      : values.instrumentType;
  }, [values.instrumentType, values.customInstrumentName]);

  function patch(field, value) {
    setDirty(true);
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      await createAsset({ ...values, instrumentName });
      setDirty(false);
      navigate("/assets", { state: { message: "Asset saved successfully." } });
    } catch (saveError) {
      setError(saveError.message || "Unable to create asset.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to="/assets" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
        <ArrowLeft size={18} />
        Back to assets
      </Link>

      <div>
        <p className="text-sm text-blue-400">Installed base</p>
        <h1 className="text-3xl font-semibold">New asset</h1>
        <p className="mt-2 text-slate-400">
          Add an installed instrument to a customer account.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2">
        <label className="md:col-span-2">
          Customer
          <select required className={inputClass} value={values.customerId} onChange={(event) => patch("customerId", event.target.value)}>
            <option value="">Select customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Instrument type
          <select required className={inputClass} value={values.instrumentType} onChange={(event) => patch("instrumentType", event.target.value)}>
            <option value="">Select instrument type</option>
            {instrumentTypes.map((instrument) => (
              <option key={instrument}>{instrument}</option>
            ))}
          </select>
        </label>

        {values.instrumentType === "Other" && (
          <label>
            Custom instrument type
            <input required className={inputClass} value={values.customInstrumentName} onChange={(event) => patch("customInstrumentName", event.target.value)} />
          </label>
        )}

        <label>
          Serial number
          <input className={inputClass} value={values.serialNumber} onChange={(event) => patch("serialNumber", event.target.value)} placeholder="Optional" />
        </label>

        <label>
          Installation date
          <DatePickerInput
  value={values.installationDate}
  onChange={(event) =>
    patch(
      "installationDate",
      event.target.value
    )
  }
  ariaLabel="Choose installation date"
/>
        </label>

        <label className="flex items-center gap-2 md:col-span-2">
          <input type="checkbox" checked={values.isActive} onChange={(event) => patch("isActive", event.target.checked)} />
          Active instrument
        </label>

        <label className="md:col-span-2">
          Notes
          <textarea rows={4} className={inputClass} value={values.notes} onChange={(event) => patch("notes", event.target.value)} />
        </label>

        <div className="flex justify-end gap-3 md:col-span-2">
          <button type="button" onClick={() => confirmDiscard() && navigate("/assets")} className="rounded-xl border border-slate-700 px-4 py-2 hover:bg-slate-800">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-60">
            {saving ? "Saving..." : "Create asset"}
          </button>
        </div>
      </form>
    </div>
  );
}
