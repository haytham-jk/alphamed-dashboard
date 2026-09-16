import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage, isAbortError } from "../utils/appErrors";

export default function useAsyncResource(
  loader,
  dependencies = [],
  { initialData = null, enabled = true, fallbackError = "Unable to load data." } = {}
) {
  const requestId = useRef(0);
  const initialDataRef = useRef(initialData);
  const controllerRef = useRef(null);
  const [state, setState] = useState({
    data: initialData,
    loading: enabled,
    refreshing: false,
    error: "",
  });

  const load = useCallback(async () => {
    if (!enabled) {
      controllerRef.current?.abort();
      requestId.current += 1;
      setState({ data: initialDataRef.current, loading: false, refreshing: false, error: "" });
      return initialDataRef.current;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const id = ++requestId.current;

    setState((current) => ({
      ...current,
      loading: current.data === null,
      refreshing: current.data !== null,
      error: "",
    }));

    try {
      const data = await loader({ signal: controller.signal });
      if (requestId.current === id && !controller.signal.aborted) {
        setState({ data, loading: false, refreshing: false, error: "" });
      }
      return data;
    } catch (error) {
      if (requestId.current === id && !isAbortError(error)) {
        setState((current) => ({
          ...current,
          loading: false,
          refreshing: false,
          error: getErrorMessage(error, fallbackError),
        }));
      }
      return undefined;
    }
  }, [enabled, fallbackError, ...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
    return () => {
      controllerRef.current?.abort();
      requestId.current += 1;
    };
  }, [load]);

  return { ...state, retry: load, refresh: load };
}
