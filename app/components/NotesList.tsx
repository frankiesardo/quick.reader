import type { Highlight } from "~/services/db";
import { formatTimeAgo } from "~/services/time";
import { ColorDot } from "./ColorDot";
import { TrashIcon } from "./icons";

interface NotesListProps {
  highlights: Highlight[];
  onNavigate: (cfiRange: string) => void;
  onDelete: (id: string) => void;
}

export function NotesList({
  highlights,
  onNavigate,
  onDelete,
}: NotesListProps) {
  if (highlights.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">No highlights yet</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Select text while reading to create highlights
        </p>
      </div>
    );
  }

  return (
    <ul className="py-2">
      {highlights.map((highlight) => (
        <li key={highlight.id}>
          <div className="flex gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <div className="flex-shrink-0 pt-1">
              <ColorDot color={highlight.color} size="sm" />
            </div>
            <div className="flex-1 min-w-0">
              <button
                onClick={() => onNavigate(highlight.cfiRange)}
                className="text-left w-full"
              >
                <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  "{highlight.text}"
                </p>
                {highlight.note && (
                  <p
                    className="text-sm text-slate-600 dark:text-slate-400 mt-2 pl-3 border-l-2 line-clamp-2"
                    style={{
                      borderColor: `var(--highlight-${highlight.color})`,
                    }}
                  >
                    {highlight.note}
                  </p>
                )}
              </button>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatTimeAgo(highlight.createdAt)}
                </p>
                <button
                  onClick={() => onDelete(highlight.id)}
                  className="p-1 text-slate-400 dark:text-slate-500 hover:text-red-500 transition-colors"
                  aria-label="Delete highlight"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

