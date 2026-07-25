import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { getCustomers } from "../services/customers";

export default function CustomersPage({ canEdit }) {
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function loadCustomers() {
    setLoading(true);
    setError("");
    getCustomers()
      .then(setCustomers)
      .catch((loadError) => setError(loadError?.message || "Unable to load customers."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadCustomers(); }, []);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return customers.filter((customer) =>
      !search || [customer.customer_name, customer.emirate].some((value) =>
        String(value || "").toLowerCase().includes(search)
      )
    );
  }, [customers, query]);

  if (loading) return <div className="py-16 text-center text-slate-400" role="status">Loading customers...</div>;

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><p className="text-sm text-blue-400">Reference data</p><h1 className="text-3xl font-semibold">Customers</h1></div>
        {canEdit && <Link to="/customers/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white focus-visible:ring-2 focus-visible:ring-blue-400"><Plus size={18} aria-hidden="true" />New customer</Link>}
      </header>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <label htmlFor="customer-search" className="mb-2 block text-sm font-medium">Search customers</label>
        <div className="relative"><Search size={17} aria-hidden="true" className="absolute left-3 top-3 text-slate-500" /><input id="customer-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or emirate..." className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-10 pr-3 outline-none focus-visible:ring-2 focus-visible:ring-blue-400" /></div>
      </section>
      {error && <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300" role="alert"><p>{error}</p><button type="button" onClick={loadCustomers} className="mt-3 rounded-lg border border-red-700 px-3 py-1.5">Retry</button></div>}
      {!error && <p className="text-sm text-slate-500">Showing {filtered.length} of {customers.length} customers</p>}
      {!error && filtered.length === 0 && <div className="rounded-xl border border-slate-800 p-8 text-center text-slate-500">{query ? "No customers match the search." : "No customers are available."}</div>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((customer) => {
          const content = <><div className="font-semibold">{customer.customer_name || "Unnamed customer"}</div><div className="mt-1 text-sm text-slate-400">{customer.emirate || "Unknown"}</div><span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs ${customer.is_active ? "bg-emerald-950 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>{customer.is_active ? "Active" : "Inactive"}</span></>;
          const classes="block rounded-2xl border border-slate-800 bg-slate-900 p-5 hover:bg-slate-800/60 focus-visible:ring-2 focus-visible:ring-blue-400";
          return canEdit ? <Link key={customer.id} to={`/customers/${customer.id}/edit`} className={classes}>{content}</Link> : <article key={customer.id} className={classes}>{content}</article>;
        })}
      </div>
    </div>
  );
}
