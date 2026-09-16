import { Link } from "react-router-dom";

export const dashboardMetricCardClass =
  "rounded-2xl border border-slate-800 bg-gradient-to-br from-fuchsia-950/60 via-slate-900 to-blue-950/60 p-5 transition hover:-translate-y-0.5 hover:border-purple-500/70 hover:brightness-125 hover:saturate-110 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.55),0_8px_20px_rgba(88,28,135,0.22)] focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

export default function DashboardMetricCard({ to, icon: Icon, label, value, note, tone }) {
  return (
    <Link to={to} className={dashboardMetricCardClass}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-2 text-4xl font-semibold text-white">{value}</p>
          {note && <p className="mt-2 text-sm text-slate-500">{note}</p>}
        </div>
        <span className={`rounded-xl p-3 ${tone}`}>
          <Icon size={22} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
