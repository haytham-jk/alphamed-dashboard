import { formatDateOnly } from "../utils/dateDisplay";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Plus,
  Search,
} from "lucide-react";
import { getAssets } from "../services/assets";
import { downloadCsv, formatCsvDate } from "../utils/csvExport";
import useAsyncResource from "../hooks/useAsyncResource";
import { ErrorState, LoadingState } from "../components/ui/AsyncState";

export default function AssetsPage({ canEdit }) {
  const loader = useCallback(({ signal }) => getAssets({ signal }), []);
  const { data: assets, loading, refreshing, error, retry } = useAsyncResource(loader, [loader], { initialData: [], fallbackError: "Unable to load assets." });
  const [query, setQuery] = useState("");
  const [view, setView] = useState("Active");
  const [expandedGroups, setExpandedGroups] = useState({});
  const [copyMessage, setCopyMessage] = useState("");
  const copyTimer = useRef(null);


  useEffect(() => {
  return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    };
  }, []);

  async function copySerialNumber(serialNumber) {
    try {
      await navigator.clipboard.writeText(serialNumber);
      setCopyMessage("Serial number copied");
    } catch {
      setCopyMessage("Unable to copy serial number");
    }
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopyMessage(""), 2200);
  }

  const filteredAssets = useMemo(() => {
    const search = query.trim().toLowerCase();

    return assets.filter((asset) => {
      const matchesView =
        view === "All" ||
        (view === "Active" && asset.is_active) ||
        (view === "Inactive" && !asset.is_active);

      const values = [
        asset.instrument_name,
        asset.serial_number,
        asset.customers?.customer_name,
        asset.customers?.emirate,
        asset.notes,
      ];

      const matchesSearch =
        !search ||
        values.some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(search)
        );

      return matchesView && matchesSearch;
    });
  }, [assets, query, view]);

  const groupedAssets = useMemo(() => {
    const groups = filteredAssets.reduce(
      (result, asset) => {
        const type =
          asset.instrument_name || "Unknown instrument";

        if (!result[type]) {
          result[type] = [];
        }

        result[type].push(asset);
        return result;
      },
      {}
    );

    return Object.entries(groups)
      .map(([instrumentType, records]) => ({
        instrumentType,
        records,
      }))
      .sort((first, second) =>
        first.instrumentType.localeCompare(
          second.instrumentType
        )
      );
  }, [filteredAssets]);

  function toggleGroup(instrumentType) {
    setExpandedGroups((current) => ({
      ...current,
      [instrumentType]: !current[instrumentType],
    }));
  }

  if (loading) return <LoadingState message="Loading assets..." />;
  if (!assets && error) return <ErrorState message={error} onRetry={retry} retrying={refreshing} />;

  return (
    <div className="space-y-5">
      {copyMessage && (
        <div role="status" aria-live="polite" className="fixed right-4 top-4 z-50 rounded-xl border border-blue-800 bg-blue-950 px-4 py-3 text-sm text-blue-200 shadow-xl">
          {copyMessage}
        </div>
      )}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-blue-400">
            Install base
          </p>
          <h1 className="text-3xl font-semibold">
            Assets
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => downloadCsv("assets.csv", ["Site Name", "Instrument", "Serial Number", "Installation Date"], filteredAssets.map((asset) => [asset.customers?.customer_name || "", asset.instrument_name || "", asset.serial_number || "", formatCsvDate(asset.installation_date)]))} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-slate-200"><Download size={18} />Export CSV</button>
        {canEdit && (
          <Link
            to="/assets/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white"
          >
            <Plus size={18} />
            New asset
          </Link>
        )}
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search
            size={17}
            className="absolute left-3 top-3 text-slate-500"
          />
          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Search customer, instrument, or serial number..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-10 pr-3 outline-none"
          />
        </div>

        <select
          value={view}
          onChange={(event) =>
            setView(event.target.value)
          }
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
        >
          <option>Active</option>
          <option>Inactive</option>
          <option>All</option>
        </select>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-fuchsia-950/60 via-slate-900 to-blue-950/60 p-4">
          <div className="text-sm text-slate-500">
            Visible assets
          </div>
          <div className="mt-1 text-3xl font-semibold">
            {filteredAssets.length}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-fuchsia-950/60 via-slate-900 to-blue-950/60 p-4">
          <div className="text-sm text-slate-500">
            Instrument types
          </div>
          <div className="mt-1 text-3xl font-semibold">
            {groupedAssets.length}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-fuchsia-950/60 via-slate-900 to-blue-950/60 p-4">
          <div className="text-sm text-slate-500">
            Inactive instruments
          </div>
          <div className="mt-1 text-3xl font-semibold">
            {assets.filter((asset) => !asset.is_active).length}
          </div>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={retry} retrying={refreshing} />}

      <div className="space-y-4">
        {groupedAssets.map((group) => {
          const expanded = Boolean(
            expandedGroups[group.instrumentType]
          );

          return (
            <section
              key={group.instrumentType}
              className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
            >
              <button
                type="button"
                onClick={() =>
                  toggleGroup(group.instrumentType)
                }
                className="asset-group-trigger flex w-full items-center justify-between gap-4 border-b border-slate-800 p-4 text-left transition-colors duration-150 focus-visible:outline-none"
              >
                <div className="flex items-center gap-3">
                  {expanded ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  )}

                  <div>
                    <div className="font-semibold">
                      {group.instrumentType}
                    </div>
                    <div className="text-sm text-slate-500">
                      {group.records.length} instruments
                    </div>
                  </div>
                </div>
              </button>

              {expanded && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="p-4">Customer</th>
                        <th className="p-4">Emirate</th>
                        <th className="p-4">Serial number</th>
                        <th className="p-4">Installation date</th>
                        <th className="p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.records.map((asset) => {
                        const needsAssignment =
                          !asset.is_active &&
                          !asset.customer_id;

                        const destination =
                          `/assets/${asset.id}/edit`;

                        return (
                          <tr
                            key={asset.id}
                            className={`border-b last:border-0 hover:bg-slate-800/40 ${
                              needsAssignment
                                ? "border-l-4 border-l-amber-500 border-y-amber-900/50 bg-amber-950/20"
                                : "border-slate-800"
                            }`}
                          >
                            <td className="p-0 font-medium">
                              <Link
                                to={destination}
                                className="block p-4"
                              >
                                <span className="inline-flex flex-wrap items-center gap-2">
                                  {asset.customers?.customer_name ||
                                    "Unused or unassigned"}

                                  {needsAssignment && (
                                    <span className="rounded-full border border-amber-800 bg-amber-950 px-2 py-0.5 text-xs font-medium text-amber-300">
                                      Needs assignment
                                    </span>
                                  )}
                                </span>
                              </Link>
                              {asset.related_case_count > 0 ? (
                                <Link to={`/cases?asset=${asset.id}&status=All`} className="mx-4 mb-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2 py-1 text-xs text-blue-300 hover:border-blue-600 hover:bg-blue-950/40">
                                  Related cases
                                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-900 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-blue-100">
                                    {asset.related_case_count}
                                  </span>
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => window.alert("No related Cases")}
                                  className="mx-4 mb-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2 py-1 text-xs text-blue-300 hover:border-blue-600 hover:bg-blue-950/40"
                                >
                                  Related cases
                                </button>
                              )}
                            </td>

                            <td className="p-0 text-slate-400">
                              <Link
                                to={destination}
                                className="block p-4"
                              >
                                {asset.customers?.emirate ||
                                  "Unknown"}
                              </Link>
                            </td>

                            <td className="p-4">
                              {asset.serial_number ? (
                                <button
                                  type="button"
                                  onClick={() => copySerialNumber(asset.serial_number)}
                                  aria-label={`Copy serial number ${asset.serial_number}`}
                                  title="Copy serial number"
                                  className="group inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 transition-colors hover:border-blue-500 hover:bg-blue-950 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                                >
                                  <Copy
                                    size={14}
                                    aria-hidden="true"
                                    className="transition-colors group-hover:text-blue-300"
                                  />
                                  {asset.serial_number}
                                </button>
                              ) : (
                                <Link to={destination} className="block text-slate-500">
                                  Not recorded
                                </Link>
                              )}
                            </td>

                            <td className="p-0">
                              <Link
                                to={destination}
                                className="block p-4"
                              >
                                {formatDateOnly(asset.installation_date)}
                              </Link>
                            </td>

                            <td className="p-0">
                              <Link
                                to={destination}
                                className="block p-4"
                              >
                                <span
                                  className={`rounded-full px-3 py-1 text-xs ${
                                    asset.is_active
                                      ? "bg-emerald-950 text-emerald-300"
                                      : "bg-slate-800 text-slate-400"
                                  }`}
                                >
                                  {asset.is_active
                                    ? "Active"
                                    : "Inactive"}
                                </span>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}

        {groupedAssets.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center text-slate-500">
            No assets match the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}
