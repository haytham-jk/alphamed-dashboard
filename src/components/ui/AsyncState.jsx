export function LoadingState({ message = "Loading...", compact = false }) {
  return (
    <div className={compact ? "py-4 text-center text-slate-400" : "py-12 text-center text-slate-400"} role="status">
      {message}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  retryLabel = "Retry",
  retrying = false,
  title,
}) {
  return (
    <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300" role="alert">
      {title && <p className="font-semibold">{title}</p>}
      <p className={title ? "mt-1" : ""}>{message || "Something went wrong."}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-3 rounded-lg border border-red-700 px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-60"
        >
          {retrying ? "Retrying..." : retryLabel}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }) {
  return <div className="rounded-xl border border-slate-800 p-8 text-center text-slate-500">{message}</div>;
}
