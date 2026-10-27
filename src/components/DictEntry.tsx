import React, { useState } from "react";
import { MWDictionaryEntry, MWLdq, MWEtymology, DtTuple } from "../types/mw-dictionary";
import { buildAudioUrl } from "../utils/mwApi";
import { SenseList } from "./SenseList";
import { EtymologyAccordion } from "./EtymologyAccordion";
import { parseMwMarkup } from "../utils/parseMwMarkup";

interface Props {
  entry: MWDictionaryEntry;
  onNavigate: (word: string) => void;
}

function playAudio(audioToken: string) {
  chrome.runtime.sendMessage({ type: "PLAY_AUDIO", url: buildAudioUrl(audioToken) });
}

export function DictEntry({ entry, onNavigate }: Props) {
  const { meta, hwi, fl, def, uros, et, date, suppl } = entry;

  const headword = hwi.hw.replace(/\*/g, "\u00B7"); // * → ·
  const phonetic = hwi.prs?.[0]?.mw ?? null;
  const audioToken = hwi.prs?.[0]?.sound?.audio ?? null;

  return (
    <article className="mw-dict-entry">
      {meta.offensive && (
        <div className="mw-offensive-banner" role="alert">
          This word may be considered offensive
        </div>
      )}

      {/* Header: headword + IPA + audio + POS */}
      <div className="mw-card-header">
        <h2 className="mw-headword">{headword}</h2>
      </div>
      <div className="mw-card-meta">
        {phonetic && <span className="mw-pronunciation">/{phonetic}/</span>}
        {audioToken && (
          <button
            className="mw-audio-btn"
            onClick={() => playAudio(audioToken)}
            aria-label="Play pronunciation"
            title="Play pronunciation"
          >
            ▶
          </button>
        )}
        {fl && <span className="mw-pos">{fl}</span>}
      </div>

      {/* Full definitions */}
      {def && def.length > 0 && (
        <div className="mw-card-body">
          {def.map((defBlock, di) => (
            <SenseList
              key={di}
              sseq={defBlock.sseq}
              vd={defBlock.vd}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}

      {/* Related forms (uros) */}
      {uros && uros.length > 0 && (
        <div className="mw-section mw-related-forms">
          <h3 className="mw-section-label">RELATED FORMS</h3>
          <div className="mw-uro-list">
            {uros.map((uro, i) => (
              <span key={i} className="mw-uro-item">
                <span className="mw-uro-form">
                  {uro.ure.replace(/\*/g, "\u00B7")}
                </span>
                {uro.fl && (
                  <span className="mw-uro-fl"> · {uro.fl}</span>
                )}
                {i < uros.length - 1 && <span className="mw-uro-sep">,  </span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Supplemental examples accordion */}
      {suppl?.examples && suppl.examples.length > 0 && (
        <SupplExamplesAccordion
          examples={suppl.examples.map((e) => e.t)}
          onNavigate={onNavigate}
        />
      )}

      {/* Simpler definitions accordion (Learner's Dictionary) */}
      {suppl?.ldq && (
        <SimplerDefsAccordion ldq={suppl.ldq} onNavigate={onNavigate} />
      )}

      {/* Etymology & first use accordion */}
      <EtymologyAccordion
        etymology={et ? renderEt(et) : null}
        firstKnownUse={date ?? null}
      />
    </article>
  );
}

// ── Supplemental Examples Accordion ─────────────────────────────────────────

function SupplExamplesAccordion({
  examples,
  onNavigate,
}: {
  examples: string[];
  onNavigate: (word: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mw-accordion">
      <button
        className="mw-accordion-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="mw-accordion-arrow">{open ? "▾" : "▸"}</span>
        Supplemental Examples
      </button>
      {open && (
        <div className="mw-accordion-body">
          {examples.map((t, i) => (
            <div key={i} className="mw-vis">
              <span className="mw-vis-quote">{parseMwMarkup(t, onNavigate)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Simpler Definitions Accordion ────────────────────────────────────────────

function SimplerDefsAccordion({
  ldq,
  onNavigate,
}: {
  ldq: MWLdq;
  onNavigate: (word: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mw-accordion">
      <button
        className="mw-accordion-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="mw-accordion-arrow">{open ? "▾" : "▸"}</span>
        Simpler Definitions
      </button>
      {open && (
        <div className="mw-accordion-body">
          {ldq.def.map((defBlock, di) => (
            <div key={di} className="mw-ldq-def">
              {defBlock.sls && (
                <div className="mw-sls-chip-row">
                  {defBlock.sls.map((l) => (
                    <span key={l} className="mw-sls-chip">
                      {l}
                    </span>
                  ))}
                </div>
              )}
              {Array.isArray(defBlock.sseq) && defBlock.sseq.map((group, gi) =>
                group.map(([, sense], si) => (
                  <div key={`${gi}-${si}`} className="mw-ldq-sense">
                    {sense.sls && (
                      <span className="mw-sls-chip-row">
                        {sense.sls.map((l) => (
                          <span key={l} className="mw-sls-chip">
                            {l}
                          </span>
                        ))}
                      </span>
                    )}
                    <span className="mw-sense-def">
                      {renderDtSimple(sense.dt, onNavigate)}
                    </span>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function renderDtSimple(
  dt: DtTuple[],
  onNavigate: (word: string) => void
): React.ReactNode {
  return dt
    .filter(([tag]) => tag === "text")
    .map(([, val], i) => (
      <React.Fragment key={i}>
        {parseMwMarkup(val as string, onNavigate)}
      </React.Fragment>
    ));
}

// ── Etymology helper ──────────────────────────────────────────────────────────

function renderEt(et: MWEtymology[]): string {
  return et
    .flat()
    .filter(([tag]) => tag === "text")
    .map(([, text]) => text)
    .join(" ")
    .replace(/\{[^}]+\}/g, "")
    .trim();
}
