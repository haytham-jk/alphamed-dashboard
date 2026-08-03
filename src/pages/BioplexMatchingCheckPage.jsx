import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarClock, Search } from "lucide-react";
import {
  correctBioplexLotExpiry,
  findBioplexMatches,
  getBioplexLotEvents,
} from "../services/bioplexMatching";
import { formatBioplexDate } from "../utils/bioplexDates";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

function normalizeDashboardResults(rows) {
  const filtered = (rows ?? [])
    .filter((row) => {
      if (row.material_type === "kit") {
        return !row.related_lot_id || (
          row.relationship_type === "kit_calibrator" &&
          row.related_material_type === "calibrator"
        );
      }
      if (row.material_type === "calibrator") {
        return !row.related_lot_id || (
          row.relationship_type === "kit_calibrator" &&
          row.related_material_type === "kit"
        );
      }
      return row.material_type === "qc";
    })
    .map((row) => row.material_type === "qc" ? {
      ...row,
      related_lot_id: null,
      related_material_type: null,
      related_lot_number: null,
      related_expiry_date: null,
      relationship_type: null,
    } : row);

  return filtered.filter((row, index, allRows) => {
    const key = `${row.lot_id}|${row.related_lot_id ?? "none"}|${row.relationship_type ?? "none"}`;
    return allRows.findIndex((candidate) =>
      `${candidate.lot_id}|${candidate.related_lot_id ?? "none"}|${candidate.relationship_type ?? "none"}` === key
    ) === index;
  });
}

export default function BioplexMatchingCheckPage({ profile }) {
  const [lot, setLot] = useState("");
  const [type, setType] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [history, setHistory] = useState([]);
  const lotRef = useRef(null);
  const isAdmin = profile?.role === "admin";

  async function search(event) {
    event?.preventDefault();
    if (!lot.trim()) {
      setError("Enter a reagent, calibrator, or QC lot number.");
      lotRef.current?.focus();
      return;
    }
    try {
      setBusy(true);
      setError("");
      const matches = await findBioplexMatches(lot, type, false);
      setResults(normalizeDashboardResults(matches));
    } catch (searchError) {
      setError(searchError.message || "Unable to check this lot number.");
    } finally {
      setBusy(false);
    }
  }

  async function openEditor(target) {
    try {
      setHistory(await getBioplexLotEvents(target.id));
      setEditing({ ...target, expiryDate: target.expiryDate || "", reason: "" });
    } catch (historyError) {
      setError(historyError.message || "Unable to load the expiry correction history.");
    }
  }

  async function saveExpiry() {
    if (!editing.reason.trim()) {
      setError("Enter a reason for the expiry-date correction.");
      document.querySelector("[data-expiry-reason]")?.focus();
      return;
    }
    try {
      setBusy(true);
      setError("");
      await correctBioplexLotExpiry(editing.id, editing.expiryDate, editing.reason);
      setEditing(null);
      await search();
    } catch (saveError) {
      setError(saveError.message || "Unable to update the expiry date.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="mx-auto max-w-5xl space-y-5"><Link to="/bioplex-inventory" className="-ml-2 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><ArrowLeft size={18} aria-hidden="true" />Back to BioPlex Management</Link>
    <header>
      <p className="text-sm text-blue-400">BioPlex</p>
      <h1 className="text-3xl font-semibold">Matching Check</h1>
      <p className="mt-1 text-slate-400">Reagents show calibrators, calibrators show reagents, and QC searches show QC details only.</p>
    </header>

    <form onSubmit={search} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-[1fr_13rem_auto]">
      <input ref={lotRef} className={inputClass} value={lot} onChange={(event) => setLot(event.target.value)} placeholder="Enter any lot number"/>
      <select className={inputClass} value={type} onChange={(event) => setType(event.target.value)}>
        <option value="">All material types</option>
        <option value="kit">Reagent</option>
        <option value="calibrator">Calibrator</option>
        <option value="qc">QC</option>
      </select>
      <button disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl bg-blue-600 px-5 py-2 font-medium disabled:opacity-50">
        <Search size={18}/>{busy ? "Checking..." : "Check"}
      </button>
    </form>

    {error && <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">{error}</div>}
    {!busy && lot.trim() && !error && !results.length && <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">No active BioPlex matching record was found for this lot number.</div>}

    <div className="space-y-3">
      {results.map((row, index) => <article key={`${row.lot_id}-${row.related_lot_id ?? "none"}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-blue-400">{row.assay_name}</p>
            <h2 className="text-xl font-semibold">{row.product_name || row.material_type}</h2>
            <p className="mt-1 text-slate-300">Lot {row.lot_number}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-950 px-3 py-1 text-sm text-emerald-300">{row.material_type}</span>
            {isAdmin && <button type="button" onClick={() => openEditor({ id: row.lot_id, label: `${row.material_type} ${row.lot_number}`, expiryDate: row.expiry_date })} className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-800 px-3 py-2 text-sm text-blue-300"><CalendarClock size={16}/>Edit expiry</button>}
          </div>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <Info label="Release date" value={formatBioplexDate(row.release_date) || "Not recorded"}/>
          <Info label="Expiry date" value={formatBioplexDate(row.expiry_date) || "Not recorded"}/>
          <Info label="Source import" value={row.source_import_id ? `Import ${row.source_import_id}` : "Manual"}/>
        </dl>
        {row.related_lot_id && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-950 p-4">
          <div>
            <p className="text-xs uppercase text-slate-500">Matching material</p>
            <p className="mt-1 font-medium">{row.related_material_type}: {row.related_lot_number}</p>
            <p className="mt-1 text-sm text-slate-400">Expiry: {formatBioplexDate(row.related_expiry_date) || "Not recorded"}</p>
          </div>
          {isAdmin && <button type="button" onClick={() => openEditor({ id: row.related_lot_id, label: `${row.related_material_type} ${row.related_lot_number}`, expiryDate: row.related_expiry_date })} className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-800 px-3 py-2 text-sm text-blue-300"><CalendarClock size={16}/>Edit expiry</button>}
        </div>}
      </article>)}
    </div>

    {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Correct expiry date</h2>
        <p className="mt-1 text-slate-400">{editing.label}</p>
        <label className="mt-5 block">Expiry date<input type="date" className={`${inputClass} mt-2`} value={editing.expiryDate} onChange={(event) => setEditing((current) => ({ ...current, expiryDate: event.target.value }))}/><span className="mt-1 block text-xs text-slate-500">{formatBioplexDate(editing.expiryDate) || "No expiry date"}</span></label>
        <label className="mt-4 block">Correction reason<textarea data-expiry-reason rows={3} className={`${inputClass} mt-2`} value={editing.reason} onChange={(event) => setEditing((current) => ({ ...current, reason: event.target.value }))}/></label>
        {history.length > 0 && <div className="mt-4 max-h-40 overflow-auto rounded-xl border border-slate-800 p-3"><p className="text-sm font-medium">Previous corrections</p>{history.map((event) => <div key={event.id} className="mt-2 text-sm text-slate-400">{formatBioplexDate(event.previous_expiry_date) || "Blank"} → {formatBioplexDate(event.new_expiry_date) || "Blank"}: {event.reason}</div>)}</div>}
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="h-10 rounded-xl border border-slate-700 px-4">Cancel</button><button type="button" disabled={busy} onClick={saveExpiry} className="h-10 rounded-xl bg-blue-600 px-4 font-medium disabled:opacity-50">Save correction</button></div>
      </div>
    </div>}
  </div>;
}

function Info({ label, value }) {
  return <div><dt className="text-xs uppercase text-slate-500">{label}</dt><dd className="mt-1">{value}</dd></div>;
}
