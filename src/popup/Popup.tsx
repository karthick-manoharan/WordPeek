import { useState, useRef, useEffect, useCallback } from "react";
import { WordCard } from "../components/WordCard";
import { DictCard } from "../components/DictCard";
import { FreeDictCard } from "../components/FreeDictCard";
import { NavDock, NavMode, NavPosition } from "../components/NavDock";
import { useWordLookup } from "../hooks/useWordLookup";
import { useDictLookup } from "../hooks/useDictLookup";
import { useFreeDictLookup } from "../hooks/useFreeDictLookup";
import { useFreeDictDictLookup } from "../hooks/useFreeDictDictLookup";
import { LookupSource } from "../types/lookup";
import "../components/WordCard.css";
import "../components/DictCard.css";

export function Popup() {
  console.log("[MW v2] Popup mounted");
  const [mode, setMode] = useState<NavMode>("quick");
  const [navPosition, setNavPosition] = useState<NavPosition>("top");
  const [lookupSources, setLookupSources] = useState<LookupSource>("mw");
  const [freeDictLang, setFreeDictLang] = useState("en");

  // Load preferences from storage
  useEffect(() => {
    chrome.storage.sync.get(["navPosition", "lookupSources", "freeDictLang"], (result) => {
      const pos = result.navPosition as NavPosition | undefined;
      if (pos) setNavPosition(pos);
      setLookupSources((result.lookupSources as LookupSource) ?? "mw");
      setFreeDictLang((result.freeDictLang as string) ?? "en");
    });
  }, []);

  const isVerticalDock = navPosition === "left" || navPosition === "right";
  const dockAfterContent = navPosition === "right" || navPosition === "bottom";

  const shellStyle: React.CSSProperties = isVerticalDock
    ? { display: "flex", flexDirection: "row" }
    : { display: "flex", flexDirection: "column" };

  const dock = (
    <NavDock
      activeMode={mode}
      onModeChange={setMode}
      position={navPosition}
    />
  );

  return (
    <div className="mw-popup-shell" data-nav-pos={navPosition} style={shellStyle}>
      {!dockAfterContent && dock}
      <div className="mw-popup-content" style={{ flex: 1, overflow: "hidden" }}>
        {mode === "quick"
          ? <QuickLookupView lookupSources={lookupSources} freeDictLang={freeDictLang} />
          : <DictionaryView lookupSources={lookupSources} freeDictLang={freeDictLang} />}
      </div>
      {dockAfterContent && dock}
    </div>
  );
}

// ── Quick Lookup View ──────────────────────────────────────────────────────────

function QuickLookupView({ lookupSources, freeDictLang }: { lookupSources: LookupSource; freeDictLang: string }) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const mw = useWordLookup();
  const fd = useFreeDictLookup(freeDictLang);

  const showMW = lookupSources === "mw" || lookupSources === "both";
  const showFD = lookupSources === "freeDict" || lookupSources === "both";
  const showLabels = lookupSources === "both";
  const isLoading = (showMW && mw.loading) || (showFD && fd.loading);
  const hasAny = (showMW && (mw.data || mw.error)) || (showFD && (fd.data || fd.error));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const word = input.trim();
    if (!word) return;
    if (showMW) mw.lookup(word);
    if (showFD) fd.lookup(word);
  }

  return (
    <>
      <form className="mw-search-bar" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className="mw-search-input"
          type="text"
          placeholder="Look up a word…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
        <button className="mw-search-btn" type="submit" disabled={isLoading}>
          {isLoading ? "…" : "→"}
        </button>
      </form>

      <div className="mw-popup-body">
        {!hasAny && !isLoading && (
          <p className="mw-popup-hint">Type a word and press Enter</p>
        )}

        {showMW && (
          <>
            {showLabels && (mw.loading || mw.data || mw.error) && (
              <div className="mw-source-label">Merriam-Webster</div>
            )}
            {mw.loading && <p className="mw-popup-hint">Looking up…</p>}
            {mw.error && <p className="mw-popup-error">{mw.error}</p>}
            {mw.data && <WordCard data={mw.data} />}
          </>
        )}

        {showFD && (
          <>
            {showLabels && (fd.loading || fd.data || fd.error) && (
              <>
                {(mw.data || mw.error) && <hr className="mw-source-divider" />}
                <div className="mw-source-label">Free Dictionary</div>
              </>
            )}
            {fd.loading && <p className="mw-popup-hint">Looking up…</p>}
            {fd.error && <p className="mw-popup-error">{fd.error}</p>}
            {fd.data && <WordCard data={fd.data} />}
          </>
        )}
      </div>
    </>
  );
}

// ── Dictionary View ───────────────────────────────────────────────────────────

function DictionaryView({ lookupSources, freeDictLang }: { lookupSources: LookupSource; freeDictLang: string }) {
  const [input, setInput] = useState("");
  const showMW = lookupSources === "mw" || lookupSources === "both";
  const showFD = lookupSources === "freeDict" || lookupSources === "both";
  const showLabels = lookupSources === "both";
  const { entries, suggestions, loading: mwLoading, error: mwError, lookup: mwLookup } = useDictLookup();
  const { response: fdResponse, loading: fdLoading, error: fdError, lookup: fdLookup } = useFreeDictDictLookup(freeDictLang);

  // Navigation history: words array + cursor index
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);

  const navigate = useCallback(
    (word: string) => {
      const trimmed = word.trim();
      if (!trimmed) return;
      setInput(trimmed);
      setHistory((prev) => [...prev.slice(0, cursor + 1), trimmed]);
      setCursor((prev) => prev + 1);
      if (showMW) mwLookup(trimmed);
      if (showFD) fdLookup(trimmed);
    },
    [cursor, showMW, showFD, mwLookup, fdLookup]
  );

  const goBack = useCallback(() => {
    if (cursor > 0) {
      const word = history[cursor - 1];
      setCursor((prev) => prev - 1);
      setInput(word);
      if (showMW) mwLookup(word);
      if (showFD) fdLookup(word);
    }
  }, [cursor, history, showMW, showFD, mwLookup, fdLookup]);

  const goForward = useCallback(() => {
    if (cursor < history.length - 1) {
      const word = history[cursor + 1];
      setCursor((prev) => prev + 1);
      setInput(word);
      if (showMW) mwLookup(word);
      if (showFD) fdLookup(word);
    }
  }, [cursor, history, showMW, showFD, mwLookup, fdLookup]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate(input);
  }

  const canBack = cursor > 0;
  const canForward = cursor < history.length - 1;
  const isLoading = (showMW && mwLoading) || (showFD && fdLoading);

  return (
    <>
      <form className="mw-dict-search-bar" onSubmit={handleSubmit}>
        <button
          type="button"
          className="mw-dict-nav-btn"
          disabled={!canBack}
          onClick={goBack}
          aria-label="Go back"
          title="Go back"
        >
          ←
        </button>
        <input
          className="mw-search-input"
          type="text"
          placeholder="Look up a word…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
        <button
          className="mw-search-btn"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "…" : "→"}
        </button>
        <button
          type="button"
          className="mw-dict-nav-btn"
          disabled={!canForward}
          onClick={goForward}
          aria-label="Go forward"
          title="Go forward"
        >
          →
        </button>
      </form>

      <div className="mw-popup-body" style={{ overflowY: "auto", maxHeight: "500px" }}>
        {!entries && !suggestions && !fdResponse && !mwError && !fdError && !isLoading && (
          <p className="mw-popup-hint">Type a word and press Enter</p>
        )}

        {/* Merriam-Webster results */}
        {showMW && (
          <>
            {showLabels && (mwLoading || entries || suggestions || mwError) && (
              <div className="mw-source-label">Merriam-Webster</div>
            )}
            {mwLoading && <p className="mw-popup-hint">Looking up…</p>}
            {mwError && <p className="mw-popup-error">{mwError}</p>}
            {suggestions && suggestions.length > 0 && (
              <div style={{ padding: "12px 16px" }}>
                <p className="mw-section-label" style={{ marginBottom: 8 }}>Did you mean…</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      className="mw-dict-xref"
                      style={{ fontSize: 13, padding: "3px 0" }}
                      onClick={() => navigate(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {entries && entries.length > 0 && (
              <DictCard entries={entries} onNavigate={navigate} />
            )}
          </>
        )}

        {/* Free Dictionary results */}
        {showFD && (
          <>
            {showLabels && (fdLoading || fdResponse || fdError) && (
              <>
                {(entries || mwError) && <hr className="mw-source-divider" />}
                <div className="mw-source-label">Free Dictionary</div>
              </>
            )}
            {fdLoading && <p className="mw-popup-hint">Looking up…</p>}
            {fdError && <p className="mw-popup-error">{fdError}</p>}
            {fdResponse && <FreeDictCard response={fdResponse} />}
          </>
        )}
      </div>
    </>
  );
}
