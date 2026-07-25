import { useEffect } from "react";

export default function useUnsavedChanges(isDirty) {
  useEffect(() => {
    function handleBeforeUnload(event) {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  function confirmDiscard() {
    return !isDirty || window.confirm("You have unsaved changes. Leave this page and discard them?");
  }

  return { confirmDiscard };
}
