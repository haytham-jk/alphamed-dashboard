import SelectInput from "../components/ui/SelectInput";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  Clock,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import { getDashboardCaseSummary, getSupportCases } from "../services/cases";
import {
  ACTIVE_CASE_STATUSES,
  CASE_PRIORITIES,
  CASE_STATUSES,
} from "../constants/caseOptions";
import { getDateUrgency } from "../utils/dateDisplay";
import { getLocalDateOnly } from "../utils/dates";
import PaginationControls from "../components/ui/PaginationControls";
import DashboardMetricCard from "../components/ui/DashboardMetricCard";
import { CASE_BADGE_CLASS, CASE_PRIORITY_COLORS, getCaseStatusClass } from "../constants/caseDisplay";
const PAGE_SIZE = 20;
const STATUS_FILTERS = ["All", "Active", ...CASE_STATUSES];


const priorityRank = Object.fromEntries(
  CASE_PRIORITIES.map((priority, index) => [priority, index])
);


function validStatus(value) {
  return STATUS_FILTERS.includes(value) ? value : "Active";
}

function CaseRow({ record, casesReturnTo }) {
  const urgency = getDateUrgency(record.followUpDate);

  return (
    <Link
      to={`/cases/${record.databaseId}`}
      state={{ casesReturnTo, focusCaseId: record.databaseId }}
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
          className={`${CASE_BADGE_CLASS} ${getCaseStatusClass(record.status)}`}
        >
          {record.status || "New"}
        </span>
        <span className={`${CASE_BADGE_CLASS} ${urgency.className}`}>
          {urgency.label}
        </span>
      </div>
    </Link>
  );
}

export default function CasesPage({ canEdit }) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cases, setCases] = useState([]);
  const [summary, setSummary] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = searchParams.get("q") || "";
  const status = validStatus(searchParams.get("status") || "Active");
  const escalatedOnly = searchParams.get("escalated") === "true";
  const overdueOnly = searchParams.get("overdue") === "true";
  const assetId = searchParams.get("asset") || "";
  const sort = searchParams.get("sort") || "priority";
  const groupBy =
    searchParams.get("group") === "priority" ? "priority" : "none";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  function updateFilters(changes) {
    const next = new URLSearchParams(searchParams);
    if ("status" in changes) {
      next.delete("escalated");
      next.delete("overdue");
    }

    Object.entries(changes).forEach(([key, value]) => {
      const shouldDelete =
        !value ||
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

    Promise.all([
      getSupportCases(),
      getDashboardCaseSummary(getLocalDateOnly()),
    ])
      .then(([caseRows, caseSummary]) => {
        setCases(Array.isArray(caseRows) ? caseRows : []);
        setSummary(caseSummary ?? {});
      })
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

      const urgency = getDateUrgency(record.followUpDate);
      const matchesOverdue =
        !overdueOnly ||
        (ACTIVE_CASE_STATUSES.includes(record.status) && urgency.rank === 0);

      const escalationTarget = String(record.escalatedTo || "").trim();
      const matchesEscalation =
        !escalatedOnly ||
        (ACTIVE_CASE_STATUSES.includes(record.status) &&
          escalationTarget !== "" &&
          escalationTarget !== "None");

      const matchesAsset = !assetId || (record.instrumentIds || []).some((instrumentId) => String(instrumentId) === assetId);
      return matchesSearch && matchesStatus && matchesEscalation && matchesOverdue && matchesAsset;
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
  }, [assetId, cases, escalatedOnly, overdueOnly, query, sort, status]);

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

  const casesReturnTo = `${location.pathname}${location.search}`;

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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          to="/cases?status=Active"
          icon={Activity}
          label="Active cases"
          value={summary.active ?? 0}
          note="Cases requiring attention"
          tone="bg-blue-950 text-blue-300"
        />
        <DashboardMetricCard
          to="/cases?status=Active&overdue=true&sort=followUp"
          icon={Clock}
          label="Overdue"
          value={summary.overdue ?? 0}
          note="Active cases past follow-up"
          tone="bg-red-950 text-red-300"
        />
        <DashboardMetricCard
          to="/cases?status=Unresolved"
          icon={AlertTriangle}
          label="Unresolved"
          value={summary.unresolved ?? 0}
          note="Cases not resolved"
          tone="bg-orange-950 text-orange-300"
        />
        <DashboardMetricCard
          to="/cases?status=Escalated"
          icon={ShieldAlert}
          label="Escalated"
          value={summary.escalated ?? 0}
          note="Cases with Escalated status"
          tone="bg-red-950 text-red-300"
        />
      </section>
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
          <SelectInput
            value={status}
            onChange={(event) => updateFilters({ status: event.target.value })}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
          >
            {STATUS_FILTERS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </SelectInput>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium">View</span>
          <SelectInput
            value={groupBy}
            onChange={(event) => updateFilters({ group: event.target.value })}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
          >
            <option value="none">Flat list</option>
            <option value="priority">Group by priority</option>
          </SelectInput>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium">Sort by</span>
          <SelectInput
            value={sort}
            onChange={(event) => updateFilters({ sort: event.target.value })}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
          >
            <option value="priority">Priority</option>
            <option value="followUp">Follow-up urgency</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="customer">Customer</option>
          </SelectInput>
        </label>
      </section>

      <p className="flex items-center gap-2 text-sm text-slate-400" aria-live="polite">
        <BriefcaseBusiness size={17} aria-hidden="true" />
        Showing <strong className="text-slate-200">{visibleCases.length}</strong> of{" "}
        <strong className="text-slate-200">{filteredCases.length}</strong> matching cases,{" "}
        <strong className="text-slate-200">{cases.length}</strong> total
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
            <CaseRow key={record.databaseId} record={record} casesReturnTo={casesReturnTo} />
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
                        className={`${CASE_BADGE_CLASS} ${
                          CASE_PRIORITY_COLORS[group.priority] ||
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
                      <CaseRow key={record.databaseId} record={record} casesReturnTo={casesReturnTo} />
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
