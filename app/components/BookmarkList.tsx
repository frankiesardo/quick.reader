import type { Bookmark } from "~/services/db";
import { formatTimeAgo } from "~/services/time";
import { TrashIcon } from "./icons";

interface BookmarkListProps {
  bookmarks: Bookmark[];
  onNavigate: (cfi: string) => void;
  onDelete: (id: string) => void;
}

export function BookmarkList({ bookmarks, onNavigate, onDelete }: BookmarkListProps) {
  if (bookmarks.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">No bookmarks yet</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Tap the bookmark icon while reading to save your place
        </p>
      </div>
    );
  }

  return (
    <ul className="py-2">
      {bookmarks.map((bookmark) => (
        <li key={bookmark.id}>
          <div className="flex items-start gap-2 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <button
              onClick={() => onNavigate(bookmark.cfi)}
              className="flex-1 text-left min-w-0"
            >
              <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                {bookmark.excerpt ? (
                  <>"{bookmark.excerpt}"</>
                ) : (
                  <span className="italic text-slate-400 dark:text-slate-500">No preview available</span>
                )}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {formatTimeAgo(bookmark.createdAt)}
              </p>
            </button>
            <button
              onClick={() => onDelete(bookmark.id)}
              className="p-1.5 text-slate-400 dark:text-slate-500 active:text-red-500 transition-colors flex-shrink-0"
              aria-label="Delete bookmark"
            >
              <TrashIcon />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

