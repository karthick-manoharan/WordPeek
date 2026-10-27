import { MWDictionaryResponse, MWEtymologySegment } from "../types/mw-dictionary";
import { MWThesaurusResponse } from "../types/mw-thesaurus";
import { WordData } from "../types/lookup";
import { buildAudioUrl } from "./mwApi";

function renderEtymology(et: MWEtymologySegment[][]): string {
  return et
    .flat()
    .filter(([tag]) => tag === "text")
    .map(([, text]) => text)
    .join(" ")
    .replace(/\{[^}]+\}/g, "") // strip MW markup tags like {it}, {b}, etc.
    .trim();
}

export function parseWordData(
  dictRaw: MWDictionaryResponse,
  thesRaw: MWThesaurusResponse
): WordData | null {
  // If the API returned suggestions instead of entries, bail out
  if (!Array.isArray(dictRaw) || dictRaw.length === 0 || typeof dictRaw[0] === "string") {
    return null;
  }

  const dictEntry = dictRaw[0];
  const thesEntry =
    Array.isArray(thesRaw) && thesRaw.length > 0 && typeof thesRaw[0] !== "string"
      ? thesRaw[0]
      : null;

  const audioToken = dictEntry.hwi.prs?.[0]?.sound?.audio ?? null;

  return {
    headword: dictEntry.hwi.hw.replace(/\*/g, "·"),
    phonetic: dictEntry.hwi.prs?.[0]?.mw ?? "",
    audioUrl: audioToken ? buildAudioUrl(audioToken) : null,
    partOfSpeech: dictEntry.fl ?? "",
    definitions: dictEntry.shortdef.slice(0, 2),
    synonyms: thesEntry?.meta?.syns?.[0] ?? [],
    antonyms: thesEntry?.meta?.ants?.[0] ?? [],
    etymology: dictEntry.et ? renderEtymology(dictEntry.et) : null,
    firstKnownUse: dictEntry.date ?? null,
  };
}
