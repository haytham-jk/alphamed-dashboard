import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import DatePickerInput from "../components/ui/DatePickerInput";
import { getCustomerOptions } from "../services/customers";
import {
  createUnityRtInstallation,
  getLatestUnityRtServicePack,
} from "../services/unityRealTime";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30";

const initialValues = {
  customerId: "",
  primaryId: "",
  unityRtExpiryDate: "",
  servicePack: "",
  connectivityType: "None",
  connectivityExpiryDate: "",
  installationNotes: "",
};

export default function NewUnityRealTimePage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [latestSp, setLatestSp] = useState("SP11");
  const [values, setValues] = useState(initialValues);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const { confirmDiscard } = useUnsavedChanges(dirty);

  useEffect(() => {
    Promise.all([
      getCustomerOptions(),
      getLatestUnityRtServicePack(),
    ])
      .then(([customerOptions, latestServicePack]) => {
        setCustomers(customerOptions);
        setLatestSp(latestServicePack);
      })
      .catch((loadError) =>
        setError(loadError?.message || "Unable to load form options.")
      )
      .finally(() => setLoading(false));
  }, []);

  function patch(field, value) {
    setDirty(true);
    setValues((current) => ({
      ...current,
      [field]: value,
      ...(field === "connectivityType" && value === "None"
        ? { connectivityExpiryDate: "" }
        : {}),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!values.customerId) {
      setError("Select a customer.");
      return;
    }

    if (!/^\d+$/.test(values.primaryId.trim())) {
      setError("Primary ID is required and must contain numbers only.");
      return;
    }

    if (
      values.connectivityType !== "None" &&
      !values.connectivityExpiryDate
    ) {
      setError("Enter the Unity Connect expiry date.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await createUnityRtInstallation(values);
      setDirty(false);
      navigate("/unity-real-time", {
        state: {
          message: "Unity Real Time installation saved successfully.",
        },
      });
    } catch (saveError) {
      setError(saveError?.message || "Unable to save installation.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400" role="status">
        Loading installation...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        to="/unity-real-time"
        onClick={(event) => {
          if (!confirmDiscard()) event.preventDefault();
        }}
        className="-ml-2 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Back to Unity Real Time
      </Link>

      <header>
        <p className="text-sm text-blue-400">Software licenses</p>
        <h1 className="text-3xl font-semibold">
          New Unity Real Time installation
        </h1>
        <p className="mt-2 text-slate-400">
          Latest service pack: {latestSp}
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
        className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2"
      >
        <label>
          Customer
          <select
            required
            className={inputClass}
            value={values.customerId}
            onChange={(event) => patch("customerId", event.target.value)}
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
          Primary ID
          <input
            required
            inputMode="numeric"
            pattern="[0-9]+"
            className={inputClass}
            value={values.primaryId}
            onChange={(event) =>
              patch("primaryId", event.target.value.replace(/\D/g, ""))
            }
          />
          <span className="mt-1 block text-xs text-slate-500">
            Primary ID must be unique.
          </span>
        </label>

        <label>
          Unity RT license expiry
          <div className="mt-2">
            <DatePickerInput
              value={values.unityRtExpiryDate}
              onChange={(event) =>
                patch("unityRtExpiryDate", event.target.value)
              }
              ariaLabel="Choose Unity RT expiry date"
            />
          </div>
        </label>

        <label>
          Current service pack
          <input
            placeholder="Example: SP11"
            className={inputClass}
            value={values.servicePack}
            onChange={(event) =>
              patch("servicePack", event.target.value.toUpperCase())
            }
          />
        </label>

        <label>
          Connectivity solution
          <select
            className={inputClass}
            value={values.connectivityType}
            onChange={(event) =>
              patch("connectivityType", event.target.value)
            }
          >
            <option value="None">No connectivity</option>
            <option value="UnityConnect 1">UnityConnect 1 (UC1)</option>
            <option value="UnityConnect 2">UnityConnect 2 (UC2)</option>
          </select>
        </label>

        {values.connectivityType !== "None" && (
          <label>
            Unity Connect expiry date
            <div className="mt-2">
              <DatePickerInput
                required
                value={values.connectivityExpiryDate}
                onChange={(event) =>
                  patch("connectivityExpiryDate", event.target.value)
                }
                ariaLabel="Choose Unity Connect expiry date"
              />
            </div>
          </label>
        )}

        <label className="md:col-span-2">
          Notes
          <textarea
            rows={5}
            className={inputClass}
            value={values.installationNotes}
            onChange={(event) =>
              patch("installationNotes", event.target.value)
            }
          />
        </label>

        <div className="flex justify-end gap-3 border-t border-slate-800 pt-5 md:col-span-2">
          <button
            type="button"
            onClick={() =>
              confirmDiscard() && navigate("/unity-real-time")
            }
            className="rounded-xl border border-slate-700 px-4 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 px-4 py-2 font-medium disabled:opacity-60"
          >
            {saving ? "Saving..." : "Create installation"}
          </button>
        </div>
      </form>
    </div>
  );
}
