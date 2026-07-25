import React from "react";

export const Card = React.forwardRef(function Card({ className = "", ...props }, ref) {
  return <section ref={ref} className={`rounded-2xl border border-slate-800 bg-slate-900 ${className}`} {...props} />;
});
Card.displayName = "Card";

export const CardContent = React.forwardRef(function CardContent({ className = "", ...props }, ref) {
  return <div ref={ref} className={`p-5 ${className}`} {...props} />;
});
CardContent.displayName = "CardContent";
