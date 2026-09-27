import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePreference } from '../../app/providers/ThemeProvider';

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  return (
    <div role="group" aria-label="Colour theme" className="flex rounded-lg border border-line bg-surface-2 p-0.5">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const checked = preference === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={checked}
            title={`${label} theme`}
            onClick={() => setPreference(value)}
            className={`grid size-7 place-items-center rounded-md ${checked ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'}`}
          >
            <Icon size={15} aria-hidden />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
