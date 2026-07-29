import { useEffect, useState } from "react";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createCustomer, getCustomer, updateCustomer } from "../services/customers";
import { deleteCustomer } from "../services/deletions";
import { EMIRATES } from "../constants/locationOptions";

const DESIGNATIONS = ["Lab Director", "Lab Manager", "Lab Supervisor", "Lab Technician", "Quality Supervisor"];
const inputClass = "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2";
const emptyContact = () => ({ key: crypto.randomUUID(), name: "", designation: "Lab Manager", phoneNumber: "", email: "" });

export default function CustomerFormPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(customerId);
  const [values, setValues] = useState({ customerName: "", emirate: "", isActive: true, contacts: [] });
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { confirmDiscard } = useUnsavedChanges(dirty);

  useEffect(() => {
    if (!editing) return;
    getCustomer(customerId).then((customer) => setValues({
      customerName: customer.customer_name || "",
      emirate: customer.emirate || "",
      isActive: customer.is_active,
      contacts: (customer.customer_contacts ?? []).map((contact) => ({ key: String(contact.id), name: contact.name, designation: contact.designation, phoneNumber: contact.phone_number || "", email: contact.email || "" })),
    })).catch((loadError) => setError(loadError.message));
  }, [customerId, editing]);

  function patch(field, value) { setDirty(true); setValues((current) => ({ ...current, [field]: value })); }
  function addContact() { patch("contacts", [...values.contacts, emptyContact()]); }
  function updateContact(key, field, value) { patch("contacts", values.contacts.map((contact) => contact.key === key ? { ...contact, [field]: value } : contact)); }
  function removeContact(key) { patch("contacts", values.contacts.filter((contact) => contact.key !== key)); }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    const incomplete = values.contacts.find((contact) => !contact.name.trim() || !contact.designation);
    if (incomplete) { setError("Every contact requires a name and designation."); return; }
    try {
      setSaving(true); setError("");
      if (editing) await updateCustomer(customerId, values); else await createCustomer(values);
      setDirty(false);
      navigate("/customers", { state: { message: "Customer saved successfully." } });
    } catch (saveError) { setError(saveError.message || "Unable to save customer."); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (deleting || !window.confirm("Delete this customer permanently? Linked records may prevent deletion until they are reassigned.")) return;
    try { setDeleting(true); setError(""); await deleteCustomer(customerId); setDirty(false); navigate("/customers", { state: { message: "Customer deleted successfully." } }); }
    catch (deleteError) { setError(deleteError.message || "Unable to delete customer."); }
    finally { setDeleting(false); }
  }

  return <div className="mx-auto max-w-4xl space-y-5">
    <Link to="/customers" onClick={(event) => { if (!confirmDiscard()) event.preventDefault(); }} className="inline-flex items-center gap-2 text-slate-400"><ArrowLeft size={18} />Back to customers</Link>
    <h1 className="text-3xl font-semibold">{editing ? "Edit customer" : "New customer"}</h1>
    {error && <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">{error}</div>}
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <label className="block">Customer name<input required className={inputClass} value={values.customerName} onChange={(event) => patch("customerName", event.target.value)} /></label>
        <label className="block">Emirate<select className={inputClass} value={values.emirate} onChange={(event) => patch("emirate", event.target.value)}><option value="">Select Emirate</option>{EMIRATES.map((emirate) => <option key={emirate}>{emirate}</option>)}</select></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={values.isActive} onChange={(event) => patch("isActive", event.target.checked)} />Active customer</label>
      </section>
      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold">Customer contacts</h2><p className="text-sm text-slate-400">Add laboratory contacts for this customer.</p></div><button type="button" onClick={addContact} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm"><Plus size={16} />Add contact</button></div>
        {values.contacts.map((contact, index) => <article key={contact.key} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="mb-3 flex justify-between"><h3 className="font-medium">Contact {index + 1}</h3><button type="button" onClick={() => removeContact(contact.key)} className="text-red-300" aria-label={`Remove contact ${index + 1}`}><Trash2 size={18} /></button></div><div className="grid gap-4 md:grid-cols-2"><label>Name<input required className={inputClass} value={contact.name} onChange={(event) => updateContact(contact.key, "name", event.target.value)} /></label><label>Designation<select required className={inputClass} value={contact.designation} onChange={(event) => updateContact(contact.key, "designation", event.target.value)}>{DESIGNATIONS.map((designation) => <option key={designation}>{designation}</option>)}</select></label><label>Number<input type="tel" className={inputClass} value={contact.phoneNumber} onChange={(event) => updateContact(contact.key, "phoneNumber", event.target.value)} /></label><label>Email<input type="email" className={inputClass} value={contact.email} onChange={(event) => updateContact(contact.key, "email", event.target.value)} /></label></div></article>)}
        {!values.contacts.length && <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-400">No contacts added.</div>}
      </section>
      <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">{editing ? <button type="button" onClick={handleDelete} disabled={deleting} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-800 px-4 py-2 text-red-300"><Trash2 size={17} />{deleting ? "Deleting..." : "Delete customer"}</button> : <Link to="/customers" onClick={(event) => { if (!confirmDiscard()) event.preventDefault(); }} className="rounded-xl border border-slate-700 px-4 py-2 text-center">Back to customers</Link>}<button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2 font-medium disabled:opacity-60">{saving ? "Saving..." : "Save customer"}</button></div>
    </form>
  </div>;
}
