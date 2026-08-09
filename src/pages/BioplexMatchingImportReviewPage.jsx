import SelectInput from "../components/ui/SelectInput";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, ChevronUp, Save, Upload, XCircle } from "lucide-react";
import {
  bulkUpdateBioplexImportRows,
  commitBioplexImport,
  getActiveBioplexMatchingSnapshot,
  getBioplexImport,
  getBioplexImportBlockingRows,
  getBioplexImportRows,
  refreshBioplexImport,
  updateBioplexImportRow,
} from "../services/bioplexMatching";
import { formatBioplexDate } from "../utils/bioplexDates";
import { buildParsedReviewModel, summarizeImportImpact } from "../utils/bioplexImportReviewModel";

const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const FILTERS = ["All", "Blocking only", "Pending", "Valid", "Warning", "Exact Duplicate", "Possible Duplicate", "Conflict", "Invalid", "Excluded", "Resolved"];
const BLOCKING = new Set(["Pending", "Possible Duplicate", "Conflict", "Invalid"]);

function draftFromRow(row) {
  return {
    assayName: row.assay_name_raw ?? "",
    lotNumber: row.lot_number_raw ?? "",
    releaseDate: row.release_date ?? "",
    expiryDate: row.expiry_date ?? "",
    relatedLot: row.related_lot_raw ?? "",
    reviewStatus: row.review_status,
    proposedAction: row.proposed_action,
    resolutionNotes: row.resolution_notes ?? "",
  };
}
function isoToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function addDays(iso, days) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function statusClass(status) {
  if (["Invalid", "Conflict"].includes(status)) return "border-red-800 bg-red-950/40 text-red-300";
  if (["Warning", "Possible Duplicate", "Pending"].includes(status)) return "border-amber-800 bg-amber-950/30 text-amber-300";
  if (["Valid", "Resolved"].includes(status)) return "border-emerald-800 bg-emerald-950/30 text-emerald-300";
  return "border-slate-700 bg-slate-950 text-slate-300";
}

export default function BioplexMatchingImportReviewPage() {
  const { importId } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [importRecord, setImportRecord] = useState(null);
  const [snapshot, setSnapshot] = useState({ lots: [], relationships: [] });
  const [reviewView, setReviewView] = useState("Rows");
  const [replaceConfirmation, setReplaceConfirmation] = useState("");
  const [drafts, setDrafts] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [assayFilter, setAssayFilter] = useState("All");
  const [materialFilter, setMaterialFilter] = useState("All");
  const [dateField, setDateField] = useState("expiryDate");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datePreset, setDatePreset] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const headerCheckboxRef = useRef(null);
  const firstBlockingRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [result, nextImport, nextSnapshot] = await Promise.all([
        getBioplexImportRows(importId),
        getBioplexImport(importId),
        getActiveBioplexMatchingSnapshot(),
      ]);
      setRows(result);
      setImportRecord(nextImport);
      setSnapshot(nextSnapshot);
      setDrafts(Object.fromEntries(result.map((row) => [row.id, draftFromRow(row)])));
      setSelected(new Set());
    } catch (loadError) {
      setError(loadError.message || "Unable to load the import review.");
    } finally {
      setLoading(false);
    }
  }, [importId]);

  useEffect(() => { load(); }, [load]);

  const assays = useMemo(
    () => [...new Set(rows.map((row) => row.assay_name_raw).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const visibleRows = useMemo(() => {
    const today = isoToday();
    const expiredCutoff = addDays(today, -30);
    const upcomingCutoff = addDays(today, 30);
    const query = search.trim().toUpperCase();
    return rows.filter((row) => {
      const draft = drafts[row.id] ?? draftFromRow(row);
      if (statusFilter === "Blocking only") {
        const isBlocking = draft.proposedAction === "Review" || BLOCKING.has(draft.reviewStatus);
        if (!isBlocking) return false;
      } else if (statusFilter !== "All" && draft.reviewStatus !== statusFilter) return false;
      if (assayFilter !== "All" && row.assay_name_raw !== assayFilter) return false;
      if (materialFilter !== "All" && row.material_type !== materialFilter) return false;
      if (query && ![draft.lotNumber, draft.relatedLot, draft.assayName, row.sheet_name, row.cc_code_raw]
        .some((value) => String(value ?? "").toUpperCase().includes(query))) return false;
      const rowDate = draft[dateField] || "";
      if (datePreset === "No date" && rowDate) return false;
      if (datePreset === "Expired over 30 days" && (!rowDate || rowDate >= expiredCutoff)) return false;
      if (datePreset === "Expired within 30 days" && (!rowDate || rowDate < expiredCutoff || rowDate >= today)) return false;
      if (datePreset === "Expires in next 30 days" && (!rowDate || rowDate < today || rowDate > upcomingCutoff)) return false;
      if (dateFrom && (!rowDate || rowDate < dateFrom)) return false;
      if (dateTo && (!rowDate || rowDate > dateTo)) return false;
      return true;
    });
  }, [rows, drafts, statusFilter, assayFilter, materialFilter, dateField, dateFrom, dateTo, datePreset, search]);

  const visibleIds = useMemo(() => visibleRows.map((row) => row.id), [visibleRows]);
  const selectedVisibleCount = visibleIds.filter((id) => selected.has(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = selectedVisibleCount > 0 && !allVisibleSelected;
    }
  }, [selectedVisibleCount, allVisibleSelected]);

  const blockingRows = useMemo(
    () => rows.filter((row) => BLOCKING.has(drafts[row.id]?.reviewStatus) && drafts[row.id]?.proposedAction !== "Exclude"),
    [rows, drafts]
  );
  const summary = useMemo(() => {
    const result = { total: rows.length, visible: visibleRows.length, selected: selected.size, blocking: blockingRows.length, invalid: 0, duplicates: 0 };
    rows.forEach((row) => {
      const current = drafts[row.id]?.reviewStatus;
      if (current === "Invalid") result.invalid += 1;
      if (["Exact Duplicate", "Possible Duplicate"].includes(current)) result.duplicates += 1;
    });
    return result;
  }, [rows, drafts, visibleRows.length, selected.size, blockingRows.length]);

  const stagedModel = useMemo(
    () => buildParsedReviewModel(rows, snapshot),
    [rows, snapshot]
  );
  const impact = useMemo(
    () => summarizeImportImpact(stagedModel, snapshot, importRecord?.import_mode ?? "Merge"),
    [stagedModel, snapshot, importRecord]
  );

  function patch(rowId, changes) {
    setDrafts((current) => ({ ...current, [rowId]: { ...current[rowId], ...changes } }));
  }
  function toggleRow(rowId) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(rowId)) next.delete(rowId); else next.add(rowId);
      return next;
    });
  }
  function toggleVisible() {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }
  function applyLocal(ids, changes) {
    const idSet = new Set(ids);
    setRows((current) => current.map((row) => idSet.has(row.id) ? {
      ...row,
      review_status: changes.reviewStatus ?? row.review_status,
      proposed_action: changes.proposedAction ?? row.proposed_action,
      resolution_notes: changes.resolutionNotes ?? row.resolution_notes,
    } : row));
    setDrafts((current) => Object.fromEntries(Object.entries(current).map(([id, draft]) => [id, idSet.has(Number(id)) ? { ...draft, ...changes } : draft])));
  }

  async function bulkAction(action) {
    const ids = [...selected];
    if (!ids.length) { setError("Select at least one row first."); return; }
    const changes = action === "Exclude"
      ? { reviewStatus: "Excluded", proposedAction: "Exclude", resolutionNotes: "Excluded during bulk import review" }
      : action === "Skip duplicate"
        ? { reviewStatus: "Exact Duplicate", proposedAction: "Skip Duplicate", resolutionNotes: "Duplicate skipped during bulk import review" }
        : { reviewStatus: "Resolved", proposedAction: "Create", resolutionNotes: "Accepted during bulk import review" };
    try {
      setBusy(true);
      setError("");
      await bulkUpdateBioplexImportRows(ids, changes);
      await refreshBioplexImport(importId);
      applyLocal(ids, changes);
      setSelected(new Set());
    } catch (actionError) {
      setError(actionError.message || "Unable to apply the bulk action.");
    } finally {
      setBusy(false);
    }
  }

  async function saveRow(row) {
    const draft = drafts[row.id];
    if (!draft.assayName.trim() || !draft.lotNumber.trim()) {
      setError("Assay and lot number are required before resolving this row.");
      document.querySelector(`[data-row-id="${row.id}"] input:invalid`)?.focus();
      return;
    }
    try {
      setBusy(true);
      setError("");
      await updateBioplexImportRow(row.id, draft);
      await refreshBioplexImport(importId);
      applyLocal([row.id], draft);
      setEditingId(null);
    } catch (saveError) {
      setError(saveError.message || "Unable to save this review row.");
    } finally {
      setBusy(false);
    }
  }

  async function commitImport() {
    if (blockingRows.length) {
      setError(`Resolve or exclude ${blockingRows.length} blocking row${blockingRows.length === 1 ? "" : "s"} before importing.`);
      setStatusFilter("All");
      setDatePreset("All"); setDateFrom(""); setDateTo(""); setAssayFilter("All"); setMaterialFilter("All"); setSearch("");
      window.requestAnimationFrame(() => {
        firstBlockingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        firstBlockingRef.current?.querySelector("input, select, button")?.focus({ preventScroll: true });
      });
      return;
    }
    if (importRecord?.review_only) {
      setError(`This is a review-only copy of committed import ${importRecord.duplicate_of_import_id}. Final import is disabled.`);
      return;
    }
    if (importRecord?.import_mode === "Replace" && replaceConfirmation !== "REPLACE") {
      setError('Type REPLACE in the confirmation field before finalizing this replacement import.');
      return;
    }
    try {
      setBusy(true);
      setError("");
      await refreshBioplexImport(importId);
      const databaseBlockers = await getBioplexImportBlockingRows(importId);
      if (databaseBlockers.length) {
        const first = databaseBlockers[0];
        throw new Error(`The database still has ${databaseBlockers.length} blocking row${databaseBlockers.length === 1 ? "" : "s"}. First blocker: ${first.sheet_name}:${first.source_row_number}, ${first.review_status}, action ${first.proposed_action}.`);
      }
      await commitBioplexImport(importId);
      navigate("/bioplex-matching-check", { state: { message: "BioPlex matching data imported successfully." } });
    } catch (commitError) {
      setError(commitError.message || "Unable to commit the matching import.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="text-slate-400">Loading matching import review...</div>;
  return <div className="mx-auto max-w-[96rem] space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm text-blue-400">BioPlex Matching Imports</p><h1 className="text-3xl font-semibold">Review import {importId}</h1><p className="mt-1 text-sm text-slate-300">Mode: <strong>{importRecord?.import_mode ?? "Loading"}</strong></p><p className="mt-1 text-slate-400">Filter, select, and apply decisions to multiple rows without refreshing the page.</p>{importRecord?.review_only && <p className="mt-2 rounded-lg border border-cyan-800 bg-cyan-950/30 px-3 py-2 text-sm text-cyan-200">Review only. Duplicate of committed import {importRecord.duplicate_of_import_id}. This copy cannot be committed.</p>}</div>
      <Link to="/bioplex-matching-imports" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={18}/>Back to imports</Link>
    </header>
    {error && <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300" role="alert">{error}</div>}
    <section className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-3 lg:grid-cols-6">
      {Object.entries(summary).map(([key, value]) => <Metric key={key} label={key} value={value}/>) }
    </section>

    <section className={`space-y-4 rounded-2xl border p-5 ${importRecord?.import_mode === "Replace" ? "border-amber-800 bg-amber-950/20" : "border-blue-900 bg-blue-950/20"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setReviewView("Rows")} className={`rounded-xl px-4 py-2 ${reviewView === "Rows" ? "bg-blue-600" : "border border-slate-700"}`}>Review rows</button>
        <button type="button" onClick={() => setReviewView("Materials")} className={`rounded-xl px-4 py-2 ${reviewView === "Materials" ? "bg-blue-600" : "border border-slate-700"}`}>Materials ({stagedModel.materials.length})</button>
        <button type="button" onClick={() => setReviewView("Relationships")} className={`rounded-xl px-4 py-2 ${reviewView === "Relationships" ? "bg-blue-600" : "border border-slate-700"}`}>Relationships ({stagedModel.relationships.length})</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Metric label="New materials" value={impact.newMaterials}/><Metric label="Existing materials" value={impact.existingMaterials}/><Metric label="New relationships" value={impact.newRelationships}/><Metric label="Existing relationships" value={impact.existingRelationships}/><Metric label="Lots deactivated" value={impact.deactivateLots}/><Metric label="Links deactivated" value={impact.deactivateRelationships}/>
      </div>
      {importRecord?.import_mode === "Replace" && <><p className="text-sm text-amber-200">Replace deactivates the current active dataset before approved rows are committed. Omitted assays: {impact.omittedAssays.length ? impact.omittedAssays.join(", ") : "None"}.</p><label className="block max-w-sm text-sm">Type REPLACE before Final import<input className={`${inputClass} mt-2`} value={replaceConfirmation} onChange={(event) => setReplaceConfirmation(event.target.value)}/></label></>}
      {reviewView !== "Rows" && <div className="max-h-96 overflow-auto rounded-xl border border-slate-800"><table className="min-w-full text-sm"><thead className="sticky top-0 bg-slate-950 text-left text-slate-400"><tr><th className="p-3">Assay</th><th className="p-3">Material / From</th><th className="p-3">Related / To</th><th className="p-3">Classification</th><th className="p-3">Sources</th><th className="p-3">Merged source</th></tr></thead><tbody>{(reviewView === "Materials" ? stagedModel.materials : stagedModel.relationships).map((item) => <tr key={item.key} className="border-t border-slate-800"><td className="p-3">{item.assay}</td><td className="p-3 font-medium">{item.lotNumber ?? `${item.fromLot} (${item.fromType})`}</td><td className="p-3">{item.toLot ? `${item.toLot} (${item.toType})` : item.materialType}</td><td className="p-3">{item.classification}</td><td className="p-3">{[...new Set(item.sources)].join(", ")}</td><td className="p-3 text-cyan-300">{[...new Set((item.inheritedMergedCells ?? []).map((cell) => cell.mergeRange))].join(", ") || "Direct"}</td></tr>)}</tbody></table></div>}
    </section>

    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label>Search<input className={`${inputClass} mt-2`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Lot, assay, sheet, or code"/></label>
        <label>Status<SelectInput className={`${inputClass} mt-2`} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{FILTERS.map((value) => <option key={value}>{value}</option>)}</SelectInput></label>
        <label>Assay<SelectInput className={`${inputClass} mt-2`} value={assayFilter} onChange={(event) => setAssayFilter(event.target.value)}><option>All</option>{assays.map((value) => <option key={value}>{value}</option>)}</SelectInput></label>
        <label>Material<SelectInput className={`${inputClass} mt-2`} value={materialFilter} onChange={(event) => setMaterialFilter(event.target.value)}><option>All</option><option value="kit">Reagent kit</option><option value="calibrator">Calibrator</option><option value="qc">QC</option></SelectInput></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label>Date field<SelectInput className={`${inputClass} mt-2`} value={dateField} onChange={(event) => setDateField(event.target.value)}><option value="expiryDate">Expiry date</option><option value="releaseDate">Release date</option></SelectInput></label>
        <label>Date preset<SelectInput className={`${inputClass} mt-2`} value={datePreset} onChange={(event) => setDatePreset(event.target.value)}><option>All</option><option>Expired over 30 days</option><option>Expired within 30 days</option><option>Expires in next 30 days</option><option>No date</option></SelectInput></label>
        <label>From<input type="date" className={`${inputClass} mt-2`} value={dateFrom} onChange={(event) => setDateFrom(event.target.value)}/><span className="mt-1 block text-xs text-slate-500">{formatBioplexDate(dateFrom)}</span></label>
        <label>To<input type="date" className={`${inputClass} mt-2`} value={dateTo} onChange={(event) => setDateTo(event.target.value)}/><span className="mt-1 block text-xs text-slate-500">{formatBioplexDate(dateTo)}</span></label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { setStatusFilter("All"); setAssayFilter("All"); setMaterialFilter("All"); setDatePreset("All"); setDateFrom(""); setDateTo(""); setSearch(""); }} className="rounded-xl border border-slate-700 px-4 py-2">Clear filters</button>
        <span className="self-center text-sm text-slate-400">{visibleRows.length} shown from {rows.length} loaded rows</span>
      </div>
    </section>

    <section className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/95 p-4 shadow-xl backdrop-blur">
      <strong>{selected.size} selected</strong>
      <button disabled={busy || !selected.size} onClick={() => bulkAction("Exclude")} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-red-800 px-4 py-2 text-red-300 disabled:opacity-40"><XCircle size={17}/>Exclude selected</button>
      <button disabled={busy || !selected.size} onClick={() => bulkAction("Skip duplicate")} className="rounded-xl border border-amber-800 px-4 py-2 text-amber-300 disabled:opacity-40">Skip as duplicates</button>
      <button disabled={busy || !selected.size} onClick={() => bulkAction("Accept")} className="inline-flex items-center gap-2 rounded-xl border border-emerald-800 px-4 py-2 text-emerald-300 disabled:opacity-40"><Check size={17}/>Accept selected</button>
      <button type="button" disabled={busy || blockingRows.length > 0 || importRecord?.review_only || (importRecord?.import_mode === "Replace" && replaceConfirmation !== "REPLACE")} onClick={commitImport} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-50"><Upload size={18}/>Final import</button>
    </section>

    <div className="overflow-x-auto rounded-2xl border border-slate-800">
      <table className="min-w-[88rem] w-full text-sm">
        <thead className="bg-slate-950 text-left text-slate-400">
          <tr>
            <th className="w-12 p-3"><input ref={headerCheckboxRef} type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} aria-label="Select all filtered rows"/></th>
            <th className="p-3">Source</th><th className="p-3">Assay</th><th className="p-3">Type</th><th className="p-3">Lot</th><th className="p-3">Related lot</th><th className="p-3">Release</th><th className="p-3">Expiry</th><th className="p-3">Status</th><th className="p-3">Issues</th><th className="w-24 p-3">Edit</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => {
            const draft = drafts[row.id];
            const blocking = BLOCKING.has(draft?.reviewStatus) && draft?.proposedAction !== "Exclude";
            const open = editingId === row.id;
            return <FragmentRow key={row.id} row={row} draft={draft} blocking={blocking} open={open} selected={selected.has(row.id)} firstBlockingRef={firstBlockingRef} toggleRow={toggleRow} setEditingId={setEditingId} patch={patch} saveRow={saveRow} busy={busy}/>;
          })}
          {!visibleRows.length && <tr><td colSpan={11} className="p-10 text-center text-slate-400">No rows match the current filters.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>;
}

function FragmentRow({ row, draft, blocking, open, selected, firstBlockingRef, toggleRow, setEditingId, patch, saveRow, busy }) {
  return <>
    <tr ref={blocking && !firstBlockingRef.current ? firstBlockingRef : undefined} className={`border-t border-slate-800 ${selected ? "bg-blue-950/30" : blocking ? "bg-amber-950/15" : "bg-slate-900"}`}>
      <td className="p-3"><input type="checkbox" checked={selected} onChange={() => toggleRow(row.id)} aria-label={`Select ${row.sheet_name} row ${row.source_row_number}`}/></td>
      <td className="p-3 whitespace-nowrap">{row.sheet_name}:{row.source_row_number}</td>
      <td className="p-3">{draft?.assayName}</td><td className="p-3">{row.material_type}</td><td className="p-3 font-medium">{draft?.lotNumber}</td><td className="p-3">{draft?.relatedLot || ""}</td>
      <td className="p-3 whitespace-nowrap">{formatBioplexDate(draft?.releaseDate) || ""}</td><td className="p-3 whitespace-nowrap">{formatBioplexDate(draft?.expiryDate) || ""}</td>
      <td className="p-3"><span className={`inline-flex rounded-full border px-2 py-1 text-xs ${statusClass(draft?.reviewStatus)}`}>{draft?.reviewStatus}</span></td>
      <td className="max-w-64 truncate p-3 text-slate-400" title={row.issue_codes?.join(", ")}>{row.issue_codes?.join(", ") || "None"}</td>
      <td className="p-3"><button type="button" onClick={() => setEditingId(open ? null : row.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-1">{open ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}Edit</button></td>
    </tr>
    {open && <tr data-row-id={row.id} className="border-t border-slate-800 bg-slate-950"><td colSpan={11} className="p-5">
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Field label="Assay" required value={draft?.assayName} onChange={(value) => patch(row.id, { assayName: value })}/><Field label="Lot" required value={draft?.lotNumber} onChange={(value) => patch(row.id, { lotNumber: value })}/><Field label="Release date" type="date" value={draft?.releaseDate} onChange={(value) => patch(row.id, { releaseDate: value })}/><Field label="Expiry date" type="date" value={draft?.expiryDate} onChange={(value) => patch(row.id, { expiryDate: value })}/><Field label="Related lot" value={draft?.relatedLot} onChange={(value) => patch(row.id, { relatedLot: value })}/>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[12rem_14rem_1fr_auto]"><label>Status<SelectInput className={`${inputClass} mt-2`} value={draft?.reviewStatus} onChange={(event) => patch(row.id, { reviewStatus: event.target.value })}><option>Valid</option><option>Warning</option><option>Resolved</option><option>Excluded</option><option>Conflict</option><option>Invalid</option><option>Possible Duplicate</option><option>Exact Duplicate</option></SelectInput></label><label>Action<SelectInput className={`${inputClass} mt-2`} value={draft?.proposedAction} onChange={(event) => patch(row.id, { proposedAction: event.target.value })}><option>Create</option><option>Update</option><option>Keep Existing</option><option>Skip Duplicate</option><option>Exclude</option><option>Review</option></SelectInput></label><label>Resolution notes<textarea rows={2} className={`${inputClass} mt-2`} value={draft?.resolutionNotes} onChange={(event) => patch(row.id, { resolutionNotes: event.target.value })}/></label><button type="button" disabled={busy} onClick={() => saveRow(row)} className="mt-7 inline-flex h-fit items-center gap-2 rounded-xl bg-blue-600 px-4 py-2"><Save size={17}/>Save</button></div>
    </td></tr>}
  </>;
}
function Field({ label, value = "", onChange, type = "text", required = false }) { return <label>{label}<input required={required} type={type} className={`${inputClass} mt-2`} value={value ?? ""} onChange={(event) => onChange(event.target.value)}/></label>; }
function Metric({ label, value }) { return <div><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>; }
