import { useEffect, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import { getCustomerOptions } from "../services/customers";
import { deleteEqasOnlineRecord, getEqasOnlineRecord, updateEqasOnlineRecord } from "../services/eqasOnline";

const inputClass = "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30";

export default function EditEqasOnlinePage() {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [values, setValues] = useState({ customerId: "", labName: "", qcnetId: "", labNumber: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const { confirmDiscard } = useUnsavedChanges(dirty);

  useEffect(() => { Promise.all([getCustomerOptions(), getEqasOnlineRecord(recordId)]).then(([customerOptions, record]) => { setCustomers(customerOptions); setValues({ customerId: String(record.customer_id), labName: record.lab_name || "", qcnetId: record.qcnet_id || "", labNumber: record.lab_number || "" }); }).catch((loadError) => setError(loadError?.message || "Unable to load EQAS record.")).finally(() => setLoading(false)); }, [recordId]);

  function patch(field, value) { setDirty(true); setValues((current) => ({ ...current, [field]: value })); }

  async function submit(event) {
    event.preventDefault();
    if (!values.customerId) return setError("Select a customer.");
    if (!values.labName.trim()) return setError("Enter a Lab Name.");
    if (!values.qcnetId.trim()) return setError("Enter a QCnet ID.");
    if (!/^\d+$/.test(values.labNumber.trim())) return setError("Lab Number is required and must contain numbers only.");
    try {
      setSaving(true); setError("");
      await updateEqasOnlineRecord(recordId, values);
      setDirty(false);
      navigate("/eqas-online", { state: { message: "EQAS record updated successfully." } });
    } catch (saveError) { setError(saveError?.message || "Unable to save EQAS record."); }
    finally { setSaving(false); }
  }

  async function remove() { if (!window.confirm("Delete this EQAS record permanently?")) return; try { setDeleting(true); await deleteEqasOnlineRecord(recordId); setDirty(false); navigate("/eqas-online", { state: { message: "EQAS record deleted successfully." } }); } catch (deleteError) { setError(deleteError?.message || "Unable to delete EQAS record."); } finally { setDeleting(false); } }

  if (loading) return <div className="py-16 text-center text-slate-400">Loading form...</div>;

  return <div className="mx-auto max-w-3xl space-y-5">
    <Link to="/eqas-online" onClick={(event) => { if (!confirmDiscard()) event.preventDefault(); }} className="inline-flex items-center gap-2 text-slate-400"><ArrowLeft size={18} />Back to EQAS Online</Link>
    <header><p className="text-sm text-blue-400">Online quality assurance</p><h1 className="text-3xl font-semibold">Edit EQAS record</h1></header>
    {error && <div role="alert" className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">{error}</div>}
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2">
      <label className="md:col-span-2">Customer<select required value={values.customerId} onChange={(event) => patch("customerId", event.target.value)} className={inputClass}><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
      <label className="md:col-span-2">Lab Name<input required value={values.labName} onChange={(event) => patch("labName", event.target.value)} placeholder="Branch, laboratory, or instrument name" className={inputClass} /></label>
      <label>QCnet ID<input required value={values.qcnetId} onChange={(event) => patch("qcnetId", event.target.value)} placeholder="Email or QCnet account ID" className={inputClass} /><span className="mt-1 block text-xs text-slate-500">Duplicates are allowed.</span></label>
      <label>Lab Number<input required inputMode="numeric" pattern="[0-9]+" value={values.labNumber} onChange={(event) => patch("labNumber", event.target.value.replace(/\D/g, ""))} className={inputClass} /><span className="mt-1 block text-xs text-slate-500">Must be unique. Leading zeroes are preserved.</span></label>
      <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-800 pt-5 md:col-span-2 sm:flex-row"><button type="button" onClick={remove} disabled={deleting} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-800 px-4 py-2 text-red-300 disabled:opacity-60"><Trash2 size={17} />{deleting ? "Deleting..." : "Delete record"}</button><div className="flex justify-end gap-3"><button type="button" onClick={() => confirmDiscard() && navigate("/eqas-online")} className="rounded-xl border border-slate-700 px-4 py-2">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2 font-medium disabled:opacity-60">{saving ? "Saving..." : "Save changes"}</button></div></div>
    </form>
  </div>;
}
