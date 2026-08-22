import { useState } from 'react';
import { useEntryIdStore } from '../../stores/useEntryId';
import { useThemeStore } from '../../stores/useTheme';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-fg">{title}</h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const { entryId, setEntryId } = useEntryIdStore();
  const { theme, setTheme } = useThemeStore();
  const [value, setValue] = useState(entryId ? String(entryId) : '');
  const [saved, setSaved] = useState(false);
  const [clearing, setClearing] = useState(false);

  const saveEntry = () => {
    const n = Number(value.trim());
    if (Number.isFinite(n) && n > 0) {
      setEntryId(n);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  const clearCache = async () => {
    setClearing(true);
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // ignore; reload regardless
    }
    location.reload();
  };

  return (
    <div className="space-y-3 py-3">
      <h1 className="px-1 text-xl font-bold">Settings</h1>

      <Section title="FPL team id">
        <div className="flex gap-2">
          <input
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="num flex-1 rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={saveEntry}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black active:opacity-80"
          >
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </Section>

      <Section title="Appearance">
        <div className="flex overflow-hidden rounded-xl bg-surface2 text-sm font-medium">
          {(['dark', 'light'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`flex-1 py-2.5 capitalize ${
                theme === t ? 'bg-accent text-black' : 'text-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </Section>

      <Section title="About">
        <p className="text-sm leading-relaxed text-muted">
          fplq is a personal Fantasy Premier League companion: live overall rank with a trajectory,
          a five-gameweek transfer planner, a fixture ticker and a player explorer. Data comes from
          the official FPL API through a small caching proxy.
        </p>
      </Section>

      <Section title="Storage">
        <button
          onClick={clearCache}
          disabled={clearing}
          className="w-full rounded-xl bg-surface2 py-2.5 text-sm font-medium text-down active:opacity-70 disabled:opacity-50"
        >
          {clearing ? 'Clearing…' : 'Clear cache & reload'}
        </button>
        <p className="mt-2 text-[11px] text-faint">
          Unregisters the service worker and clears cached data, then reloads.
        </p>
      </Section>
    </div>
  );
}
