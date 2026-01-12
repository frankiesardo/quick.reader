import type {
  ReaderSettings,
  Theme,
  FontSize,
  LineHeight,
} from "~/services/db";

interface SettingsPanelProps {
  settings: ReaderSettings;
  onUpdate: (data: Partial<Omit<ReaderSettings, "id" | "updatedAt">>) => void;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-150 ${
            value === option.value
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const themeOptions: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "auto", label: "Auto" },
];

const fontSizeOptions: { value: FontSize; label: string }[] = [
  { value: "xs", label: "XS" },
  { value: "s", label: "S" },
  { value: "m", label: "M" },
  { value: "l", label: "L" },
  { value: "xl", label: "XL" },
];

const lineHeightOptions: { value: LineHeight; label: string }[] = [
  { value: "tight", label: "Tight" },
  { value: "normal", label: "Normal" },
  { value: "loose", label: "Loose" },
];

export function SettingsPanel({ settings, onUpdate }: SettingsPanelProps) {
  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Display Settings
        </h3>

        <div className="space-y-5">
          {/* Theme */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Theme
            </label>
            <SegmentedControl
              value={settings.theme}
              options={themeOptions}
              onChange={(theme) => onUpdate({ theme })}
            />
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Font Size
            </label>
            <SegmentedControl
              value={settings.fontSize}
              options={fontSizeOptions}
              onChange={(fontSize) => onUpdate({ fontSize })}
            />
          </div>

          {/* Line Height */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Line Height
            </label>
            <SegmentedControl
              value={settings.lineHeight}
              options={lineHeightOptions}
              onChange={(lineHeight) => onUpdate({ lineHeight })}
            />
          </div>
        </div>
      </div>

      {/* Preview hint */}
      <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
        Changes apply instantly to the reader
      </p>
    </div>
  );
}

