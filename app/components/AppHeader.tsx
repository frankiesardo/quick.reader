import { href, Link } from "react-router";
import { ChevronLeftIcon } from "./icons";

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  menuButton?: React.ReactNode;
  rightContent?: React.ReactNode;
}

export function AppHeader({ title, showBack, menuButton, rightContent }: AppHeaderProps) {
  return (
    <header className="flex-shrink-0 h-14 px-3 flex items-center gap-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
      {/* App icon with optional back caret */}
      <Link
        to={href("/books")}
        className="relative flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors pl-1"
      >
        {showBack && (
          <span className="absolute -left-2.5 text-slate-400 dark:text-slate-500">
            <ChevronLeftIcon />
          </span>
        )}
        <span className="text-xl leading-none">📚</span>
      </Link>

      {/* Optional menu button (for TOC on reader) */}
      {menuButton}

      {/* Title */}
      <h1 className="text-base font-medium text-slate-800 dark:text-slate-200 truncate flex-1 min-w-0">
        {title}
      </h1>

      {/* Right content */}
      {rightContent && <div className="flex-shrink-0">{rightContent}</div>}
    </header>
  );
}
