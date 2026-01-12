import type { HighlightColor } from "./db";

export const HIGHLIGHT_COLORS: Record<HighlightColor, string> = {
  yellow: "#fef08a",
  green: "#86efac",
  blue: "#7dd3fc",
  pink: "#f9a8d4",
  purple: "#d8b4fe",
};

export const HIGHLIGHT_COLOR_NAMES: HighlightColor[] = [
  "yellow",
  "green",
  "blue",
  "pink",
  "purple",
];

export const DEFAULT_HIGHLIGHT_COLOR: HighlightColor = "yellow";

export function getColorValue(color: HighlightColor): string {
  return HIGHLIGHT_COLORS[color];
}

