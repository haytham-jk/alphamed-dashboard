import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function FlashMessage() {
  const location = useLocation();
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const routeMessage = location.state?.message || "";
  const [message, setMessage] = useState(routeMessage);

  useEffect(() => {
    if (!routeMessage) return;

    setMessage(routeMessage);
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: {},
    });
  }, [location.pathname, location.search, navigate, routeMessage]);

  useEffect(() => {
    if (!message) return;

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      setMessage("");
      timerRef.current = null;
    }, 6000);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [message]);

  function dismiss() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setMessage("");
  }

  if (!message) return null;

  return (
    <div
      className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-emerald-700 bg-emerald-950 p-4 text-emerald-100 shadow-lg"
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-lg px-2 py-1 text-emerald-200 hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      >
        Dismiss
      </button>
    </div>
  );
}
