import type { ReactNode } from 'react';

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <svg width="120" height="80" viewBox="0 0 120 80" fill="none" aria-hidden>
        <rect x="18" y="14" width="84" height="56" rx="6" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <path d="M30 30h42M30 42h54M30 54h30" stroke="currentColor" strokeWidth="1.5" opacity="0.45" strokeLinecap="round" />
        <circle cx="88" cy="62" r="14" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.5" />
        <path d="M82 62h12M88 56v12" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <strong>{title}</strong>
      {hint && <span className="caption">{hint}</span>}
      {action}
    </div>
  );
}
