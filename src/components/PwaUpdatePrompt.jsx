import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { registerSW } from "virtual:pwa-register";

export default function PwaUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateServiceWorker, setUpdateServiceWorker] = useState(null);

  useEffect(() => {
    const update = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
    });

    setUpdateServiceWorker(() => update);
  }, []);

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-2xl border border-slate-700 bg-slate-900 p-4 text-slate-100 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">
            {needRefresh ? "A new version is available" : "Operations Hub is ready"}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {needRefresh
              ? "Update when you are not editing a form. Unsaved work will be lost if the app reloads."
              : "The application shell is available. Current operational records still require a network connection."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setNeedRefresh(false); setOfflineReady(false); }}
          aria-label="Dismiss notification"
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      {needRefresh && (
        <button
          type="button"
          onClick={() => updateServiceWorker?.(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
        >
          <RefreshCw size={17} aria-hidden="true" />
          Update now
        </button>
      )}
    </div>
  );
}
