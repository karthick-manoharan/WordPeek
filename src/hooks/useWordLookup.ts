import { useState, useCallback } from "react";
import { WordData, LookupResponse } from "../types/lookup";

interface LookupState {
  data: WordData | null;
  loading: boolean;
  error: string | null;
}

export function useWordLookup() {
  const [state, setState] = useState<LookupState>({
    data: null,
    loading: false,
    error: null,
  });

  const lookup = useCallback((word: string) => {
    const trimmed = word.trim();
    if (!trimmed) return;

    setState({ data: null, loading: true, error: null });

    chrome.runtime.sendMessage(
      { type: "LOOKUP", word: trimmed },
      (response: LookupResponse) => {
        if (chrome.runtime.lastError) {
          setState({ data: null, loading: false, error: chrome.runtime.lastError.message ?? "Extension error" });
          return;
        }
        if (response.error) {
          setState({ data: null, loading: false, error: response.error });
        } else {
          setState({ data: response.data ?? null, loading: false, error: null });
        }
      }
    );
  }, []);

  return { ...state, lookup };
}
