import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getBioplexCount } from "../services/bioplexInventory";
import {
  exportBioplexCountDetailed,
  exportBioplexCountPdf,
  exportBioplexCountQuick,
} from "../services/bioplexInventoryExport";
import { formatBioplexDate } from "../utils/bioplexDates";
import { buildBioplexInventoryGroups } from "../utils/bioplexInventoryGrouping";

export default function BioplexInventoryDetailsPage({ canEdit }) {
  const { sessionId } = useParams();
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    getBioplexCount(sessionId).then(setRecord).catch((requestError) => setError(requestError.message));
  }, [sessionId]);
  const groups = useMemo(
    () => record ? buildBioplexInventoryGroups(record.items, record.links) : { reagentGroups: [], standalone: [] },
    [record]
  );
  if (error && !record) return <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">{error}</div>;
  if (!record) return <div className="text-slate-400">Loading...</div>;
  const count = record.count;
  const canExport = ["Completed", "Exported"].includes(count.status) && !count.deleted_at;
  return <div className="mx-auto max-w-6xl space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm text-blue-400">BioPlex Inventory</p><h1 className="text-3xl font-semibold">{count.customers?.customer_name}</h1><p className="mt-1 text-slate-400">Counted {formatBioplexDate(count.counted_on)} · {count.status}</p></div>
      <div className="flex flex-wrap gap-2">{canExport && <><button onClick={() => exportBioplexCountQuick(sessionId)} className="rounded-xl border border-emerald-700 px-3 py-2 text-emerald-300">Quick Excel</button><button onClick={() => exportBioplexCountDetailed(sessionId)} className="rounded-xl border border-blue-700 px-3 py-2 text-blue-300">Detailed Excel</button><button onClick={() => exportBioplexCountPdf(sessionId)} className="rounded-xl border border-purple-700 px-3 py-2 text-purple-300">PDF</button></>}{canEdit && <Link to={`/bioplex-inventory/${sessionId}/edit`} className="rounded-xl bg-blue-600 px-4 py-2">Edit</Link>}</div>
    </header>
    <Link to="/bioplex-inventory" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={18}/>Back</Link>

    <section className="space-y-4">
      {groups.reagentGroups.map((group) => <article key={group.root.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><Line item={group.root}/>{group.children.length > 0 && <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">{group.children.map((entry) => <div key={`${group.root.id}-${entry.item.id}-${entry.relationshipType}`} className="rounded-xl bg-slate-950 p-4"><div className="mb-2 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-blue-950 px-2 py-1 text-blue-300">{entry.relationshipType === "kit_qc" ? "Assay QC" : "Matched calibrator"}</span>{entry.shared && <span className="rounded-full bg-cyan-950 px-2 py-1 text-cyan-300">Shared across reagent lots</span>}</div><Line item={entry.item} compact/></div>)}</div>}</article>)}
      {groups.standalone.map((item) => <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Standalone material</div><Line item={item}/></article>)}
      {!record.items.length && <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">No stock items recorded.</div>}
    </section>

    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-xl font-semibold">Audit history</h2><div className="mt-3 space-y-2">{record.events.map((event) => <div key={event.id} className="rounded-xl bg-slate-950 p-3"><p className="font-medium">{event.event_type}</p><p className="text-sm text-slate-400">{event.reason || "No reason"}</p></div>)}</div></section>
  </div>;
}

function Line({ item, compact = false }) {
  return <div><p className="text-sm text-blue-400">{item.assay_name_snapshot}</p><h3 className={compact ? "font-semibold" : "text-lg font-semibold"}>{item.product_name_snapshot}</h3><dl className="mt-3 grid gap-3 sm:grid-cols-4"><Info label="Type" value={item.material_type}/><Info label="Lot" value={item.lot_number || "Not recorded"}/><Info label="Expiry" value={formatBioplexDate(item.expiry_date) || "Not recorded"}/><Info label="Quantity" value={item.quantity === null || item.quantity === undefined ? "Not entered" : String(item.quantity)}/></dl></div>;
}
function Info({ label, value }) { return <div><dt className="text-xs uppercase text-slate-500">{label}</dt><dd className="mt-1">{value}</dd></div>; }
