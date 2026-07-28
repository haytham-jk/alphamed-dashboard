import { useEffect, useState } from "react";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import { ArrowLeft } from "lucide-react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import { getCustomerOptions } from "../services/customers";
import { getInstrumentsForCustomer } from "../services/assets";
import {
  getTrainingRecord,
  updateTrainingRecord,
} from "../services/training";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none";

export default function EditTrainingPage({ session }) {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [values, setValues] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const { confirmDiscard } = useUnsavedChanges(dirty);

  useEffect(() => {
    Promise.all([
      getCustomerOptions(),
      getTrainingRecord(trainingId),
    ])
      .then(async ([customerOptions, record]) => {
        setCustomers(customerOptions);

        const instrumentOptions = record.customer_id
          ? await getInstrumentsForCustomer(
              record.customer_id
            )
          : [];

        setInstruments(instrumentOptions);
        setValues({
          title: record.title || "",
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
          trainingDate: record.training_date || "",
          attendees: (record.attendees || []).join(", "),
          notes: record.notes || "",
        });
      })
      .catch((loadError) =>
        setError(loadError.message)
      );
  }, [trainingId]);

  function patch(field, value) {
    setDirty(true);
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function changeCustomer(customerId) {
    setDirty(true);
    patch("customerId", customerId);
    setInstruments(
      customerId
        ? await getInstrumentsForCustomer(customerId)
        : []
    );
    setValues((current) => ({
      ...current,
      customerId,
      instrumentId: "",
      instrumentName: "",
      serialNumber: "",
    }));
  }

  function changeInstrument(instrumentId) {
    setDirty(true);
    const selected = instruments.find(
      (item) => String(item.id) === instrumentId
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
      await updateTrainingRecord(
        trainingId,
        values,
        session.user.id
      );
      setDirty(false);
      navigate("/training", { state: { message: "Training record saved successfully." } });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  if (!values) {
    return (
      <div className="text-slate-400">
        Loading training record...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        to="/training"
        onClick={(event) => {
          if (!confirmDiscard()) event.preventDefault();
        }}
        className="inline-flex items-center gap-2 text-sm text-slate-400"
      >
        <ArrowLeft size={18} />
        Back to training
      </Link>

      <h1 className="text-3xl font-semibold">
        Edit training record
      </h1>

      {error && (
        <div className="text-red-300">{error}</div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2"
      >
        <label className="md:col-span-2">
          Training title
          <input
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
            className={inputClass}
            value={values.customerId}
            onChange={(event) =>
              changeCustomer(event.target.value)
            }
          >
            <option value="">Select customer</option>
            {customers.map((customer) => (
              <option
                key={customer.id}
                value={customer.id}
              >
                {customer.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Instrument
          <select
            className={inputClass}
            value={values.instrumentId}
            onChange={(event) =>
              changeInstrument(event.target.value)
            }
          >
            <option value="">Select instrument</option>
            {instruments.map((instrument) => (
              <option
                key={instrument.id}
                value={instrument.id}
              >
                {instrument.instrument_name}
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
          <input
            type="date"
            className={inputClass}
            value={values.trainingDate}
            onChange={(event) =>
              patch("trainingDate", event.target.value)
            }
          />
        </label>

        <label className="md:col-span-2">
          Staff trained
          <input
            className={inputClass}
            value={values.attendees}
            onChange={(event) =>
              patch("attendees", event.target.value)
            }
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

        <div className="flex justify-between gap-3 md:col-span-2">
          <Link
            to="/training"
            onClick={(event) => {
              if (!confirmDiscard()) event.preventDefault();
            }}
            className="rounded-xl border border-slate-700 px-4 py-2"
          >
            Back to training
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 px-4 py-2 font-medium"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
