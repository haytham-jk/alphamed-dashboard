import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyFeedbackButton({ value, className = "", children }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  async function handleCopy(event) {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(String(value ?? ""));
      setCopied(true);
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" onClick={handleCopy} className={`relative ${className}`}>
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      {children}
      <span
        role="status"
        aria-live="polite"
        className={`pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md border border-emerald-800 bg-emerald-950 px-2 py-1 text-xs font-medium text-emerald-300 shadow-lg transition-all ${copied ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
      >
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
