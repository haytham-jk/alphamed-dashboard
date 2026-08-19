import { handleInvalidCapture, focusFirstInvalidField } from "../utils/formFocus";
import SelectInput from "../components/ui/SelectInput";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Boxes,
  Check,
  Copy,
  ExternalLink,
  FlaskConical,
  Plus,
  Server,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import {
  addCustomerContact,
  findSimilarCustomerContacts,
  getCustomerSiteOverview,
} from "../services/customers";
import { contactFingerprint } from "../utils/customerDuplicates";
import { formatDateOnly } from "../utils/dateDisplay";

const DESIGNATIONS = [
  "Lab Director",
  "Lab Manager",
  "Lab Supervisor",
  "Lab Technician",
  "Pathologist",
  "Quality Supervisor",
];

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-blue-400";

function emptyContact() {
  return {
    name: "",
    designation: "Lab Manager",
    phoneNumber: "",
    email: "",
  };
}

export default function CustomerSiteOverviewPage({ canEdit }) {
  const { customerId } = useParams();
  const location = useLocation();
  const customersReturnTo = location.state?.customersReturnTo || "/customers";
  const customersReturnState = { focusCustomerId: Number(customerId) };
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedEmail, setCopiedEmail] = useState("");
  const [contactDraft, setContactDraft] = useState(emptyContact);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState("");
  const [duplicateCandidates, setDuplicateCandidates] = useState([]);
  const copyTimerRef = useRef(null);
  const contactFormRef = useRef(null);
  const contactNameRef = useRef(null);

  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setRecord(await getCustomerSiteOverview(customerId));
    } catch (loadError) {
      setError(
        loadError?.message || "Unable to load customer site overview."
      );
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadOverview();
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, [loadOverview]);

  useEffect(() => {
    if (!contactModalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => contactNameRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [contactModalOpen]);

  async function copyEmail(email) {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopiedEmail(""), 1800);
    } catch {
      setError("Unable to copy the email address.");
    }
  }

  function openContactModal() {
    setContactDraft(emptyContact());
    setDuplicateCandidates([]);
    setContactError("");
    setContactModalOpen(true);
  }

  function closeContactModal() {
    if (contactSaving) return;
    setContactModalOpen(false);
    setDuplicateCandidates([]);
    setContactError("");
  }

  function patchContact(field, value) {
    setContactDraft((current) => ({ ...current, [field]: value }));
    setDuplicateCandidates([]);
    setContactError("");
  }

  function validateContact() {
    const name = contactDraft.name.trim();
    const designation = contactDraft.designation;
    if (!name) {
      setContactError("Contact name is required.");
      focusFirstInvalidField(contactFormRef.current, '[name="contactName"]');
      return null;
    }
    if (!DESIGNATIONS.includes(designation)) {
      setContactError("Select a valid contact designation.");
      focusFirstInvalidField(
        contactFormRef.current,
        '[name="contactDesignation"]'
      );
      return null;
    }
    const candidate = {
      name,
      designation,
      phoneNumber: contactDraft.phoneNumber.trim(),
      email: contactDraft.email.trim().toLowerCase(),
    };
    const fingerprint = contactFingerprint(candidate);
    const existingDuplicate = record?.customer?.customer_contacts?.find(
      (contact) =>
        fingerprint &&
        contactFingerprint({
          email: contact.email,
          phoneNumber: contact.phone_number,
        }) === fingerprint
    );
    if (existingDuplicate) {
      setContactError(
        `${existingDuplicate.name} already uses the same email or phone number for this customer.`
      );
      focusFirstInvalidField(
        contactFormRef.current,
        candidate.email ? '[name="contactEmail"]' : '[name="contactPhone"]'
      );
      return null;
    }
    return candidate;
  }

  async function saveContact({ override = false } = {}) {
    const candidate = validateContact();
    if (!candidate || contactSaving) return;
    try {
      setContactSaving(true);
      setContactError("");
      let matches = duplicateCandidates;
      if (!override) {
        matches = await findSimilarCustomerContacts(customerId, candidate);
        if (matches.length) {
          setDuplicateCandidates(matches);
          return;
        }
      }
      await addCustomerContact(customerId, candidate, {
        allowDuplicateOverride: override,
        duplicateCandidates: matches,
      });
      await loadOverview();
      setContactModalOpen(false);
      setDuplicateCandidates([]);
      setContactDraft(emptyContact());
    } catch (saveError) {
      setContactError(saveError?.message || "Unable to add the contact.");
    } finally {
      setContactSaving(false);
    }
  }

  if (loading && !record) {
    return <div className="text-slate-400">Loading customer site overview...</div>;
  }
  if (error && !record) {
    return (
      <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">
        {error}
      </div>
    );
  }

  const { customer, instruments, unity, eqas } = record;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Link
        to={customersReturnTo}
        state={customersReturnState}
        className="inline-flex items-center gap-2 text-sm text-slate-400"
      >
        <ArrowLeft size={18} />
        Back to customers
      </Link>

      <header className="rounded-2xl border border-slate-800 bg-gradient-to-br from-fuchsia-950/60 via-slate-900 to-blue-950/60 p-6">
        <p className="text-sm text-blue-400">Customer Site Overview</p>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">{customer.customer_name}</h1>
            <p className="mt-1 text-slate-400">
              {customer.emirate || "Location not recorded"}
            </p>
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openContactModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white"
              >
                <Plus size={17} aria-hidden="true" />
                Add Contact
              </button>
              <Link
                to={`/customers/${customer.id}/edit`}
                state={{
                  customersReturnTo,
                  focusCustomerId: Number(customerId),
                }}
                className="rounded-xl border border-blue-700 px-4 py-2 text-blue-300"
              >
                Edit customer
              </Link>
            </div>
          )}
        </div>

        {(customer.is_iso_eiac_accredited || customer.is_cap_accredited) && (
          <div className="mt-5 rounded-2xl border border-emerald-700/70 bg-emerald-950/30 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-300">
              <ShieldCheck size={19} />
              Laboratory accreditation
            </h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {customer.is_iso_eiac_accredited && (
                <div className="rounded-xl border border-blue-700 bg-blue-950/70 px-4 py-3">
                  <p className="font-semibold text-blue-200">ISO/EIAC</p>
                  <p className="mt-1 text-sm text-blue-300">
                    Accreditation No. {customer.iso_eiac_accreditation_number}
                  </p>
                </div>
              )}
              {customer.is_cap_accredited && (
                <div className="rounded-xl border border-violet-700 bg-violet-950/70 px-4 py-3">
                  <p className="font-semibold text-violet-200">CAP Accredited</p>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {error && (
        <div
          className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300"
          role="alert"
        >
          {error}
        </div>
      )}

      {customer.customer_contacts?.length > 0 && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Users size={20} />
            Contacts
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {customer.customer_contacts.map((contact) => (
              <article
                key={contact.id}
                className="rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <h3 className="font-semibold">{contact.name}</h3>
                <p className="text-sm text-blue-300">{contact.designation}</p>
                {contact.phone_number && (
                  <p className="mt-2 text-sm">{contact.phone_number}</p>
                )}
                {contact.email && (
                  <div className="mt-2 flex items-center gap-2">
                    <p className="min-w-0 flex-1 break-all text-sm text-slate-400">
                      {contact.email}
                    </p>
                    <button
                      type="button"
                      onClick={() => copyEmail(contact.email)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 px-2 py-1.5 text-xs text-slate-300 hover:border-blue-600 hover:text-blue-300"
                      aria-label={`Copy ${contact.email}`}
                    >
                      {copiedEmail === contact.email ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                      {copiedEmail === contact.email ? "Copied" : "Copy"}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {instruments.length > 0 && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Boxes size={20} />
              Installed instruments
            </h2>
            <span className="text-sm text-slate-400">
              {instruments.length} active
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {instruments.map((instrument) => (
              <article
                key={instrument.id}
                className="rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <h3 className="font-semibold">{instrument.instrument_name}</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <Info
                    label="Serial number"
                    value={instrument.serial_number || "Not recorded"}
                  />
                  <Info
                    label="Installation date"
                    value={formatDateOnly(instrument.installation_date)}
                  />
                </dl>
                {canEdit && (
                  <Link
                    to={`/assets/${instrument.id}/edit`}
                    className="mt-4 inline-flex items-center gap-2 text-sm text-blue-300"
                  >
                    View in Assets
                    <ExternalLink size={15} />
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {(unity.length > 0 || eqas.length > 0) && (
        <section className="grid gap-4 lg:grid-cols-2">
          {unity.length > 0 && (
            <div className="rounded-2xl border border-cyan-900 bg-cyan-950/20 p-5">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <Server size={20} />
                Unity Real Time
              </h2>
              <div className="mt-4 space-y-3">
                {unity.map((installation) => (
                  <article
                    key={installation.id}
                    className="rounded-xl border border-cyan-900 bg-slate-950 p-4"
                  >
                    <h3 className="font-semibold">
                      {installation.installation_name || "Unity installation"}
                    </h3>
                    <dl className="mt-3 space-y-2 text-sm">
                      <Info label="Primary ID" value={installation.primary_id} />
                      <Info
                        label="License status"
                        value={
                          installation.unity_rt_license_status || "Not recorded"
                        }
                      />
                      <Info
                        label="Expiry"
                        value={formatDateOnly(installation.unity_rt_expiry_date)}
                      />
                      <Info
                        label="Connectivity"
                        value={installation.connectivity_type || "None"}
                      />
                    </dl>
                    {canEdit && (
                      <Link
                        to={`/unity-real-time/${installation.id}/edit`}
                        className="mt-4 inline-flex items-center gap-2 text-sm text-blue-300"
                      >
                        View in Unity Real Time
                        <ExternalLink size={15} />
                      </Link>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}

          {eqas.length > 0 && (
            <div className="rounded-2xl border border-violet-900 bg-violet-950/20 p-5">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <FlaskConical size={20} />
                EQAS Online
              </h2>
              <div className="mt-4 space-y-3">
                {eqas.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-violet-900 bg-slate-950 p-4"
                  >
                    <h3 className="font-semibold">
                      {item.lab_name || "EQAS laboratory"}
                    </h3>
                    <dl className="mt-3 space-y-2 text-sm">
                      <Info
                        label="Lab Number"
                        value={item.lab_number || "Not recorded"}
                      />
                      <Info
                        label="QCnet ID"
                        value={item.qcnet_id || "Not recorded"}
                      />
                    </dl>
                    {canEdit && (
                      <Link
                        to={`/eqas-online/${item.id}/edit`}
                        className="mt-4 inline-flex items-center gap-2 text-sm text-blue-300"
                      >
                        View in EQAS Online
                        <ExternalLink size={15} />
                      </Link>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {contactModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeContactModal();
          }}
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-contact-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-blue-400">{customer.customer_name}</p>
                <h2 id="add-contact-title" className="text-2xl font-semibold">
                  Add Contact
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Add the contact directly to this customer.
                </p>
              </div>
              <button
                type="button"
                onClick={closeContactModal}
                disabled={contactSaving}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50"
                aria-label="Close Add Contact"
              >
                <X size={20} />
              </button>
            </div>

            {contactError && (
              <div
                className="mt-4 rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-300"
                role="alert"
              >
                {contactError}
              </div>
            )}

            <form
              ref={contactFormRef}
              onSubmit={(event) => {
                event.preventDefault();
                saveContact();
              }}
              onInvalidCapture={handleInvalidCapture}
              className="mt-5 space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  Name
                  <input
                    ref={contactNameRef}
                    required
                    name="contactName"
                    value={contactDraft.name}
                    onChange={(event) =>
                      patchContact("name", event.target.value)
                    }
                    className={inputClass}
                  />
                </label>
                <label>
                  Designation
                  <SelectInput
                    required
                    name="contactDesignation"
                    value={contactDraft.designation}
                    onChange={(event) =>
                      patchContact("designation", event.target.value)
                    }
                    className={inputClass}
                  >
                    {DESIGNATIONS.map((designation) => (
                      <option key={designation}>{designation}</option>
                    ))}
                  </SelectInput>
                </label>
                <label>
                  Number
                  <input
                    type="tel"
                    name="contactPhone"
                    value={contactDraft.phoneNumber}
                    onChange={(event) =>
                      patchContact("phoneNumber", event.target.value)
                    }
                    className={inputClass}
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    name="contactEmail"
                    value={contactDraft.email}
                    onChange={(event) =>
                      patchContact("email", event.target.value)
                    }
                    className={inputClass}
                  />
                </label>
              </div>

              {duplicateCandidates.length > 0 && (
                <div className="rounded-xl border border-amber-700 bg-amber-950/25 p-4">
                  <h3 className="font-semibold text-amber-200">
                    A similar contact may already exist
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Review the possible matches before adding another contact.
                  </p>
                  <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                    {duplicateCandidates.map((candidate) => (
                      <article
                        key={candidate.contact_id}
                        className="rounded-xl border border-slate-700 bg-slate-950 p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{candidate.contact_name}</p>
                            <p className="text-sm text-blue-300">
                              {candidate.designation}
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                              {candidate.customer_name}
                              {candidate.emirate ? `, ${candidate.emirate}` : ""}
                            </p>
                            <p className="mt-2 text-sm text-amber-300">
                              {candidate.match_reason}
                            </p>
                            {candidate.phone_number && (
                              <p className="mt-1 text-xs text-slate-500">
                                {candidate.phone_number}
                              </p>
                            )}
                            {candidate.email && (
                              <p className="mt-1 break-all text-xs text-slate-500">
                                {candidate.email}
                              </p>
                            )}
                          </div>
                          <Link
                            to={`/customers/${candidate.customer_id}/overview`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-blue-800 px-3 py-2 text-sm text-blue-300"
                          >
                            View customer
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Adding anyway creates a separate contact. It does not move,
                    merge, or edit an existing contact.
                  </p>
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-slate-800 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeContactModal}
                  disabled={contactSaving}
                  className="rounded-xl border border-slate-700 px-4 py-2 disabled:opacity-50"
                >
                  Cancel
                </button>
                {duplicateCandidates.length > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setDuplicateCandidates([]);
                        window.requestAnimationFrame(() =>
                          contactNameRef.current?.focus()
                        );
                      }}
                      disabled={contactSaving}
                      className="rounded-xl border border-slate-700 px-4 py-2 disabled:opacity-50"
                    >
                      Go back and edit
                    </button>
                    <button
                      type="button"
                      onClick={() => saveContact({ override: true })}
                      disabled={contactSaving}
                      className="rounded-xl bg-amber-600 px-4 py-2 font-medium text-black disabled:opacity-50"
                    >
                      {contactSaving ? "Adding..." : "Add contact anyway"}
                    </button>
                  </>
                ) : (
                  <button
                    type="submit"
                    disabled={contactSaving}
                    className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
                  >
                    {contactSaving ? "Checking..." : "Add Contact"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd>{value || "Not recorded"}</dd>
    </div>
  );
}
