export default function PaginationControls({ page, pageCount, onPageChange }) {
  if (pageCount <= 1) return null;
  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-xl border border-slate-700 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">Previous</button>
      <span className="text-sm text-slate-400">Page {page} of {pageCount}</span>
      <button type="button" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} className="rounded-xl border border-slate-700 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">Next</button>
    </nav>
  );
}
