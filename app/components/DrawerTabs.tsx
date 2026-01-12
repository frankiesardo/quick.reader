import { SettingsIcon } from "./icons";

export type TabId = "contents" | "bookmarks" | "notes" | "settings";

interface Tab {
  id: TabId;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface DrawerTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  bookmarkCount: number;
  noteCount?: number;
}

export function DrawerTabs({
  activeTab,
  onTabChange,
  bookmarkCount,
  noteCount = 0,
}: DrawerTabsProps) {
  const tabs: Tab[] = [
    { id: "contents", label: "Contents" },
    { id: "bookmarks", label: "Bookmarks", count: bookmarkCount },
    { id: "notes", label: "Notes", count: noteCount },
    { id: "settings", label: "", icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="flex border-b border-slate-200 dark:border-slate-700">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`${tab.icon ? "px-3 flex-shrink-0" : "flex-1 px-2"} py-3.5 text-sm font-medium transition-colors relative ${
            activeTab === tab.id
              ? "text-blue-600 dark:text-blue-400"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
          aria-label={tab.id === "settings" ? "Settings" : undefined}
        >
          <span className="flex items-center justify-center gap-1">
            {tab.icon || tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {tab.count}
              </span>
            )}
          </span>
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
          )}
        </button>
      ))}
    </div>
  );
}

