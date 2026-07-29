import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, FilePenLine, Plus, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { deleteBioplexInventory, getBioplexSessions, restoreBioplexInventory } from "../services/bioplexInventory";
import { formatDateOnly } from "../utils/dates";

export default function BioplexInventoryPage({ canEdit, profile }) {
  const isAdmin = profile?.role === "admin";
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [customerFilter, setCustomerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadSessions = useCallback(async () => {
    try { setLoading(true); setError(""); setSessions(await getBioplexSessions({ includeDeleted: isAdmin && showDeleted })); }
    catch (loadError) { setError(loadError.message || "Unable to load BioPlex inventory."); }
    finally { setLoading(false); }
  }, [isAdmin, showDeleted]);
  useEffect(() => { loadSessions(); }, [loadSessions]);

  const customers = useMemo(() => Array.from(new Map(sessions.filter((session) => session.customers).map((session) => [session.customer_id, session.customers.customer_name])).entries()), [sessions]);
  const visible = sessions.filter((session) => (!customerFilter || String(session.customer_id) === customerFilter) && (!statusFilter || session.status === statusFilter) && (showDeleted ? Boolean(session.deleted_at) : !session.deleted_at));

  async function deleteCount(session) {
    const reason = window.prompt(`Delete ${session.customers?.customer_name || "this"} count from ${formatDateOnly(session.counted_on)}? Enter a reason:`);
    if (!reason?.trim()) return;
    try { await deleteBioplexInventory(session.id, reason); await loadSessions(); }
    catch (actionError) { setError(actionError.message || "Unable to delete the count."); }
  }
  async function restoreCount(session) {
    const reason = window.prompt("Enter the reason for restoring this count:");
    if (!reason?.trim()) return;
    try { await restoreBioplexInventory(session.id, reason); await loadSessions(); }
    catch (actionError) { setError(actionError.message || "Unable to restore the count."); }
  }

  return <div className="space-y-5">
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-sm text-blue-400">BioPlex 2200</p><h1 className="text-3xl font-semibold">Inventory</h1><p className="mt-1 text-slate-400">Record onsite stock and compare completed visits.</p></div><div className="flex flex-wrap gap-2"><Link to="/bioplex-inventory/report" className="rounded-xl border border-slate-700 px-4 py-2 text-sm">Visit comparison</Link><button type="button" onClick={loadSessions} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm"><RefreshCw size={17} />Refresh</button>{canEdit && <Link to="/bioplex-inventory/new" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm"><Plus size={17} />New stock count</Link>}</div></header>
    <section className="grid gap-3 sm:grid-cols-3"><Metric label="Total" value={sessions.filter((session) => !session.deleted_at).length} /><Metric label="Drafts" value={sessions.filter((session) => !session.deleted_at && session.status === "Draft").length} /><Metric label="Completed" value={sessions.filter((session) => !session.deleted_at && session.status === "Completed").length} /></section>
    <section className="flex w-full flex-wrap items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 lg:min-h-20"><select className="rounded-xl border border-slate-700 bg-slate-950 py-2 pl-3 pr-8" value={customerFilter} onChange={(event) => setCustomerFilter(event.target.value)}><option value="">All customers</option>{customers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><select className="rounded-xl border border-slate-700 bg-slate-950 py-2 pl-3 pr-8" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option><option value="Draft">Draft</option><option value="Completed">Completed</option></select>{isAdmin && <label className="flex items-center gap-2"><input type="checkbox" checked={showDeleted} onChange={(event) => setShowDeleted(event.target.checked)} />Show deleted only</label>}</section>
    {error && <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">{error}</div>}
    {loading ? <div className="text-slate-400">Loading BioPlex inventory...</div> : <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">{visible.map((session) => <article key={session.id} className="grid gap-4 border-b border-slate-800 p-4 last:border-0 md:grid-cols-[1.4fr_1fr_0.8fr_0.5fr_auto] md:items-center"><div><p className="font-medium">{session.customers?.customer_name || "Unknown customer"}</p><p className="text-sm text-slate-500">{session.customers?.emirate || "Emirate not recorded"}</p></div><Cell label="Count date" value={formatDateOnly(session.counted_on)} /><Cell label="Status" value={session.deleted_at ? "Deleted" : session.status} /><Cell label="Items" value={session.lineCount} /><div className="flex flex-wrap gap-2">{session.deleted_at ? isAdmin && <button type="button" onClick={() => restoreCount(session)} className="inline-flex items-center gap-1 rounded-xl border border-emerald-800 px-3 py-2 text-sm text-emerald-300"><RotateCcw size={16} />Restore</button> : <><Link to={session.status === "Draft" && canEdit ? `/bioplex-inventory/${session.id}/edit` : `/bioplex-inventory/${session.id}`} className="inline-flex items-center gap-1 rounded-xl border border-slate-700 px-3 py-2 text-sm">{session.status === "Draft" && canEdit ? <FilePenLine size={16} /> : <Boxes size={16} />}{session.status === "Draft" && canEdit ? "Continue" : "View"}</Link>{session.status === "Completed" && canEdit && <Link to={`/bioplex-inventory/${session.id}/edit`} className="rounded-xl border border-blue-800 px-3 py-2 text-sm text-blue-300">Edit</Link>}{isAdmin && <button type="button" onClick={() => deleteCount(session)} className="inline-flex items-center gap-1 rounded-xl border border-red-900 px-3 py-2 text-sm text-red-300"><Trash2 size={16} />Delete</button>}</>}</div></article>)}{!visible.length && <div className="p-8 text-center text-slate-400">No matching BioPlex counts.</div>}</div>}
  </div>;
}
function Metric({ label, value }) { return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>; }
function Cell({ label, value }) { return <div><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-1">{value}</p></div>; }
