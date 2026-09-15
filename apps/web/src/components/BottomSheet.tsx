import { useEffect, type ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  placement?: 'top' | 'bottom';
  contentClassName?: string;
}

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  placement = 'bottom',
  contentClassName = '',
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const scrollY = window.scrollY;
    const prev = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev.overflow;
      document.body.style.position = prev.position;
      document.body.style.top = prev.top;
      document.body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col ${placement === 'top' ? 'justify-start' : 'justify-end'}`}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/60 fade-in" onClick={onClose} />
      <div
        className={`relative bg-surface shadow-2xl ${
          placement === 'top'
            ? 'fade-in flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden rounded-b-2xl border-b border-line pt-[env(safe-area-inset-top)] sm:h-auto sm:max-h-[88dvh]'
            : 'sheet-in max-h-[88dvh] overflow-y-auto rounded-t-2xl border-t border-line pb-[calc(env(safe-area-inset-bottom)+1rem)]'
        }`}
      >
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur">
          <div className="min-w-0 flex-1 text-base font-semibold">{title}</div>
          <button
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-full bg-surface2 text-muted active:opacity-70"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div
          className={`${placement === 'top' ? 'min-h-0 flex-1 overflow-hidden pb-[env(safe-area-inset-bottom)]' : ''} px-4 py-4 ${contentClassName}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
