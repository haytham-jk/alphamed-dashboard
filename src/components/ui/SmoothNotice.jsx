import { useEffect, useState } from "react";

export default function SmoothNotice({ message, duration = 5000 }) {
  const [visible, setVisible] = useState(Boolean(message));
  const [renderedMessage, setRenderedMessage] = useState(message);

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return undefined;
    }
    setRenderedMessage(message);
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), duration);
    return () => window.clearTimeout(timer);
  }, [message, duration]);

  return (
    <div
      aria-live="polite"
      className={[
        "grid transition-[grid-template-rows,opacity,margin] duration-500 ease-in-out motion-reduce:transition-none",
        visible ? "mt-3 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0",
      ].join(" ")}
    >
      <div className="overflow-hidden">
        <div className="rounded-xl border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-300">
          {renderedMessage}
        </div>
      </div>
    </div>
  );
}
