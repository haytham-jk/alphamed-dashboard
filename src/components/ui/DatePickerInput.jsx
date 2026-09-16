import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { formatDateOnly, parseDisplayDateOnly } from "../../utils/dates.js";

function formatIsoDate(value) {
  return formatDateOnly(value, "");
}

function formatWhileTyping(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export default function DatePickerInput({
  id,
  value = "",
  onChange,
  className = "",
  required = false,
  min,
  max,
  disabled = false,
  ariaLabel = "Choose date",
  invalid = false,
  describedBy,
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const calendarInputRef = useRef(null);
  const [displayValue, setDisplayValue] = useState(formatIsoDate(value));
  const [formatError, setFormatError] = useState(false);

  useEffect(() => {
    setDisplayValue(formatIsoDate(value));
    setFormatError(false);
  }, [value]);

  function emitChange(nextValue) {
    onChange?.({
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    });
  }

  function isWithinRange(isoValue) {
    return (!min || isoValue >= min) && (!max || isoValue <= max);
  }

  function commitDisplayValue() {
    if (!displayValue) {
      setFormatError(false);
      emitChange("");
      return;
    }
    const isoValue = parseDisplayDateOnly(displayValue);
    if (!isoValue || !isWithinRange(isoValue)) {
      setFormatError(true);
      return;
    }
    setFormatError(false);
    setDisplayValue(formatIsoDate(isoValue));
    emitChange(isoValue);
  }

  function handleTextChange(event) {
    const nextDisplayValue = formatWhileTyping(event.target.value);
    setDisplayValue(nextDisplayValue);
    setFormatError(false);
    const isoValue = parseDisplayDateOnly(nextDisplayValue);
    if (isoValue && isWithinRange(isoValue)) emitChange(isoValue);
    else if (!nextDisplayValue) emitChange("");
  }

  function handleCalendarChange(event) {
    const nextValue = event.target.value;
    setDisplayValue(formatIsoDate(nextValue));
    setFormatError(false);
    emitChange(nextValue);
  }

  function openCalendar() {
    if (disabled || !calendarInputRef.current) return;
    calendarInputRef.current.focus();
    if (typeof calendarInputRef.current.showPicker === "function") {
      try {
        calendarInputRef.current.showPicker();
      } catch {
        // The hidden native date input remains focused as a fallback.
      }
    }
  }

  const isInvalid = invalid || formatError;
  const formatHelpId = `${inputId}-format-help`;
  const ariaDescription = [describedBy, formatError ? formatHelpId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={`relative ${className}`}>
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="DD/MM/YYYY"
        value={displayValue}
        onChange={handleTextChange}
        onBlur={commitDisplayValue}
        onKeyDown={(event) => {
          if (event.key === "Enter") commitDisplayValue();
        }}
        required={required}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={isInvalid || undefined}
        aria-describedby={ariaDescription}
        className={`w-full rounded-xl border bg-slate-950 px-3 py-2 pr-11 text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-60 ${isInvalid ? "border-red-700" : "border-slate-700"}`}
      />
      <input
        ref={calendarInputRef}
        type="date"
        value={value || ""}
        onChange={handleCalendarChange}
        min={min}
        max={max}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute h-px w-px opacity-0"
      />
      <button
        type="button"
        onClick={openCalendar}
        disabled={disabled}
        aria-label={`Open ${ariaLabel.toLowerCase()}`}
        className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-60"
      >
        <CalendarDays size={18} aria-hidden="true" />
      </button>
      {formatError && (
        <span id={formatHelpId} className="mt-1 block text-xs text-red-400">
          Enter a valid date in DD/MM/YYYY format.
        </span>
      )}
    </div>
  );
}
