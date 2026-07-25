import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function FlashMessage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState(location.state?.message || "");

  useEffect(() => {
    if (!location.state?.message) return;
    setMessage(location.state.message);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
  }, [location.pathname, location.search, location.state, navigate]);

  if (!message) return null;
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-900 bg-emerald-950/50 p-4 text-emerald-300" role="status">
      <span>{message}</span>
      <button type="button" onClick={() => setMessage("")} aria-label="Dismiss notification" className="rounded px-2 py-1 hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">Dismiss</button>
    </div>
  );
}
