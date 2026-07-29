import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { getBioplexComparison, getBioplexCustomers } from "../services/bioplexInventory";

export default function BioplexInventoryReportPage() {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [comparison, setComparison] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getBioplexCustomers().then(setCustomers).catch((loadError) => setError(loadError.message));
  }, []);

  useEffect(() => {
    if (!customerId) {
      setComparison(null);
      return;
    }
    getBioplexComparison(customerId).then(setComparison).catch((loadError) => setError(loadError.message));
  }, [customerId]);

  const totals = useMemo(() => {
    const rows = comparison?.rows ?? [];
    return {
      increased: rows.filter((row) => row.change > 0).length,
      decreased: rows.filter((row) => row.change < 0).length,
      newItems: rows.filter((row) => row.previousQuantity === null).length,
      missing: rows.filter((row) => row.currentQuantity === null).length,
    };
  }, [comparison]);

  return <div className="space-y-5">
    <Link to="/bioplex-inventory" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={18} />Back to inventory</Link>
    <header><p className="text-sm text-blue-400">BioPlex Inventory</p><h1 className="text-3xl font-semibold">Visit comparison</h1></header>
    <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
      <option value="">Select customer</option>
      {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
    </select>
    {error && <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">{error}</div>}
    {comparison && <>
      <section className="grid gap-3 sm:grid-cols-4">
        <Metric label="Increased" value={totals.increased} /><Metric label="Decreased" value={totals.decreased} /><Metric label="New" value={totals.newItems} /><Metric label="Not recorded now" value={totals.missing} />
      </section>
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        {comparison.rows.map((row) => <div key={row.key} className="grid gap-3 border-b border-slate-800 p-4 last:border-0 md:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr]">
          <div><p className="font-medium">{row.productName}</p><p className="text-sm text-slate-500">{row.assayName} · {row.lotNumber || "No lot"}</p></div>
          <Cell label="Previous" value={row.previousQuantity ?? "Not recorded"} />
          <Cell label="Current" value={row.currentQuantity ?? "Not recorded"} />
          <div className={row.change > 0 ? "text-emerald-300" : row.change < 0 ? "text-amber-300" : "text-slate-400"}>{row.change > 0 ? <TrendingUp className="inline" size={17} /> : row.change < 0 ? <TrendingDown className="inline" size={17} /> : null} {row.change ?? "N/A"}</div>
        </div>)}
      </div>
    </>}
  </div>;
}
function Metric({ label, value }) { return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>; }
function Cell({ label, value }) { return <div><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-1">{value}</p></div>; }
