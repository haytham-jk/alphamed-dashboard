import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Users } from "lucide-react";
import { getCustomers } from "../services/customers";

function getContactSummary(customer) {
  const count = customer.customer_contacts?.length ?? 0;
  if (count === 0) return "No contacts added";
  if (count === 1) return "1 contact added";
  return `${count} contacts added`;
}

export default function CustomersPage({ canEdit }) {
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function loadCustomers() {
    setLoading(true);
    setError("");
    getCustomers()
      .then(setCustomers)
      .catch((loadError) =>
        setError(loadError?.message || "Unable to load customers.")
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return customers.filter((customer) => {
      if (!search) return true;

      const searchableValues = [
        customer.customer_name,
        customer.emirate,
        ...(customer.customer_contacts ?? []).flatMap((contact) => [
          contact.name,
          contact.designation,
          contact.email,
          contact.phone_number,
        ]),
      ];

      return searchableValues.some((value) =>
        String(value || "").toLowerCase().includes(search)
      );
    });
  }, [customers, query]);

  if (loading) {
    return <div className="text-slate-400">Loading customers...</div>;
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-blue-400">Reference data</p>
          <h1 className="text-3xl font-semibold">Customers</h1>
        </div>
        {canEdit && (
          <Link
            to="/customers/new"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2"
          >
            <Plus size={17} aria-hidden="true" />
            New customer
          </Link>
        )}
      </header>

      <label className="relative block">
        <span className="sr-only">Search customers</span>
        <Search
          className="absolute left-3 top-3 text-slate-500"
          size={18}
          aria-hidden="true"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by customer or contact..."
          className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-10 pr-3"
        />
      </label>

      {error && (
        <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((customer) => {
          const cardContent = (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {customer.customer_name || "Unnamed customer"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {customer.emirate || "Unknown"}
                  </p>
                </div>
                <span
                  className={
                    customer.is_active
                      ? "text-emerald-300"
                      : "text-slate-500"
                  }
                >
                  {customer.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm text-slate-400">
                <Users size={15} aria-hidden="true" />
                {getContactSummary(customer)}
              </div>
            </>
          );

          if (canEdit) {
            return (
              <Link
                key={customer.id}
                to={`/customers/${customer.id}/edit`}
                className="block rounded-2xl border border-slate-800 bg-slate-900 p-5 hover:bg-slate-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                {cardContent}
              </Link>
            );
          }

          return (
            <article
              key={customer.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              {cardContent}
            </article>
          );
        })}
      </div>

      {!filtered.length && (
        <div className="py-8 text-center text-slate-500">
          No customers match the search.
        </div>
      )}
    </div>
  );
}
