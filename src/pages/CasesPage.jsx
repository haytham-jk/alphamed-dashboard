import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronRight, RefreshCw, Search } from "lucide-react";
import { getSupportCases } from "../services/cases";
import {
  ACTIVE_CASE_STATUSES,
  CASE_PRIORITIES,
  CASE_STATUSES,
} from "../constants/caseOptions";
import { getDateUrgency } from "../utils/dateDisplay";
import PaginationControls from "../components/ui/PaginationControls";
const PAGE_SIZE = 20;
const STATUS_FILTERS = ["All", "Active", ...CASE_STATUSES];

const statusColors = {
  New: "border-slate-700 bg-slate-800 text-slate-200",
  Pending: "border-cyan-900 bg-cyan-950 text-cyan-300",
  "In Progress": "border-blue-900 bg-blue-950 text-blue-300",
  Escalated: "border-red-900 bg-red-950 text-red-300",
  Unresolved: "border-orange-900 bg-orange-950 text-orange-300",
  Resolved: "border-emerald-900 bg-emerald-950 text-emerald-300",
  Closed: "border-emerald-900 bg-emerald-950 text-emerald-300",
  Cancelled: "border-slate-700 bg-slate-800 text-slate-400",
};

const priorityColors = {
  Critical: "border-red-900 bg-red-950 text-red-200",
  High: "border-red-900 bg-red-950 text-red-300",
  Medium: "border-amber-900 bg-amber-950 text-amber-300",
  Low: "border-emerald-900 bg-emerald-950 text-emerald-300",
};

const priorityRank = Object.fromEntries(
  CASE_PRIORITIES.map((priority, index) => [priority, index])
);

const badgeClass =
  "inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium leading-none";

function validStatus(value) {
  return STATUS_FILTERS.includes(value) ? value : "Active";
}

function CaseRow({ record }) {
  const urgency = getDateUrgency(record.followUpDate);

  return (
    <Link
      to={`/cases/${record.databaseId}`}
      className="grid gap-3 border-b border-slate-800 p-5 last:border-0 hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400 lg:grid-cols-[minmax(0,2fr)_minmax(180px,1.2fr)_auto] lg:items-center"
    >
      <div className="min-w-0">
        <div className="font-semibold text-slate-100">{record.title}</div>
        <div className="mt-1 line-clamp-2 text-sm text-slate-500">
          {record.description}
        </div>
      </div>

      <div className="min-w-0">
        <div className="truncate text-slate-200">
          {record.customer || "Internal / No customer"}
        </div>
        <div className="text-sm text-slate-500">
          {record.emirate || "Emirate not recorded"}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <span
          className={`${badgeClass} ${
            statusColors[record.status] || statusColors.New
          }`}
        >
          {record.status || "New"}
        </span>
        <span className={`${badgeClass} ${urgency.className}`}>
          {urgency.label}
        </span>
      </div>
    </Link>
  );
}

export default function CasesPage({ canEdit }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cases, setCases] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = searchParams.get("q") || "";
  const status = validStatus(searchParams.get("status") || "Active");
  const escalatedOnly = searchParams.get("escalated") === "true";
  const sort = searchParams.get("sort") || "priority";
  const groupBy =
    searchParams.get("group") === "priority" ? "priority" : "none";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  function updateFilters(changes) {
    const next = new URLSearchParams(searchParams);
    if ("status" in changes) next.delete("escalated");

    Object.entries(changes).forEach(([key, value]) => {
      const shouldDelete =
        !value ||
        (key === "status" && value === "All") ||
        (key === "page" && Number(value) === 1) ||
        (key === "group" && value === "none");

      if (shouldDelete) next.delete(key);
      else next.set(key, String(value));
    });

    if (!("page" in changes)) next.delete("page");
    setSearchParams(next, { replace: true });
  }

  function loadCases() {
    setLoading(true);
    setError("");

    getSupportCases()
      .then(setCases)
      .catch((loadError) =>
        setError(loadError?.message || "Unable to load cases.")
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCases();
  }, []);

  const filteredCases = useMemo(() => {
    const search = query.trim().toLowerCase();

    const result = cases.filter((record) => {
      const values = [
        record.title,
        record.description,
        record.customer,
        ...(record.customerNames || []),
        ...(record.source || []),
      ];

      const matchesSearch =
        !search ||
        values.some((value) =>
          String(value || "").toLowerCase().includes(search)
        );

      const matchesStatus =
        status === "All" ||
        (status === "Active" &&
          ACTIVE_CASE_STATUSES.includes(record.status)) ||
        record.status === status;

      const escalationTarget = String(record.escalatedTo || "").trim();
      const matchesEscalation =
        !escalatedOnly ||
        (ACTIVE_CASE_STATUSES.includes(record.status) &&
          escalationTarget !== "" &&
          escalationTarget !== "None");

      return matchesSearch && matchesStatus && matchesEscalation;
    });

    return [...result].sort((first, second) => {
      if (sort === "oldest") {
        return String(first.caseCreatedOn || "").localeCompare(
          String(second.caseCreatedOn || "")
        );
      }
      if (sort === "newest") {
        return String(second.caseCreatedOn || "").localeCompare(
          String(first.caseCreatedOn || "")
        );
      }
      if (sort === "customer") {
        return String(first.customer || "").localeCompare(
          String(second.customer || "")
        );
      }
      if (sort === "followUp") {
        const firstUrgency = getDateUrgency(first.followUpDate);
        const secondUrgency = getDateUrgency(second.followUpDate);
        return (
          firstUrgency.rank - secondUrgency.rank ||
          String(first.followUpDate || "9999").localeCompare(
            String(second.followUpDate || "9999")
          )
        );
      }
      return (
        (priorityRank[first.priority] ?? 99) -
        (priorityRank[second.priority] ?? 99)
      );
    });
  }, [cases, escalatedOnly, query, sort, status]);

  const pageCount = Math.max(1, Math.ceil(filteredCases.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleCases = filteredCases.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const groups = useMemo(() => {
    const priorityGroups = CASE_PRIORITIES.map((priority) => ({
      priority,
      records: visibleCases.filter((record) => record.priority === priority),
    }));
    const uncategorized = visibleCases.filter(
      (record) => !CASE_PRIORITIES.includes(record.priority)
    );
    if (uncategorized.length) {
      priorityGroups.push({ priority: "Uncategorized", records: uncategorized });
    }
    return priorityGroups;
  }, [visibleCases]);

  function isExpanded(group) {
    return expandedGroups[group.priority] ?? group.records.length > 0;
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400" role="status">
        Loading cases...
      </div>
    );
  }

  return (
    <div className="space-y-5">

      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-blue-400">Workspace</p>
          <h1 className="text-3xl font-semibold">Cases</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadCases}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2"
          >
            <RefreshCw size={17} aria-hidden="true" />
            Refresh
          </button>
          {canEdit && (
            <Link
              to="/cases/new"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 py-2 font-medium text-white"
            >
              New case
            </Link>
          )}
        </div>
      </header>

      <section className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 xl:grid-cols-[minmax(280px,1fr)_170px_180px_190px]">
        <label>
          <span className="mb-2 block text-sm font-medium">Search cases</span>
          <div className="relative">
            <Search
              size={17}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-3 text-slate-500"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => updateFilters({ q: event.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-10 pr-3"
            />
          </div>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium">Status</span>
          <select
            value={status}
            onChange={(event) => updateFilters({ status: event.target.value })}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
          >
            {STATUS_FILTERS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium">View</span>
          <select
            value={groupBy}
            onChange={(event) => updateFilters({ group: event.target.value })}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
          >
            <option value="none">Flat list</option>
            <option value="priority">Group by priority</option>
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium">Sort by</span>
          <select
            value={sort}
            onChange={(event) => updateFilters({ sort: event.target.value })}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
          >
            <option value="priority">Priority</option>
            <option value="followUp">Follow-up urgency</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="customer">Customer</option>
          </select>
        </label>
      </section>

      <p className="text-sm text-slate-500" aria-live="polite">
        Showing {visibleCases.length} of {filteredCases.length} matching cases
      </p>

      {error && (
        <div
          className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300"
          role="alert"
        >
          {error}
        </div>
      )}

      {!error && visibleCases.length === 0 && (
        <div className="rounded-xl border border-slate-800 p-8 text-center text-slate-500">
          No cases match the selected filters.
        </div>
      )}

      {groupBy === "none" ? (
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          {visibleCases.map((record) => (
            <CaseRow key={record.databaseId} record={record} />
          ))}
        </section>
      ) : (
        <div className="space-y-4">
          {groups
            .filter((group) => group.records.length > 0)
            .map((group) => {
              const expanded = isExpanded(group);
              return (
                <section
                  key={group.priority}
                  className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedGroups((current) => ({
                        ...current,
                        [group.priority]: !expanded,
                      }))
                    }
                    aria-expanded={expanded}
                    className="flex w-full items-center justify-between gap-4 border-b border-slate-800 p-4 text-left"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {expanded ? (
                        <ChevronDown size={18} aria-hidden="true" />
                      ) : (
                        <ChevronRight size={18} aria-hidden="true" />
                      )}
                      <span
                        className={`${badgeClass} ${
                          priorityColors[group.priority] ||
                          "border-slate-700 bg-slate-800 text-slate-300"
                        }`}
                      >
                        {group.priority}
                      </span>
                    </div>
                    <span className="shrink-0 text-sm text-slate-400">
                      {group.records.length} cases
                    </span>
                  </button>

                  {expanded &&
                    group.records.map((record) => (
                      <CaseRow key={record.databaseId} record={record} />
                    ))}
                </section>
              );
            })}
        </div>
      )}

      <PaginationControls
        page={safePage}
        pageCount={pageCount}
        onPageChange={(nextPage) => updateFilters({ page: nextPage })}
      />
    </div>
  );
}
