import React from "react";
import { MWSseq, MWSenseEntry, MWSense, DtTuple } from "../types/mw-dictionary";
import { parseMwMarkup } from "../utils/parseMwMarkup";

interface Props {
  sseq: MWSseq;
  vd?: string; // verb divider label
  onNavigate: (word: string) => void;
}

export function SenseList({ sseq, vd, onNavigate }: Props) {
  return (
    <div className="mw-sense-list">
      {vd && <div className="mw-verb-divider">{vd}</div>}
      {Array.isArray(sseq) && sseq.map((group, gi) => (
        <div key={gi} className="mw-sense-group">
          {Array.isArray(group) && group.map((entry, ei) => (
            <SenseEntryRow key={ei} entry={entry} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
    </div>
  );
}

function SenseEntryRow({
  entry,
  onNavigate,
}: {
  entry: MWSenseEntry;
  onNavigate: (word: string) => void;
}) {
  const [type, data] = entry;

  if (type === "sense") {
    return <SenseRow sense={data as MWSense} onNavigate={onNavigate} />;
  }

  if (type === "bs") {
    const bs = data as { sense: MWSense };
    return <SenseRow sense={bs.sense} onNavigate={onNavigate} />;
  }

  if (type === "pseq") {
    const raw = data as MWSenseEntry[][] | MWSenseEntry[];
    // Normalise: if the first element is a [tag, content] tuple (1-D), wrap it
    const groups: MWSenseEntry[][] =
      Array.isArray(raw[0]) && typeof (raw[0] as MWSenseEntry)[0] === "string"
        ? [raw as MWSenseEntry[]]
        : (raw as MWSenseEntry[][]);
    return (
      <>
        {groups.map((group, gi) =>
          Array.isArray(group) &&
          group.map((e, ei) => (
            <SenseEntryRow key={`${gi}-${ei}`} entry={e} onNavigate={onNavigate} />
          ))
        )}
      </>
    );
  }

  return null;
}

function SenseRow({
  sense,
  onNavigate,
}: {
  sense: MWSense;
  onNavigate: (word: string) => void;
}) {
  const { sn, dt, sdsense, sls } = sense;

  return (
    <div className="mw-sense-row">
      <span className="mw-sense-num">{sn ?? ""}</span>
      <div className="mw-sense-body">
        {sls && sls.length > 0 && (
          <span className="mw-sls-chip-row">
            {sls.map((label) => (
              <span key={label} className="mw-sls-chip">
                {label}
              </span>
            ))}
          </span>
        )}
        <span className="mw-sense-def">
          {renderDt(dt, onNavigate)}
        </span>
        {sdsense && (
          <div className="mw-sds">
            <span className="mw-sds-label">{sdsense.sd}</span>{" "}
            <span className="mw-sense-def">
              {renderDt(sdsense.dt, onNavigate)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function renderDt(
  dt: DtTuple[],
  onNavigate: (word: string) => void
): React.ReactNode {
  const parts: React.ReactNode[] = [];

  for (let i = 0; i < dt.length; i++) {
    const [tag, val] = dt[i];

    if (tag === "text") {
      parts.push(
        <React.Fragment key={i}>
          {parseMwMarkup(val as string, onNavigate)}
        </React.Fragment>
      );
    } else if (tag === "vis") {
      const illustrations = val as Array<{ t: string; aq?: { auth?: string } }>;
      parts.push(
        <div key={i} className="mw-vis-group">
          {illustrations.map((vis, vi) => (
            <div key={vi} className="mw-vis">
              <span className="mw-vis-quote">
                {parseMwMarkup(vis.t, onNavigate)}
              </span>
              {vis.aq?.auth && (
                <span className="mw-vis-attr"> — {vis.aq.auth}</span>
              )}
            </div>
          ))}
        </div>
      );
    } else if (tag === "uns") {
      // Usage notes — render as an indented note block
      const uns = val as Array<Array<DtTuple>>;
      parts.push(
        <div key={i} className="mw-usage-note">
          {uns.map((noteItems, ni) => (
            <span key={ni}>{renderDt(noteItems, onNavigate)}</span>
          ))}
        </div>
      );
    }
    // snote and other tags: skip
  }

  return parts;
}
