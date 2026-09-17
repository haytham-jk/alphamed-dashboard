import "./caseCustomerScrollbar.css";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CheckCircle2, Search, Star, Trash2 } from "lucide-react";
import { toId, toIdList } from "../../utils/normalizers";
import { addSelectedCustomer, removeSelectedCustomer } from "../../utils/caseCustomerSelection";

export default function CaseCustomerSelector({
  customers = [],
  customerIds = [],
  primaryCustomerId = "",
  internalCase = false,
  errors = {},
  onChange,
}) {
  const [search, setSearch] = useState("");
  const searchId = useId();
  const selectedSectionRef = useRef(null);
  const focusedSelectionRef = useRef("");
  const selectedIds = useMemo(() => toIdList(customerIds), [customerIds]);
  const primaryId = toId(primaryCustomerId);
  const customerById = useMemo(
    () => new Map(customers.map((customer) => [toId(customer.id), customer])),
    [customers]
  );
  const selectedCustomers = useMemo(
    () => selectedIds
      .map((customerId) => customerById.get(customerId))
      .filter(Boolean)
      .sort((first, second) => {
        const firstId = toId(first.id);
        const secondId = toId(second.id);
        if (firstId === primaryId) return -1;
        if (secondId === primaryId) return 1;
        return String(first.name).localeCompare(String(second.name));
      }),
    [customerById, primaryId, selectedIds]
  );
  const availableCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((customer) => {
      const customerId = toId(customer.id);
      if (selectedIds.includes(customerId)) return false;
      if (!query) return true;
      return [customer.name, customer.emirate]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [customers, search, selectedIds]);

  useEffect(() => {
    if (internalCase || selectedCustomers.length === 0) return;
    const targetId = primaryId || toId(selectedCustomers[0]?.id);
    const focusKey = `${targetId}|${selectedIds.join(",")}`;
    if (!targetId || focusedSelectionRef.current === focusKey) return;
    const target = selectedSectionRef.current?.querySelector(
      `[data-selected-customer-id="${targetId}"]`
    );
    if (!target) return;
    focusedSelectionRef.current = focusKey;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "nearest",
      });
      target.focus({ preventScroll: true });
    });
  }, [internalCase, primaryId, selectedCustomers, selectedIds]);

  function publishSelection(nextIds, nextPrimaryId) {
    onChange({ customerIds: nextIds, primaryCustomerId: nextPrimaryId });
  }
  function addCustomer(rawCustomerId) {
    const customerId = toId(rawCustomerId);
    if (!customerId || selectedIds.includes(customerId)) return;
    const next = addSelectedCustomer(selectedIds, primaryId, customerId);
    publishSelection(next.customerIds, next.primaryCustomerId);
  }
  function removeCustomer(rawCustomerId) {
    const customerId = toId(rawCustomerId);
    const next = removeSelectedCustomer(selectedIds, primaryId, customerId);
    publishSelection(next.customerIds, next.primaryCustomerId);
  }
  function setPrimaryCustomer(rawCustomerId) {
    const customerId = toId(rawCustomerId);
    if (!selectedIds.includes(customerId)) return;
    publishSelection(selectedIds, customerId);
  }
  function changeInternalCase(checked) {
    if (
      checked &&
      selectedIds.length > 0 &&
      !window.confirm(
        "Switching to an internal case will clear the selected customers. Continue?"
      )
    ) return;
    onChange({
      internalCase: checked,
      customerIds: checked ? [] : selectedIds,
      primaryCustomerId: checked ? "" : primaryId,
    });
  }

  const customerError = errors.customerIds || errors.primaryCustomerId;
  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Case customers</legend>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={internalCase}
          onChange={(event) => changeInternalCase(event.target.checked)}
        />
        Internal case with no specific customer
      </label>
      {!internalCase && (
        <>
          {selectedCustomers.length > 0 && (
            <section
              ref={selectedSectionRef}
              className="rounded-2xl border border-blue-900 bg-blue-950/20 p-4"
              aria-labelledby="selected-customers-title"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 id="selected-customers-title" className="font-semibold text-blue-100">
                    Selected customers
                  </h3>
                  <p className="text-xs text-slate-400">
                    The primary customer is listed first and remains visible while you search.
                  </p>
                </div>
                <span className="rounded-full border border-blue-800 bg-blue-950 px-2.5 py-1 text-xs text-blue-300">
                  {selectedCustomers.length} selected
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {selectedCustomers.map((customer) => {
                  const customerId = toId(customer.id);
                  const isPrimary = customerId === primaryId;
                  return (
                    <article
                      key={customerId}
                      data-selected-customer-id={customerId}
                      tabIndex={-1}
                      className={`rounded-xl border p-3 outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                        isPrimary
                          ? "border-blue-600 bg-blue-950/60"
                          : "border-slate-700 bg-slate-950"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium text-slate-100">{customer.name}</p>
                            <span className={`rounded-full border px-2 py-0.5 text-xs ${isPrimary ? "border-blue-600 bg-blue-900 text-blue-200" : "border-slate-700 bg-slate-800 text-slate-300"}`}>
                              {isPrimary ? "Primary customer" : "Additional customer"}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {customer.emirate || "Emirate not recorded"}
                          </p>
                        </div>
                        {isPrimary && <CheckCircle2 size={19} className="shrink-0 text-blue-300" aria-hidden="true" />}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {!isPrimary && (
                          <button
                            type="button"
                            onClick={() => setPrimaryCustomer(customerId)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-800 px-3 py-1.5 text-xs text-blue-300"
                          >
                            <Star size={14} aria-hidden="true" />
                            Set as primary
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeCustomer(customerId)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-900 px-3 py-1.5 text-xs text-red-300"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          Remove
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
          <label htmlFor={searchId} className="block text-sm font-medium">
            Search customers
          </label>
          <div className="relative">
            <Search size={17} className="pointer-events-none absolute left-3 top-3 text-slate-500" aria-hidden="true" />
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer name or Emirate..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-10 pr-3"
            />
          </div>
          <p className="text-xs text-slate-500">
            Select one customer. Additional customers are optional.
          </p>
          <div className="case-customer-scrollbar max-h-80 space-y-2 overflow-y-auto pr-2" style={{ scrollbarColor: "#475569 #020617", scrollbarWidth: "thin" }}>
            {availableCustomers.map((customer) => {
              const customerId = toId(customer.id);
              return (
                <button
                  key={customerId}
                  type="button"
                  onClick={() => addCustomer(customerId)}
                  className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950 p-3 text-left transition-colors hover:border-blue-800 hover:bg-blue-950/30 focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{customer.name}</span>
                    <span className="block text-sm text-slate-500">
                      {customer.emirate || "Emirate not recorded"}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300">
                    Add
                  </span>
                </button>
              );
            })}
            {availableCustomers.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-500">
                {search ? "No unselected customers match the search." : "All available customers are selected."}
              </div>
            )}
          </div>
        </>
      )}
      {customerError && <p className="text-sm text-red-300" role="alert">{customerError}</p>}
    </fieldset>
  );
}
