function focusElement(element) {
  if (!element) return false;

  window.requestAnimationFrame(() => {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.focus({ preventScroll: true });
  });

  return true;
}

export function focusFirstInvalidField(form, selector = "") {
  if (!form) return false;

  const requested = selector ? form.querySelector(selector) : null;
  const invalid = form.querySelector(":invalid");
  const fallback = form.querySelector(
    "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])"
  );

  return focusElement(requested || invalid || fallback);
}

export function handleInvalidCapture(event) {
  const form = event.currentTarget;
  const firstInvalid = form?.querySelector(":invalid") || event.target;
  focusElement(firstInvalid);
}
