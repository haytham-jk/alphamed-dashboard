import { useEffect, useMemo, useState } from "react";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DatePickerInput from "../components/ui/DatePickerInput";
import { getCustomerOptions } from "../services/customers";
import { getAsset, updateAsset } from "../services/assets";
import { deleteAsset } from "../services/deletions";
import { INSTRUMENT_TYPES } from "../constants/instrumentOptions";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30";

export default function EditAssetPage() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [values, setValues] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const { confirmDiscard } = useUnsavedChanges(dirty);

  useEffect(() => {
    Promise.all([getCustomerOptions(), getAsset(assetId)])
      .then(([customerOptions, asset]) => {
        setCustomers(customerOptions);
        const knownType = INSTRUMENT_TYPES.includes(asset.instrument_name);
        setValues({
          customerId: String(asset.customer_id || ""),
          instrumentType: knownType ? asset.instrument_name : "Other",
          customInstrumentName: knownType ? "" : asset.instrument_name || "",
          serialNumber: asset.serial_number || "",
          installationDate: asset.installation_date || "",
          isActive: asset.is_active,
          notes: asset.notes || "",
        });
      })
      .catch((loadError) => setError(loadError.message));
  }, [assetId]);

  const instrumentName = useMemo(() => {
    if (!values) return "";
    return values.instrumentType === "Other"
      ? values.customInstrumentName
      : values.instrumentType;
  }, [values]);

  function patch(field, value) {
    setDirty(true);
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    try {
      setSaving(true);
      setError("");
      await updateAsset(assetId, {
        ...values,
        instrumentName,
      });
      setDirty(false);
      navigate("/assets", {
        state: { message: "Asset saved successfully." },
      });
    } catch (saveError) {
      setError(saveError.message || "Unable to update asset.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      deleting ||
      !window.confirm(
        "Delete this asset permanently? Existing training and linearity records may retain snapshot information but lose the asset link."
      )
    ) {
      return;
    }

    try {
      setDeleting(true);
      setError("");
      await deleteAsset(assetId);
      setDirty(false);
      navigate("/assets", {
        state: { message: "Asset deleted successfully." },
      });
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete asset.");
    } finally {
      setDeleting(false);
    }
  }

  if (!values) {
    return <div className="text-slate-400">Loading asset...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        to="/assets"
        onClick={(event) => {
          if (!confirmDiscard()) event.preventDefault();
        }}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft size={18} />
        Back to assets
      </Link>

      <div>
        <p className="text-sm text-blue-400">Installed base</p>
        <h1 className="text-3xl font-semibold">Edit asset</h1>
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
          Customer
          <select
            className={inputClass}
            value={values.customerId}
            onChange={(event) => patch("customerId", event.target.value)}
          >
            <option value="">Unused or unassigned</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Instrument type
          <select
            required
            className={inputClass}
            value={values.instrumentType}
            onChange={(event) => patch("instrumentType", event.target.value)}
          >
            {INSTRUMENT_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>

        {values.instrumentType === "Other" && (
          <label>
            Custom instrument type
            <input
              required
              className={inputClass}
              value={values.customInstrumentName}
              onChange={(event) =>
                patch("customInstrumentName", event.target.value)
              }
            />
          </label>
        )}

        <label>
          Serial number
          <input
            className={inputClass}
            value={values.serialNumber}
            onChange={(event) => patch("serialNumber", event.target.value)}
          />
        </label>

        <label>
          Installation date
          <div className="mt-2">
            <DatePickerInput
              value={values.installationDate}
              onChange={(event) =>
                patch("installationDate", event.target.value)
              }
              ariaLabel="Choose installation date"
            />
          </div>
        </label>

        <label className="flex items-center gap-2 md:col-span-2">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(event) => patch("isActive", event.target.checked)}
          />
          Active instrument
        </label>

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
            <Trash2 size={17} />
            {deleting ? "Deleting..." : "Delete asset"}
          </button>

          <div className="flex justify-end gap-3">
            <Link
              to="/assets"
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
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
