import { formatDateOnly, getDateUrgency } from "../utils/dateDisplay";
import { getLocalDateOnly } from "../utils/dates";
import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Clock,
  GitCommitHorizontal,
  Boxes,
  ShieldAlert,
} from "lucide-react";
import { getDashboardCaseSummary } from "../services/cases";
import { getDashboardLinearitySummary } from "../services/linearity";
import { getDashboardBioplexSummary } from "../services/bioplexInventory";
import useAsyncResource from "../hooks/useAsyncResource";
import { ErrorState, LoadingState } from "../components/ui/AsyncState";
import {
  CASE_BADGE_CLASS,
  getCasePriorityClass,
  getCaseStatusClass,
} from "../constants/caseDisplay";
import { formatRemainingPeriod } from "../utils/linearityDates";

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
  const loadDashboard = useCallback(async ({ signal }) => {
    const referenceDate = getLocalDateOnly();
    const [caseSummary, linearitySummary, bioplexSummary] = await Promise.all([
      getDashboardCaseSummary(referenceDate, { signal }),
      getDashboardLinearitySummary(referenceDate, { signal }),
      getDashboardBioplexSummary(referenceDate, { signal }),
    ]);
    return { caseSummary, linearitySummary, bioplexSummary };
  }, []);
  const { data, loading, refreshing, error, retry } = useAsyncResource(
    loadDashboard,
    [loadDashboard],
    { fallbackError: "Unable to load Dashboard data." }
  );
  const { caseSummary = {}, linearitySummary = {}, bioplexSummary = {} } = data ?? {};
  const metrics = {
    active: caseSummary.active ?? 0,
    overdue: caseSummary.overdue ?? 0,
    unresolved: caseSummary.unresolved ?? 0,
    escalated: caseSummary.escalated ?? 0,
  };
  const overdueCases = useMemo(
    () => (caseSummary.overdueCases ?? []).map((item) => ({
      ...item,
      followUpUrgency: getDateUrgency(item.followUpDate),
    })),
    [caseSummary.overdueCases]
  );
  const attentionLinearity = linearitySummary.attentionRecords ?? [];
  if (loading) return <LoadingState message="Loading Dashboard..." />;
  if (!data && error) return <ErrorState message={error} onRetry={retry} retrying={refreshing} />;

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

      {error && <ErrorState message={error} onRetry={retry} retrying={refreshing} />}

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
          to="/cases?status=Active&overdue=true&sort=followUp"
          icon={Clock}
          label="Overdue"
          value={metrics.overdue}
          note="Active cases past follow-up"
          tone="bg-red-950 text-red-300"
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
          to="/cases?status=Escalated"
          icon={ShieldAlert}
          label="Escalated"
          value={metrics.escalated}
          note="Cases with Escalated status"
          tone="bg-red-950 text-red-300"
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/10">
        <QuickViewHeader
          icon={BriefcaseBusiness}
          eyebrow="Case operations"
          title="Overdue case quick view"
          description="Active cases past their follow-up date"
          count={overdueCases.length}
          to="/cases?status=Active&overdue=true&sort=followUp"
          linkLabel="View all overdue cases"
          accent="border-blue-800/70 bg-gradient-to-r from-blue-950/80 via-blue-950/35 to-slate-900"
          iconClass="border border-blue-800 bg-blue-950 text-blue-300"
          countClass="border-blue-700 bg-blue-950 text-blue-300"
        />
        <div className="space-y-2.5 bg-slate-950/35 p-4 sm:p-5">
          {overdueCases.map((item) => (
            <Link
              key={item.databaseId}
              to={`/cases/${item.databaseId}`}
              className={`grid gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_7rem] sm:items-center ${interactiveCardClass}`}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-100">{item.title}</p>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {item.customer}
                </p>
              </div>
              <span
                className={`${CASE_BADGE_CLASS} w-full justify-center text-center ${item.followUpUrgency.className}`}
                title={
                  item.followUpDate
                    ? `Follow-up: ${formatDateOnly(item.followUpDate)}`
                    : "No follow-up date recorded"
                }
              >
                {item.followUpUrgency.label}
              </span>
              <span className={`${CASE_BADGE_CLASS} w-full justify-center text-center ${getCaseStatusClass(item.status)}`}>
                {item.status}
              </span>
              <span className={`${CASE_BADGE_CLASS} w-full justify-center text-center ${getCasePriorityClass(item.priority)}`}>
                {item.priority}
              </span>
            </Link>
          ))}
          {overdueCases.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-6 text-center text-slate-400">
              No overdue cases.
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
          count={linearitySummary.attentionCount ?? 0}
          to="/linearity"
          linkLabel="View linearity tracker"
          accent="border-violet-800/70 bg-gradient-to-r from-violet-950/80 via-violet-950/30 to-slate-900"
          iconClass="border border-violet-800 bg-violet-950 text-violet-300"
          countClass="border-violet-700 bg-violet-950 text-violet-300"
        />
        <div className="space-y-2.5 bg-slate-950/35 p-4 sm:p-5">
          {attentionLinearity.map((item) => (
            <Link
              key={item.id}
              to={`/linearity/${item.id}/edit`}
              className={`grid gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(11rem,auto)_auto] sm:items-center ${interactiveCardClass}`}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-100">
                  {item.customerName || "Unassigned"}
                </p>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {item.instrumentName ||
                    item.instrumentNameSnapshot ||
                    "Not specified"}
                </p>
              </div>
              <div className="text-sm sm:text-right">
                <p className="text-xs uppercase tracking-wide text-slate-500">Next due</p>
                <p className="mt-1 text-slate-300">
                  {formatDateOnly(item.nextDueDate, "Not scheduled")}
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

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/10">
        <QuickViewHeader
          icon={Boxes}
          eyebrow="BioPlex inventory"
          title="Inventory requiring attention"
          description="Expired lots, upcoming expiry, missing expiry, draft counts, and matching-review blockers"
          count={(bioplexSummary.expired ?? 0) + (bioplexSummary.missingExpiry ?? 0) + (bioplexSummary.matchingWarnings ?? 0)}
          to="/bioplex-inventory/attention"
          linkLabel="View BioPlex attention items"
          accent="border-cyan-800/70 bg-gradient-to-r from-cyan-950/80 via-cyan-950/30 to-slate-900"
          iconClass="border border-cyan-800 bg-cyan-950 text-cyan-300"
          countClass="border-cyan-700 bg-cyan-950 text-cyan-300"
        />
        <div className="grid gap-3 bg-slate-950/35 p-4 sm:grid-cols-2 lg:grid-cols-5 sm:p-5">
          {[
            ["Expired lots", bioplexSummary.expired ?? 0, "text-red-300", "/bioplex-inventory/attention?type=expired"],
            ["Expiring in 30 days", bioplexSummary.expiring30 ?? 0, "text-amber-300", "/bioplex-inventory/attention?type=expiring"],
            ["Missing expiry", bioplexSummary.missingExpiry ?? 0, "text-orange-300", "/bioplex-inventory/attention?type=missing-expiry"],
            ["Draft counts", bioplexSummary.draftCounts ?? 0, "text-blue-300", "/bioplex-inventory?status=Draft"],
            ["Matching warnings", bioplexSummary.matchingWarnings ?? 0, "text-violet-300", "/bioplex-inventory/attention?type=matching-warnings"],
          ].map(([label, value, tone, destination]) => (
            <Link key={label} to={destination} className="rounded-xl border border-slate-800 bg-slate-950 p-4 hover:border-cyan-700">
              <p className="text-sm text-slate-500">{label}</p>
              <p className={`mt-2 text-3xl font-semibold ${tone}`}>{value}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
