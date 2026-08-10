import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUp, ChevronDown, ChevronRight } from "lucide-react";
import SelectInput from "../components/ui/SelectInput";
import { getBioplexCount } from "../services/bioplexInventory";
import { exportBioplexCountDetailed, exportBioplexCountPdf, exportBioplexCountQuick } from "../services/bioplexInventoryExport";
import { formatBioplexDate } from "../utils/bioplexDates";
import { buildBioplexInventoryGroups } from "../utils/bioplexInventoryGrouping";
const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2";
const itemType = (item) => item.material_type;
function itemMatches(item, query, filter) {
  if (query && !`${item.assay_name_snapshot} ${item.product_name_snapshot} ${item.lot_number} ${itemType(item)}`.toUpperCase().includes(query)) return false;
  if (filter === "Reagents") return itemType(item) === "kit";
  if (filter === "Calibrators") return itemType(item) === "calibrator";
  if (filter === "QC") return itemType(item) === "qc";
  if (filter === "Missing quantity") return item.quantity === null || item.quantity === undefined;
  if (filter === "Zero quantity") return item.quantity !== null && item.quantity !== undefined && Number(item.quantity) === 0;
  return true;
}
export default function BioplexInventoryDetailsPage({ canEdit }) {
  const { sessionId } = useParams();
  const [record, setRecord] = useState(null); const [error, setError] = useState(""); const [search, setSearch] = useState(""); const [filter, setFilter] = useState("All"); const [collapsed, setCollapsed] = useState(new Set());
  useEffect(() => { getBioplexCount(sessionId).then(setRecord).catch((requestError) => setError(requestError.message)); }, [sessionId]);
  const sections = useMemo(() => {
    if (!record) return [];
    const grouped = buildBioplexInventoryGroups(record.items, record.links); const map = new Map();
    const ensure = (name) => { if (!map.has(name)) map.set(name, { name, groups: [], standalone: [], items: [] }); return map.get(name); };
    grouped.reagentGroups.forEach((group) => { const section = ensure(group.root.assay_name_snapshot); section.groups.push(group); section.items.push(group.root, ...group.children.map((entry) => entry.item)); });
    grouped.standalone.forEach((item) => { const section = ensure(item.assay_name_snapshot); section.standalone.push(item); section.items.push(item); });
    const query = search.trim().toUpperCase();
    return [...map.values()].map((section) => {
      const groups = section.groups.map((group) => ({
        root: itemMatches(group.root, query, filter) ? group.root : null,
        children: group.children.filter((entry) => itemMatches(entry.item, query, filter)),
        key: group.root.id,
      })).filter((group) => group.root || group.children.length);
      const standalone = section.standalone.filter((item) => itemMatches(item, query, filter));
      return { ...section, groups, standalone, items: [...new Map(section.items.map((item) => [item.id, item])).values()] };
    }).filter((section) => section.groups.length || section.standalone.length).sort((a, b) => a.name.localeCompare(b.name));
  }, [record, search, filter]);
  if (error && !record) return <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">{error}</div>;
  if (!record) return <div className="text-slate-400">Loading...</div>;
  const count = record.count; const canExport = ["Completed", "Exported"].includes(count.status) && !count.deleted_at;
  return <div className="mx-auto max-w-6xl space-y-5 pb-20">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-blue-400">BioPlex Inventory</p><h1 className="text-3xl font-semibold">{count.customers?.customer_name}</h1><p className="mt-1 text-slate-400">Counted {formatBioplexDate(count.counted_on)} · {count.status}</p></div><div className="flex flex-wrap gap-2">{canExport && <><button onClick={() => exportBioplexCountQuick(sessionId)} className="rounded-xl border border-emerald-700 px-3 py-2 text-emerald-300">Quick Excel</button><button onClick={() => exportBioplexCountDetailed(sessionId)} className="rounded-xl border border-blue-700 px-3 py-2 text-blue-300">Detailed Excel</button><button onClick={() => exportBioplexCountPdf(sessionId)} className="rounded-xl border border-purple-700 px-3 py-2 text-purple-300">PDF</button></>}{canEdit && <Link to={`/bioplex-inventory/${sessionId}/edit`} className="rounded-xl bg-blue-600 px-4 py-2">Edit</Link>}</div></header>
    <Link to="/bioplex-inventory" className="inline-flex items-center gap-2 text-sm text-slate-400"><ArrowLeft size={18}/>Back</Link>
    <section className="sticky top-2 z-20 rounded-2xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur">
      <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_16rem]"><input type="search" className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assay, material, or lot"/><SelectInput className={inputClass} value={filter} onChange={(event) => setFilter(event.target.value)}><option>All</option><option>Reagents</option><option>Calibrators</option><option>QC</option><option>Missing quantity</option><option>Zero quantity</option></SelectInput></div>
      <div className="mt-3 border-t border-slate-700 pt-3"><div className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 py-1"><button onClick={() => setCollapsed(new Set(sections.map((section) => section.name)))} className="shrink-0 whitespace-nowrap rounded-lg border border-slate-700 px-3 py-1.5 text-sm transition-colors hover:border-blue-500 hover:bg-blue-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400">Collapse all</button><button onClick={() => setCollapsed(new Set())} className="shrink-0 whitespace-nowrap rounded-lg border border-slate-700 px-3 py-1.5 text-sm transition-colors hover:border-blue-500 hover:bg-blue-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400">Expand all</button>{sections.map((section) => <button key={section.name} onClick={() => document.getElementById(`view-${slug(section.name)}`)?.scrollIntoView({ behavior: "smooth", block: "start" })} className="shrink-0 whitespace-nowrap rounded-lg border border-slate-700 px-3 py-1.5 text-sm transition-colors hover:border-blue-500 hover:bg-blue-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400">{section.name}</button>)}</div></div>
    </section>
    <section className="space-y-4">{sections.map((section) => { const closed = collapsed.has(section.name) && !search; const entered = section.items.filter((item) => item.quantity !== null && item.quantity !== undefined).length; return <article id={`view-${slug(section.name)}`} key={section.name} className="scroll-mt-44 rounded-2xl border border-slate-800 bg-slate-900"><button onClick={() => setCollapsed((current) => { const next = new Set(current); next.has(section.name) ? next.delete(section.name) : next.add(section.name); return next; })} className="flex w-full items-center justify-between p-4"><span className="flex items-center gap-2">{closed ? <ChevronRight/> : <ChevronDown/>}<strong>{section.name}</strong></span><span className="rounded-full bg-slate-800 px-3 py-1 text-xs">{entered} of {section.items.length} entered</span></button>{!closed && <div className="space-y-3 border-t border-slate-800 p-4">{section.groups.map((group) => <div key={group.key} className="rounded-xl border border-slate-700 p-4">{group.root && <Line item={group.root}/>} {group.children.map((entry) => <div key={`${group.key}-${entry.item.id}`} className={group.root ? "mt-3 border-t border-slate-800 pt-3" : "py-2"}><p className="mb-2 text-xs uppercase text-cyan-400">{entry.relationshipType === "kit_qc" ? "Assay QC" : entry.shared ? "Shared calibrator" : "Matched calibrator"}</p><Line item={entry.item}/></div>)}</div>)}{section.standalone.map((item) => <div key={item.id} className="rounded-xl border border-dashed border-slate-700 p-4"><p className="mb-2 text-xs uppercase text-slate-500">Standalone material</p><Line item={item}/></div>)}</div>}</article>; })}</section>
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-xl font-semibold">Audit history</h2>{record.events.map((event) => <div key={event.id} className="mt-3 rounded-xl bg-slate-950 p-3"><p className="font-medium">{event.event_type}</p><p className="text-sm text-slate-400">{event.reason || "No reason"}</p></div>)}</section>
    <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-5 right-4 rounded-full border border-slate-700 bg-slate-900 p-3 shadow-xl" aria-label="Back to top"><ArrowUp size={20}/></button>
  </div>;
}
function Line({ item }) { return <div><h3 className="font-semibold">{item.product_name_snapshot}</h3><dl className="mt-3 grid gap-3 sm:grid-cols-4"><Info label="Type" value={item.material_type}/><Info label="Lot" value={item.lot_number || "Not recorded"}/><Info label="Expiry" value={formatBioplexDate(item.expiry_date) || "Not recorded"}/><Info label="Quantity" value={item.quantity === null || item.quantity === undefined ? "Not entered" : String(item.quantity)}/></dl></div>; }
function Info({ label, value }) { return <div><dt className="text-xs uppercase text-slate-500">{label}</dt><dd className="mt-1">{value}</dd></div>; }
function slug(value) { return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
