import { useEffect, useState } from "react";
import { ArrowLeft, FilePenLine } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getAssetDetails } from "../services/assets";
import { formatDateOnly } from "../utils/dateDisplay";
import { isExpectedAbortError } from "../utils/requestErrors";

export default function AssetDetailsPage({ canEdit }) {
  const { assetId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    getAssetDetails(assetId, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((loadError) => {
        if (!isExpectedAbortError(loadError)) {
          setError(loadError.message || "Unable to load asset details.");
        }
      });
    return () => controller.abort();
  }, [assetId]);

  if (error) return <div role="alert" className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">{error}</div>;
  if (!data) return <p className="text-slate-400" role="status">Loading asset details...</p>;

  const { asset, cases, ownership } = data;
  return <div className="mx-auto max-w-6xl space-y-5">
    <div className="flex items-center justify-between gap-3">
      <Link to="/assets" state={{ focusAssetId: String(asset.id) }} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2"><ArrowLeft size={18}/>Back to assets</Link>
      {canEdit && <Link to={`/assets/${asset.id}/edit`} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2"><FilePenLine size={17}/>Edit asset</Link>}
    </div>
    <header><p className="text-sm text-blue-400">Installed base</p><h1 className="text-3xl font-semibold">{asset.instrument_name}</h1><p className="mt-1 text-slate-400">SN: {asset.serial_number || "Not recorded"} · {asset.is_active ? "Active" : "Inactive"}</p></header>
    <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-2 lg:grid-cols-4">
      <Info label="Current customer" value={asset.customer_name || "Unassigned"}/><Info label="Emirate" value={asset.emirate || "Not recorded"}/><Info label="Installed" value={formatDateOnly(asset.installation_date) || "Not recorded"}/><Info label="Related cases" value={String(cases.length)}/>
    </section>
    <Section title="Case history">{cases.length ? <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="text-left text-slate-400"><tr>{["Case","Date","Title","Source","Priority","Status","Customer"].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{cases.map((item) => <tr key={item.id} className="border-t border-slate-800"><td className="p-3"><Link className="text-blue-300" to={`/cases/${item.id}`}>{item.case_reference || item.case_number || `Case ${item.id}`}</Link></td><td className="p-3">{formatDateOnly(item.case_created_on)}</td><td className="p-3">{item.case_title}</td><td className="p-3">{Array.isArray(item.source) ? item.source.join(", ") : item.source || ""}</td><td className="p-3">{item.priority}</td><td className="p-3">{item.status}</td><td className="p-3">{item.customer_name || "Internal"}</td></tr>)}</tbody></table></div> : <p className="text-slate-500">No cases are linked to this asset.</p>}</Section>
    <Section title="Customer ownership history"><div className="space-y-3">{ownership.map((item) => <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex justify-between gap-2"><strong>{item.customer_name || `Customer ${item.customer_id}`}</strong><span className={item.ended_at ? "text-slate-400" : "text-emerald-300"}>{item.ended_at ? "Previous" : "Current"}</span></div><p className="mt-2 text-sm text-slate-400">{new Date(item.assigned_at).toLocaleString()} → {item.ended_at ? new Date(item.ended_at).toLocaleString() : "Present"}</p>{item.change_reason && <p className="mt-2 text-sm">{item.change_reason}</p>}</article>)}{!ownership.length && <p className="text-slate-500">No customer ownership period is recorded.</p>}</div></Section>
  </div>;
}
function Info({ label, value }) { return <div><dt className="text-xs uppercase text-slate-500">{label}</dt><dd className="mt-1">{value}</dd></div>; }
function Section({ title, children }) { return <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="mb-4 text-xl font-semibold">{title}</h2>{children}</section>; }
