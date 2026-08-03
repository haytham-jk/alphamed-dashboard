import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";

function splitSelectClasses(className = "") {
  const classes = String(className).split(/\s+/).filter(Boolean);
  const wrapperClasses = [];
  const selectClasses = [];

  for (const item of classes) {
    if (/^(?:[a-z]+:)*m[trblxy]?-/.test(item)) {
      wrapperClasses.push(item);
    } else {
      selectClasses.push(item);
    }
  }

  return {
    wrapperClassName: wrapperClasses.join(" "),
    selectClassName: selectClasses.join(" "),
  };
}

const SelectInput = forwardRef(function SelectInput(
  {
    className = "",
    wrapperClassName = "",
    invalid = false,
    children,
    ...props
  },
  ref
) {
  const splitClasses = splitSelectClasses(className);
  const isInvalid = invalid || props["aria-invalid"] === true || props["aria-invalid"] === "true";

  return (
    <span
      className={`relative block w-full ${splitClasses.wrapperClassName} ${wrapperClassName}`.trim()}
    >
      <select
        {...props}
        ref={ref}
        aria-invalid={isInvalid || undefined}
        className={`w-full appearance-none rounded-xl border bg-slate-950 px-3 py-2 pr-12 text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60 ${
          isInvalid ? "border-red-700" : "border-slate-700"
        } ${splitClasses.selectClassName}`.trim()}
      >
        {children}
      </select>
      <ChevronDown
        size={18}
        strokeWidth={2}
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </span>
  );
});

export default SelectInput;
