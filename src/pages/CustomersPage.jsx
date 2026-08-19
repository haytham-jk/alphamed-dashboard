import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Plus, Search, Users } from "lucide-react";
import SelectInput from "../components/ui/SelectInput";
import { EMIRATES } from "../constants/locationOptions";
import { getCustomers } from "../services/customers";

const ACCREDITATION_FILTERS = ["All", "ISO/EIAC", "CAP", "Both"];
const STATUS_FILTERS = ["All", "Active", "Inactive"];

function getContactSummary(customer) {
  const count = customer.customer_contacts?.length ?? 0;
  return count === 0 ? "No contacts added" : count === 1 ? "1 contact added" : `${count} contacts added`;
}

export default function CustomersPage({ canEdit }) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const restoredCustomerRef = useRef("");

  const query = searchParams.get("q") ?? "";
  const accreditationFilter = ACCREDITATION_FILTERS.includes(searchParams.get("accreditation")) ? searchParams.get("accreditation") : "All";
  const emirateFilter = searchParams.get("emirate") ?? "All";
  const statusFilter = STATUS_FILTERS.includes(searchParams.get("status")) ? searchParams.get("status") : "All";

  useEffect(() => {
    setLoading(true);
    setError("");
    getCustomers()
      .then(setCustomers)
      .catch((loadError) => setError(loadError?.message || "Unable to load customers."))
      .finally(() => setLoading(false));
  }, []);

  const availableEmirates = useMemo(() => {
    const recorded = [...new Set(customers.map((customer) => customer.emirate).filter(Boolean))];
    return [...EMIRATES, ...recorded.filter((emirate) => !EMIRATES.includes(emirate)).sort()];
  }, [customers]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesSearch = !search || [
        customer.customer_name,
        customer.emirate,
        customer.iso_eiac_accreditation_number,
        ...(customer.customer_contacts ?? []).flatMap((contact) => [contact.name, contact.designation, contact.email, contact.phone_number]),
      ].some((value) => String(value || "").toLowerCase().includes(search));
      const hasIso = Boolean(customer.is_iso_eiac_accredited);
      const hasCap = Boolean(customer.is_cap_accredited);
      const matchesAccreditation = accreditationFilter === "All"
        || (accreditationFilter === "ISO/EIAC" && hasIso && !hasCap)
        || (accreditationFilter === "CAP" && hasCap && !hasIso)
        || (accreditationFilter === "Both" && hasIso && hasCap);
      const matchesEmirate = emirateFilter === "All" || customer.emirate === emirateFilter;
      const matchesStatus = statusFilter === "All"
        || (statusFilter === "Active" && customer.is_active)
        || (statusFilter === "Inactive" && !customer.is_active);
      return matchesSearch && matchesAccreditation && matchesEmirate && matchesStatus;
    });
  }, [customers, query, accreditationFilter, emirateFilter, statusFilter]);

  useEffect(() => {
    if (loading) return;
    const customerId = String(location.state?.focusCustomerId ?? "");
    if (!customerId || restoredCustomerRef.current === customerId) return;
    const target = document.getElementById(`customer-card-${customerId}`);
    if (!target) {
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    restoredCustomerRef.current = customerId;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      target.focus({ preventScroll: true });
    });
  }, [filtered, loading, location.state]);

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === "All") next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  }

  const parameterText = searchParams.toString();
  const returnTo = `/customers${parameterText ? `?${parameterText}` : ""}`;

  if (loading) return <div className="text-slate-400">Loading customers...</div>;

  return <div className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-sm text-blue-400">Reference data</p><h1 className="text-3xl font-semibold">Customers</h1></div>
      {canEdit && <Link to="/customers/new" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium"><Plus size={18}/>New customer</Link>}
    </header>

    <section className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-2 xl:grid-cols-[minmax(18rem,1fr)_13rem_13rem_12rem]">
      <label><span className="mb-2 block text-sm font-medium">Search customers</span><div className="relative"><Search className="absolute left-3 top-3 text-slate-500" size={17}/><input type="search" value={query} onChange={(event) => updateFilter("q", event.target.value)} placeholder="Customer, accreditation, or contact..." className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-10 pr-3"/></div></label>
      <label><span className="mb-2 block text-sm font-medium">Accreditation</span><SelectInput value={accreditationFilter} onChange={(event) => updateFilter("accreditation", event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">{ACCREDITATION_FILTERS.map((option) => <option key={option}>{option}</option>)}</SelectInput></label>
      <label><span className="mb-2 block text-sm font-medium">Emirate</span><SelectInput value={emirateFilter} onChange={(event) => updateFilter("emirate", event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"><option>All</option>{availableEmirates.map((emirate) => <option key={emirate}>{emirate}</option>)}</SelectInput></label>
      <label><span className="mb-2 block text-sm font-medium">Status</span><SelectInput value={statusFilter} onChange={(event) => updateFilter("status", event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">{STATUS_FILTERS.map((option) => <option key={option}>{option}</option>)}</SelectInput></label>
    </section>

    <p className="flex items-center gap-2 text-sm text-slate-400" aria-live="polite"><Users size={17}/>Showing <strong className="text-slate-200">{filtered.length}</strong> of <strong className="text-slate-200">{customers.length}</strong> customers</p>
    {error && <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300" role="alert">{error}</div>}

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((customer) => <Link id={`customer-card-${customer.id}`} key={customer.id} to={`/customers/${customer.id}/overview`} state={{ customersReturnTo: returnTo, focusCustomerId: customer.id }} className="scroll-mt-24 rounded-2xl border border-slate-800 bg-slate-900 p-5 transition duration-200 ease-out hover:-translate-y-1 hover:border-purple-500/80 hover:bg-slate-800/90 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.35),0_14px_30px_rgba(88,28,135,0.28)] focus-visible:-translate-y-1 focus-visible:border-purple-500 focus-visible:bg-slate-800/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transform-none motion-reduce:transition-none">
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{customer.customer_name || "Unnamed customer"}</h2><p className="text-sm text-slate-400">{customer.emirate || "Unknown"}</p></div><span className={`rounded-full px-2 py-1 text-xs ${customer.is_active ? "bg-emerald-950 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>{customer.is_active ? "Active" : "Inactive"}</span></div>
      <div className="mt-3 flex flex-wrap gap-2">{customer.is_iso_eiac_accredited && <span className="rounded-full bg-blue-950 px-3 py-1 text-xs text-blue-300">ISO/EIAC{customer.iso_eiac_accreditation_number ? ` · ${customer.iso_eiac_accreditation_number}` : ""}</span>}{customer.is_cap_accredited && <span className="rounded-full bg-violet-950 px-3 py-1 text-xs text-violet-300">CAP</span>}</div>
      <p className="mt-4 text-sm text-slate-400">{getContactSummary(customer)}</p>
    </Link>)}</div>
    {!filtered.length && <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-400">No customers match the selected filters.</div>}
  </div>;
}
