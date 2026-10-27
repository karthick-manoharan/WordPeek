import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const listeners = new Set();
const mediaListeners = new Set();
let read;
const media = {
  matches: true,
  addEventListener: (_, fn) => mediaListeners.add(fn),
  removeEventListener: (_, fn) => mediaListeners.delete(fn),
};
const context = {
  exports: {},
  window: { matchMedia: () => media },
  chrome: { storage: {
    sync: { get: (_, callback) => { read = callback; } },
    onChanged: { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn) },
  } },
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/theme/theme.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, context);
const { normalizeTheme, resolveTheme, subscribeTheme } = context.exports;
for (const value of [undefined, null, "", "unsupported", 42]) assert.equal(normalizeTheme(value), "system");
for (const preference of ["system", "light", "dark"]) {
  for (const dark of [false, true]) {
    assert.equal(resolveTheme(preference, dark), preference === "system" ? (dark ? "dark" : "light") : preference);
  }
}
const target = { dataset: {} };
const unsubscribe = subscribeTheme(target);
assert.equal(target.dataset.theme, "dark");
read({});
assert.equal(target.dataset.theme, "dark");
const save = value => listeners.forEach(fn => fn({ themePreference: { newValue: value } }, "sync"));
save("light");
mediaListeners.forEach(fn => fn());
assert.equal(target.dataset.theme, "light");
save("system");
media.matches = false;
mediaListeners.forEach(fn => fn());
assert.equal(target.dataset.theme, "light");
media.matches = true;
mediaListeners.forEach(fn => fn());
assert.equal(target.dataset.theme, "dark");
unsubscribe();
assert.equal(listeners.size, 0);
assert.equal(mediaListeners.size, 0);
const disposeEarly = subscribeTheme(target);
save("light");
read({ themePreference: "dark" }); // stale initial read must not override a save
assert.equal(target.dataset.theme, "light");
disposeEarly();
read({ themePreference: "dark" }); // asynchronous read after cleanup must not mutate
assert.equal(target.dataset.theme, "light");
console.log("Theme normalization, overrides, live changes, initial-read race, and cleanup: PASS");

const css = fs.readFileSync("src/theme/theme.css", "utf8");
const blocks = [...css.matchAll(/(?:^:root, \[data-theme\]|\[data-theme="dark"\]) \{([^}]+)\}/g)];
function luminance(hex) {
  return hex.match(/\w\w/g).map(v => parseInt(v, 16) / 255)
    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
}
function contrast(a, b) {
  const [low, high] = [luminance(a), luminance(b)].sort((a, b) => a - b);
  return (high + .05) / (low + .05);
}
for (const [i, block] of blocks.entries()) {
  const palette = Object.fromEntries([...block[1].matchAll(/--([\w-]+): #(\w{6});/g)].map(m => [m[1], m[2]]));
  const pairs = [];
  for (const text of ["text", "secondary", "link", "link-hover", "success", "error"]) {
    for (const bg of ["canvas", "surface", "raised", "hover", "active"]) pairs.push([text, bg]);
  }
  pairs.push(["syn-text", "syn-bg"], ["ant-text", "ant-bg"], ["tag-text", "tag-bg"],
    ["button-text", "button"], ["button-text", "button-hover"], ["disabled-text", "disabled"]);
  const ratios = pairs.map(([text, bg]) => ({ pair: text + "/" + bg, ratio: contrast(palette[text], palette[bg]) }));
  for (const { pair, ratio } of ratios) assert(ratio >= 4.5, pair + ": " + ratio);
  const minimum = ratios.reduce((a,b) => a.ratio < b.ratio ? a : b);
  console.log((i ? "Dark" : "Light") + ": " + pairs.length + " text pairs >= 4.5:1; minimum " + minimum.pair + " " + minimum.ratio.toFixed(2) + ":1; scrollbar " + contrast(palette.thumb, palette.raised).toFixed(2) + ":1");
}
