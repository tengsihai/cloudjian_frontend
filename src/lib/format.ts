import type { UiLang } from './types';

const LOCALE: Record<UiLang, string> = {
  'zh-CN': 'zh-CN',
  en: 'en',
  ja: 'ja',
};

export function formatTime(ts: number | null | undefined, lang: UiLang = 'zh-CN') {
  if (!ts) return '—';
  const date = new Date(ts);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return new Intl.DateTimeFormat(LOCALE[lang], {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
  return new Intl.DateTimeFormat(LOCALE[lang], {
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function formatDateTime(ts: number | null | undefined, lang: UiLang = 'zh-CN') {
  if (!ts) return '—';
  return new Intl.DateTimeFormat(LOCALE[lang], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts));
}

export function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function initials(name: string) {
  return name
    .split(/[.\s_-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function percent(done: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}
