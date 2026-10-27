import { WordData } from "../types/lookup";
import { DefinitionList } from "./DefinitionList";
import { PillList } from "./PillList";
import { EtymologyAccordion } from "./EtymologyAccordion";

interface Props {
  data: WordData;
}

function playAudio(url: string) {
  chrome.runtime.sendMessage({ type: "PLAY_AUDIO", url });
}

export function WordCard({ data }: Props) {
  return (
    <div className="mw-card">
      <div className="mw-card-header">
        <h2 className="mw-headword">{data.headword}</h2>
      </div>

      <div className="mw-card-meta">
        {data.phonetic && (
          <span className="mw-pronunciation">/{data.phonetic}/</span>
        )}
        {data.audioUrl && (
          <button
            className="mw-audio-btn"
            onClick={() => playAudio(data.audioUrl!)}
            aria-label="Play pronunciation"
            title="Play pronunciation"
          >
            ▶
          </button>
        )}
        {data.partOfSpeech && (
          <span className="mw-pos">{data.partOfSpeech}</span>
        )}
      </div>

      <div className="mw-card-body">
        <DefinitionList definitions={data.definitions} />

        <PillList label="SYNONYMS" words={data.synonyms} variant="syn" />

        <PillList label="ANTONYMS" words={data.antonyms} variant="ant" />

        <EtymologyAccordion
          etymology={data.etymology}
          firstKnownUse={data.firstKnownUse}
        />
      </div>
    </div>
  );
}
