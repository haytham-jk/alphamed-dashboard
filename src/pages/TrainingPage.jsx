import SelectInput from "../components/ui/SelectInput";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, RefreshCw, Search } from "lucide-react";
import { getTrainingRecordsPage } from "../services/training";
import { ErrorState } from "../components/ui/AsyncState";
import { formatDateOnly } from "../utils/dateDisplay";
import PaginationControls from "../components/ui/PaginationControls";
const PAGE_SIZE = 20;

export default function TrainingPage({ canEdit }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult] = useState({ rows: [], filteredCount: 0, totalCount: 0, page: 1, pageCount: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const query = searchParams.get("q") || "";
  const sortValue = searchParams.get("sort");
  const sort = ["newest", "oldest", "customer"].includes(sortValue) ? sortValue : "newest";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const updateFilter = useCallback((key, value) => {
    const next = new URLSearchParams(searchParams);
    if (!value || (key === "sort" && value === "newest") || (key === "page" && Number(value) === 1)) next.delete(key);
    else next.set(key, String(value));
    if (key !== "page") next.delete("page");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setRefreshing(true);
        setError("");
        const next = await getTrainingRecordsPage({ query, sort, page, pageSize: PAGE_SIZE }, { signal: controller.signal });
        setResult(next);
        if (next.page !== page) updateFilter("page", next.page);
      } catch (loadError) {
        if (loadError?.name !== "AbortError") setError(loadError?.message || "Unable to load training records.");
      } finally {
        if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); }
      }
    }, query ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, sort, page, refreshKey, updateFilter]);

  function openRecord(recordId) { if (canEdit) navigate(`/training/${recordId}/edit`); }
  function handleRowKeyDown(event, recordId) {
    if (!canEdit) return;
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openRecord(recordId); }
  }

  return <div className="space-y-5">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-sm text-blue-400">Customer development</p><h1 className="text-3xl font-semibold">Training Records</h1></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={refreshing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2"><RefreshCw size={17}/>{refreshing ? "Refreshing..." : "Refresh"}</button>{canEdit && <button type="button" onClick={() => navigate("/training/new")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white"><Plus size={18}/>New training</button>}</div></header>
    <section className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-[minmax(0,1fr)_190px]"><label><span className="mb-2 block text-sm font-medium">Search training records</span><div className="relative"><Search size={17} className="pointer-events-none absolute left-3 top-3 text-slate-500"/><input type="search" value={query} onChange={(event) => updateFilter("q", event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-10 pr-3"/></div></label><label><span className="mb-2 block text-sm font-medium">Sort by</span><SelectInput value={sort} onChange={(event) => updateFilter("sort", event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="customer">Customer</option></SelectInput></label></section>
    <p className="text-sm text-slate-500" aria-live="polite">Showing {result.rows.length} of {result.filteredCount} matching records, {result.totalCount} total</p>
    {loading && <div className="py-16 text-center text-slate-400" role="status">Loading training records...</div>}
    {error && <ErrorState message={error} onRetry={() => setRefreshKey((value) => value + 1)} retrying={refreshing}/>} 
    {!loading && !error && <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900"><table className="w-full min-w-[680px] table-fixed text-sm"><colgroup><col className="w-[46%]"/><col className="w-[36%]"/><col className="w-[18%]"/></colgroup><thead><tr className="border-b border-slate-800 bg-slate-950/60 text-left text-xs uppercase tracking-wide text-slate-500"><th className="p-4">Training and customer</th><th className="p-4">Instrument</th><th className="p-4">Training date</th></tr></thead><tbody>{result.rows.map((record) => <tr key={record.id} onClick={() => openRecord(record.id)} onKeyDown={(event) => handleRowKeyDown(event, record.id)} tabIndex={canEdit ? 0 : undefined} role={canEdit ? "link" : undefined} className={`border-b border-slate-800 last:border-0 ${canEdit ? "cursor-pointer hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400" : ""}`}><td className="p-4 align-top"><div className="font-medium text-slate-100">{record.title}</div><div className="mt-1 text-slate-500">{record.customers?.customer_name || "No customer"}</div></td><td className="p-4 align-top text-slate-200"><div className="truncate">{record.instruments?.instrument_name || record.instrument_name_snapshot || "Not specified"}</div><div className="mt-1 truncate text-slate-500">S/N {record.instruments?.serial_number || record.serial_number_snapshot || "Not recorded"}</div></td><td className="whitespace-nowrap p-4 align-top text-slate-300">{formatDateOnly(record.training_date, "No date")}</td></tr>)}{result.rows.length === 0 && <tr><td colSpan={3} className="p-12 text-center text-slate-500">No training records match the search.</td></tr>}</tbody></table></div>}
    {!loading && !error && <PaginationControls page={result.page} pageCount={result.pageCount} onPageChange={(value) => updateFilter("page", value)}/>} 
  </div>;
}
