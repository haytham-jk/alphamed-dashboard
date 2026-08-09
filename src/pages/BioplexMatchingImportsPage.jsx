import SelectInput from "../components/ui/SelectInput";
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Database, GitBranch, Upload } from "lucide-react";
import { parseBioplexMatchingWorkbook } from "../utils/bioplexMatchingWorkbook";
import {
  getActiveBioplexMatchingSnapshot,
  stageBioplexMatchingImport,
} from "../services/bioplexMatching";
import {
  buildParsedReviewModel,
  summarizeImportImpact,
} from "../utils/bioplexImportReviewModel";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2";

function Metric({ label, value, tone = "text-slate-100" }) {
  return <div><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-1 text-xl font-semibold ${tone}`}>{value}</p></div>;
}

function MergeMarker({ item }) {
  const ranges = [...new Set((item.inheritedMergedCells ?? []).map((cell) => cell.mergeRange))];
  if (!ranges.length) return <span className="text-slate-600">Direct cells</span>;
  return <span className="text-cyan-300" title={ranges.join(", ")}>Merged: {ranges.join(", ")}</span>;
}

export default function BioplexMatchingImportsPage() {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("Merge");
  const [parsed, setParsed] = useState(null);
  const [snapshot, setSnapshot] = useState({ lots: [], relationships: [] });
  const [view, setView] = useState("Relationships");
  const [search, setSearch] = useState("");
  const [replaceAcknowledged, setReplaceAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const model = useMemo(
    () => buildParsedReviewModel(parsed?.rows ?? [], snapshot),
    [parsed, snapshot]
  );
  const impact = useMemo(
    () => summarizeImportImpact(model, snapshot, mode),
    [model, snapshot, mode]
  );
  const visibleItems = useMemo(() => {
    const query = search.trim().toUpperCase();
    const source = view === "Materials" ? model.materials : model.relationships;
    if (!query) return source;
    return source.filter((item) => Object.values(item).some((value) =>
      typeof value === "string" && value.toUpperCase().includes(query)
    ));
  }, [model, search, view]);

  async function review() {
    if (!file) {
      setError("Select an .xlsx matching workbook.");
      fileRef.current?.focus();
      return;
    }
    try {
      setBusy(true);
      setError("");
      const [nextParsed, nextSnapshot] = await Promise.all([
        parseBioplexMatchingWorkbook(file),
        getActiveBioplexMatchingSnapshot(),
      ]);
      setParsed(nextParsed);
      setSnapshot(nextSnapshot);
      setReplaceAcknowledged(false);
    } catch (reviewError) {
      setError(reviewError.message || "Unable to review the workbook.");
    } finally {
      setBusy(false);
    }
  }

  async function stage() {
    if (!parsed) return;
    if (mode === "Replace" && !replaceAcknowledged) {
      setError("Acknowledge the Replace impact before continuing to database review.");
      return;
    }
    try {
      setBusy(true);
      setError("");
      const importId = await stageBioplexMatchingImport(file, parsed, mode);
      window.location.assign(`/bioplex-matching-imports/${importId}`);
    } catch (stageError) {
      setError(stageError.message || "Unable to stage the matching import.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="mx-auto max-w-7xl space-y-5">
    <Link to="/bioplex-inventory" className="-ml-2 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-400 hover:text-white focus-visible:ring-2 focus-visible:ring-blue-400"><ArrowLeft size={18}/>Back to BioPlex Management</Link>
    <header><p className="text-sm text-blue-400">BioPlex</p><h1 className="text-3xl font-semibold">Matching Imports</h1><p className="mt-1 text-slate-400">Workbook parsing and impact review do not change database data.</p></header>

    <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-[1fr_14rem_auto]">
      <input ref={fileRef} type="file" accept=".xlsx" className={inputClass} onChange={(event) => { setFile(event.target.files?.[0] ?? null); setParsed(null); }}/>
      <SelectInput className={inputClass} value={mode} onChange={(event) => { setMode(event.target.value); setReplaceAcknowledged(false); }}><option>Merge</option><option>Replace</option></SelectInput>
      <button type="button" disabled={busy} onClick={review} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium disabled:opacity-50"><Upload size={18}/>{busy ? "Reading..." : "Review workbook"}</button>
    </section>

    {error && <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300" role="alert">{error}</div>}

    {parsed && <>
      <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-2 lg:grid-cols-6">
        <Metric label="Materials" value={model.materials.length}/><Metric label="Relationships" value={model.relationships.length}/><Metric label="New materials" value={impact.newMaterials} tone="text-emerald-300"/><Metric label="New relationships" value={impact.newRelationships} tone="text-cyan-300"/><Metric label="Existing materials" value={impact.existingMaterials}/><Metric label="Existing relationships" value={impact.existingRelationships}/>
      </section>

      {mode === "Merge" ? <section className="rounded-2xl border border-blue-900 bg-blue-950/25 p-5"><div className="flex gap-3"><GitBranch className="mt-0.5 text-blue-300"/><div><h2 className="font-semibold text-blue-200">Merge impact</h2><p className="mt-1 text-sm text-slate-300">Merge preserves unrelated active matching data. New relationships between existing materials remain separate additions.</p></div></div></section> : <section className="space-y-4 rounded-2xl border border-amber-800 bg-amber-950/25 p-5"><div className="flex gap-3"><Database className="mt-0.5 text-amber-300"/><div><h2 className="font-semibold text-amber-200">Replace impact</h2><p className="mt-1 text-sm text-slate-300">Replace deactivates the entire current active matching dataset, then reactivates only approved data from this import.</p></div></div><div className="grid gap-3 sm:grid-cols-3"><Metric label="Lots to deactivate" value={impact.deactivateLots} tone="text-amber-300"/><Metric label="Relationships to deactivate" value={impact.deactivateRelationships} tone="text-amber-300"/><Metric label="Omitted assays" value={impact.omittedAssays.length} tone={impact.omittedAssays.length ? "text-red-300" : "text-slate-100"}/></div>{impact.omittedAssays.length > 0 && <p className="rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-200">Assays absent from this workbook: {impact.omittedAssays.join(", ")}</p>}<label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={replaceAcknowledged} onChange={(event) => setReplaceAcknowledged(event.target.checked)}/><span>I understand that Replace will deactivate current active lots and relationships that are not retained by the approved import.</span></label></section>}

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setView("Relationships")} className={`rounded-xl px-4 py-2 ${view === "Relationships" ? "bg-blue-600" : "border border-slate-700"}`}>Relationships ({model.relationships.length})</button><button type="button" onClick={() => setView("Materials")} className={`rounded-xl px-4 py-2 ${view === "Materials" ? "bg-blue-600" : "border border-slate-700"}`}>Materials ({model.materials.length})</button><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assay or lot" className={`${inputClass} ml-auto max-w-sm`}/></div>
        <div className="overflow-x-auto rounded-xl border border-slate-800"><table className="min-w-full text-sm"><thead className="bg-slate-950 text-left text-slate-400">{view === "Relationships" ? <tr><th className="p-3">Assay</th><th className="p-3">From</th><th className="p-3">To</th><th className="p-3">Classification</th><th className="p-3">Source</th><th className="p-3">Cell origin</th></tr> : <tr><th className="p-3">Assay</th><th className="p-3">Type</th><th className="p-3">Lot</th><th className="p-3">Classification</th><th className="p-3">Source</th><th className="p-3">Cell origin</th></tr>}</thead><tbody>{visibleItems.map((item) => view === "Relationships" ? <tr key={item.key} className="border-t border-slate-800"><td className="p-3">{item.assay}</td><td className="p-3 font-medium">{item.fromLot} <span className="text-slate-500">({item.fromType})</span></td><td className="p-3 font-medium">{item.toLot} <span className="text-slate-500">({item.toType})</span></td><td className="p-3">{item.classification}</td><td className="p-3">{[...new Set(item.sources)].join(", ")}</td><td className="p-3 text-xs"><MergeMarker item={item}/></td></tr> : <tr key={item.key} className="border-t border-slate-800"><td className="p-3">{item.assay}</td><td className="p-3">{item.materialType}</td><td className="p-3 font-medium">{item.lotNumber}</td><td className="p-3">{item.classification}</td><td className="p-3">{[...new Set(item.sources)].join(", ")}</td><td className="p-3 text-xs"><MergeMarker item={item}/></td></tr>)}</tbody></table></div>
      </section>

      <div className="flex justify-end"><button type="button" disabled={busy || (mode === "Replace" && !replaceAcknowledged)} onClick={stage} className="rounded-xl bg-emerald-600 px-5 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-50">Continue to database review</button></div>
    </>}
  </div>;
}
