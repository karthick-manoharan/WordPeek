import { useState } from "react";
import { FreeDictResponse, FreeDictSense } from "../types/free-dictionary";
import { PillList } from "./PillList";
import "./FreeDictCard.css";

interface Props {
  response: FreeDictResponse;
}

export function FreeDictCard({ response }: Props) {
  if (!response.entries || response.entries.length === 0) return null;

  return (
    <div className="fd-card">
      {response.entries.map((entry, i) => {
        const ipaText =
          entry.pronunciations?.find((p) => p.type === "IPA")?.text ??
          entry.pronunciations?.[0]?.text;

        return (
          <article key={i} className="fd-entry">
            {/* Header */}
            <div className="mw-card-header">
              <h2 className="mw-headword">{response.word}</h2>
            </div>
            <div className="mw-card-meta">
              {ipaText && (
                <span className="mw-pronunciation">/{ipaText}/</span>
              )}
              {entry.partOfSpeech && (
                <span className="mw-pos">{entry.partOfSpeech}</span>
              )}
            </div>

            {/* Senses */}
            {entry.senses && entry.senses.length > 0 && (
              <div className="mw-card-body">
                <div className="fd-sense-list">
                  {entry.senses.map((sense, si) => (
                    <SenseBlock key={si} sense={sense} index={si} total={entry.senses.length} />
                  ))}
                </div>
              </div>
            )}

            {/* Entry-level synonyms / antonyms */}
            {entry.synonyms && entry.synonyms.length > 0 && (
              <PillList label="SYNONYMS" words={entry.synonyms} variant="syn" />
            )}
            {entry.antonyms && entry.antonyms.length > 0 && (
              <PillList label="ANTONYMS" words={entry.antonyms} variant="ant" />
            )}

            {/* Source attribution */}
            {response.source?.url && (
              <div className="fd-source">
                <a href={response.source.url} target="_blank" rel="noreferrer">
                  {response.source.license?.name ?? "Source"}
                </a>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function SenseBlock({ sense, index, total }: { sense: FreeDictSense; index: number; total: number }) {
  const [subsOpen, setSubsOpen] = useState(false);
  const hasSubsenses = sense.subsenses && sense.subsenses.length > 0;

  return (
    <div className="fd-sense">
      <div className="fd-sense-row">
        {total > 1 && <span className="fd-sense-num">{index + 1}.</span>}
        <div className="fd-sense-body">
          {/* Tags */}
          {sense.tags && sense.tags.length > 0 && (
            <span className="fd-tag-row">
              {sense.tags.map((t) => (
                <span key={t} className="fd-tag">{t}</span>
              ))}
            </span>
          )}

          {/* Definition */}
          <span className="fd-definition">{sense.definition}</span>

          {/* Examples */}
          {sense.examples && sense.examples.length > 0 && (
            <div className="fd-examples">
              {sense.examples.map((ex, ei) => (
                <blockquote key={ei} className="fd-example">"{ex}"</blockquote>
              ))}
            </div>
          )}

          {/* Sense-level synonyms / antonyms */}
          {sense.synonyms && sense.synonyms.length > 0 && (
            <div className="fd-mini-pills">
              <span className="fd-mini-label">syn:</span>
              {sense.synonyms.slice(0, 4).map((s) => (
                <span key={s} className="mw-pill mw-pill--syn fd-mini-pill">{s}</span>
              ))}
            </div>
          )}
          {sense.antonyms && sense.antonyms.length > 0 && (
            <div className="fd-mini-pills">
              <span className="fd-mini-label">ant:</span>
              {sense.antonyms.slice(0, 4).map((s) => (
                <span key={s} className="mw-pill mw-pill--ant fd-mini-pill">{s}</span>
              ))}
            </div>
          )}

          {/* Subsenses accordion */}
          {hasSubsenses && (
            <div className="fd-subsenses">
              <button
                className="fd-subsense-toggle"
                onClick={() => setSubsOpen((o) => !o)}
              >
                {subsOpen ? "▾" : "▸"} {sense.subsenses!.length} subsense{sense.subsenses!.length !== 1 ? "s" : ""}
              </button>
              {subsOpen && (
                <div className="fd-subsense-list">
                  {sense.subsenses!.map((sub, si) => (
                    <SenseBlock key={si} sense={sub} index={si} total={sense.subsenses!.length} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
