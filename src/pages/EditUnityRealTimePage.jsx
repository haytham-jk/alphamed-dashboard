import SelectInput from "../components/ui/SelectInput";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import DatePickerInput from "../components/ui/DatePickerInput";
import { getCustomerOptions } from "../services/customers";
import {
  deleteUnityRtInstallation,
  getLatestUnityRtServicePack,
  getUnityRtInstallation,
  updateUnityRtInstallation,
} from "../services/unityRealTime";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30";

export default function EditUnityRealTimePage() {
  const { installationId } = useParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [latestSp, setLatestSp] = useState("SP11");
  const [values, setValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const { confirmDiscard } = useUnsavedChanges(dirty);

  useEffect(() => {
    Promise.all([
      getCustomerOptions(),
      getLatestUnityRtServicePack(),
      getUnityRtInstallation(installationId),
    ])
      .then(([customerOptions, latestServicePack, record]) => {
        setCustomers(customerOptions);
        setLatestSp(latestServicePack);

        const combinedNotes = [
          record.installation_notes,
          record.renewal_notes,
        ]
          .filter(Boolean)
          .join("\n\n");

        setValues({
          customerId: String(record.customer_id || ""),
          primaryId: record.primary_id || "",
          unityRtExpiryDate: record.unity_rt_expiry_date || "",
          servicePack: record.service_pack || "",
          connectivityType: record.connectivity_type || "None",
          connectivityExpiryDate: record.connectivity_expiry_date || "",
          installationNotes: combinedNotes,
          renewalNotes: "",

          // Preserve removed legacy fields when an existing record is edited.
          installationName: record.installation_name || "",
          adminUsername: record.admin_username || "",
          credentialReference: record.credential_reference || "",
          credentialsVerifiedDate:
            record.credentials_verified_date || "",
        });
      })
      .catch((loadError) =>
        setError(loadError?.message || "Unable to load installation.")
      )
      .finally(() => setLoading(false));
  }, [installationId]);

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
      await updateUnityRtInstallation(installationId, values);
      setDirty(false);
      navigate("/unity-real-time", {
        state: {
          message: "Unity Real Time installation saved successfully.",
        },
      });
    } catch (saveError) {
      setError(saveError?.message || "Unable to update installation.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        "Delete this Unity Real Time installation permanently?"
      )
    ) {
      return;
    }

    try {
      setDeleting(true);
      setError("");
      await deleteUnityRtInstallation(installationId);
      setDirty(false);
      navigate("/unity-real-time", {
        state: {
          message: "Unity Real Time installation deleted successfully.",
        },
      });
    } catch (deleteError) {
      setError(deleteError?.message || "Unable to delete installation.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400" role="status">
        Loading installation...
      </div>
    );
  }

  if (!values) {
    return (
      <div className="text-red-300" role="alert">
        {error || "Installation not found."}
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
        className="inline-flex items-center gap-2 text-slate-400"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Back to Unity Real Time
      </Link>

      <header>
        <p className="text-sm text-blue-400">Software licenses</p>
        <h1 className="text-3xl font-semibold">
          Edit Unity Real Time installation
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
          <SelectInput
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
          </SelectInput>
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
          <SelectInput
            className={inputClass}
            value={values.connectivityType}
            onChange={(event) =>
              patch("connectivityType", event.target.value)
            }
          >
            <option value="None">No connectivity</option>
            <option value="UnityConnect 1">UnityConnect 1 (UC1)</option>
            <option value="UnityConnect 2">UnityConnect 2 (UC2)</option>
          </SelectInput>
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

        <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-800 pt-5 md:col-span-2 sm:flex-row">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-800 px-4 py-2 text-red-300 hover:bg-red-950 disabled:opacity-60"
          >
            <Trash2 size={17} aria-hidden="true" />
            {deleting ? "Deleting..." : "Delete installation"}
          </button>

          <div className="flex justify-end gap-3">
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
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
