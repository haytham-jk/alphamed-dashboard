import { handleInvalidCapture, focusFirstInvalidField } from "../utils/formFocus";
import SelectInput from "../components/ui/SelectInput";
import { useEffect, useRef, useState } from "react";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createCustomer, findSimilarCustomers, getCustomer, updateCustomer } from "../services/customers";
import { deleteCustomer } from "../services/deletions";
import { contactsShareIdentity, normalizeCustomerContact } from "../utils/customerDuplicates";
import { EMIRATES } from "../constants/locationOptions";
const DESIGNATIONS = ["Lab Director", "Lab Manager", "Lab Supervisor", "Lab Technician", "Pathologist", "Quality Supervisor"];
const inputClass = "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2";
const emptyContact = () => ({ key: crypto.randomUUID(), name: "", designation: "Lab Manager", phoneNumber: "", email: "" });
const initialValues = { expectedUpdatedAt: "", customerName: "", emirate: "", isActive: true, isIsoEiacAccredited: false, isoEiacAccreditationNumber: "", isCapAccredited: false, contacts: [] };
export default function CustomerFormPage() {
  const { customerId } = useParams(); const navigate = useNavigate(); const editing = Boolean(customerId); const formRef = useRef(null);
  const [values, setValues] = useState(initialValues); const [contactDraft, setContactDraft] = useState(null); const [editingContactKey, setEditingContactKey] = useState(""); const [similar, setSimilar] = useState([]); const [error, setError] = useState(""); const [dirty, setDirty] = useState(false); const [saving, setSaving] = useState(false); const [deleting, setDeleting] = useState(false); const { confirmDiscard } = useUnsavedChanges(dirty);
  useEffect(() => { if (!editing) return; getCustomer(customerId).then((customer) => setValues({ expectedUpdatedAt: customer.updated_at || "", customerName: customer.customer_name || "", emirate: customer.emirate || "", isActive: customer.is_active, isIsoEiacAccredited: Boolean(customer.is_iso_eiac_accredited), isoEiacAccreditationNumber: customer.iso_eiac_accreditation_number || "", isCapAccredited: Boolean(customer.is_cap_accredited), contacts: (customer.customer_contacts ?? []).map((contact) => ({ key: String(contact.id), name: contact.name, designation: contact.designation, phoneNumber: contact.phone_number || "", email: contact.email || "" })) })).catch((loadError) => setError(loadError.message)); }, [customerId, editing]);
  function patch(field, value) { setDirty(true); if (field === "customerName" || field === "emirate") setSimilar([]); setValues((current) => ({ ...current, [field]: value })); }
  function openNewContact() { setEditingContactKey(""); setContactDraft(emptyContact()); setError(""); requestAnimationFrame(() => document.querySelector('[name="draftContactName"]')?.focus()); }
  function openEditContact(contact) { setEditingContactKey(contact.key); setContactDraft({ ...contact }); setError(""); requestAnimationFrame(() => document.querySelector('[name="draftContactName"]')?.focus()); }
  function cancelContact() { setContactDraft(null); setEditingContactKey(""); }
  function commitContact() {
    const name = contactDraft?.name.trim(); const designation = contactDraft?.designation;
    if (!name || !designation) { setError("Contact name and designation are required."); focusFirstInvalidField(formRef.current, !name ? '[name="draftContactName"]' : '[name="draftContactDesignation"]'); return; }
    const candidate = normalizeCustomerContact({ ...contactDraft, name, designation });
    if (values.contacts.some((contact) => contact.key !== editingContactKey && contactsShareIdentity(contact, candidate))) { setError("A contact with the same email or phone number is already listed."); focusFirstInvalidField(formRef.current, candidate.email ? '[name="draftContactEmail"]' : '[name="draftContactPhone"]'); return; }
    patch("contacts", editingContactKey ? values.contacts.map((contact) => contact.key === editingContactKey ? candidate : contact) : [...values.contacts, candidate]); cancelContact();
  }
  function removeContact(key) { patch("contacts", values.contacts.filter((contact) => contact.key !== key)); if (editingContactKey === key) cancelContact(); }
  function validate() {
    if (values.isIsoEiacAccredited && !values.isoEiacAccreditationNumber.trim()) { setError("Enter the ISO/EIAC accreditation number."); focusFirstInvalidField(formRef.current, '[name="isoEiacNumber"]'); return false; }
    if (contactDraft) { setError("Add or cancel the open contact before saving the customer."); focusFirstInvalidField(formRef.current, '[name="draftContactName"]'); return false; }
    return true;
  }
  async function persist(allowSimilarOverride = false, candidates = similar) {
    try { setSaving(true); setError(""); if (editing) await updateCustomer(customerId, values, { allowSimilarOverride, similarCandidates: candidates }); else await createCustomer(values, { allowSimilarOverride, similarCandidates: candidates }); setDirty(false); navigate("/customers", { state: { message: "Customer saved successfully." } }); }
    catch (saveError) { setError(saveError.message || "Unable to save customer."); }
    finally { setSaving(false); }
  }
  async function handleSubmit(event) {
    event.preventDefault();
    if (saving || !validate()) return;
    if (editing) {
      await persist(false, []);
      return;
    }
    try {
      setSaving(true);
      setError("");
      const matches = await findSimilarCustomers(values.customerName, values.emirate, null);
      if (matches.length) {
        setSimilar(matches);
        setSaving(false);
        return;
      }
      await persist(false, []);
    } catch (saveError) {
      setError(saveError.message || "Unable to check or save this customer.");
      setSaving(false);
    }
  }
  async function handleDelete() { if (deleting || !window.confirm("Delete this customer permanently? Linked records may prevent deletion until they are reassigned.")) return; try { setDeleting(true); setError(""); await deleteCustomer(customerId); setDirty(false); navigate("/customers", { state: { message: "Customer deleted successfully." } }); } catch (deleteError) { setError(deleteError.message || "Unable to delete customer."); } finally { setDeleting(false); } }
  return <div className="mx-auto max-w-4xl space-y-5">
    <Link to="/customers" onClick={(event) => { if (!confirmDiscard()) event.preventDefault(); }} className="-ml-2 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-400 hover:text-white"><ArrowLeft size={18}/>Back to customers</Link><h1 className="text-3xl font-semibold">{editing ? "Edit customer" : "New customer"}</h1>{error && <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300" role="alert">{error}</div>}
    <form ref={formRef} onSubmit={handleSubmit} onInvalidCapture={handleInvalidCapture} className="space-y-5">
      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5"><label className="block">Customer name<input required className={inputClass} value={values.customerName} onChange={(event) => patch("customerName", event.target.value)}/></label><label className="block">Emirate<SelectInput className={inputClass} value={values.emirate} onChange={(event) => patch("emirate", event.target.value)}><option value="">Select Emirate</option>{EMIRATES.map((emirate) => <option key={emirate}>{emirate}</option>)}</SelectInput></label><label className="flex items-center gap-2"><input type="checkbox" checked={values.isActive} onChange={(event) => patch("isActive", event.target.checked)}/>Active customer</label></section>
      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5"><div><h2 className="text-xl font-semibold">Accreditation</h2><p className="text-sm text-slate-400">Select all accreditations held by this laboratory.</p></div><div className="flex flex-wrap gap-5"><label className="flex items-center gap-2"><input type="checkbox" checked={values.isIsoEiacAccredited} onChange={(event) => { patch("isIsoEiacAccredited", event.target.checked); if (!event.target.checked) patch("isoEiacAccreditationNumber", ""); }}/>ISO/EIAC</label><label className="flex items-center gap-2"><input type="checkbox" checked={values.isCapAccredited} onChange={(event) => patch("isCapAccredited", event.target.checked)}/>CAP</label></div>{values.isIsoEiacAccredited && <label className="block">ISO/EIAC accreditation number<input required name="isoEiacNumber" className={inputClass} value={values.isoEiacAccreditationNumber} onChange={(event) => patch("isoEiacAccreditationNumber", event.target.value)}/></label>}</section>
      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Customer contacts</h2><p className="text-sm text-slate-400">Add contacts as cards, then save the customer once.</p></div>{!contactDraft && <button type="button" onClick={openNewContact} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm"><Plus size={16}/>Add contact</button>}</div>
        {contactDraft && <div className="rounded-xl border border-blue-800 bg-blue-950/20 p-4"><h3 className="font-medium">{editingContactKey ? "Edit contact" : "New contact"}</h3><div className="mt-3 grid gap-4 md:grid-cols-2"><label>Name<input required name="draftContactName" className={inputClass} value={contactDraft.name} onChange={(event) => setContactDraft((current) => ({ ...current, name: event.target.value }))}/></label><label>Designation<SelectInput required name="draftContactDesignation" className={inputClass} value={contactDraft.designation} onChange={(event) => setContactDraft((current) => ({ ...current, designation: event.target.value }))}>{DESIGNATIONS.map((designation) => <option key={designation}>{designation}</option>)}</SelectInput></label><label>Number<input name="draftContactPhone" type="tel" className={inputClass} value={contactDraft.phoneNumber} onChange={(event) => setContactDraft((current) => ({ ...current, phoneNumber: event.target.value }))}/></label><label>Email<input name="draftContactEmail" type="email" className={inputClass} value={contactDraft.email} onChange={(event) => setContactDraft((current) => ({ ...current, email: event.target.value }))}/></label></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={cancelContact} className="rounded-xl border border-slate-700 px-4 py-2">Cancel</button><button type="button" onClick={commitContact} className="rounded-xl bg-blue-600 px-4 py-2">{editingContactKey ? "Update" : "Add"}</button></div></div>}
        <div className="grid gap-3 md:grid-cols-2">{values.contacts.map((contact) => <article key={contact.key} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{contact.name}</h3><p className="text-sm text-blue-300">{contact.designation}</p></div><div className="flex gap-2"><button type="button" onClick={() => openEditContact(contact)} className="rounded-lg border border-slate-700 p-2" aria-label={`Edit ${contact.name}`}><Pencil size={16}/></button><button type="button" onClick={() => removeContact(contact.key)} className="rounded-lg border border-red-900 p-2 text-red-300" aria-label={`Remove ${contact.name}`}><Trash2 size={16}/></button></div></div>{contact.phoneNumber && <p className="mt-3 text-sm text-slate-300">{contact.phoneNumber}</p>}{contact.email && <p className="mt-1 break-all text-sm text-slate-400">{contact.email}</p>}</article>)}</div>{!values.contacts.length && !contactDraft && <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-400">No contacts added.</div>}</section>
      <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">{editing ? <button type="button" onClick={handleDelete} disabled={deleting} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-800 px-4 py-2 text-red-300"><Trash2 size={17}/>{deleting ? "Deleting..." : "Delete customer"}</button> : <Link to="/customers" onClick={(event) => { if (!confirmDiscard()) event.preventDefault(); }} className="rounded-xl border border-slate-700 px-4 py-2 text-center">Back to customers</Link>}<button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2 font-medium disabled:opacity-60">{saving ? "Saving..." : "Save customer"}</button></div>
    </form>
    {similar.length > 0 && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-2xl rounded-2xl border border-amber-700 bg-slate-900 p-6"><h2 className="text-xl font-semibold text-amber-200">A similar customer may already exist</h2><p className="mt-2 text-slate-400">Review the records below before creating another laboratory.</p><div className="mt-4 max-h-80 space-y-3 overflow-y-auto">{similar.map((candidate) => <article key={candidate.customer_id} className="rounded-xl border border-slate-700 bg-slate-950 p-4"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{candidate.customer_name}</h3><p className="text-sm text-slate-400">{candidate.emirate || "Emirate not recorded"}</p><p className="mt-2 text-sm text-amber-300">{candidate.match_reason}</p></div><Link target="_blank" to={`/customers/${candidate.customer_id}/overview`} className="self-start rounded-lg border border-blue-800 px-3 py-2 text-sm text-blue-300">View existing</Link></div></article>)}</div><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setSimilar([])} className="rounded-xl border border-slate-700 px-4 py-2">Go back and edit</button><button type="button" disabled={saving} onClick={() => persist(true, similar)} className="rounded-xl bg-amber-600 px-4 py-2 font-medium text-black">Create customer anyway</button></div></div></div>}
  </div>;
}
