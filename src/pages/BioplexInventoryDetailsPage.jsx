import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUp, ChevronsDown, ChevronsUp, ChevronDown, ChevronRight } from "lucide-react";
import SelectInput from "../components/ui/SelectInput";
import { getBioplexCount } from "../services/bioplexInventory";
import { exportBioplexCountDetailed, exportBioplexCountPdf, exportBioplexCountQuick } from "../services/bioplexInventoryExport";
import { formatBioplexDate } from "../utils/bioplexDates";
import { buildBioplexPdfGroups } from "../utils/bioplexPdfGrouping";
const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2";
const typeOf = (item) => item.material_type;
const lotOf = (item) => item.lot_number || "Not recorded";
function matches(item, query, filter) {
  if (query && !`${item.assay_name_snapshot} ${item.product_name_snapshot} ${item.lot_number} ${typeOf(item)}`.toUpperCase().includes(query)) return false;
  if (filter === "Reagents") return typeOf(item) === "kit";
  if (filter === "Calibrators") return typeOf(item) === "calibrator";
  if (filter === "QC") return typeOf(item) === "qc";
  if (filter === "Consumables") return typeOf(item) === "consumable";
  if (filter === "Missing quantity") return item.quantity == null;
  if (filter === "Zero quantity") return item.quantity != null && Number(item.quantity) === 0;
  return true;
}
export default function BioplexInventoryDetailsPage({ canEdit }) {
  const { sessionId } = useParams();
  const [record, setRecord] = useState(null); const [error, setError] = useState(""); const [search, setSearch] = useState(""); const [filter, setFilter] = useState("All"); const [collapsed, setCollapsed] = useState(new Set(["Consumables"])); const [auditCollapsed, setAuditCollapsed] = useState(true);
  useEffect(() => { getBioplexCount(sessionId).then(setRecord).catch((requestError) => setError(requestError.message)); }, [sessionId]);
  const sections = useMemo(() => {
    if (!record) return [];
    const groups = buildBioplexPdfGroups(record); const query = search.trim().toUpperCase(); const map = new Map();
    const ensure = (name) => { if (!map.has(name)) map.set(name, { name, groups: [], standaloneCalibrators: [], standaloneQc: [], consumables: [], allItems: [] }); return map.get(name); };
    for (const group of groups.reagentGroups) {
      const linkedMatch = group.calibrators.some((entry) => matches(entry.item, query, filter)) || group.qc.some((entry) => matches(entry.item, query, filter));
      if (!matches(group.reagent, query, filter) && !linkedMatch) continue;
      const section = ensure(group.assay); section.groups.push({ ...group, calibrators: query || filter !== "All" ? group.calibrators.filter((entry) => matches(entry.item, query, filter) || matches(group.reagent, query, filter)) : group.calibrators, qc: query || filter !== "All" ? group.qc.filter((entry) => matches(entry.item, query, filter) || matches(group.reagent, query, filter)) : group.qc });
      section.allItems.push(group.reagent, ...group.calibrators.map((entry) => entry.item), ...group.qc.map((entry) => entry.item));
    }
    for (const [key, items] of [["standaloneCalibrators", groups.standaloneCalibrators], ["standaloneQc", groups.standaloneQc], ["consumables", groups.consumables]]) for (const item of items) if (matches(item, query, filter)) { const section = ensure(item.assay_name_snapshot || (key === "consumables" ? "Consumables" : "Unassigned assay")); section[key].push(item); section.allItems.push(item); }
    return [...map.values()].filter((section) => section.groups.length || section.standaloneCalibrators.length || section.standaloneQc.length || section.consumables.length).sort((a,b) => a.name.localeCompare(b.name));
  }, [filter, record, search]);
  const collapseAll = () => setCollapsed(new Set(sections.map((section) => section.name)));
  const expandAll = () => setCollapsed(new Set());
  if (error && !record) return <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">{error}</div>;
  if (!record) return <div className="text-slate-400">Loading...</div>;
  const count = record.count; const canExport = ["Completed", "Exported"].includes(count.status) && !count.deleted_at;
  return <div className="mx-auto max-w-7xl space-y-5 pb-20">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-blue-400">BioPlex Inventory</p><h1 className="text-3xl font-semibold">{count.customers?.customer_name}</h1><p className="mt-1 text-slate-400">Counted {formatBioplexDate(count.counted_on)} · {count.status}</p></div><div className="flex flex-wrap gap-2">{canExport && <><button onClick={() => exportBioplexCountQuick(sessionId)} className="rounded-xl border border-emerald-700 px-3 py-2 text-emerald-300">Quick Excel</button><button onClick={() => exportBioplexCountDetailed(sessionId)} className="rounded-xl border border-blue-700 px-3 py-2 text-blue-300">Template Excel</button><button onClick={() => exportBioplexCountPdf(sessionId)} className="rounded-xl border border-purple-700 px-3 py-2 text-purple-300">PDF</button></>}{canEdit && <Link to={`/bioplex-inventory/${sessionId}/edit`} className="rounded-xl bg-blue-600 px-4 py-2">Edit</Link>}</div></header>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link to="/bioplex-inventory" className="-ml-2 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"><ArrowLeft size={18}/>Back</Link>
      <div className="flex items-center gap-2" aria-label="Section display controls">
        <button type="button" onClick={expandAll} disabled={!sections.length} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 px-3 text-sm text-slate-300 hover:border-blue-700 hover:bg-blue-950/30 hover:text-blue-200 disabled:opacity-50"><ChevronsDown size={16}/>Expand all</button>
        <button type="button" onClick={collapseAll} disabled={!sections.length || Boolean(search)} title={search ? "Clear search before collapsing all sections" : undefined} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 px-3 text-sm text-slate-300 hover:border-blue-700 hover:bg-blue-950/30 hover:text-blue-200 disabled:opacity-50"><ChevronsUp size={16}/>Collapse all</button>
      </div>
    </div>
    <section className="sticky top-2 z-20 rounded-2xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_16rem]"><input type="search" className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assay, material, or lot"/><SelectInput className={inputClass} value={filter} onChange={(event) => setFilter(event.target.value)}>{["All","Reagents","Calibrators","QC","Consumables","Missing quantity","Zero quantity"].map((value)=><option key={value}>{value}</option>)}</SelectInput></div></section>
    <section className="space-y-5">{sections.map((section) => { const closed = collapsed.has(section.name) && !search; const unique = [...new Map(section.allItems.map((item)=>[item.id,item])).values()]; const entered = unique.filter((item)=>item.quantity != null).length; return <article key={section.name} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"><button type="button" onClick={()=>setCollapsed((current)=>{const next=new Set(current);next.has(section.name)?next.delete(section.name):next.add(section.name);return next;})} className="asset-group-trigger flex w-full items-center justify-between bg-slate-900 p-4 text-left focus-visible:outline-none"><span className="flex items-center gap-2">{closed?<ChevronRight/>:<ChevronDown/>}<strong className="text-lg">{section.name}</strong></span><span className="rounded-full bg-slate-800 px-3 py-1 text-xs">{section.groups.length} groups · {entered}/{unique.length} quantities</span></button>{!closed && <div className="space-y-4 border-t border-slate-800 bg-slate-950/35 p-4">{section.groups.map((group)=><MatchingGroup key={group.reagent.id} group={group}/>) }<Standalone title="Standalone calibrators" items={section.standaloneCalibrators}/><Standalone title="Standalone QC" items={section.standaloneQc}/><Standalone title="Consumables" items={section.consumables}/></div>}</article>;})}</section>
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <button
        type="button"
        onClick={() => setAuditCollapsed((current) => !current)}
        aria-expanded={!auditCollapsed}
        aria-controls="bioplex-audit-history"
        className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-slate-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-500"
      >
        <span className="flex items-center gap-2">
          {auditCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
          <span className="text-xl font-semibold">Audit history</span>
        </span>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
          {record.events.length} {record.events.length === 1 ? "event" : "events"}
        </span>
      </button>
      {!auditCollapsed && (
        <div id="bioplex-audit-history" className="border-t border-slate-800 p-5 pt-2">
          {record.events.length ? record.events.map((event)=><div key={event.id} className="mt-3 rounded-xl bg-slate-950 p-3"><p className="font-medium">{event.event_type}</p><p className="text-sm text-slate-400">{event.reason || "No reason"}</p></div>) : <p className="mt-3 text-sm text-slate-500">No audit events recorded.</p>}
        </div>
      )}
    </section>
    <button onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} className="fixed bottom-5 right-4 rounded-full border border-slate-700 bg-slate-900 p-3 shadow-xl" aria-label="Back to top"><ArrowUp size={20}/></button>
  </div>;
}
function MatchingGroup({ group }) { return <article className="overflow-hidden rounded-2xl border border-blue-800/70 bg-slate-900"><div className="flex flex-col gap-2 bg-blue-950/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-300">Reagent kit</p><p className="mt-1 font-semibold">{group.reagent.product_name_snapshot}</p></div><span className="w-fit rounded-full border border-blue-700 bg-blue-950 px-3 py-1 text-xs text-blue-200">Matching group {group.number}</span></div><div className="p-4"><MaterialLine item={group.reagent} emphasis/><div className="mt-4 grid gap-4 lg:grid-cols-2"><LinkedPanel title="Matching calibrators" tone="cyan" empty="No matching calibrator recorded">{group.calibrators.map((entry)=><MaterialLine key={entry.item.id} item={entry.item} badge={entry.matchingReagentLots.length>1?"Shared calibrator":"Matched calibrator"} note={entry.matchingReagentLots.length>1?`Matches reagent lots: ${entry.matchingReagentLots.join(", ")}`:`Matches reagent lot ${lotOf(group.reagent)}`}/>)}</LinkedPanel><LinkedPanel title="Related QC" tone="violet" empty="No related QC recorded">{group.qc.map((entry)=><MaterialLine key={entry.item.id} item={entry.item} badge="Assay-compatible QC" note="Related by assay, not a direct lot-to-lot match"/>)}</LinkedPanel></div></div></article>; }
function LinkedPanel({title,tone,empty,children}) { const items=[].concat(children??[]).filter(Boolean); return <section className={`rounded-xl border p-3 ${tone==="cyan"?"border-cyan-900 bg-cyan-950/20":"border-violet-900 bg-violet-950/20"}`}><h3 className={`text-xs font-semibold uppercase tracking-wider ${tone==="cyan"?"text-cyan-300":"text-violet-300"}`}>{title}</h3><div className="mt-3 space-y-3">{items.length?items:<p className="text-sm text-slate-500">{empty}</p>}</div></section>; }
function Standalone({title,items}) { if(!items.length)return null; return <section><h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">{title}</h3><div className="grid gap-3 md:grid-cols-2">{items.map((item)=><div key={item.id} className="rounded-xl border border-dashed border-slate-700 bg-slate-900 p-4"><MaterialLine item={item}/></div>)}</div></section>; }
function MaterialLine({item,badge,note,emphasis=false}) { return <div className={emphasis?"rounded-xl border border-blue-900 bg-slate-950 p-4":"rounded-lg bg-slate-950/70 p-3"}><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">{item.product_name_snapshot}</h4>{badge&&<span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-300">{badge}</span>}</div><dl className="mt-3 grid gap-3 sm:grid-cols-3"><Info label="Lot" value={lotOf(item)}/><Info label="Expiry" value={formatBioplexDate(item.expiry_date)||"Not recorded"}/><Info label="Quantity" value={item.quantity==null?"Not entered":String(item.quantity)}/></dl>{note&&<p className="mt-3 text-xs text-slate-400">{note}</p>}</div>; }
function Info({label,value}) { return <div><dt className="text-xs uppercase text-slate-500">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>; }
