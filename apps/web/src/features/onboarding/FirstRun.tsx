import { useState } from 'react';
import { DEFAULT_ENTRY_ID, useEntryIdStore } from '../../stores/useEntryId';

export default function FirstRun() {
  const setEntryId = useEntryIdStore((s) => s.setEntryId);
  const [value, setValue] = useState(DEFAULT_ENTRY_ID ? String(DEFAULT_ENTRY_ID) : '');
  const [error, setError] = useState('');

  const submit = () => {
    const n = Number(value.trim());
    if (!Number.isFinite(n) || n <= 0) {
      setError('Enter a valid FPL team id (a number).');
      return;
    }
    setEntryId(n);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-accent to-brand text-xl font-black text-black">
          Q
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">fplq</h1>
          <p className="text-sm text-muted">Live FPL rank, planner &amp; fixtures</p>
        </div>
      </div>

      <label className="mb-2 block text-sm font-medium text-muted" htmlFor="entryId">
        Your FPL team id
      </label>
      <input
        id="entryId"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        placeholder="e.g. 1965441"
        className="num w-full rounded-xl border border-line bg-surface px-4 py-3 text-lg outline-none focus:border-accent"
      />
      <p className="mt-2 text-xs text-faint">
        Find it in the FPL app URL under Points: <code>/entry/&lt;id&gt;/</code>.
      </p>
      {error && <p className="mt-2 text-xs text-down">{error}</p>}

      <button
        onClick={submit}
        className="mt-6 rounded-xl bg-accent px-4 py-3 text-base font-semibold text-black active:opacity-80"
      >
        Continue
      </button>
    </div>
  );
}
