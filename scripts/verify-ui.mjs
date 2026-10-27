import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { parseHTML } from "linkedom";

const { window, document } = parseHTML("<html><head></head><body></body></html>");
Object.assign(globalThis, {
  window, document,
  HTMLElement: window.HTMLElement, Node: window.Node, Event: window.Event,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { createElement: h, act } = await import("react");
const { createRoot } = await import("react-dom/client");
const require = createRequire(import.meta.url);
async function load(entry) {
  const result = await build({
    entryPoints: [entry], bundle: true, write: false, format: "cjs",
    platform: "node", packages: "external", jsx: "automatic",
    plugins: [{
      name: "test-styles",
      setup(builder) {
        builder.onResolve({ filter: /\.css(\?inline)?$/ }, args => ({
          path: path.resolve(args.resolveDir, args.path.replace(/\?inline$/, "")),
          namespace: args.path.endsWith("?inline") ? "inline-css" : "empty-css",
        }));
        builder.onLoad({ filter: /.*/, namespace: "inline-css" }, args => ({
          contents: "export default " + JSON.stringify(fs.readFileSync(args.path, "utf8")), loader: "js",
        }));
        builder.onLoad({ filter: /.*/, namespace: "empty-css" }, () => ({ contents: "", loader: "js" }));
      },
    }],
  });
  const module = { exports: {} };
  new Function("require", "module", "exports", result.outputFiles[0].text)(require, module, module.exports);
  return module.exports;
}

const storageListeners = new Set();
const mediaListeners = new Set();
const resizeListeners = new Set();
const observers = new Set();
const messages = [];
const pending = [];
let settings = {};
let dark = false;
let measuredHeight = 80;
const media = {
  get matches() { return dark; },
  addEventListener: (_, fn) => mediaListeners.add(fn),
  removeEventListener: (_, fn) => mediaListeners.delete(fn),
};
window.matchMedia = () => media;
window.innerWidth = 800;
window.innerHeight = 600;
const realAdd = window.addEventListener.bind(window);
const realRemove = window.removeEventListener.bind(window);
window.addEventListener = (name, fn, ...args) => {
  if (name === "resize") resizeListeners.add(fn);
  return realAdd(name, fn, ...args);
};
window.removeEventListener = (name, fn, ...args) => {
  if (name === "resize") resizeListeners.delete(fn);
  return realRemove(name, fn, ...args);
};
globalThis.ResizeObserver = class {
  constructor(fn) { this.fn = fn; }
  observe() { observers.add(this); }
  disconnect() { observers.delete(this); }
};
window.HTMLElement.prototype.getBoundingClientRect = function () {
  return { left: 0, top: 0, bottom: measuredHeight, width: 320, height: measuredHeight };
};
globalThis.chrome = {
  storage: {
    sync: {
      get(keys, callback) { callback({ ...settings }); },
      set(values, callback) {
        const changes = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { newValue: value, oldValue: settings[key] }]));
        settings = { ...settings, ...values };
        storageListeners.forEach(fn => fn(changes, "sync"));
        callback?.();
      },
    },
    onChanged: {
      addListener: fn => storageListeners.add(fn),
      removeListener: fn => storageListeners.delete(fn),
    },
  },
  runtime: {
    sendMessage(message, callback) {
      messages.push(message);
      if (callback) pending.push({ message, callback });
    },
  },
};
const event = (node, type, properties = {}) => {
  const e = new window.Event(type, { bubbles: true, cancelable: true });
  Object.assign(e, properties);
  node.dispatchEvent(e);
};
const mount = async (Component, props = {}) => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(h(Component, props)));
  return { container, root, async close() { await act(async () => root.unmount()); container.remove(); } };
};
const click = async node => {
  assert(node, "click target exists");
  await act(async () => event(node, "click"));
};
const save = async values => act(async () => chrome.storage.sync.set(values));
const changeSystem = async value => act(async () => {
  dark = value;
  mediaListeners.forEach(fn => fn());
});
const { subscribeTheme } = await load("src/theme/theme.ts");
const { Options } = await load("src/options/Options.tsx");

// Run actual React form callbacks and real storage subscriptions without a browser.
const preserved = { dictKey: "test-dict", thesKey: "test-thes", navPosition: "right", triggerOnDblClick: true, lookupSources: "both", freeDictLang: "fr" };
settings = { ...preserved };
const surfaces = [document.documentElement, document.createElement("div"), document.createElement("div")];
const cleanups = surfaces.map(subscribeTheme);
for (const choice of ["dark", "light", "system"]) {
  const form = await mount(Options);
  const radio = form.container.querySelector('input[name="themePreference"][value="' + choice + '"]');
  const before = surfaces.map(target => target.dataset.theme);
  await click(radio);
  assert.equal(radio.checked, true);
  assert.deepEqual(surfaces.map(target => target.dataset.theme), before, "draft must not update applied theme");
  await act(async () => event(form.container.querySelector("form"), "submit"));
  assert.equal(settings.themePreference, choice);
  for (const [key, value] of Object.entries(preserved)) assert.equal(settings[key], value);
  assert.match(form.container.textContent, /Saved/);
  const expected = choice === "system" ? (dark ? "dark" : "light") : choice;
  surfaces.forEach(target => assert.equal(target.dataset.theme, expected));
  await changeSystem(!dark);
  surfaces.forEach(target => assert.equal(target.dataset.theme, choice === "system" ? (dark ? "dark" : "light") : choice));
  await form.close();
  const reopened = await mount(Options);
  assert.equal(reopened.container.querySelector('input[value="' + choice + '"]').checked, true);
  await reopened.close();
  const restarted = document.createElement("div");
  const stop = subscribeTheme(restarted);
  assert.equal(restarted.dataset.theme, choice === "system" ? (dark ? "dark" : "light") : choice);
  stop();
}
cleanups.forEach(stop => stop());
assert.equal(mediaListeners.size, 0);
console.log("Options: draft/save/reopen, recreated surfaces, preserved settings, three live surfaces and all theme choices PASS");

// Pure geometry properties over edge anchors, viewport sizes and content growth.
const { getPopupGeometry } = await load("src/content/popupGeometry.ts");
let geometryCases = 0;
for (const width of [32, 100, 240, 320, 800, 1440]) {
  for (const height of [32, 80, 200, 600, 1000]) {
    for (const left of [-100, 0, width / 2, width - 1, width + 100]) {
      for (const top of [-20, 0, height / 2, height - 20, height + 100]) {
        for (const contentHeight of [0, 20, 200, 800, 5000]) {
          const g = getPopupGeometry({ left, top, bottom: top + 16 }, width, height, contentHeight);
          const actualHeight = Math.min(contentHeight, g.maxHeight) + 2;
          assert(g.x >= 8 && g.y >= 8);
          assert(g.x + g.width <= width - 8);
          assert(g.y + actualHeight <= height - 8 + 1e-9);
          assert(g.width <= 320);
          assert(actualHeight <= contentHeight + 2);
          geometryCases++;
        }
      }
    }
  }
}
const short = getPopupGeometry({ left: 30, top: 30, bottom: 46 }, 800, 600, 40);
assert.equal(short.y, 54, "short results prefer below the selection");
assert.equal(Math.min(40, short.maxHeight) + 2, 42, "short content retains its natural height");
const flipped = getPopupGeometry({ left: 30, top: 550, bottom: 566 }, 800, 600, 40);
assert.equal(flipped.y, 500, "results flip above when there is space");
console.log("Geometry: " + geometryCases + " edge/offscreen/narrow/short/growth combinations PASS");

const word = {
  headword: "fixture", phonetic: "fik", audioUrl: "https://example.invalid/audio.mp3",
  partOfSpeech: "noun", definitions: Array.from({ length: 80 }, (_, i) => "Definition " + (i + 1)),
  synonyms: ["similar"], antonyms: ["opposite"], etymology: "Expanded origin ".repeat(80), firstKnownUse: "1500",
};
const fd = { word: "fixture", entries: [{
  partOfSpeech: "noun", pronunciations: [{ type: "IPA", text: "fik" }],
  senses: [{ definition: "Free definition", examples: ["Example sentence"], tags: ["formal"], synonyms: ["similar"], antonyms: ["opposite"], subsenses: [{ definition: "Nested definition" }] }],
  synonyms: ["similar"], antonyms: ["opposite"],
}], source: { url: "https://example.invalid", license: { name: "Test license" } } };
const { SelectionPopup } = await load("src/content/SelectionPopup.tsx");
const empty = { data: null, loading: false, error: null };
for (const source of ["mw", "freeDict", "both"]) {
  let closed = 0;
  measuredHeight = 2000;
  const popup = await mount(SelectionPopup, {
    mw: { ...empty, data: word }, freeDict: { ...empty, data: word },
    lookupSources: source, position: { left: 790, top: 560, bottom: 580 }, onClose: () => closed++,
  });
  const region = popup.container.querySelector('[role="region"]');
  assert.equal(region.getAttribute("tabindex"), "0");
  assert.equal(popup.container.querySelectorAll(".mw-selection-results").length, 1);
  assert.equal(popup.container.querySelectorAll(".mw-def-item").length, source === "both" ? 160 : 80);
  assert.match(region.textContent, /Definition 80/);
  const shell = popup.container.querySelector(".mw-selection-shell");
  assert(parseFloat(shell.style.left) + parseFloat(shell.style.width) <= 792);
  await click(popup.container.querySelector(".mw-audio-btn"));
  assert.equal(messages.at(-1).type, "PLAY_AUDIO");
  await click(popup.container.querySelector(".mw-accordion-trigger"));
  assert.match(region.textContent, /Expanded origin/);
  assert.equal(popup.container.querySelector(".mw-accordion-trigger").getAttribute("aria-expanded"), "true");
  await act(async () => { measuredHeight = 4000; observers.forEach(o => o.fn()); });
  assert.equal(closed, 0);
  // Browser defaults own physical scrolling; verify these events never dismiss.
  for (const type of ["wheel", "scroll", "keydown"]) {
    await act(async () => event(region, type, { key: "PageDown", deltaY: 800 }));
    assert.equal(closed, 0);
  }
  await act(async () => {
    window.innerWidth = 200; window.innerHeight = 100;
    window.dispatchEvent(new window.Event("resize"));
  });
  assert.equal(parseFloat(shell.style.width), 184);
  assert(parseFloat(region.style.maxHeight) <= 82);
  await act(async () => event(document, "keydown", { key: "Escape" }));
  assert.equal(closed, 1);
  await popup.close();
  assert.equal(observers.size, 0);
  assert.equal(resizeListeners.size, 0);
  window.innerWidth = 800; window.innerHeight = 600;
}
for (const status of ["loading", "error"]) {
  const sourceState = { ...empty, loading: status === "loading", error: status === "error" ? "Selection error" : null };
  const popup = await mount(SelectionPopup, {
    mw: sourceState, freeDict: sourceState, lookupSources: "both",
    position: { left: 20, top: 20, bottom: 36 }, onClose() {},
  });
  assert.match(popup.container.textContent, status === "loading" ? /Looking up/ : /Selection error/);
  assert.match(popup.container.innerHTML, status === "loading" ? /var\(--secondary\)/ : /var\(--error\)/);
  await popup.close();
}
console.log("Selection components: each source/both, final definitions, expanded content, audio, events, resize and cleanup PASS");

// Mount the actual content entry to verify trigger/dismissal and late-result behaviour.
let closedShadow;
const attachShadow = window.HTMLElement.prototype.attachShadow;
window.HTMLElement.prototype.attachShadow = function (options) {
  const shadow = attachShadow.call(this, options);
  if (this.id === "mw-extension-root") closedShadow = shadow;
  return shadow;
};
let selected = "fixture";
window.getSelection = () => ({
  toString: () => selected,
  getRangeAt: () => ({ getBoundingClientRect: () => ({ left: 20, top: 20, bottom: 36 }) }),
});
settings = { lookupSources: "both", themePreference: "system", triggerOnDblClick: false };
await load("src/content/index.tsx");
for (const doubleClick of [false, true]) {
  await save({ triggerOnDblClick: doubleClick });
  for (const source of ["mw", "freeDict", "both"]) {
    await save({ lookupSources: source });
    pending.length = 0;
    await act(async () => event(document.body, "mouseup", { detail: doubleClick ? 2 : 1 }));
    assert(closedShadow.querySelector(".mw-selection-shell"));
    const container = closedShadow.querySelector("[data-theme]");
    assert.match(closedShadow.querySelector("style").textContent, /overscroll-behavior: contain/);
    assert.match(closedShadow.querySelector("style").textContent, /--syn-text/);
    assert.equal(pending.length, source === "both" ? 2 : 1);
    await act(async () => pending.splice(0).forEach(({ message, callback }) =>
      callback(message.type === "LOOKUP" ? { data: word } : { response: fd })));
    assert.match(container.textContent, /Definition 80|Free definition/);
    for (const host of ["light", "dark"]) {
      document.body.dataset.theme = host;
      for (const preference of ["light", "dark", "system"]) {
        await save({ themePreference: preference });
        assert.equal(container.dataset.theme, preference === "system" ? (dark ? "dark" : "light") : preference);
        await changeSystem(!dark);
        assert.equal(container.dataset.theme, preference === "system" ? (dark ? "dark" : "light") : preference);
      }
    }
    // A retargeted event from a closed shadow reaches the host, not the document body.
    const host = document.getElementById("mw-extension-root");
    await act(async () => event(host, "mouseup", { detail: 1 }));
    await act(async () => event(host, "mousedown"));
    assert(container.querySelector(".mw-selection-shell"));
    await act(async () => event(document, "keydown", { key: "Escape" }));
    assert.equal(container.querySelector(".mw-selection-shell"), null);
    await save({ themePreference: "dark" });
    assert.equal(container.querySelector(".mw-selection-shell"), null);
    await act(async () => event(document.body, "mouseup", { detail: doubleClick ? 2 : 1 }));
    assert(container.querySelector(".mw-selection-shell"));
    await act(async () => event(document.body, "mousedown"));
    assert.equal(container.querySelector(".mw-selection-shell"), null);
    await act(async () => pending.splice(0).forEach(({ callback }) => callback({ data: word, response: fd })));
    assert.equal(container.querySelector(".mw-selection-shell"), null, "late responses must not reopen");
  }
}
console.log("Content entry: both triggers, source matrix, both host themes, live preferences/system, inside/outside/Escape, reopen and stale results PASS");

const { Popup } = await load("src/popup/Popup.tsx");
const originalLog = console.log;
console.log = (...args) => { if (args[0] !== "[MW v2] Popup mounted") originalLog(...args); };
const dictionaryEntry = {
  meta: { id: "fixture", uuid: "fixture-uuid", offensive: true },
  hwi: { hw: "fixture", prs: [{ mw: "fik", sound: { audio: "fixture" } }] },
  fl: "noun", et: [[["text", "Dictionary origin"]]], date: "1500",
  def: [{ sseq: [[["sense", { sn: "1", sls: ["formal"], dt: [
    ["text", "Dictionary definition"], ["vis", [{ t: "Dictionary example" }]],
  ] }]]] }],
};
// Linkedom lacks the native input-value event plumbing used by React.
// Invoke the rendered input's React change callback, then submit via DOM events.
const fill = async (input, value) => {
  const propsKey = Object.keys(input).find(key => key.startsWith("__reactProps$"));
  assert(propsKey, "React input callback is available");
  await act(async () => input[propsKey].onChange({ target: { value } }));
};
for (const source of ["mw", "freeDict", "both"]) {
  for (const preference of ["system", "light", "dark"]) {
    settings.lookupSources = source;
    settings.navPosition = "top";
    settings.themePreference = preference;
    const stopTheme = subscribeTheme(document.documentElement);
    const popup = await mount(Popup);
    for (const mode of ["quick", "dictionary"]) {
      if (mode === "dictionary") await click(popup.container.querySelectorAll(".mw-nav-btn")[1]);
      const form = popup.container.querySelector("form");
      assert(form);
      await fill(form.querySelector("input"), "fixture");
      pending.length = 0;
      await act(async () => event(form, "submit"));
      assert.match(popup.container.textContent, /Looking up/);
      assert(popup.container.querySelector(".mw-search-btn").disabled);
      assert.equal(pending.length, source === "both" ? 2 : 1);
      await act(async () => pending.splice(0).forEach(({ message, callback }) => callback(
        message.type === "LOOKUP" ? { data: word } :
        message.type === "DICT_LOOKUP" ? { entries: [dictionaryEntry] } : { response: fd }
      )));
      if (source !== "freeDict") {
        assert.match(popup.container.textContent, mode === "quick" ? /Definition 80/ : /Dictionary definition/);
        await click(popup.container.querySelector(".mw-audio-btn"));
        assert.equal(messages.at(-1).type, "PLAY_AUDIO");
        await click(popup.container.querySelector(".mw-accordion-trigger"));
        assert.match(popup.container.textContent, mode === "quick" ? /Expanded origin/ : /Dictionary origin/);
      }
      if (source !== "mw") assert.match(popup.container.textContent, /Free definition/);
      if (source === "both") {
        assert.match(popup.container.textContent, /Merriam-Webster/);
        assert.match(popup.container.textContent, /Free Dictionary/);
      }
      await changeSystem(!dark);
      assert.equal(document.documentElement.dataset.theme, preference === "system" ? (dark ? "dark" : "light") : preference);
      // Both status surfaces stay renderable after results and theme changes.
      await act(async () => event(form, "submit"));
      await act(async () => pending.splice(0).forEach(({ callback }) => callback({ error: "Fixture lookup error" })));
      assert.match(popup.container.textContent, /Fixture lookup error/);
      assert.equal(popup.container.querySelector(".mw-search-btn").disabled, false);
    }
    await popup.close();
    stopTheme();
  }
}
console.log("Toolbar: source/theme/quick-dictionary matrix, loading/error/results, source labels, audio and expanded origins PASS");
const { FreeDictCard } = await load("src/components/FreeDictCard.tsx");
const freeCard = await mount(FreeDictCard, { response: fd });
for (const label of ["Free definition", "Example sentence", "similar", "opposite", "Test license"]) assert.match(freeCard.container.textContent, new RegExp(label));
await click(freeCard.container.querySelector(".fd-subsense-toggle"));
assert.match(freeCard.container.textContent, /Nested definition/);
await freeCard.close();

// Audit authored styles and every variable reference, including initial System styling.
const cssFiles = fs.readdirSync("src/components").filter(name => name.endsWith(".css")).map(name => "src/components/" + name);
const themedFiles = [...cssFiles, "src/options/index.html", "src/popup/index.html", "src/content/SelectionPopup.tsx"];
const themeCSS = fs.readFileSync("src/theme/theme.css", "utf8");
const definitions = new Set([...themeCSS.matchAll(/--([\w-]+):/g)].map(m => m[1]));
for (const filename of themedFiles) {
  const text = fs.readFileSync(filename, "utf8");
  assert(!/#[0-9a-f]{3,8}\b|rgba?\(/i.test(text), filename + " contains a literal colour");
  for (const match of text.matchAll(/var\(--([\w-]+)\)/g)) assert(definitions.has(match[1]), filename + ": undefined variable " + match[1]);
}
for (const selector of [":focus-visible", ":active", ":disabled", "::-webkit-scrollbar-thumb", "scrollbar-color", "color-scheme: dark", "prefers-color-scheme: dark", "overflow-y: auto", "overscroll-behavior: contain"]) assert(themeCSS.includes(selector), selector);
for (const name of ["options", "popup"]) {
  assert(fs.readFileSync("src/" + name + "/index.html", "utf8").includes('../theme/theme.css'));
  assert(fs.readFileSync("src/" + name + "/index.tsx", "utf8").includes("subscribeTheme(document.documentElement)"));
}
console.log("Toolbar navigation, Free Dictionary details, palette coverage, native/control/scrollbar and initialization CSS audit PASS");
console.log("Non-browser UI verification complete. Native layout/scrollbar painting and browser restart were not exercised.");
