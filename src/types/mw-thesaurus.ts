export interface MWThesaurusMeta {
  syns: string[][];
  ants: string[][];
}

export interface MWThesaurusEntry {
  meta: MWThesaurusMeta;
  hwi: { hw: string };
  fl?: string;
}

// The API returns either an array of entries or an array of suggestion strings
export type MWThesaurusResponse = MWThesaurusEntry[] | string[];
