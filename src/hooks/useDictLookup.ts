import { useState, useCallback } from "react";
import { DictLookupResponse } from "../types/lookup";
import { MWDictionaryEntry } from "../types/mw-dictionary";

interface DictLookupState {
  entries: MWDictionaryEntry[] | null;
  suggestions: string[] | null;
  loading: boolean;
  error: string | null;
}

export function useDictLookup() {
  const [state, setState] = useState<DictLookupState>({
    entries: null,
    suggestions: null,
    loading: false,
    error: null,
  });

  const lookup = useCallback((word: string) => {
    const trimmed = word.trim();
    if (!trimmed) return;

    setState({ entries: null, suggestions: null, loading: true, error: null });

    chrome.runtime.sendMessage(
      { type: "DICT_LOOKUP", word: trimmed },
      (response: DictLookupResponse) => {
        if (chrome.runtime.lastError) {
          setState({
            entries: null,
            suggestions: null,
            loading: false,
            error: chrome.runtime.lastError.message ?? "Extension error",
          });
          return;
        }
        if (response.error) {
          setState({
            entries: null,
            suggestions: null,
            loading: false,
            error: response.error,
          });
        } else {
          setState({
            entries: response.entries ?? null,
            suggestions: response.suggestions ?? null,
            loading: false,
            error: null,
          });
        }
      }
    );
  }, []);

  return { ...state, lookup };
}
