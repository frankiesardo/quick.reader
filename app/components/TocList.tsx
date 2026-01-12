import type { NavItem } from "epubjs";

interface TocListProps {
  items: NavItem[];
  onNavigate: (href: string) => void;
}

export function TocList({ items, onNavigate }: TocListProps) {
  if (items.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading contents...</p>
      </div>
    );
  }

  return (
    <nav>
      <TocItems items={items} onNavigate={onNavigate} depth={0} />
    </nav>
  );
}

interface TocItemsProps {
  items: NavItem[];
  onNavigate: (href: string) => void;
  depth: number;
}

function TocItems({ items, onNavigate, depth }: TocItemsProps) {
  return (
    <ul className={depth === 0 ? "py-2" : ""}>
      {items.map((item, index) => (
        <li key={item.id || index}>
          <button
            onClick={() => onNavigate(item.href)}
            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            style={{ paddingLeft: `${1 + depth * 0.75}rem` }}
          >
            {item.label}
          </button>
          {item.subitems && item.subitems.length > 0 && (
            <TocItems items={item.subitems} onNavigate={onNavigate} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

