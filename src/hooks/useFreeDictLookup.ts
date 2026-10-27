import { useState, useCallback } from "react";
import { WordData, FreeDictLookupResponse } from "../types/lookup";
import { parseFreeDictToWordData } from "../utils/freeDictApi";

interface FreeDictWordState {
  data: WordData | null;
  loading: boolean;
  error: string | null;
}

/** Quick-lookup view hook — returns a parsed WordData for display in WordCard. */
export function useFreeDictLookup(lang: string) {
  const [state, setState] = useState<FreeDictWordState>({
    data: null,
    loading: false,
    error: null,
  });

  const lookup = useCallback(
    (word: string) => {
      const trimmed = word.trim();
      if (!trimmed) return;

      setState({ data: null, loading: true, error: null });

      chrome.runtime.sendMessage(
        { type: "FREE_DICT_LOOKUP", word: trimmed, lang: lang || "en" },
        (response: FreeDictLookupResponse) => {
          if (chrome.runtime.lastError) {
            setState({ data: null, loading: false, error: chrome.runtime.lastError.message ?? "Extension error" });
            return;
          }
          if (response.error) {
            setState({ data: null, loading: false, error: response.error });
          } else if (response.response) {
            const wordData = parseFreeDictToWordData(response.response);
            setState({ data: wordData, loading: false, error: wordData ? null : "No definitions found." });
          } else {
            setState({ data: null, loading: false, error: "No results." });
          }
        }
      );
    },
    [lang]
  );

  return { ...state, lookup };
}
