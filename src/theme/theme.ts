export type ThemePreference = "system" | "light" | "dark";
export type Theme = "light" | "dark";

export function normalizeTheme(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveTheme(preference: ThemePreference, dark: boolean): Theme {
  return preference === "system" ? (dark ? "dark" : "light") : preference;
}

/** Update appearance only: never render or change lookup state. */
export function subscribeTheme(target: HTMLElement): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  let preference: ThemePreference = "system";
  let disposed = false;
  let changed = false;
  const apply = () => {
    if (!disposed) target.dataset.theme = resolveTheme(preference, media.matches);
  };
  const storageChanged = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
    if (area === "sync" && "themePreference" in changes) {
      changed = true;
      preference = normalizeTheme(changes.themePreference.newValue);
      apply();
    }
  };
  apply();
  media.addEventListener("change", apply);
  chrome.storage.onChanged.addListener(storageChanged);
  chrome.storage.sync.get("themePreference", result => {
    if (!changed) preference = normalizeTheme(result.themePreference);
    apply();
  });
  return () => {
    disposed = true;
    media.removeEventListener("change", apply);
    chrome.storage.onChanged.removeListener(storageChanged);
  };
}
