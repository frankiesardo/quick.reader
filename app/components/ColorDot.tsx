import type { HighlightColor } from "~/services/db";
import { HIGHLIGHT_COLORS } from "~/services/highlight";

interface ColorDotProps {
  color: HighlightColor;
  selected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

export function ColorDot({
  color,
  selected = false,
  onClick,
  size = "md",
}: ColorDotProps) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-8 h-8",
    lg: "w-10 h-10", // Larger touch target for mobile
  }[size];
  const ringClasses = selected
    ? "ring-2 ring-offset-2 ring-slate-400"
    : "";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`${sizeClasses} ${ringClasses} rounded-full transition-all flex-shrink-0`}
      style={{ backgroundColor: HIGHLIGHT_COLORS[color] }}
      aria-label={`${color} color${selected ? " (selected)" : ""}`}
    />
  );
}

