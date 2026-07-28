import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Copy, Plus, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PaginationControls from "../components/ui/PaginationControls";
import { getEqasOnlineRecords } from "../services/eqasOnline";

const PAGE_SIZE = 20;

export default function EqasOnlinePage({ canEdit }) {
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    getEqasOnlineRecords()
      .then(setRecords)
      .catch((loadError) => setError(loadError?.message || "Unable to load EQAS records."))
      .finally(() => setLoading(false));
    return () => timerRef.current && window.clearTimeout(timerRef.current);
  }, []);

  useEffect(() => setPage(1), [query, customerFilter]);

  const customers = useMemo(
    () => [...new Set(records.map((record) => record.customer_name).filter(Boolean))].sort(),
    [records]
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch = !search || [record.qcnet_id, record.lab_number, record.lab_name]
        .some((value) => String(value || "").toLowerCase().includes(search));
      const matchesCustomer = customerFilter === "All" || record.customer_name === customerFilter;
      return matchesSearch && matchesCustomer;
    });
  }, [records, query, customerFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function copyValue(event, value, message) {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(message);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopyMessage(""), 2200);
    } catch {
      setCopyMessage("Unable to copy");
    }
  }

  if (loading) return <div className="py-16 text-center text-slate-400" role="status">Loading EQAS Online records...</div>;

  const copyClass = "group inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 transition-colors hover:border-blue-500 hover:bg-blue-950 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400";

  return (
    <div className="space-y-5">
      {copyMessage && <div role="status" aria-live="polite" className="fixed right-5 top-5 z-50 inline-flex items-center gap-2 rounded-xl border border-emerald-800 bg-emerald-950 px-4 py-3 text-sm font-medium text-emerald-300 shadow-xl"><CheckCircle2 size={18} />{copyMessage}</div>}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><p className="text-sm text-blue-400">Online quality assurance</p><h1 className="text-3xl font-semibold">EQAS Online</h1><p className="mt-2 text-slate-400">Manage customer QCnet IDs and assigned Lab Numbers.</p></div>
        {canEdit && <Link to="/eqas-online/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium"><Plus size={18} />New EQAS record</Link>}
      </header>
      <section className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-[minmax(280px,1fr)_280px]">
        <label><span className="mb-2 block text-sm font-medium text-slate-300">Search</span><div className="relative"><Search size={17} className="pointer-events-none absolute left-3 top-3 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="QCnet ID, Lab Number, or Lab Name..." className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-10 pr-3" /></div></label>
        <label><span className="mb-2 block text-sm font-medium text-slate-300">Customer</span><select value={customerFilter} onChange={(event) => setCustomerFilter(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"><option>All</option>{customers.map((customer) => <option key={customer}>{customer}</option>)}</select></label>
      </section>
      {error && <div role="alert" className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">{error}</div>}
      <p className="text-sm text-slate-500">Showing {visible.length} of {filtered.length} records</p>
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
        <table className="w-full min-w-[900px] text-sm">
          <thead><tr className="border-b border-slate-800 bg-slate-950/60 text-left text-xs uppercase tracking-wide text-slate-500"><th className="p-4">Customer</th><th className="p-4">Lab Name</th><th className="p-4">QCnet ID</th><th className="p-4">Lab Number</th></tr></thead>
          <tbody>
            {visible.map((record) => <tr key={record.id} onClick={() => canEdit && navigate(`/eqas-online/${record.id}/edit`)} onKeyDown={(event) => { if (canEdit && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); navigate(`/eqas-online/${record.id}/edit`); } }} tabIndex={canEdit ? 0 : undefined} role={canEdit ? "link" : undefined} className={`border-b border-slate-800 last:border-0 ${canEdit ? "cursor-pointer hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400" : ""}`}>
              <td className="p-4"><div className="font-medium">{record.customer_name}</div><div className="text-xs text-slate-500">{record.emirate || ""}</div></td>
              <td className="p-4">{record.lab_name || <span className="text-slate-500">Not recorded</span>}</td>
              <td className="p-4"><button type="button" onClick={(event) => copyValue(event, record.qcnet_id, "QCnet ID copied")} className={copyClass}><Copy size={14} />{record.qcnet_id}</button></td>
              <td className="p-4"><button type="button" onClick={(event) => copyValue(event, record.lab_number, "Lab Number copied")} className={copyClass}><Copy size={14} />{record.lab_number}</button></td>
            </tr>)}
            {!visible.length && <tr><td colSpan={4} className="p-12 text-center text-slate-500">No EQAS records match the selected filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <PaginationControls page={safePage} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}
