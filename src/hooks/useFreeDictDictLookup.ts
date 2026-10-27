import { useState, useCallback } from "react";
import { FreeDictLookupResponse } from "../types/lookup";
import { FreeDictResponse } from "../types/free-dictionary";

interface FreeDictDictState {
  response: FreeDictResponse | null;
  loading: boolean;
  error: string | null;
}

/** Dictionary-view hook — returns the raw FreeDictResponse for rendering in FreeDictCard. */
export function useFreeDictDictLookup(lang: string) {
  const [state, setState] = useState<FreeDictDictState>({
    response: null,
    loading: false,
    error: null,
  });

  const lookup = useCallback(
    (word: string) => {
      const trimmed = word.trim();
      if (!trimmed) return;

      setState({ response: null, loading: true, error: null });

      chrome.runtime.sendMessage(
        { type: "FREE_DICT_LOOKUP", word: trimmed, lang: lang || "en" },
        (res: FreeDictLookupResponse) => {
          if (chrome.runtime.lastError) {
            setState({ response: null, loading: false, error: chrome.runtime.lastError.message ?? "Extension error" });
            return;
          }
          if (res.error) {
            setState({ response: null, loading: false, error: res.error });
          } else {
            setState({ response: res.response ?? null, loading: false, error: null });
          }
        }
      );
    },
    [lang]
  );

  return { ...state, lookup };
}
