import { buildDictUrl, buildThesaurusUrl } from "../utils/mwApi";
import { buildFreeDictUrl } from "../utils/freeDictApi";
import { parseWordData } from "../utils/parseResponse";
import {
  LookupMessage,
  PlayAudioMessage,
  LookupResponse,
  DictLookupMessage,
  DictLookupResponse,
  FreeDictLookupMessage,
  FreeDictLookupResponse,
} from "../types/lookup";
import { MWDictionaryResponse, MWDictionaryEntry } from "../types/mw-dictionary";
import { MWThesaurusResponse } from "../types/mw-thesaurus";
import { FreeDictResponse } from "../types/free-dictionary";

const OFFSCREEN_URL = "src/offscreen/offscreen.html";

chrome.runtime.onMessage.addListener(
  (
    message: LookupMessage | PlayAudioMessage | DictLookupMessage | FreeDictLookupMessage,
    _sender,
    sendResponse
  ) => {
    if (message.type === "LOOKUP") {
      handleLookup(message.word)
        .then(sendResponse)
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : "Unknown error";
          sendResponse({ error: msg } satisfies LookupResponse);
        });
      return true;
    }

    if (message.type === "DICT_LOOKUP") {
      handleDictLookup(message.word)
        .then(sendResponse)
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : "Unknown error";
          sendResponse({ error: msg } satisfies DictLookupResponse);
        });
      return true;
    }

    if (message.type === "FREE_DICT_LOOKUP") {
      handleFreeDictLookup(message.word, message.lang)
        .then(sendResponse)
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : "Unknown error";
          sendResponse({ error: msg } satisfies FreeDictLookupResponse);
        });
      return true;
    }

    if (message.type === "PLAY_AUDIO") {
      handlePlayAudio(message.url).catch(() => {});
      return false;
    }

    return false;
  }
);

async function handlePlayAudio(url: string): Promise<void> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)],
  });

  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
      justification: "Playing Merriam-Webster pronunciation audio",
    });
  }

  chrome.runtime.sendMessage({ type: "PLAY_AUDIO_OFFSCREEN", url });
}

async function handleLookup(word: string): Promise<LookupResponse> {
  const { dictKey, thesKey } = await getApiKeys();

  if (!dictKey || !thesKey) {
    return {
      error: "API keys are not configured. Please open the extension Options page to add them.",
    };
  }

  const [dictRaw, thesRaw] = await Promise.all([
    fetchJson<MWDictionaryResponse>(buildDictUrl(word, dictKey)),
    fetchJson<MWThesaurusResponse>(buildThesaurusUrl(word, thesKey)),
  ]);

  const data = parseWordData(dictRaw, thesRaw);

  if (!data) {
    return { error: `No results found for "${word}".` };
  }

  return { data };
}

async function handleDictLookup(word: string): Promise<DictLookupResponse> {
  const { dictKey } = await getApiKeys();

  if (!dictKey) {
    return {
      error: "Dictionary API key is not configured. Please open the extension Options page to add it.",
    };
  }

  const raw = await fetchJson<MWDictionaryResponse>(buildDictUrl(word, dictKey));

  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: `No results found for "${word}".` };
  }

  if (typeof raw[0] === "string") {
    return { suggestions: raw as string[] };
  }

  return { entries: raw as MWDictionaryEntry[] };
}

async function handleFreeDictLookup(word: string, lang: string): Promise<FreeDictLookupResponse> {
  const url = buildFreeDictUrl(word, lang || "en");
  const raw = await fetchJson<FreeDictResponse | { title: string }>(url);

  // API returns an error object (not an array) when the word is not found
  if (!raw || "title" in raw) {
    return { error: `No results found for "${word}".` };
  }

  return { response: raw as FreeDictResponse };
}

async function getApiKeys(): Promise<{ dictKey: string; thesKey: string }> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["dictKey", "thesKey"], (result) => {
      resolve({
        dictKey: (result.dictKey as string) ?? "",
        thesKey: (result.thesKey as string) ?? "",
      });
    });
  });
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}
