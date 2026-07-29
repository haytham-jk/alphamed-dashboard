import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { getSupportCases } from "../services/cases";
import { getLinearityRecords } from "../services/linearity";
import { ACTIVE_CASE_STATUSES } from "../constants/caseOptions";
import { CASE_BADGE_CLASS, getCasePriorityClass, getCaseStatusClass } from "../constants/caseDisplay";
import {
  calculateDaysRemaining,
  calculateNextDueDate,
  formatRemainingPeriod,
  getLinearityDueStatus,
} from "../utils/linearityDates";

function DashboardCard({
  to,
  icon: Icon,
  label,
  value,
  note,
  tone,
}) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:-translate-y-0.5 hover:border-slate-700"
    >
      <div className="flex justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-1 text-3xl font-semibold">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{note}</p>
        </div>
        <div className={`h-fit rounded-2xl p-3 ${tone}`}>
          <Icon size={22} />
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage({ canEdit }) {
  const [cases, setCases] = useState([]);
  const [linearityRecords, setLinearityRecords] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      getSupportCases(),
      getLinearityRecords(),
    ])
      .then(([caseData, linearityData]) => {
        setCases(caseData);
        setLinearityRecords(linearityData);
      })
      .catch((loadError) => setError(loadError.message));
  }, []);

  const activeCases = useMemo(() => {
    return cases.filter(
      (item) => ACTIVE_CASE_STATUSES.includes(item.status)
    );
  }, [cases]);

  const metrics = useMemo(() => {
    return {
      active: activeCases.length,
      pending: cases.filter(
        (item) => item.status === "Pending"
      ).length,
      unresolved: cases.filter(
        (item) => item.status === "Unresolved"
      ).length,
      escalated: activeCases.filter(
        (item) =>
          item.escalatedTo &&
          item.escalatedTo.trim() !== "" &&
          item.escalatedTo !== "None"
      ).length,
    };
  }, [cases, activeCases]);

  const attentionLinearity = useMemo(() => {
    return linearityRecords
      .map((record) => {
        const daysRemaining = calculateDaysRemaining(
          record.performed_date,
          record.frequency_months
        );
        return {
          ...record,
          daysRemaining,
          nextDueDate: calculateNextDueDate(
            record.performed_date,
            record.frequency_months
          ),
          dueStatus: getLinearityDueStatus(daysRemaining),
        };
      })
      .filter((record) =>
        ["Overdue", "Due today", "Due soon"].includes(
          record.dueStatus
        )
      )
      .sort((first, second) =>
        first.daysRemaining - second.daysRemaining
      );
  }, [linearityRecords]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-blue-400">
            Alphamed Operations Hub
          </p>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="mt-2 text-slate-400">
            Select a card to open the matching cases.
          </p>
        </div>

        {canEdit && (
          <Link
            to="/cases/new"
            className="rounded-xl bg-blue-600 px-4 py-2 text-center font-medium"
          >
            New case
          </Link>
        )}
      </div>

      {error && <div className="text-red-300">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          to="/cases?status=Active"
          icon={Activity}
          label="Active cases"
          value={metrics.active}
          note="Cases requiring attention"
          tone="bg-blue-950 text-blue-300"
        />
        <DashboardCard
          to="/cases?status=Pending"
          icon={Clock}
          label="Pending"
          value={metrics.pending}
          note="Cases awaiting action"
          tone="bg-amber-950 text-amber-300"
        />
        <DashboardCard
          to="/cases?status=Unresolved"
          icon={AlertTriangle}
          label="Unresolved"
          value={metrics.unresolved}
          note="Cases not resolved"
          tone="bg-orange-950 text-orange-300"
        />
        <DashboardCard
          to="/cases?escalated=true"
          icon={ShieldAlert}
          label="Active escalations"
          value={metrics.escalated}
          note="Escalated open cases"
          tone="bg-red-950 text-red-300"
        />
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              Active case quick view
            </h2>
            <p className="text-sm text-slate-500">
              Open cases requiring attention
            </p>
          </div>
          <Link to="/cases?status=Active" className="text-sm text-blue-400">
            View all active cases
          </Link>
        </div>

        <div className="space-y-2">
          {activeCases.slice(0, 10).map((item) => (
            <Link
              key={item.databaseId}
              to={`/cases/${item.databaseId}`}
              className="grid gap-2 rounded-xl border border-slate-800 p-3 hover:bg-slate-800 sm:grid-cols-[1fr_auto_auto] sm:items-center"
            >
              <div>
                <div className="font-medium">{item.title}</div>
                <div className="text-sm text-slate-500">
                  {item.customer}
                </div>
              </div>
              <span className={`${CASE_BADGE_CLASS} ${getCaseStatusClass(item.status)}`}>
                {item.status}
              </span>
              <span className={`${CASE_BADGE_CLASS} ${getCasePriorityClass(item.priority)}`}>
                {item.priority}
              </span>
            </Link>
          ))}

          {activeCases.length === 0 && (
            <div className="py-8 text-center text-slate-500">
              No active cases.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              Linearity requiring attention
            </h2>
            <p className="text-sm text-slate-500">
              Due soon and overdue records
            </p>
          </div>
          <Link to="/linearity" className="text-sm text-blue-400">
            View linearity tracker
          </Link>
        </div>

        <div className="space-y-2">
          {attentionLinearity.slice(0, 10).map((item) => (
            <Link
              key={item.id}
              to={`/linearity/${item.id}/edit`}
              className="grid gap-2 rounded-xl border border-slate-800 p-3 hover:bg-slate-800 sm:grid-cols-[1fr_auto_auto] sm:items-center"
            >
              <div>
                <div className="font-medium">
                  {item.customers?.customer_name || "Unassigned"}
                </div>
                <div className="text-sm text-slate-500">
                  {item.instruments?.instrument_name ||
                    item.instrument_name_snapshot ||
                    "Not specified"}
                </div>
              </div>
              <div className="text-sm text-slate-400">
                Due {item.nextDueDate || "not scheduled"}
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  item.dueStatus === "Overdue"
                    ? "bg-red-950 text-red-300"
                    : "bg-amber-950 text-amber-300"
                }`}
              >
                {formatRemainingPeriod(item.daysRemaining)}
              </span>
            </Link>
          ))}

          {attentionLinearity.length === 0 && (
            <div className="py-8 text-center text-slate-500">
              No overdue or due-soon linearity records.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
