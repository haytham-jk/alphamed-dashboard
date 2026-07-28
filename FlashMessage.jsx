import { useLocation, useNavigate } from "react-router-dom";

export default function FlashMessage() {
  const location = useLocation();
  const navigate = useNavigate();
  const message = location.state?.message || "";

  if (!message) return null;

  function dismiss() {
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: {},
    });
  }

  return (
    <div
      className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-emerald-900 bg-emerald-950/60 p-4 text-emerald-200"
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss notification"
        className="shrink-0 rounded px-2 py-1 hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      >
        Dismiss
      </button>
    </div>
  );
}
