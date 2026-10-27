interface Props {
  definitions: string[];
}

export function DefinitionList({ definitions }: Props) {
  if (definitions.length === 0) return null;

  return (
    <section className="mw-section">
      <h3 className="mw-section-label">DEFINITIONS</h3>
      <ol className="mw-def-list">
        {definitions.map((def, i) => (
          <li key={i} className="mw-def-item">
            {def}
          </li>
        ))}
      </ol>
    </section>
  );
}
