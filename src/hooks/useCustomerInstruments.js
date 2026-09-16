import { useCallback, useEffect, useRef, useState } from "react";
import { getInstrumentsForCustomer } from "../services/assets";

const EMPTY_INSTRUMENTS = Object.freeze([]);

export default function useCustomerInstruments(customerId) {
  const normalizedCustomerId = String(customerId ?? "").trim();
  const requestIdRef = useRef(0);
  const controllerRef = useRef(null);
  const [state, setState] = useState({
    instruments: EMPTY_INSTRUMENTS,
    loadingInstruments: false,
    instrumentError: "",
  });

  const loadInstruments = useCallback(async () => {
    controllerRef.current?.abort();
    const requestId = ++requestIdRef.current;

    if (!normalizedCustomerId) {
      setState({
        instruments: EMPTY_INSTRUMENTS,
        loadingInstruments: false,
        instrumentError: "",
      });
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setState({
      instruments: EMPTY_INSTRUMENTS,
      loadingInstruments: true,
      instrumentError: "",
    });

    try {
      const instruments = await getInstrumentsForCustomer(
        normalizedCustomerId,
        { signal: controller.signal }
      );
      if (requestIdRef.current !== requestId || controller.signal.aborted) return;
      setState({
        instruments: instruments ?? EMPTY_INSTRUMENTS,
        loadingInstruments: false,
        instrumentError: "",
      });
    } catch (error) {
      if (requestIdRef.current !== requestId || error?.name === "AbortError") return;
      setState({
        instruments: EMPTY_INSTRUMENTS,
        loadingInstruments: false,
        instrumentError:
          error?.message || "Unable to load customer instruments.",
      });
    }
  }, [normalizedCustomerId]);

  useEffect(() => {
    loadInstruments();
    return () => {
      controllerRef.current?.abort();
      requestIdRef.current += 1;
    };
  }, [loadInstruments]);

  return {
    ...state,
    retryInstruments: loadInstruments,
  };
}
