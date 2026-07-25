import { useEffect, useState } from "react";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  createCustomer,
  getCustomer,
  updateCustomer,
} from "../services/customers";
import { deleteCustomer } from "../services/deletions";

const emirates = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
];

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2";

export default function CustomerFormPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(customerId);
  const [values, setValues] = useState({
    customerName: "",
    emirate: "",
    isActive: true,
  });
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const { confirmDiscard } = useUnsavedChanges(dirty);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!editing) return;

    getCustomer(customerId)
      .then((customer) =>
        setValues({
          customerName: customer.customer_name || "",
          emirate: customer.emirate || "",
          isActive: customer.is_active,
        })
      )
      .catch((loadError) =>
        setError(loadError.message)
      );
  }, [customerId, editing]);

  function patch(field, value) {
    setDirty(true);
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (editing) {
        await updateCustomer(customerId, values);
      } else {
        await createCustomer(values);
      }

      setDirty(false);
      navigate("/customers", { state: { message: "Customer saved successfully." } });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(
      "Delete this customer permanently? Linked records may prevent deletion until they are reassigned."
    )) {
      return;
    }

    try {
      setDeleting(true);
      setError("");
      await deleteCustomer(customerId);
      setDirty(false);
      navigate("/customers", { state: { message: "Customer saved successfully." } });
    } catch (deleteError) {
      setError(
        deleteError.message || "Unable to delete customer."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        to="/customers"
        className="inline-flex items-center gap-2 text-slate-400"
      >
        <ArrowLeft size={18} />
        Back to customers
      </Link>

      <h1 className="text-3xl font-semibold">
        {editing ? "Edit customer" : "New customer"}
      </h1>

      {error && (
        <div className="text-red-300">{error}</div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5"
      >
        <label className="block">
          Customer name
          <input
            required
            className={inputClass}
            value={values.customerName}
            onChange={(event) =>
              patch("customerName", event.target.value)
            }
          />
        </label>

        <label className="block">
          Emirate
          <select
            className={inputClass}
            value={values.emirate}
            onChange={(event) =>
              patch("emirate", event.target.value)
            }
          >
            <option value="">Select Emirate</option>
            {emirates.map((emirate) => (
              <option key={emirate}>{emirate}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(event) =>
              patch("isActive", event.target.checked)
            }
          />
          Active customer
        </label>

        <div className="flex flex-col-reverse justify-between gap-3 pt-3 sm:flex-row">
          {editing ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-800 px-4 py-2 text-red-300 hover:bg-red-950"
            >
              <Trash2 size={17} />
              {deleting ? "Deleting..." : "Delete customer"}
            </button>
          ) : (
            <Link
              to="/customers"
              className="rounded-xl border border-slate-700 px-4 py-2 text-center"
            >
              Back to customers
            </Link>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 px-4 py-2 font-medium"
          >
            {saving ? "Saving..." : "Save customer"}
          </button>
        </div>
      </form>
    </div>
  );
}
