import SelectInput from "../components/ui/SelectInput";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, RefreshCw, Search } from "lucide-react";
import { getTrainingRecords } from "../services/training";
import { formatDateOnly } from "../utils/dateDisplay";
import PaginationControls from "../components/ui/PaginationControls";
const PAGE_SIZE = 20;

export default function TrainingPage({ canEdit }) {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function loadRecords() {
    setLoading(true);
    setError("");

    getTrainingRecords()
      .then(setRecords)
      .catch((loadError) =>
        setError(loadError?.message || "Unable to load training records.")
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, sort]);

  const filteredRecords = useMemo(() => {
    const search = query.trim().toLowerCase();

    const result = records.filter((record) => {
      const values = [
        record.title,
        record.customers?.customer_name,
        record.instruments?.instrument_name,
        record.instrument_name_snapshot,
        record.instruments?.serial_number,
        record.serial_number_snapshot,
        ...(record.attendees || []),
        record.notes,
      ];

      return (
        !search ||
        values.some((value) =>
          String(value || "").toLowerCase().includes(search)
        )
      );
    });

    return [...result].sort((first, second) => {
      if (sort === "customer") {
        return String(first.customers?.customer_name || "").localeCompare(
          String(second.customers?.customer_name || "")
        );
      }

      if (sort === "oldest") {
        return String(first.training_date || "").localeCompare(
          String(second.training_date || "")
        );
      }

      return String(second.training_date || "").localeCompare(
        String(first.training_date || "")
      );
    });
  }, [query, records, sort]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredRecords.length / PAGE_SIZE)
  );
  const safePage = Math.min(page, pageCount);
  const visibleRecords = filteredRecords.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function openRecord(recordId) {
    if (canEdit) navigate(`/training/${recordId}/edit`);
  }

  function handleRowKeyDown(event, recordId) {
    if (!canEdit) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openRecord(recordId);
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400" role="status">
        Loading training records...
      </div>
    );
  }

  return (
    <div className="space-y-5">

      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-blue-400">Customer development</p>
          <h1 className="text-3xl font-semibold">Training Records</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadRecords}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2"
          >
            <RefreshCw size={17} aria-hidden="true" />
            Refresh
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => navigate("/training/new")}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white"
            >
              <Plus size={18} aria-hidden="true" />
              New training
            </button>
          )}
        </div>
      </header>

      <section className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-[minmax(0,1fr)_190px]">
        <label>
          <span className="mb-2 block text-sm font-medium">
            Search training records
          </span>
          <div className="relative">
            <Search
              size={17}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-3 text-slate-500"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-10 pr-3"
            />
          </div>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium">Sort by</span>
          <SelectInput
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="customer">Customer</option>
          </SelectInput>
        </label>
      </section>

      {error && (
        <div
          className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300"
          role="alert"
        >
          {error}
        </div>
      )}

      <p className="text-sm text-slate-500" aria-live="polite">
        Showing {visibleRecords.length} of {filteredRecords.length} records
      </p>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
        <table className="w-full min-w-[680px] table-fixed text-sm">
          <colgroup>
            <col className="w-[46%]" />
            <col className="w-[36%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="p-4">Training and customer</th>
              <th className="p-4">Instrument</th>
              <th className="p-4">Training date</th>
            </tr>
          </thead>
          <tbody>
            {visibleRecords.map((record) => (
              <tr
                key={record.id}
                onClick={() => openRecord(record.id)}
                onKeyDown={(event) =>
                  handleRowKeyDown(event, record.id)
                }
                tabIndex={canEdit ? 0 : undefined}
                role={canEdit ? "link" : undefined}
                aria-label={
                  canEdit ? `Edit training record ${record.title}` : undefined
                }
                className={`border-b border-slate-800 last:border-0 ${
                  canEdit
                    ? "cursor-pointer hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400"
                    : ""
                }`}
              >
                <td className="p-4 align-top">
                  <div className="font-medium text-slate-100">
                    {record.title}
                  </div>
                  <div className="mt-1 text-slate-500">
                    {record.customers?.customer_name || "No customer"}
                  </div>
                </td>

                <td className="p-4 align-top text-slate-200">
                  <div className="truncate">
                    {record.instruments?.instrument_name ||
                      record.instrument_name_snapshot ||
                      "Not specified"}
                  </div>
                  <div className="mt-1 truncate text-slate-500">
                    S/N {record.instruments?.serial_number ||
                      record.serial_number_snapshot ||
                      "Not recorded"}
                  </div>
                </td>

                <td className="p-4 align-top whitespace-nowrap text-slate-300">
                  {formatDateOnly(record.training_date, "No date")}
                </td>
              </tr>
            ))}

            {!visibleRecords.length && (
              <tr>
                <td
                  colSpan={3}
                  className="p-12 text-center text-slate-500"
                >
                  No training records match the search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PaginationControls
        page={safePage}
        pageCount={pageCount}
        onPageChange={setPage}
      />
    </div>
  );
}
