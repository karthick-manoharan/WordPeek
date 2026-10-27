import { FreeDictEntry, FreeDictResponse } from "../types/free-dictionary";
import { WordData } from "../types/lookup";

const FREE_DICT_BASE = "https://freedictionaryapi.com/api/v1/entries";

export function buildFreeDictUrl(word: string, lang: string): string {
  return `${FREE_DICT_BASE}/${encodeURIComponent(lang)}/${encodeURIComponent(word)}`;
}

export function parseFreeDictToWordData(
  response: FreeDictResponse
): WordData | null {
  if (!response.entries || response.entries.length === 0) return null;

  const entry = response.entries[0];

  const phonetic =
    entry.pronunciations?.find((p) => p.type === "IPA")?.text ??
    entry.pronunciations?.[0]?.text ??
    "";

  const allSenses = flattenSenses(entry);

  const definitions = allSenses
    .map((s) => s.definition)
    .filter(Boolean)
    .slice(0, 2);

  if (definitions.length === 0) return null;

  const synonyms = dedupe([
    ...(entry.synonyms ?? []),
    ...allSenses.flatMap((s) => s.synonyms ?? []),
  ]).slice(0, 6);

  const antonyms = dedupe([
    ...(entry.antonyms ?? []),
    ...allSenses.flatMap((s) => s.antonyms ?? []),
  ]).slice(0, 6);

  return {
    headword: response.word,
    phonetic,
    audioUrl: null,
    partOfSpeech: entry.partOfSpeech ?? "",
    definitions,
    synonyms,
    antonyms,
    etymology: null,
    firstKnownUse: null,
  };
}

// Recursively collect senses + subsenses in order
function flattenSenses(entry: FreeDictEntry) {
  const result: { definition: string; synonyms?: string[]; antonyms?: string[] }[] = [];
  for (const sense of entry.senses ?? []) {
    collectSense(sense, result);
  }
  return result;
}

function collectSense(
  sense: import("../types/free-dictionary").FreeDictSense,
  out: { definition: string; synonyms?: string[]; antonyms?: string[] }[]
) {
  out.push({ definition: sense.definition, synonyms: sense.synonyms, antonyms: sense.antonyms });
  for (const sub of sense.subsenses ?? []) {
    collectSense(sub, out);
  }
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))];
}
