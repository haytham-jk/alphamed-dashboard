const preloadPromises = new Map();

export function preloadRoute(routeKey, importer) {
  if (!routeKey || typeof importer !== "function") return Promise.resolve();
  if (!preloadPromises.has(routeKey)) {
    preloadPromises.set(
      routeKey,
      Promise.resolve()
        .then(importer)
        .catch((error) => {
          preloadPromises.delete(routeKey);
          throw error;
        })
    );
  }
  return preloadPromises.get(routeKey);
}

export function scheduleRoutePreloads(entries, windowObject = window) {
  const validEntries = entries.filter(
    ([routeKey, importer]) => routeKey && typeof importer === "function"
  );
  if (!validEntries.length) return () => {};

  let cancelled = false;
  const run = () => {
    if (cancelled) return;
    validEntries.forEach(([routeKey, importer]) => {
      preloadRoute(routeKey, importer).catch(() => {});
    });
  };

  if (typeof windowObject.requestIdleCallback === "function") {
    const idleId = windowObject.requestIdleCallback(run, { timeout: 1800 });
    return () => {
      cancelled = true;
      windowObject.cancelIdleCallback?.(idleId);
    };
  }

  const timeoutId = windowObject.setTimeout(run, 700);
  return () => {
    cancelled = true;
    windowObject.clearTimeout(timeoutId);
  };
}
