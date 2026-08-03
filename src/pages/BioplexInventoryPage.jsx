import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  FilePenLine,
  Plus,
  RefreshCw,
  RotateCcw,
  SearchCheck,
  Trash2,
  Upload,
} from "lucide-react";
import {
  deleteBioplexCount,
  getBioplexCounts,
  restoreBioplexCount,
} from "../services/bioplexInventory";
import { formatBioplexDate } from "../utils/bioplexDates";

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default function BioplexInventoryPage({ canEdit, profile }) {
  const isAdmin = profile?.role === "admin";
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [customerFilter, setCustomerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const result = await getBioplexCounts({
        includeDeleted: isAdmin && showDeleted,
      });
      setCounts(Array.isArray(result) ? result : []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load BioPlex inventory.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, showDeleted]);

  useEffect(() => {
    load();
  }, [load]);

  const customers = useMemo(
    () =>
      Array.from(
        new Map(
          counts
            .filter((row) => row.customers)
            .map((row) => [row.customer_id, row.customers.customer_name])
        ).entries()
      ),
    [counts]
  );

  const visible = counts.filter(
    (row) =>
      (!customerFilter || String(row.customer_id) === customerFilter) &&
      (!statusFilter || row.status === statusFilter) &&
      (showDeleted ? Boolean(row.deleted_at) : !row.deleted_at)
  );

  const activeCounts = counts.filter((row) => !row.deleted_at);

  async function remove(row) {
    const reason = window.prompt("Enter the deletion reason:");
    if (!reason?.trim()) return;
    try {
      await deleteBioplexCount(row.id, reason);
      await load();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function restore(row) {
    const reason = window.prompt("Enter the restoration reason:");
    if (!reason?.trim()) return;
    try {
      await restoreBioplexCount(row.id, reason);
      await load();
    } catch (restoreError) {
      setError(restoreError.message);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <p className="text-sm text-blue-400">BioPlex 2200</p>
          <h1 className="text-3xl font-semibold">BioPlex Management</h1>
          <p className="mt-1 text-slate-400">
            Persistent stock counts, matching tools, history, corrections, and exports.
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-2 self-start">
          <Link
            to="/bioplex-inventory/report"
            className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-700 px-4 text-slate-200"
          >
            <BarChart3 size={17} aria-hidden="true" />
            Reports
          </Link>
          <Link
            to="/bioplex-matching-check"
            className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-violet-700 bg-violet-950/30 px-4 text-violet-300"
          >
            <SearchCheck size={17} aria-hidden="true" />
            Matching Check
          </Link>
          {isAdmin && (
            <Link
              to="/bioplex-matching-imports"
              className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-amber-700 bg-amber-950/30 px-4 text-amber-300"
            >
              <Upload size={17} aria-hidden="true" />
              Imports
            </Link>
          )}
          <button
            type="button"
            onClick={load}
            className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-700 px-4 text-slate-300"
          >
            <RefreshCw size={17} aria-hidden="true" />
            Refresh
          </button>
          {canEdit && (
            <Link
              to="/bioplex-inventory/new"
              className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl bg-blue-600 px-4 font-medium text-white"
            >
              <Plus size={18} aria-hidden="true" />
              New count
            </Link>
          )}
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300" role="alert">
          {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active counts" value={activeCounts.length} />
        <Metric label="Draft" value={activeCounts.filter((row) => row.status === "Draft").length} />
        <Metric label="Completed" value={activeCounts.filter((row) => row.status === "Completed").length} />
        <Metric label="Exported" value={activeCounts.filter((row) => row.status === "Exported").length} />
      </section>

      <section className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-[minmax(16rem,1fr)_minmax(13rem,16rem)_auto] md:items-end">
        <label>
          <span className="mb-2 block text-sm font-medium">Customer</span>
          <select
            value={customerFilter}
            onChange={(event) => setCustomerFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 pr-12"
          >
            <option value="">All customers</option>
            {customers.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 pr-12"
          >
            <option value="">All statuses</option>
            <option value="Draft">Draft</option>
            <option value="Completed">Completed</option>
            <option value="Exported">Exported</option>
          </select>
        </label>

        {isAdmin && (
          <label className="flex h-10 items-center gap-2 whitespace-nowrap rounded-xl border border-slate-700 px-3">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(event) => setShowDeleted(event.target.checked)}
            />
            Show deleted only
          </label>
        )}
      </section>

      {loading ? (
        <div className="py-16 text-center text-slate-400" role="status">Loading BioPlex counts...</div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((row) => (
            <article key={row.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-blue-400">{row.customers?.customer_name || "Unknown customer"}</p>
                  <h2 className="mt-1 text-xl font-semibold">{formatBioplexDate(row.counted_on)}</h2>
                </div>
                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-300">
                  {row.deleted_at ? "Deleted" : row.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-400">{row.itemCount ?? 0} stock items</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {!row.deleted_at && (
                  <Link
                    to={`/bioplex-inventory/${row.id}`}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-700 px-3"
                  >
                    View
                  </Link>
                )}
                {canEdit && !row.deleted_at && (
                  <Link
                    to={`/bioplex-inventory/${row.id}/edit`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3"
                  >
                    <FilePenLine size={16} aria-hidden="true" />
                    Edit
                  </Link>
                )}
                {isAdmin && !row.deleted_at && (
                  <button
                    type="button"
                    onClick={() => remove(row)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-800 px-3 text-red-300"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Delete
                  </button>
                )}
                {isAdmin && row.deleted_at && (
                  <button
                    type="button"
                    onClick={() => restore(row)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-800 px-3 text-emerald-300"
                  >
                    <RotateCcw size={16} aria-hidden="true" />
                    Restore
                  </button>
                )}
              </div>
            </article>
          ))}
          {!visible.length && (
            <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center text-slate-400 md:col-span-2 xl:col-span-3">
              No BioPlex counts match the selected filters.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
