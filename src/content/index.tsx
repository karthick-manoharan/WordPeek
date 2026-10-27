import { createRoot } from "react-dom/client";
import { SelectionPopup } from "./SelectionPopup";
import { WordData, LookupResponse, FreeDictLookupResponse, LookupSource } from "../types/lookup";
import { parseFreeDictToWordData } from "../utils/freeDictApi";
import cardStyles from "../components/WordCard.css?inline";

import { subscribeTheme } from "../theme/theme";
import themeStyles from "../theme/theme.css?inline";

// ── Settings ───────────────────────────────────────────────────────────────

let triggerOnDblClick = false;
let lookupSources: LookupSource = "mw";
let freeDictLang = "en";

chrome.storage.sync.get(["triggerOnDblClick", "lookupSources", "freeDictLang"], (result) => {
  triggerOnDblClick = (result.triggerOnDblClick as boolean) ?? false;
  lookupSources = (result.lookupSources as LookupSource) ?? "mw";
  freeDictLang = (result.freeDictLang as string) ?? "en";
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if ("triggerOnDblClick" in changes) triggerOnDblClick = changes.triggerOnDblClick.newValue as boolean;
  if ("lookupSources" in changes) lookupSources = changes.lookupSources.newValue as LookupSource;
  if ("freeDictLang" in changes) freeDictLang = changes.freeDictLang.newValue as string;
});

// ── State ──────────────────────────────────────────────────────────────────

let lookupVersion = 0;

let shadowHost: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let reactRoot: ReturnType<typeof createRoot> | null = null;

interface SourceState {
  data: WordData | null;
  loading: boolean;
  error: string | null;
}

interface PopupState {
  mw: SourceState;
  freeDict: SourceState;
  position: { left: number; top: number; bottom: number };
}

const emptySource: SourceState = { data: null, loading: false, error: null };

let state: PopupState = {
  mw: { ...emptySource },
  freeDict: { ...emptySource },
  position: { left: 0, top: 0, bottom: 0 },
};

// ── Mount / render helpers ─────────────────────────────────────────────────

function ensureMount() {
  if (!shadowHost) {
    shadowHost = document.createElement("div");
    shadowHost.id = "mw-extension-root";
    document.body.appendChild(shadowHost);

    shadowRoot = shadowHost.attachShadow({ mode: "closed" });

    // Inject component CSS into Shadow DOM so it's isolated from the host page
    const style = document.createElement("style");
    style.textContent = themeStyles + cardStyles;
    shadowRoot.appendChild(style);

    const container = document.createElement("div");
    subscribeTheme(container);
    shadowRoot.appendChild(container);
    reactRoot = createRoot(container);
  }
}

function render() {
  ensureMount();
  reactRoot!.render(
    <SelectionPopup
      mw={state.mw}
      freeDict={state.freeDict}
      lookupSources={lookupSources}
      position={state.position}
      onClose={dismiss}
    />
  );
}

function dismiss() {
  lookupVersion++;
  state = {
    mw: { ...emptySource },
    freeDict: { ...emptySource },
    position: { left: 0, top: 0, bottom: 0 },
  };
  reactRoot?.render(null);
}

// ── Position calculation ───────────────────────────────────────────────────

function getPopupPosition(selection: Selection) {
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  return { left: rect.left, top: rect.top, bottom: rect.bottom };
}

// ── Main listener ──────────────────────────────────────────────────────────

document.addEventListener("mouseup", (e) => {
  // Ignore clicks inside the popup itself
  if (shadowHost && shadowHost.contains(e.target as Node)) return;

  // In double-click mode, only respond to the second click of a dblclick (detail === 2)
  if (triggerOnDblClick && e.detail < 2) {
    dismiss();
    return;
  }

  const selection = window.getSelection();
  const word = selection?.toString().trim();

  if (!word || word.includes(" ") || word.length < 2) {
    dismiss();
    return;
  }

  const version = ++lookupVersion;
  const position = getPopupPosition(selection!);
  const useMW = lookupSources === "mw" || lookupSources === "both";
  const useFD = lookupSources === "freeDict" || lookupSources === "both";

  state = {
    mw: { data: null, loading: useMW, error: null },
    freeDict: { data: null, loading: useFD, error: null },
    position,
  };
  render();

  if (useMW) {
    chrome.runtime.sendMessage(
      { type: "LOOKUP", word },
      (response: LookupResponse) => {
        if (version !== lookupVersion) return;
        if (chrome.runtime.lastError) {
          state = { ...state, mw: { data: null, loading: false, error: chrome.runtime.lastError.message ?? "Error" } };
        } else if (response.error) {
          state = { ...state, mw: { data: null, loading: false, error: response.error } };
        } else {
          state = { ...state, mw: { data: response.data ?? null, loading: false, error: null } };
        }
        render();
      }
    );
  }

  if (useFD) {
    chrome.runtime.sendMessage(
      { type: "FREE_DICT_LOOKUP", word, lang: freeDictLang },
      (response: FreeDictLookupResponse) => {
        if (version !== lookupVersion) return;
        let fdState: SourceState;
        if (chrome.runtime.lastError) {
          fdState = { data: null, loading: false, error: chrome.runtime.lastError.message ?? "Error" };
        } else if (response.error) {
          fdState = { data: null, loading: false, error: response.error };
        } else {
          const parsed = response.response ? parseFreeDictToWordData(response.response) : null;
          fdState = { data: parsed, loading: false, error: parsed ? null : "No definitions found." };
        }
        state = { ...state, freeDict: fdState };
        render();
      }
    );
  }
});

// Dismiss when clicking outside the popup
document.addEventListener("mousedown", (e) => {
  if (shadowHost && !shadowHost.contains(e.target as Node)) {
    dismiss();
  }
});
