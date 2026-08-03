import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Clock,
  GitCommitHorizontal,
  ShieldAlert,
} from "lucide-react";
import { getSupportCases } from "../services/cases";
import { getLinearityRecords } from "../services/linearity";
import { ACTIVE_CASE_STATUSES } from "../constants/caseOptions";
import {
  CASE_BADGE_CLASS,
  getCasePriorityClass,
  getCaseStatusClass,
} from "../constants/caseDisplay";
import {
  calculateDaysRemaining,
  calculateNextDueDate,
  formatRemainingPeriod,
  getLinearityDueStatus,
} from "../utils/linearityDates";

const interactiveCardClass =
  "transition hover:-translate-y-0.5 hover:border-purple-500/70 hover:brightness-125 hover:saturate-110 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.55),0_8px_20px_rgba(88,28,135,0.22)] focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

function DashboardCard({ to, icon: Icon, label, value, note, tone }) {
  return (
    <Link
      to={to}
      className={`rounded-2xl border border-slate-800 bg-gradient-to-br from-fuchsia-950/60 via-slate-900 to-blue-950/60 p-5 ${interactiveCardClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-2 text-4xl font-semibold text-white">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{note}</p>
        </div>
        <span className={`rounded-xl p-3 ${tone}`}>
          <Icon size={22} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

function QuickViewHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  count,
  to,
  linkLabel,
  accent,
  iconClass,
  countClass,
}) {
  return (
    <div className={`border-b px-5 py-5 sm:px-6 ${accent}`}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 rounded-xl p-2.5 ${iconClass}`}>
            <Icon size={21} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {eyebrow}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-semibold text-white">{title}</h2>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${countClass}`}>
                {count}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-300">{description}</p>
          </div>
        </div>
        <Link
          to={to}
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg px-2 py-1 text-sm font-medium text-slate-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:self-center"
        >
          {linkLabel}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage({ canEdit }) {
  const [cases, setCases] = useState([]);
  const [linearityRecords, setLinearityRecords] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getSupportCases(), getLinearityRecords()])
      .then(([caseData, linearityData]) => {
        setCases(caseData);
        setLinearityRecords(linearityData);
      })
      .catch((loadError) => setError(loadError.message));
  }, []);

  const activeCases = useMemo(
    () => cases.filter((item) => ACTIVE_CASE_STATUSES.includes(item.status)),
    [cases]
  );

  const metrics = useMemo(
    () => ({
      active: activeCases.length,
      pending: cases.filter((item) => item.status === "Pending").length,
      unresolved: cases.filter((item) => item.status === "Unresolved").length,
      escalated: activeCases.filter(
        (item) =>
          item.escalatedTo &&
          item.escalatedTo.trim() !== "" &&
          item.escalatedTo !== "None"
      ).length,
    }),
    [cases, activeCases]
  );

  const attentionLinearity = useMemo(
    () =>
      linearityRecords
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
          ["Overdue", "Due today", "Due soon"].includes(record.dueStatus)
        )
        .sort((first, second) => first.daysRemaining - second.daysRemaining),
    [linearityRecords]
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-blue-400">Alphamed Operations Hub</p>
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
      </header>

      {error && (
        <div
          className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300"
          role="alert"
        >
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          note="Cases currently pending"
          tone="bg-cyan-950 text-cyan-300"
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
          label="Escalated"
          value={metrics.escalated}
          note="Active escalated cases"
          tone="bg-red-950 text-red-300"
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/10">
        <QuickViewHeader
          icon={BriefcaseBusiness}
          eyebrow="Case operations"
          title="Active case quick view"
          description="Open cases requiring attention"
          count={activeCases.length}
          to="/cases?status=Active"
          linkLabel="View all active cases"
          accent="border-blue-800/70 bg-gradient-to-r from-blue-950/80 via-blue-950/35 to-slate-900"
          iconClass="border border-blue-800 bg-blue-950 text-blue-300"
          countClass="border-blue-700 bg-blue-950 text-blue-300"
        />
        <div className="space-y-2.5 bg-slate-950/35 p-4 sm:p-5">
          {activeCases.slice(0, 10).map((item) => (
            <Link
              key={item.databaseId}
              to={`/cases/${item.databaseId}`}
              className={`grid gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center ${interactiveCardClass}`}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-100">{item.title}</p>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {item.customer}
                </p>
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
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-6 text-center text-slate-400">
              No active cases.
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/10">
        <QuickViewHeader
          icon={GitCommitHorizontal}
          eyebrow="Quality schedule"
          title="Linearity requiring attention"
          description="Due-soon and overdue records"
          count={attentionLinearity.length}
          to="/linearity"
          linkLabel="View linearity tracker"
          accent="border-violet-800/70 bg-gradient-to-r from-violet-950/80 via-violet-950/30 to-slate-900"
          iconClass="border border-violet-800 bg-violet-950 text-violet-300"
          countClass="border-violet-700 bg-violet-950 text-violet-300"
        />
        <div className="space-y-2.5 bg-slate-950/35 p-4 sm:p-5">
          {attentionLinearity.slice(0, 10).map((item) => (
            <Link
              key={item.id}
              to={`/linearity/${item.id}/edit`}
              className={`grid gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(11rem,auto)_auto] sm:items-center ${interactiveCardClass}`}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-100">
                  {item.customers?.customer_name || "Unassigned"}
                </p>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {item.instruments?.instrument_name ||
                    item.instrument_name_snapshot ||
                    "Not specified"}
                </p>
              </div>
              <div className="text-sm sm:text-right">
                <p className="text-xs uppercase tracking-wide text-slate-500">Next due</p>
                <p className="mt-1 text-slate-300">
                  {item.nextDueDate || "Not scheduled"}
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  item.daysRemaining < 0
                    ? "border-red-900 bg-red-950 text-red-300"
                    : "border-amber-900 bg-amber-950 text-amber-300"
                }`}
              >
                {formatRemainingPeriod(item.daysRemaining)}
              </span>
            </Link>
          ))}
          {attentionLinearity.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-6 text-center text-slate-400">
              No overdue or due-soon linearity records.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
