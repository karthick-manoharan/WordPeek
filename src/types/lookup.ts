// Normalised shape passed to UI components — extracted from raw API responses
export interface WordData {
  headword: string;       // hwi.hw with * replaced by ·
  phonetic: string;       // hwi.prs[0].mw
  audioUrl: string | null; // built from hwi.prs[0].sound.audio
  partOfSpeech: string;   // fl
  definitions: string[];  // shortdef[0..1]
  synonyms: string[];     // thesaurus meta.syns[0]
  antonyms: string[];     // thesaurus meta.ants[0]
  etymology: string | null; // et rendered to plain text
  firstKnownUse: string | null; // date
}

export interface LookupMessage {
  type: "LOOKUP";
  word: string;
}

export interface PlayAudioMessage {
  type: "PLAY_AUDIO";
  url: string;
}

export interface LookupResponse {
  data?: WordData;
  error?: string;
}

// ── Dictionary mode (v2) ─────────────────────────────────────────────────────

export interface DictLookupMessage {
  type: "DICT_LOOKUP";
  word: string;
}

export interface DictLookupResponse {
  entries?: import("./mw-dictionary").MWDictionaryEntry[];
  suggestions?: string[];
  error?: string;
}

// ── Free Dictionary API ───────────────────────────────────────────────────────

export interface FreeDictLookupMessage {
  type: "FREE_DICT_LOOKUP";
  word: string;
  lang: string;
}

export interface FreeDictLookupResponse {
  response?: import("./free-dictionary").FreeDictResponse;
  error?: string;
}

// ── Settings ──────────────────────────────────────────────────────────────────

export type LookupSource = "mw" | "freeDict" | "both";
