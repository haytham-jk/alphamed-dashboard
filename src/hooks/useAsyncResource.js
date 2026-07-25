import { useCallback, useEffect, useRef, useState } from "react";

export default function useAsyncResource(loader, dependencies = []) {
  const requestId = useRef(0);
  const [state, setState] = useState({ data: null, loading: true, error: "" });

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await loader();
      if (requestId.current === id) setState({ data, loading: false, error: "" });
    } catch (error) {
      if (requestId.current === id) {
        setState((current) => ({ ...current, loading: false, error: error?.message || "Unable to load data." }));
      }
    }
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
    return () => { requestId.current += 1; };
  }, [load]);

  return { ...state, retry: load };
}
