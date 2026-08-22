import { useState } from 'react';
import { playerPhotoUrl } from '../lib/bootstrap-index';

interface PlayerPhotoProps {
  code: number | string;
  name: string;
  className?: string;
}

export default function PlayerPhoto({ code, name, className = '' }: PlayerPhotoProps) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className={`grid place-items-center bg-surface2 text-muted text-xs font-semibold ${className}`}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={playerPhotoUrl(code)}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
