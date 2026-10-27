import { useState } from "react";

interface Props {
  etymology: string | null;
  firstKnownUse: string | null;
}

export function EtymologyAccordion({ etymology, firstKnownUse }: Props) {
  const [open, setOpen] = useState(false);

  if (!etymology && !firstKnownUse) return null;

  return (
    <div className="mw-accordion">
      <button
        className="mw-accordion-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="mw-accordion-arrow">{open ? "▾" : "▸"}</span>
        Etymology &amp; first use
      </button>
      {open && (
        <div className="mw-accordion-body">
          {etymology && (
            <p className="mw-accordion-text">
              <strong>Etymology:</strong> {etymology}
            </p>
          )}
          {firstKnownUse && (
            <p className="mw-accordion-text">
              <strong>First known use:</strong> {firstKnownUse}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
