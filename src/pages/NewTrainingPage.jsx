import { useEffect, useState } from "react";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import DatePickerInput from "../components/ui/DatePickerInput";
import { getCustomerOptions } from "../services/customers";
import { getInstrumentsForCustomer } from "../services/assets";
import { createTrainingRecord } from "../services/training";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30";

export default function NewTrainingPage({ session }) {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const { confirmDiscard } = useUnsavedChanges(dirty);
  const [values, setValues] = useState({
    title: "",
    customerId: "",
    instrumentId: "",
    instrumentName: "",
    serialNumber: "",
    trainingDate: "",
    attendees: "",
    notes: "",
  });

  useEffect(() => {
    getCustomerOptions()
      .then(setCustomers)
      .catch((loadError) => setError(loadError.message));
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

    if (!customerId) {
      setInstruments([]);
      return;
    }

    try {
      setInstruments(
        await getInstrumentsForCustomer(customerId)
      );
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  function handleInstrumentChange(instrumentId) {
    setDirty(true);
    const selected = instruments.find(
      (instrument) =>
        String(instrument.id) === String(instrumentId)
    );

    setValues((current) => ({
      ...current,
      instrumentId,
      instrumentName: selected?.instrument_name || "",
      serialNumber: selected?.serial_number || "",
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      await createTrainingRecord(values, session.user.id);
      setDirty(false);
      navigate("/training", { state: { message: "Training record saved successfully." } });
    } catch (saveError) {
      setError(
        saveError.message ||
          "Unable to create training record."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        to="/training"
        onClick={(event) => {
          if (!confirmDiscard()) event.preventDefault();
        }}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft size={18} />
        Back to training
      </Link>

      <div>
        <p className="text-sm text-blue-400">
          Customer development
        </p>
        <h1 className="text-3xl font-semibold">
          New training record
        </h1>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2"
      >
        <label className="md:col-span-2">
          Training title
          <input
            required
            className={inputClass}
            value={values.title}
            onChange={(event) =>
              patch("title", event.target.value)
            }
          />
        </label>

        <label>
          Customer
          <select
            required
            className={inputClass}
            value={values.customerId}
            onChange={(event) =>
              handleCustomerChange(event.target.value)
            }
          >
            <option value="">Select customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Installed instrument
          <select
            className={inputClass}
            value={values.instrumentId}
            disabled={!values.customerId}
            onChange={(event) =>
              handleInstrumentChange(event.target.value)
            }
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
          </select>
        </label>

        <label>
          Instrument model
          <input
            className={inputClass}
            value={values.instrumentName}
            onChange={(event) =>
              patch("instrumentName", event.target.value)
            }
          />
        </label>

        <label>
          Serial number
          <input
            className={inputClass}
            value={values.serialNumber}
            onChange={(event) =>
              patch("serialNumber", event.target.value)
            }
          />
        </label>

        <label>
          Training date
          <div className="mt-2">
            <DatePickerInput
              value={values.trainingDate}
              onChange={(event) =>
                patch("trainingDate", event.target.value)
              }
              required
              ariaLabel="Choose training date"
            />
          </div>
        </label>

        <label className="md:col-span-2">
          Staff trained
          <input
            className={inputClass}
            value={values.attendees}
            onChange={(event) =>
              patch("attendees", event.target.value)
            }
            placeholder="Enter names separated by commas"
          />
        </label>

        <label className="md:col-span-2">
          Notes
          <textarea
            rows={4}
            className={inputClass}
            value={values.notes}
            onChange={(event) =>
              patch("notes", event.target.value)
            }
          />
        </label>

        <div className="flex justify-end gap-3 md:col-span-2">
          <Link
            to="/training"
            onClick={(event) => {
              if (!confirmDiscard()) event.preventDefault();
            }}
            className="rounded-xl border border-slate-700 px-4 py-2"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 px-4 py-2 font-medium disabled:opacity-60"
          >
            {saving ? "Saving..." : "Create training record"}
          </button>
        </div>
      </form>
    </div>
  );
}
