// Types for the Free Dictionary API response schema
// API: https://freedictionaryapi.com/api/v1/entries/{language}/{word}

export interface FreeDictLanguage {
  code: string;
  name: string;
}

export interface FreeDictPronunciation {
  type: string;    // e.g. "IPA"
  text: string;
  tags?: string[];
}

export interface FreeDictForm {
  word: string;
  tags: string[];
}

export interface FreeDictQuote {
  text: string;
  reference?: string;
}

export interface FreeDictTranslation {
  language: FreeDictLanguage;
  word: string;
}

export interface FreeDictSense {
  definition: string;
  tags?: string[];
  examples?: string[];
  quotes?: FreeDictQuote[];
  synonyms?: string[];
  antonyms?: string[];
  translations?: FreeDictTranslation[];
  subsenses?: FreeDictSense[];
}

export interface FreeDictEntry {
  language: FreeDictLanguage;
  partOfSpeech?: string;
  pronunciations?: FreeDictPronunciation[];
  forms?: FreeDictForm[];
  senses: FreeDictSense[];
  synonyms?: string[];
  antonyms?: string[];
}

export interface FreeDictLicense {
  name: string;
  url: string;
}

export interface FreeDictSource {
  url: string;
  license: FreeDictLicense;
}

// Top-level API response object
export interface FreeDictResponse {
  word: string;
  entries: FreeDictEntry[];
  source?: FreeDictSource;
}
