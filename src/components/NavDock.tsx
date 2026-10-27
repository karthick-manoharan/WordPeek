import React from "react";
import "./NavDock.css";

export type NavMode = "quick" | "dictionary";
export type NavPosition = "top" | "left" | "right" | "bottom";

interface Props {
  activeMode: NavMode;
  onModeChange: (mode: NavMode) => void;
  position: NavPosition;
}

export function NavDock({ activeMode, onModeChange, position }: Props) {
  const isVertical = position === "left" || position === "right";

  return (
    <nav
      className="mw-nav-dock"
      data-vertical={isVertical ? "true" : undefined}
      aria-label="Mode navigation"
    >
      <NavButton
        label="Quick"
        active={activeMode === "quick"}
        onClick={() => onModeChange("quick")}
        icon={<IconLightning />}
        isVertical={isVertical}
      />
      <NavButton
        label="Dictionary"
        active={activeMode === "dictionary"}
        onClick={() => onModeChange("dictionary")}
        icon={<IconBook />}
        isVertical={isVertical}
      />
    </nav>
  );
}

function NavButton({
  label,
  active,
  onClick,
  icon,
  isVertical,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  isVertical: boolean;
}) {
  return (
    <button
      className={`mw-nav-btn${active ? " mw-nav-btn--active" : ""}${isVertical ? " mw-nav-btn--vertical" : ""}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {icon}
      <span className="mw-nav-label">{label}</span>
    </button>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconLightning() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width="15"
      height="15"
      aria-hidden="true"
    >
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="15"
      height="15"
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
