export interface MWPronunciation {
  mw?: string;
  sound?: {
    audio: string;
  };
}

export interface MWHeadwordInfo {
  hw: string;
  prs?: MWPronunciation[];
}

// Etymology is an array of tagged segments, e.g. [["text", "from Latin..."]]
export type MWEtymologySegment = [string, string];
export type MWEtymology = MWEtymologySegment[];

// ── Definition text tuples ──────────────────────────────────────────────────

export type DtText = ["text", string];
export type DtVis = [
  "vis",
  Array<{ t: string; aq?: { auth?: string; source?: string } }>
];
export type DtUns = ["uns", Array<Array<DtText | DtVis>>];
export type DtSnote = ["snote", Array<DtText | DtVis>];
export type DtTuple = DtText | DtVis | DtUns | DtSnote | [string, unknown];

// ── Sense ───────────────────────────────────────────────────────────────────

export interface MWSense {
  sn?: string; // e.g. "1 a", "b", "2"
  dt: DtTuple[];
  sdsense?: { sd: string; dt: DtTuple[] }; // divided sense, e.g. "also"
  sls?: string[]; // subject/status labels e.g. "formal", "archaic"
  sgram?: string; // grammatical info
  ins?: Array<{ if: string; ifc?: string; il?: string }>; // inflections
}

// Entries inside a sense sequence group
export type MWSenseEntry =
  | ["sense", MWSense]
  | ["bs", { sense: MWSense }]
  | ["sen", { sn?: string; sls?: string[] }]
  | ["pseq", MWSenseEntry[][]];

// A sense sequence is an array of groups; each group is an array of entries
export type MWSseq = MWSenseEntry[][];

// ── Definition block ─────────────────────────────────────────────────────────

export interface MWDef {
  vd?: string; // verb divider: "transitive verb", "intransitive verb"
  sseq: MWSseq;
}

// ── Undefined run-ons (related forms) ────────────────────────────────────────

export interface MWUro {
  ure: string; // form with * syllable breaks, e.g. "vo*lu*mi*nous*ly"
  fl?: string; // function label e.g. "adverb"
  prs?: MWPronunciation[];
}

// ── Supplemental data ────────────────────────────────────────────────────────

export interface MWSupplExample {
  t: string; // text with {it} markup
}

export interface MWLdqSense {
  sls?: string[];
  dt: DtTuple[];
}

export interface MWLdqDef {
  sls?: string[];
  sseq: Array<Array<["sense", MWLdqSense]>>;
}

export interface MWLdq {
  ldhw: string;
  fl: string;
  def: MWLdqDef[];
}

export interface MWSuppl {
  examples?: MWSupplExample[];
  ldq?: MWLdq;
}

// ── Meta ─────────────────────────────────────────────────────────────────────

export interface MWMeta {
  id: string;
  uuid: string;
  sort?: string;
  src?: string;
  section?: string;
  stems?: string[];
  offensive: boolean;
}

// ── Full entry ────────────────────────────────────────────────────────────────

export interface MWDictionaryEntry {
  meta: MWMeta;
  hwi: MWHeadwordInfo;
  fl?: string;
  def?: MWDef[];
  uros?: MWUro[];
  et?: MWEtymology[];
  date?: string;
  suppl?: MWSuppl;
  shortdef: string[];
}

// The API returns either an array of entries or an array of suggestion strings
export type MWDictionaryResponse = MWDictionaryEntry[] | string[];
