import React from "react";

/**
 * Parses a Merriam-Webster markup string into React nodes.
 *
 * Handled tokens:
 *   {bc}               → ": "
 *   {sx|word||}        → clickable cross-reference
 *   {a_link|word}      → clickable cross-reference
 *   {d_link|word|id}   → clickable cross-reference (display word)
 *   {wi}word{/wi}      → <em>word</em>  (verbal illustration italics)
 *   {it}word{/it}      → <em>word</em>
 *   {b}word{/b}        → <strong>word</strong>
 *   {ldquo}/{rdquo}    → " / "
 *   {inf}word{/inf}    → <sub>word</sub>
 *   {sup}word{/sup}    → <sup>word</sup>
 *   {dx}...{/dx}       → stripped (directional xref noise)
 *   {dx_def}...{/dx_def} → stripped
 *   {ds|...}           → stripped (date sense ref)
 *   {parahw}word{/parahw} → word (plain)
 *   {phrase}word{/phrase} → word (plain)
 *   Anything else {..} → stripped
 */
export function parseMwMarkup(
  text: string,
  onLink?: (word: string) => void
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let key = 0;
  let remaining = text;

  // Strip block-level noise tags first (dx, dx_def, ds)
  remaining = remaining
    .replace(/\{dx\}.*?\{\/dx\}/gs, "")
    .replace(/\{dx_def\}.*?\{\/dx_def\}/gs, "")
    .replace(/\{ds\|[^}]*\}/g, "");

  const tokenRe =
    /(\{bc\}|\{ldquo\}|\{rdquo\}|\{sx\|[^|]*\|[^}]*\}|\{a_link\|[^}]*\}|\{d_link\|[^|]*\|[^}]*\}|\{wi\}|\{\/wi\}|\{it\}|\{\/it\}|\{b\}|\{\/b\}|\{inf\}|\{\/inf\}|\{sup\}|\{\/sup\}|\{parahw\}|\{\/parahw\}|\{phrase\}|\{\/phrase\}|\{[^}]+\})/g;

  let lastIdx = 0;
  let inEm = false;
  let inStrong = false;
  let inSub = false;
  let inSup = false;
  let match: RegExpExecArray | null;

  const flush = (str: string) => {
    if (!str) return;
    const content = inEm ? (
      <em key={key++}>{str}</em>
    ) : inStrong ? (
      <strong key={key++}>{str}</strong>
    ) : inSub ? (
      <sub key={key++}>{str}</sub>
    ) : inSup ? (
      <sup key={key++}>{str}</sup>
    ) : (
      str
    );
    nodes.push(content);
  };

  while ((match = tokenRe.exec(remaining)) !== null) {
    // Flush literal text before this token
    const literal = remaining.slice(lastIdx, match.index);
    if (literal) flush(literal);
    lastIdx = match.index + match[0].length;

    const token = match[0];

    if (token === "{bc}") {
      nodes.push(": ");
    } else if (token === "{ldquo}") {
      nodes.push("\u201C");
    } else if (token === "{rdquo}") {
      nodes.push("\u201D");
    } else if (token === "{wi}" || token === "{it}") {
      inEm = true;
    } else if (token === "{/wi}" || token === "{/it}") {
      inEm = false;
    } else if (token === "{b}") {
      inStrong = true;
    } else if (token === "{/b}") {
      inStrong = false;
    } else if (token === "{inf}") {
      inSub = true;
    } else if (token === "{/inf}") {
      inSub = false;
    } else if (token === "{sup}") {
      inSup = true;
    } else if (token === "{/sup}") {
      inSup = false;
    } else if (
      token === "{parahw}" ||
      token === "{/parahw}" ||
      token === "{phrase}" ||
      token === "{/phrase}"
    ) {
      // no-op, surrounding text is already captured
    } else if (token.startsWith("{sx|")) {
      // {sx|displayWord|linkWord|}  — first segment is display, second is link target
      const inner = token.slice(4, -1); // remove {sx| and }
      const parts = inner.split("|");
      const display = parts[0] || parts[1] || "";
      const target = parts[1] || parts[0] || "";
      if (display) {
        nodes.push(
          <button
            key={key++}
            className="mw-dict-xref"
            onClick={() => onLink?.(target || display)}
          >
            {display}
          </button>
        );
      }
    } else if (token.startsWith("{a_link|")) {
      const word = token.slice(8, -1); // remove {a_link| and }
      nodes.push(
        <button
          key={key++}
          className="mw-dict-xref"
          onClick={() => onLink?.(word)}
        >
          {word}
        </button>
      );
    } else if (token.startsWith("{d_link|")) {
      const inner = token.slice(8, -1);
      const parts = inner.split("|");
      const display = parts[0];
      const target = parts[1] || parts[0];
      nodes.push(
        <button
          key={key++}
          className="mw-dict-xref"
          onClick={() => onLink?.(target)}
        >
          {display}
        </button>
      );
    }
    // All other {tokens} → strip (do nothing)
  }

  // Flush remaining text after last token
  const tail = remaining.slice(lastIdx);
  if (tail) flush(tail);

  return nodes;
}
