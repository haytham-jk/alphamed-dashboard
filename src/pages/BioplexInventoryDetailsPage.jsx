import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { getBioplexSession } from "../services/bioplexInventory";
import { formatDateOnly, getLocalDateOnly } from "../utils/dates";

export default function BioplexInventoryDetailsPage({ canEdit }) {
  const { sessionId } = useParams();
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getBioplexSession(sessionId)
      .then((result) => {
        if (active) setRecord(result);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to load the BioPlex stock count.");
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

  if (error) return <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">{error}</div>;
  if (!record) return <div className="text-slate-400">Loading BioPlex stock count...</div>;

  const { session, lines } = record;
  const sections = [
    ["Reagent kits", lines.filter((line) => line.material_type === "kit")],
    ["Calibrators", lines.filter((line) => line.material_type === "calibrator")],
    ["QC materials", lines.filter((line) => line.material_type === "qc")],
    ["General consumables", lines.filter((line) => line.material_type === "consumable")],
  ];

  return <div className="mx-auto max-w-5xl space-y-5">
    <Link to="/bioplex-inventory" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={18} aria-hidden="true" />Back to inventory</Link>
    <header className="flex items-end justify-between gap-3"><div><p className="text-sm text-blue-400">BioPlex Inventory</p><h1 className="text-3xl font-semibold">Stock-count details</h1></div>{canEdit && session.status === "Completed" && <Link to={`/bioplex-inventory/${session.id}/edit`} className="rounded-xl border border-blue-800 px-4 py-2 text-blue-300">Edit count</Link>}</header>
    <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-3">
      <Info label="Customer" value={session.customers?.customer_name || "Unknown customer"} />
      <Info label="Count date" value={formatDateOnly(session.counted_on)} />
      <Info label="Status" value={session.status} />
      <div className="sm:col-span-3"><Info label="Notes" value={session.notes || "No notes"} /></div>
    </section>
    {sections.map(([title, sectionLines]) => sectionLines.length > 0 && <section key={title} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <h2 className="border-b border-slate-800 p-4 text-xl font-semibold">{title}</h2>
      {sectionLines.map((line) => <Line key={line.id} line={line} />)}
    </section>)}
  </div>;
}

function Line({ line }) {
  const expired = Boolean(line.expiry_date && line.expiry_date < getLocalDateOnly());
  const review = line.verification_status === "Mismatch" || line.verification_status === "Manually Entered";
  return <article className="grid gap-3 border-b border-slate-800 p-4 last:border-b-0 md:grid-cols-[1.3fr_0.8fr_0.8fr_0.5fr_1fr] md:items-center">
    <div><p className="font-medium">{line.product_name_snapshot}</p><p className="text-sm text-slate-500">{line.assay_name_snapshot}</p></div>
    <Info label="Lot" value={line.lot_number || "Not recorded"} />
    <Info label="Expiry" value={line.expiry_date ? formatDateOnly(line.expiry_date) : "Not recorded"} />
    <Info label="Qty" value={line.quantity} />
    <div className={expired || review ? "flex items-center gap-2 text-amber-300" : "flex items-center gap-2 text-emerald-300"}>{expired || review ? <AlertTriangle size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}{expired ? "Expired" : line.verification_status}</div>
  </article>;
}

function Info({ label, value }) { return <div><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1">{value}</p></div>; }
