import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Cable,
  CheckCircle2,
  Copy,
  Plus,
  Search,
  Server,
} from "lucide-react";
import PaginationControls from "../components/ui/PaginationControls";
import { getUnityRtInstallations } from "../services/unityRealTime";

const PAGE_SIZE = 20;

const statusStyle = {
  Expired: "border-red-900 bg-red-950 text-red-300",
  "Expiring in 30 days": "border-amber-900 bg-amber-950 text-amber-300",
  Valid: "border-emerald-900 bg-emerald-950 text-emerald-300",
  "Expiry not recorded": "border-slate-700 bg-slate-800 text-slate-400",
};

function SummaryCard({ label, value, icon: Icon, tone, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-slate-800 bg-gradient-to-br from-fuchsia-950/60 via-slate-900 to-blue-950/60 p-5 text-left hover:brightness-125 hover:saturate-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-semibold">{value}</p>
        </div>
        <span className={`rounded-xl p-3 ${tone}`}>
          <Icon size={22} aria-hidden="true" />
        </span>
      </div>
    </button>
  );
}

export default function UnityRealTimePage({ canEdit }) {
  const navigate = useNavigate();
  const copyMessageTimer = useRef(null);
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState("");
  const [licenseFilter, setLicenseFilter] = useState("All");
  const [connectivityFilter, setConnectivityFilter] = useState("All");
  const [servicePackFilter, setServicePackFilter] = useState("All");
  const [customerFilter, setCustomerFilter] = useState("All");
  const [cardFilter, setCardFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  function load() {
    setLoading(true);
    setError("");
    getUnityRtInstallations()
      .then(setRecords)
      .catch((loadError) =>
        setError(
          loadError?.message ||
            "Unable to load Unity Real Time installations."
        )
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [
    query,
    licenseFilter,
    connectivityFilter,
    servicePackFilter,
    customerFilter,
    cardFilter,
  ]);

  useEffect(() => {
    return () => {
      if (copyMessageTimer.current) {
        window.clearTimeout(copyMessageTimer.current);
      }
    };
  }, []);

  const customers = useMemo(
    () =>
      [...new Set(records.map((record) => record.customer_name).filter(Boolean))]
        .sort(),
    [records]
  );

  const metrics = useMemo(
    () => ({
      expired: records.filter(
        (record) => record.unity_rt_license_status === "Expired"
      ).length,
      expiring30: records.filter(
        (record) =>
          record.unity_rt_license_status === "Expiring in 30 days"
      ).length,
      uc30: records.filter(
        (record) =>
          record.connectivity_license_status === "Expiring in 30 days"
      ).length,
      total: records.length,
    }),
    [records]
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        !search ||
        [
          record.customer_name,
          record.primary_id,
          record.service_pack,
          record.connectivity_type,
        ].some((value) =>
          String(value || "").toLowerCase().includes(search)
        );

      const matchesLicense =
        licenseFilter === "All" ||
        record.unity_rt_license_status === licenseFilter;
      const matchesConnectivity =
        connectivityFilter === "All" ||
        record.connectivity_type === connectivityFilter;
      const matchesServicePack =
        servicePackFilter === "All" ||
        record.service_pack_status === servicePackFilter;
      const matchesCustomer =
        customerFilter === "All" ||
        record.customer_name === customerFilter;
      const matchesCard =
        cardFilter === "All" ||
        (cardFilter === "Expired" &&
          record.unity_rt_license_status === "Expired") ||
        (cardFilter === "Expiring30" &&
          record.unity_rt_license_status === "Expiring in 30 days") ||
        (cardFilter === "UC30" &&
          record.connectivity_license_status === "Expiring in 30 days");

      return (
        matchesSearch &&
        matchesLicense &&
        matchesConnectivity &&
        matchesServicePack &&
        matchesCustomer &&
        matchesCard
      );
    });
  }, [
    records,
    query,
    licenseFilter,
    connectivityFilter,
    servicePackFilter,
    customerFilter,
    cardFilter,
  ]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  async function copyPrimaryId(event, primaryId) {
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(primaryId);
      setCopyMessage("ID copied");

      if (copyMessageTimer.current) {
        window.clearTimeout(copyMessageTimer.current);
      }

      copyMessageTimer.current = window.setTimeout(() => {
        setCopyMessage("");
      }, 2200);
    } catch {
      setCopyMessage("Unable to copy ID");
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400" role="status">
        Loading Unity Real Time installations...
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {copyMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-5 top-5 z-50 inline-flex items-center gap-2 rounded-xl border border-emerald-800 bg-emerald-950 px-4 py-3 text-sm font-medium text-emerald-300 shadow-xl"
        >
          <CheckCircle2 size={18} aria-hidden="true" />
          {copyMessage}
        </div>
      )}

      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-blue-400">Software licenses</p>
          <h1 className="text-3xl font-semibold">Unity Real Time</h1>
          <p className="mt-2 text-slate-400">
            Track site licenses, connectivity, Primary IDs, and service packs.
          </p>
        </div>
        {canEdit && (
          <Link
            to="/unity-real-time/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white"
          >
            <Plus size={18} aria-hidden="true" />
            New installation
          </Link>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Expired installations"
          value={metrics.expired}
          icon={AlertTriangle}
          tone="bg-red-950 text-red-300"
          onClick={() =>
            setCardFilter(cardFilter === "Expired" ? "All" : "Expired")
          }
        />
        <SummaryCard
          label="Expiring in 30 days"
          value={metrics.expiring30}
          icon={AlertTriangle}
          tone="bg-amber-950 text-amber-300"
          onClick={() =>
            setCardFilter(
              cardFilter === "Expiring30" ? "All" : "Expiring30"
            )
          }
        />
        <SummaryCard
          label="UC expiring in 30 days"
          value={metrics.uc30}
          icon={Cable}
          tone="bg-cyan-950 text-cyan-300"
          onClick={() =>
            setCardFilter(cardFilter === "UC30" ? "All" : "UC30")
          }
        />
        <SummaryCard
          label="Total sites"
          value={metrics.total}
          icon={Server}
          tone="bg-blue-950 text-blue-300"
          onClick={() => setCardFilter("All")}
        />
      </section>

      <section className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 xl:grid-cols-[minmax(260px,1fr)_180px_180px_210px_220px]">
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">
            Search
          </span>
          <div className="relative">
            <Search
              size={17}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-3 text-slate-500"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Customer or Primary ID..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-10 pr-3"
            />
          </div>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">
            License status
          </span>
          <select
            value={licenseFilter}
            onChange={(event) => setLicenseFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
          >
            <option>All</option>
            <option>Expired</option>
            <option>Valid</option>
            <option>Expiry not recorded</option>
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">
            Connectivity
          </span>
          <select
            value={connectivityFilter}
            onChange={(event) => setConnectivityFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
          >
            <option>All</option>
            <option value="None">No connectivity</option>
            <option>UnityConnect 1</option>
            <option>UnityConnect 2</option>
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">
            Service pack
          </span>
          <select
            value={servicePackFilter}
            onChange={(event) => setServicePackFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
          >
            <option>All</option>
            <option>Latest service pack</option>
            <option>Behind latest service pack</option>
            <option>Version not recorded</option>
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">
            Customer
          </span>
          <select
            value={customerFilter}
            onChange={(event) => setCustomerFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
          >
            <option>All</option>
            {customers.map((customer) => (
              <option key={customer}>{customer}</option>
            ))}
          </select>
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

      <p className="text-sm text-slate-500">
        Showing {visible.length} of {filtered.length} installations
      </p>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
        <table className="w-full min-w-[1050px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="p-4">Customer</th>
              <th className="p-4">Primary ID</th>
              <th className="p-4">Unity RT expiry</th>
              <th className="p-4">RT license status</th>
              <th className="p-4">Connectivity</th>
              <th className="p-4">Connectivity expiry</th>
              <th className="p-4">UC license status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((record) => (
              <tr
                key={record.id}
                onClick={() =>
                  canEdit &&
                  navigate(`/unity-real-time/${record.id}/edit`)
                }
                onKeyDown={(event) => {
                  if (
                    canEdit &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    event.preventDefault();
                    navigate(`/unity-real-time/${record.id}/edit`);
                  }
                }}
                tabIndex={canEdit ? 0 : undefined}
                role={canEdit ? "link" : undefined}
                className={`border-b border-slate-800 last:border-0 ${
                  canEdit
                    ? "cursor-pointer hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400"
                    : ""
                }`}
              >
                <td className="p-4 font-medium">{record.customer_name}</td>
                <td className="p-4">
                  <button
                    type="button"
                    title="Copy Primary ID"
                    aria-label={`Copy Primary ID ${record.primary_id}`}
                    onClick={(event) =>
                      copyPrimaryId(event, record.primary_id)
                    }
                    className="group inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 transition-colors hover:border-blue-500 hover:bg-blue-950 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    <Copy
                      size={14}
                      aria-hidden="true"
                      className="transition-colors group-hover:text-blue-300"
                    />
                    {record.primary_id}
                  </button>
                </td>
                <td className="p-4">
                  {record.unity_rt_expiry_date || "Not recorded"}
                </td>
                <td className="p-4">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs ${
                      statusStyle[record.unity_rt_license_status] ||
                      statusStyle["Expiry not recorded"]
                    }`}
                  >
                    {record.unity_rt_license_status}
                  </span>
                </td>
                <td className="p-4">
                  {record.connectivity_type === "None"
                    ? "None"
                    : record.connectivity_type === "UnityConnect 1"
                      ? "UC1"
                      : "UC2"}
                </td>
                <td className="p-4">
                  {record.connectivity_type === "None"
                    ? "N/A"
                    : record.connectivity_expiry_date || "Not recorded"}
                </td>
                <td className="p-4">
                  {record.connectivity_type === "None" ? (
                    <span className="text-slate-500">N/A</span>
                  ) : (
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${
                        statusStyle[record.connectivity_license_status] ||
                        statusStyle["Expiry not recorded"]
                      }`}
                    >
                      {record.connectivity_license_status}
                    </span>
                  )}
                </td>
              </tr>
            ))}

            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="p-12 text-center text-slate-500"
                >
                  No installations match the selected filters.
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
