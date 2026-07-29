import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const EXIT_DURATION = 500;

export default function FlashMessage() {
  const location = useLocation();
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const clearRef = useRef(null);
  const routeMessage = location.state?.message || "";
  const [message, setMessage] = useState(routeMessage);
  const [visible, setVisible] = useState(Boolean(routeMessage));

  useEffect(() => {
    if (!routeMessage) return;
    setMessage(routeMessage);
    window.requestAnimationFrame(() => setVisible(true));
    navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
  }, [location.pathname, location.search, navigate, routeMessage]);

  useEffect(() => {
    if (!message) return undefined;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setVisible(false), 5500);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [message]);

  useEffect(() => {
    if (visible || !message) return undefined;
    if (clearRef.current) window.clearTimeout(clearRef.current);
    clearRef.current = window.setTimeout(() => setMessage(""), EXIT_DURATION);
    return () => {
      if (clearRef.current) window.clearTimeout(clearRef.current);
    };
  }, [message, visible]);

  function dismiss() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setVisible(false);
  }

  return (
    <div
      className={[
        "grid transition-[grid-template-rows,opacity,margin] duration-500 ease-in-out motion-reduce:transition-none",
        visible && message ? "mb-5 grid-rows-[1fr] opacity-100" : "mb-0 grid-rows-[0fr] opacity-0",
      ].join(" ")}
      aria-live="polite"
    >
      <div className="overflow-hidden">
        <div className="flex items-start justify-between gap-4 rounded-xl border border-emerald-700 bg-emerald-950 p-4 text-emerald-100 shadow-lg" role="status">
          <span>{message}</span>
          <button type="button" onClick={dismiss} aria-label="Dismiss notification" className="shrink-0 rounded-lg px-2 py-1 text-emerald-200 hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">Dismiss</button>
        </div>
      </div>
    </div>
  );
}
