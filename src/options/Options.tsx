import { useState, useEffect } from "react";
import { NavPosition } from "../components/NavDock";
import { LookupSource } from "../types/lookup";

import { normalizeTheme, ThemePreference } from "../theme/theme";

interface Keys {
  dictKey: string;
  thesKey: string;
}

const NAV_POSITIONS: { value: NavPosition; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "bottom", label: "Bottom" },
];

export function Options() {
  const [keys, setKeys] = useState<Keys>({ dictKey: "", thesKey: "" });
  const [navPosition, setNavPosition] = useState<NavPosition>("top");
  const [triggerOnDblClick, setTriggerOnDblClick] = useState(false);
  const [useMW, setUseMW] = useState(true);
  const [useFreeDict, setUseFreeDict] = useState(false);
  const [freeDictLang, setFreeDictLang] = useState("en");
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.storage.sync.get(
      ["dictKey", "thesKey", "navPosition", "triggerOnDblClick", "lookupSources", "freeDictLang", "themePreference"],
      (result) => {
        setThemePreference(normalizeTheme(result.themePreference));
        setKeys({
          dictKey: (result.dictKey as string) ?? "",
          thesKey: (result.thesKey as string) ?? "",
        });
        setNavPosition((result.navPosition as NavPosition) ?? "top");
        setTriggerOnDblClick((result.triggerOnDblClick as boolean) ?? false);
        const src = (result.lookupSources as LookupSource) ?? "mw";
        setUseMW(src === "mw" || src === "both");
        setUseFreeDict(src === "freeDict" || src === "both");
        setFreeDictLang((result.freeDictLang as string) ?? "en");
      }
    );
  }, []);

  function deriveLookupSource(): LookupSource {
    if (useMW && useFreeDict) return "both";
    if (useFreeDict) return "freeDict";
    return "mw"; // default: always keep at least MW
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const lookupSources = deriveLookupSource();
    chrome.storage.sync.set(
      { dictKey: keys.dictKey, thesKey: keys.thesKey, navPosition, triggerOnDblClick, lookupSources, freeDictLang, themePreference },
      () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    );
  }

  return (
    <div className="opts-shell">
      <h1 className="opts-title">MW Quick Lookup — Settings</h1>
      <p className="opts-desc">
        Register for free API keys at{" "}
        <a href="https://dictionaryapi.com/register/index" target="_blank" rel="noreferrer">
          dictionaryapi.com
        </a>
        . You need two separate keys: one for the{" "}
        <strong>Collegiate Dictionary</strong> and one for the <strong>Thesaurus</strong>.
      </p>

      <form className="opts-form" onSubmit={handleSave}>
        <fieldset className="opts-fieldset">
          <legend className="opts-label">Appearance</legend>
          <div className="opts-radio-group">
            {(["system", "light", "dark"] as const).map(value => (
              <label key={value} className="opts-radio-label">
                <input type="radio" name="themePreference" value={value}
                  checked={themePreference === value}
                  onChange={() => setThemePreference(value)} />
                {value[0].toUpperCase() + value.slice(1)}
              </label>
            ))}
          </div>
          <p className="opts-hint">System follows your device’s light or dark appearance. Changes apply when you save.</p>
        </fieldset>
        <label className="opts-label" htmlFor="dictKey">
          Dictionary API Key
        </label>
        <input
          id="dictKey"
          className="opts-input"
          type="password"
          value={keys.dictKey}
          onChange={(e) => setKeys((k) => ({ ...k, dictKey: e.target.value }))}
          placeholder="Paste your Dictionary key…"
          autoComplete="off"
        />

        <label className="opts-label" htmlFor="thesKey">
          Thesaurus API Key
        </label>
        <input
          id="thesKey"
          className="opts-input"
          type="password"
          value={keys.thesKey}
          onChange={(e) => setKeys((k) => ({ ...k, thesKey: e.target.value }))}
          placeholder="Paste your Thesaurus key…"
          autoComplete="off"
        />

        <fieldset className="opts-fieldset">
          <legend className="opts-label">Navigation Dock Position</legend>
          <div className="opts-radio-group">
            {NAV_POSITIONS.map(({ value, label }) => (
              <label key={value} className="opts-radio-label">
                <input
                  type="radio"
                  name="navPosition"
                  value={value}
                  checked={navPosition === value}
                  onChange={() => setNavPosition(value)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="opts-fieldset">
          <legend className="opts-label">Lookup Sources</legend>
          <label className="opts-checkbox-label">
            <input
              type="checkbox"
              checked={useMW}
              onChange={(e) => setUseMW(e.target.checked)}
            />
            Merriam-Webster
          </label>
          <label className="opts-checkbox-label" style={{ marginTop: 6 }}>
            <input
              type="checkbox"
              checked={useFreeDict}
              onChange={(e) => setUseFreeDict(e.target.checked)}
            />
            Free Dictionary
          </label>
          {useFreeDict && (
            <div className="opts-lang-row">
              <label className="opts-label" htmlFor="freeDictLang">
                Language code
              </label>
              <input
                id="freeDictLang"
                className="opts-input opts-lang-input"
                type="text"
                value={freeDictLang}
                onChange={(e) => setFreeDictLang(e.target.value.trim() || "en")}
                placeholder="en"
                maxLength={10}
              />
              <p className="opts-hint">
                BCP 47 language code, e.g. <code>en</code>, <code>es</code>, <code>fr</code>.
              </p>
            </div>
          )}
        </fieldset>

        <fieldset className="opts-fieldset">
          <legend className="opts-label">Selection Popup Trigger</legend>
          <label className="opts-checkbox-label">
            <input
              type="checkbox"
              checked={triggerOnDblClick}
              onChange={(e) => setTriggerOnDblClick(e.target.checked)}
            />
            Show popup on double-click only
          </label>
          <p className="opts-hint">
            When enabled, the quick-definition popup appears only when you double-click a word.
            When disabled (default), it appears on any text selection.
          </p>
        </fieldset>

        <div className="opts-actions">
          <button className="opts-save-btn" type="submit">
            Save
          </button>
          {saved && <span className="opts-saved">✓ Saved</span>}
        </div>
      </form>
    </div>
  );
}
