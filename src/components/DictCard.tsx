import { MWDictionaryEntry } from "../types/mw-dictionary";
import { DictEntry } from "./DictEntry";

interface Props {
  entries: MWDictionaryEntry[];
  onNavigate: (word: string) => void;
}

export function DictCard({ entries, onNavigate }: Props) {
  return (
    <div className="mw-dict-card">
      {entries.map((entry, i) => (
        <div key={entry.meta.uuid ?? i}>
          {i > 0 && <div className="mw-entry-divider" />}
          <DictEntry entry={entry} onNavigate={onNavigate} />
        </div>
      ))}
    </div>
  );
}
