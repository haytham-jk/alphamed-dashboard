import { useId, useMemo, useState } from "react";

function normalizeId(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function normalizeIds(values) {
  return [...new Set((values || []).map(normalizeId).filter(Boolean))];
}

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
  const selectedIds = useMemo(
    () => normalizeIds(customerIds),
    [customerIds]
  );
  const primaryId = normalizeId(primaryCustomerId);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.emirate]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [customers, search]);

  function toggleCustomer(rawCustomerId) {
    const customerId = normalizeId(rawCustomerId);
    const selected = selectedIds.includes(customerId);
    const nextIds = selected
      ? selectedIds.filter((id) => id !== customerId)
      : [...selectedIds, customerId];

    let nextPrimaryId = primaryId;
    if (selected && primaryId === customerId) {
      nextPrimaryId = nextIds[0] || "";
    }
    if (!selected && !nextPrimaryId) {
      nextPrimaryId = customerId;
    }

    onChange({
      customerIds: nextIds,
      primaryCustomerId: nextPrimaryId,
    });
  }

  function changeInternalCase(checked) {
    if (
      checked &&
      selectedIds.length > 0 &&
      !window.confirm(
        "Switching to an internal case will clear the selected customers. Continue?"
      )
    ) {
      return;
    }

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
          onChange={(event) =>
            changeInternalCase(event.target.checked)
          }
        />
        Internal case with no specific customer
      </label>

      {!internalCase && (
        <>
          <label htmlFor={searchId} className="block text-sm font-medium">
            Search customers
          </label>
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
          />

          <p className="text-xs text-slate-500">
            Select one customer. Additional customers are optional.
          </p>

          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {filteredCustomers.map((customer) => {
              const customerId = normalizeId(customer.id);
              const selected = selectedIds.includes(customerId);

              return (
                <div
                  key={customerId}
                  className={`flex items-center justify-between gap-4 rounded-xl border p-3 ${
                    selected
                      ? "border-blue-800 bg-blue-950/30"
                      : "border-slate-800 bg-slate-950"
                  }`}
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleCustomer(customerId)}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {customer.name}
                      </span>
                      <span className="block text-sm text-slate-500">
                        {customer.emirate || "Emirate not recorded"}
                      </span>
                    </span>
                  </label>

                  {selected && (
                    <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="primaryCustomer"
                        checked={primaryId === customerId}
                        onChange={() =>
                          onChange({
                            customerIds: selectedIds,
                            primaryCustomerId: customerId,
                          })
                        }
                      />
                      Primary
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {customerError && (
        <p className="text-sm text-red-300" role="alert">
          {customerError}
        </p>
      )}
    </fieldset>
  );
}
