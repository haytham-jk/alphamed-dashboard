import SelectInput from "../components/ui/SelectInput";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { getLinearityRecords } from "../services/linearity";
import {
  calculateDaysRemaining,
  calculateNextDueDate,
  formatFrequency,
  formatRemainingPeriod,
  getLinearityDueStatus,
} from "../utils/linearityDates";

const dueStatusStyles = {
  Overdue: "border-red-900 bg-red-950 text-red-300",
  "Due today": "border-red-900 bg-red-950 text-red-200",
  "Due soon": "border-amber-900 bg-amber-950 text-amber-300",
  "On schedule":
    "border-emerald-900 bg-emerald-950 text-emerald-300",
  "Not scheduled":
    "border-slate-700 bg-slate-800 text-slate-400",
  "Not required":
    "border-slate-700 bg-slate-800 text-slate-300",
};

export default function LinearityPage({ canEdit }) {
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState("");
  const [dueFilter, setDueFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getLinearityRecords()
      .then(setRecords)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    return records
      .map((record) => {
        const isNotRequired =
          String(record.status || "").trim().toLowerCase() ===
          "not required";

        if (isNotRequired) {
          return {
            ...record,
            isNotRequired: true,
            nextDueDate: null,
            daysRemaining: 0,
            dueStatus: "Not required",
          };
        }

        const nextDueDate = calculateNextDueDate(
          record.performed_date,
          record.frequency_months
        );
        const daysRemaining = calculateDaysRemaining(
          record.performed_date,
          record.frequency_months
        );

        return {
          ...record,
          isNotRequired: false,
          nextDueDate,
          daysRemaining,
          dueStatus: getLinearityDueStatus(daysRemaining),
        };
      })
      .sort((first, second) => {
        if (first.isNotRequired && !second.isNotRequired) return 1;
        if (!first.isNotRequired && second.isNotRequired) return -1;
        if (first.daysRemaining === null) return 1;
        if (second.daysRemaining === null) return -1;
        return first.daysRemaining - second.daysRemaining;
      });
  }, [records]);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((record) => {
      const values = [
        record.customers?.customer_name,
        record.instruments?.instrument_name,
        record.instrument_name_snapshot,
        record.instruments?.serial_number,
        record.serial_number_snapshot,
        record.linearity_lot_number,
      ];

      const matchesSearch =
        !search ||
        values.some((value) =>
          String(value || "").toLowerCase().includes(search)
        );

      const matchesDue =
        dueFilter === "All" ||
        record.dueStatus === dueFilter;

      return matchesSearch && matchesDue;
    });
  }, [rows, query, dueFilter]);

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400">
        Loading linearity records...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-blue-400">
            Quality schedule
          </p>
          <h1 className="text-3xl font-semibold">
            Linearity tracker
          </h1>
        </div>

        {canEdit && (
          <Link
            to="/linearity/new"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500"
          >
            <Plus size={18} />
            New record
          </Link>
        )}
      </div>

      <section className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search
            size={17}
            className="absolute left-3 top-3 text-slate-500"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search customer, instrument, serial number, or lot..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-10 pr-3 outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <SelectInput
          value={dueFilter}
          onChange={(event) => setDueFilter(event.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
        >
          <option>All</option>
          <option>Overdue</option>
          <option>Due today</option>
          <option>Due soon</option>
        </SelectInput>
      </section>

      <p className="text-sm text-slate-500">
        Showing {filteredRows.length} of {rows.length} records
      </p>

      {error && <div className="text-red-300">{error}</div>}

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
        <table className="w-full min-w-[1150px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="p-4">Customer</th>
              <th className="p-4">Instrument</th>
              <th className="p-4">Serial number</th>
              <th className="p-4">Last run</th>
              <th className="p-4">Frequency</th>
              <th className="p-4">Next due</th>
              <th className="p-4">Remaining</th>
              <th className="p-4">Due status</th>
            </tr>
          </thead>

          <tbody>
            {filteredRows.map((item) => {
              const destination = `/linearity/${item.id}/edit`;
              const remainingClass = item.isNotRequired
                ? "text-slate-300"
                : item.daysRemaining === null
                  ? "text-slate-500"
                  : item.daysRemaining < 0
                    ? "text-red-400"
                    : item.daysRemaining <= 30
                      ? "text-amber-400"
                      : "text-emerald-400";

              const cellClass = canEdit
                ? "block p-4"
                : "block p-4 cursor-default";

              function Cell({ children, className = "" }) {
                const content = (
                  <span className={`${cellClass} ${className}`}>
                    {children}
                  </span>
                );

                return (
                  <td className="p-0">
                    {canEdit ? (
                      <Link to={destination}>{content}</Link>
                    ) : (
                      content
                    )}
                  </td>
                );
              }

              return (
                <tr
                  key={item.id}
                  className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50"
                >
                  <Cell className="font-medium text-slate-100">
                    {item.customers?.customer_name ||
                      "Unassigned"}
                  </Cell>

                  <Cell className="font-medium text-slate-200">
                    {item.instruments?.instrument_name ||
                      item.instrument_name_snapshot ||
                      "Not specified"}
                  </Cell>

                  <Cell className="text-slate-400">
                    {item.instruments?.serial_number ||
                      item.serial_number_snapshot ||
                      "Not recorded"}
                  </Cell>

                  <Cell className="text-slate-300">
                    {item.isNotRequired
                      ? "N/A"
                      : item.performed_date || "Not recorded"}
                  </Cell>

                  <Cell>
                    <span className="rounded-full bg-blue-950 px-3 py-1 text-xs font-medium text-blue-300">
                      {item.isNotRequired
                        ? "N/A"
                        : formatFrequency(item.frequency_months)}
                    </span>
                  </Cell>

                  <Cell className="text-slate-300">
                    {item.isNotRequired
                      ? "N/A"
                      : item.nextDueDate || "Not scheduled"}
                  </Cell>

                  <Cell className={`font-semibold ${remainingClass}`}>
                    {item.isNotRequired
                      ? "0"
                      : formatRemainingPeriod(item.daysRemaining)}
                  </Cell>

                  <Cell>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                        dueStatusStyles[item.dueStatus] ||
                        "border-slate-700 bg-slate-800 text-slate-300"
                      }`}
                    >
                      {item.dueStatus}
                    </span>
                  </Cell>
                </tr>
              );
            })}

            {filteredRows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="p-12 text-center text-slate-500"
                >
                  No linearity records match the filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
