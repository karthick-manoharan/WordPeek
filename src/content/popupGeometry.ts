export interface SelectionAnchor {
  left: number;
  top: number;
  bottom: number;
}

/** All dimensions are CSS pixels; contentHeight excludes the shell's 1px borders. */
export function getPopupGeometry(
  anchor: SelectionAnchor,
  viewportWidth: number,
  viewportHeight: number,
  contentHeight: number,
) {
  const mx = Math.min(8, viewportWidth / 4);
  const my = Math.min(8, viewportHeight / 4);
  const width = Math.min(320, Math.max(0, viewportWidth - mx * 2));
  const available = Math.max(0, viewportHeight - my * 2);
  const height = Math.min(contentHeight + 2, available);
  const below = Math.max(0, viewportHeight - my - anchor.bottom - 8);
  const above = Math.max(0, anchor.top - 8 - my);
  let y = anchor.bottom + 8;
  if (height > below && above > below) y = anchor.top - 8 - height;
  y = Math.min(Math.max(my, y), Math.max(my, viewportHeight - my - height));
  return {
    x: Math.max(mx, Math.min(anchor.left, viewportWidth - mx - width)),
    y,
    width,
    maxHeight: Math.max(0, viewportHeight - my - y - 2),
  };
}
