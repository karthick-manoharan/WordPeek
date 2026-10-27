import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getPopupGeometry, SelectionAnchor } from "./popupGeometry";
import { WordCard } from "../components/WordCard";
import { WordData, LookupSource } from "../types/lookup";

interface SourceState {
  data: WordData | null;
  loading: boolean;
  error: string | null;
}

interface Props {
  mw: SourceState;
  freeDict: SourceState;
  lookupSources: LookupSource;
  position: SelectionAnchor;
  onClose: () => void;
}

export function SelectionPopup({ mw, freeDict, lookupSources, position, onClose }: Props) {
  // Dismiss on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const showMW = lookupSources === "mw" || lookupSources === "both";
  const showFD = lookupSources === "freeDict" || lookupSources === "both";
  const showLabels = lookupSources === "both";

  const content = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState({ x: 0, y: 0, width: 320, maxHeight: 0 });
  useLayoutEffect(() => {
    const measure = () => {
      const next = getPopupGeometry(
        position, window.innerWidth, window.innerHeight,
        content.current?.getBoundingClientRect().height ?? 0,
      );
      setGeometry(previous => Object.keys(next).every(
        key => previous[key as keyof typeof next] === next[key as keyof typeof next]
      ) ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (content.current) observer.observe(content.current);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [position]);

  const style: React.CSSProperties = {
    position: "fixed",
    top: geometry.y,
    left: geometry.x,
    zIndex: 2147483647,
    width: geometry.width,
    boxShadow: "var(--shadow)",
    borderRadius: 8,
    background: "var(--surface)",
    border: "1px solid var(--border)",
    overflow: "hidden",
  };

  return (
    <div className="mw-selection-shell" style={style}>
      <div className="mw-selection-results" tabIndex={0}
        role="region" aria-label="Dictionary results" style={{ maxHeight: geometry.maxHeight }}>
      <div ref={content}>
      {showMW && (
        <>
          {showLabels && <div className="mw-source-label">Merriam-Webster</div>}
          {mw.loading && (
            <div style={{ padding: "16px", fontSize: 14, color: "var(--secondary)" }}>Looking up…</div>
          )}
          {mw.error && (
            <div style={{ padding: "16px", fontSize: 13, color: "var(--error)" }}>{mw.error}</div>
          )}
          {mw.data && <WordCard data={mw.data} />}
        </>
      )}

      {showFD && (
        <>
          {showLabels && (
            <>
              {(mw.data || mw.error) && <hr className="mw-source-divider" />}
              <div className="mw-source-label">Free Dictionary</div>
            </>
          )}
          {freeDict.loading && (
            <div style={{ padding: "16px", fontSize: 14, color: "var(--secondary)" }}>Looking up…</div>
          )}
          {freeDict.error && (
            <div style={{ padding: "16px", fontSize: 13, color: "var(--error)" }}>{freeDict.error}</div>
          )}
          {freeDict.data && <WordCard data={freeDict.data} />}
        </>
      )}
      </div>
      </div>
    </div>
  );
}
