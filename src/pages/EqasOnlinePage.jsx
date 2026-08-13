import SelectInput from "../components/ui/SelectInput";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Copy, ExternalLink, Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import PaginationControls from "../components/ui/PaginationControls";
import { getEqasOnlineRecords } from "../services/eqasOnline";

const PAGE_SIZE = 20;

function groupRecordsByCustomer(records) {
  const groups = new Map();

  for (const record of records) {
    const key = String(record.customer_id);
    const current = groups.get(key) ?? {
      customerId: record.customer_id,
      customerName: record.customer_name || "Unassigned customer",
      emirate: record.emirate || "",
      records: [],
    };

    current.records.push(record);
    groups.set(key, current);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      records: [...group.records].sort((first, second) =>
        String(first.lab_number || "").localeCompare(
          String(second.lab_number || ""),
          undefined,
          { numeric: true, sensitivity: "base" }
        )
      ),
    }))
    .sort((first, second) =>
      first.customerName.localeCompare(second.customerName)
    );
}

export default function EqasOnlinePage({ canEdit }) {
  const timerRef = useRef(null);
  const pageTopRef = useRef(null);
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [expandedCustomerIds, setExpandedCustomerIds] = useState(new Set());

  useEffect(() => {
    getEqasOnlineRecords()
      .then(setRecords)
      .catch((loadError) =>
        setError(loadError?.message || "Unable to load EQAS records.")
      )
      .finally(() => setLoading(false));

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => setPage(1), [query, customerFilter]);

  useLayoutEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;
        pageTopRef.current?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [page]);

  const customerGroups = useMemo(
    () => groupRecordsByCustomer(records),
    [records]
  );

  const customers = useMemo(
    () => customerGroups.map((group) => group.customerName),
    [customerGroups]
  );

  const filteredGroups = useMemo(() => {
    const search = query.trim().toLowerCase();

    return customerGroups.filter((group) => {
      const matchesCustomer =
        customerFilter === "All" || group.customerName === customerFilter;
      const matchesSearch =
        !search ||
        [group.customerName, group.emirate, ...group.records.flatMap((record) => [
          record.qcnet_id,
          record.lab_number,
          record.lab_name,
        ])].some((value) =>
          String(value || "").toLowerCase().includes(search)
        );

      return matchesCustomer && matchesSearch;
    });
  }, [customerGroups, customerFilter, query]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredGroups.length / PAGE_SIZE)
  );
  const safePage = Math.min(page, pageCount);
  const visibleGroups = filteredGroups.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function toggleCustomer(customerId) {
    const key = String(customerId);
    setExpandedCustomerIds((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function changePage(nextPage) {
    if (nextPage === page) return;
    setExpandedCustomerIds(new Set());
    setPage(nextPage);
  }

  async function copyValue(value, message) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(message);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopyMessage(""), 2200);
    } catch {
      setCopyMessage("Unable to copy");
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400" role="status">
        Loading EQAS Online records...
      </div>
    );
  }

  const copyClass =
    "inline-flex min-w-0 items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-left transition-colors hover:border-blue-500 hover:bg-blue-950 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400";

  return (
    <div ref={pageTopRef} className="scroll-mt-4 space-y-5">
      {copyMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-5 top-5 z-50 inline-flex items-center gap-2 rounded-xl border border-emerald-800 bg-emerald-950 px-4 py-3 text-sm font-medium text-emerald-300 shadow-xl"
        >
          <CheckCircle2 size={18} />
          {copyMessage}
        </div>
      )}

      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-blue-400">Online quality assurance</p>
          <h1 className="text-3xl font-semibold">EQAS Online</h1>
          <p className="mt-2 text-slate-400">
            Manage customer QCnet IDs and assigned Lab Numbers.
          </p>
        </div>
        {canEdit && (
          <Link
            to="/eqas-online/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium"
          >
            <Plus size={18} />
            New EQAS record
          </Link>
        )}
      </header>

      <section className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-[minmax(280px,1fr)_280px]">
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">
            Search
          </span>
          <div className="relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-3 text-slate-500"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Customer, QCnet ID, Lab Number, or Lab Name..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-10 pr-3"
            />
          </div>
        </label>
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">
            Customer
          </span>
          <SelectInput
            value={customerFilter}
            onChange={(event) => setCustomerFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 pr-10"
          >
            <option>All</option>
            {customers.map((customer) => (
              <option key={customer}>{customer}</option>
            ))}
          </SelectInput>
        </label>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300"
        >
          {error}
        </div>
      )}

      <p className="text-sm text-slate-500">
        Showing {visibleGroups.length} of {filteredGroups.length} customers, {records.length} EQAS records total
      </p>

      <div className="space-y-4">
        {visibleGroups.map((group) => (
          <section
            key={group.customerId}
            className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
          >
            <button
              type="button"
              onClick={() => toggleCustomer(group.customerId)}
              aria-expanded={expandedCustomerIds.has(String(group.customerId))}
              aria-controls={`eqas-customer-${group.customerId}`}
              className="flex w-full flex-wrap items-center justify-between gap-3 bg-slate-950/60 px-5 py-4 text-left hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400"
            >
              <span className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 shrink-0 text-slate-400">
                  {expandedCustomerIds.has(String(group.customerId)) ? (
                    <ChevronDown size={20} aria-hidden="true" />
                  ) : (
                    <ChevronRight size={20} aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-lg font-semibold text-slate-100">
                    {group.customerName}
                  </span>
                  <span className="mt-1 block text-sm text-slate-500">
                    {group.emirate || "Emirate not recorded"}
                  </span>
                </span>
              </span>
              <span className="rounded-full border border-blue-800 bg-blue-950 px-3 py-1 text-sm font-medium text-blue-300">
                {group.records.length} {group.records.length === 1 ? "lab" : "labs"}
              </span>
            </button>

            {expandedCustomerIds.has(String(group.customerId)) && (
              <div
                id={`eqas-customer-${group.customerId}`}
                className="divide-y divide-slate-800 border-t border-slate-800"
              >
                {group.records.map((record) => (
                <article
                  key={record.id}
                  className="grid gap-4 p-4 hover:bg-slate-800/40 md:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_minmax(10rem,0.8fr)_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Lab Name
                    </p>
                    <p className="mt-1 break-words font-medium text-slate-200">
                      {record.lab_name || "Not recorded"}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      QCnet ID
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        copyValue(record.qcnet_id, "QCnet ID copied")
                      }
                      className={`${copyClass} mt-1 max-w-full`}
                    >
                      <Copy size={14} className="shrink-0" />
                      <span className="truncate">{record.qcnet_id}</span>
                    </button>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Lab Number
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        copyValue(record.lab_number, "Lab Number copied")
                      }
                      className={`${copyClass} mt-1 max-w-full`}
                    >
                      <Copy size={14} className="shrink-0" />
                      <span className="truncate">{record.lab_number}</span>
                    </button>
                  </div>

                  {canEdit && (
                    <Link
                      to={`/eqas-online/${record.id}/edit`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-800 px-3 py-2 text-sm font-medium text-blue-300"
                    >
                      Edit
                      <ExternalLink size={15} />
                    </Link>
                  )}
                </article>
                ))}
              </div>
            )}
          </section>
        ))}

        {!visibleGroups.length && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-12 text-center text-slate-500">
            No EQAS customers match the selected filters.
          </div>
        )}
      </div>

      <PaginationControls
        page={safePage}
        pageCount={pageCount}
        onPageChange={changePage}
      />
    </div>
  );
}
