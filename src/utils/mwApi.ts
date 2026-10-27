const DICT_BASE = "https://www.dictionaryapi.com/api/v3/references/collegiate/json";
const THES_BASE = "https://www.dictionaryapi.com/api/v3/references/thesaurus/json";
const AUDIO_BASE = "https://media.merriam-webster.com/audio/prons/en/us/mp3";

export function buildDictUrl(word: string, apiKey: string): string {
  return `${DICT_BASE}/${encodeURIComponent(word)}?key=${apiKey}`;
}

export function buildThesaurusUrl(word: string, apiKey: string): string {
  return `${THES_BASE}/${encodeURIComponent(word)}?key=${apiKey}`;
}

export function buildAudioUrl(audio: string): string {
  let subdir: string;
  if (audio.startsWith("bix")) {
    subdir = "bix";
  } else if (audio.startsWith("gg")) {
    subdir = "gg";
  } else if (/^\d/.test(audio)) {
    subdir = "number";
  } else {
    subdir = audio[0];
  }
  return `${AUDIO_BASE}/${subdir}/${audio}.mp3`;
}
