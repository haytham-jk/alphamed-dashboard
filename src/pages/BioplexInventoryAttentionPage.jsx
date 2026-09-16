import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, SearchCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/ui/AsyncState";
import useAsyncResource from "../hooks/useAsyncResource";
import { getBioplexLotAttention, getBioplexMatchingWarningImports } from "../services/bioplexInventory";
import { formatBioplexDate } from "../utils/bioplexDates";
import { getLocalDateOnly } from "../utils/dates";

const TYPES = [
  ["expired", "Expired"], ["expiring", "Expiring in 30 days"],
  ["missing-expiry", "Missing expiry"], ["matching-warnings", "Matching warnings"],
];
const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2";
const DAY_MS = 86400000;
function daysBetween(referenceDate, expiryDate) {
  if (!expiryDate) return null;
  return Math.round((Date.parse(`${expiryDate}T00:00:00Z`) - Date.parse(`${referenceDate}T00:00:00Z`)) / DAY_MS);
}
function reasonLabel(value) { return String(value ?? "").replaceAll("_", " ").toLowerCase(); }

export default function BioplexInventoryAttentionPage({ profile }) {
  const [params, setParams] = useSearchParams();
  const type = TYPES.some(([value]) => value === params.get("type")) ? params.get("type") : "expired";
  const [search, setSearch] = useState("");
  const [assay, setAssay] = useState("");
  const [material, setMaterial] = useState("");
  const isAdmin = profile?.role === "admin";
  const load = useCallback(async ({ signal }) => {
    if (signal?.aborted) return [];
    return type === "matching-warnings"
      ? getBioplexMatchingWarningImports()
      : getBioplexLotAttention(getLocalDateOnly(), type);
  }, [type]);
  const { data, loading, error, retry, refreshing } = useAsyncResource(load, [load], { fallbackError: "Unable to load BioPlex attention items." });
  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const referenceDate = getLocalDateOnly();
  const assays = useMemo(() => [...new Set(rows.map((row) => row.bioplex_assays?.assay_name).filter(Boolean))].sort(), [rows]);
  const visible = useMemo(() => {
    const query = search.trim().toUpperCase();
    return rows.filter((row) => {
      if (type === "matching-warnings") return !query || `${row.original_filename ?? ""} ${row.status ?? ""} ${(row.blockingReasons ?? []).join(" ")}`.toUpperCase().includes(query);
      return (!query || `${row.lot_number} ${row.bioplex_assays?.assay_name} ${row.bioplex_products?.product_name} ${row.material_type}`.toUpperCase().includes(query))
        && (!assay || row.bioplex_assays?.assay_name === assay)
        && (!material || row.material_type === material);
    });
  }, [assay, material, rows, search, type]);
  if (loading) return <LoadingState message="Loading BioPlex attention items..." />;
  return <div className="mx-auto max-w-7xl space-y-5">
    <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={18}/>Back to Dashboard</Link>
    <header><p className="text-sm text-cyan-400">BioPlex inventory</p><h1 className="text-3xl font-semibold">Attention items</h1><p className="mt-1 text-slate-400">Review the records behind the Dashboard counters. Expired lots remain stored and remain visible in historical counts.</p></header>
    {error && <ErrorState message={error} onRetry={retry} retrying={refreshing} />}
    <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="BioPlex attention filters">{TYPES.map(([value, label]) => <button key={value} type="button" onClick={() => setParams({ type: value })} className={`shrink-0 rounded-xl px-4 py-2 ${type === value ? "bg-cyan-600 text-white" : "border border-slate-700 text-slate-300"}`}>{label}</button>)}</nav>
    <section className={`grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 ${type === "matching-warnings" ? "" : "md:grid-cols-3"}`}>
      <input className={inputClass} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search lot, assay, material, or import" />
      {type !== "matching-warnings" && <><select className={inputClass} value={assay} onChange={(event) => setAssay(event.target.value)}><option value="">All assays</option>{assays.map((value) => <option key={value}>{value}</option>)}</select><select className={inputClass} value={material} onChange={(event) => setMaterial(event.target.value)}><option value="">All material types</option><option value="kit">Reagent kit</option><option value="calibrator">Calibrator</option><option value="qc">QC</option></select></>}
    </section>
    <p className="text-sm text-slate-400">Showing {visible.length} of {rows.length}</p>
    {type === "matching-warnings" ? <section className="grid gap-4 lg:grid-cols-2">{visible.map((row) => <article key={row.id} className="rounded-2xl border border-violet-900/70 bg-slate-900 p-5"><div className="flex justify-between gap-3"><div><p className="text-xs uppercase text-violet-300">Import {row.id}</p><h2 className="mt-1 font-semibold">{row.original_filename}</h2></div><span className="h-fit rounded-full bg-violet-950 px-3 py-1 text-xs text-violet-200">{row.blockingRowCount} blocking rows</span></div><p className="mt-3 text-sm text-slate-400">{(row.blockingReasons ?? []).length ? row.blockingReasons.map(reasonLabel).join(", ") : "Pending review decisions"}</p>{isAdmin ? <Link to={`/bioplex-matching-imports/${row.id}`} className="mt-4 inline-flex rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium">Open import review</Link> : <p className="mt-4 text-sm text-slate-500">An Administrator must resolve this import.</p>}</article>)}{!visible.length && <Empty />}</section> : <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((row) => { const days = daysBetween(referenceDate, row.expiry_date); return <article key={row.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-cyan-400">{row.bioplex_assays?.assay_name || "Unassigned assay"}</p><h2 className="mt-1 text-xl font-semibold">Lot {row.lot_number}</h2></div><span className={`rounded-full px-3 py-1 text-xs ${days !== null && days < 0 ? "bg-red-950 text-red-300" : "bg-amber-950 text-amber-300"}`}>{days === null ? "Missing expiry" : days < 0 ? `${Math.abs(days)} days expired` : `${days} days left`}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><Info label="Material" value={row.material_type}/><Info label="Product" value={row.bioplex_products?.product_name || "Not recorded"}/><Info label="Expiry" value={formatBioplexDate(row.expiry_date) || "Not recorded"}/><Info label="Master status" value={row.is_active ? "Active" : "Inactive"}/></dl><div className="mt-4 flex flex-wrap gap-2"><Link to={`/bioplex-matching-check?lot=${encodeURIComponent(row.lot_number)}`} className="inline-flex items-center gap-2 rounded-xl border border-violet-700 px-3 py-2 text-sm text-violet-300"><SearchCheck size={16}/>Matching Check</Link>{isAdmin && <Link to={`/bioplex-inventory/lot-expiry-maintenance?lot=${encodeURIComponent(row.lot_number)}`} className="inline-flex items-center gap-2 rounded-xl border border-cyan-700 px-3 py-2 text-sm text-cyan-300"><CalendarClock size={16}/>Expiry maintenance</Link>}</div></article>; })}{!visible.length && <Empty />}</section>}
  </div>;
}
function Info({ label, value }) { return <div><dt className="text-xs uppercase text-slate-500">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>; }
function Empty() { return <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center text-slate-400 md:col-span-2 xl:col-span-3">No records match this attention filter.</div>; }
