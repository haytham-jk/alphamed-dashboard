import React from "react";

export const Button = React.forwardRef(function Button(
  { className = "", variant = "default", type = "button", loading = false, disabled, children, ...props },
  ref
) {
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-500",
    outline: "border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800",
    danger: "border border-red-800 bg-red-950/30 text-red-300 hover:bg-red-950",
  };
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant] || variants.default} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
Button.displayName = "Button";
