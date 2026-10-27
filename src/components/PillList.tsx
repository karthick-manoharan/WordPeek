interface Props {
  label: string;
  words: string[];
  variant: "syn" | "ant";
}

export function PillList({ label, words, variant }: Props) {
  if (words.length === 0) return null;

  return (
    <section className="mw-section">
      <h3 className="mw-section-label">{label}</h3>
      <div className="mw-pill-group">
        {words.map((word) => (
          <span key={word} className={`mw-pill mw-pill--${variant}`}>
            {word}
          </span>
        ))}
      </div>
    </section>
  );
}
