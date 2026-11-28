import type { DirItem } from './types';

interface Entry {
  ts: number;
  items: DirItem[];
}

type Store = Record<string, Entry>;

const PREFIX = 'cloudjian.dirs.v1.';
const MAX_ENTRIES = 80;

function key(userUuid: string) {
  return `${PREFIX}${userUuid}`;
}

function load(userUuid: string): Store {
  try {
    const raw = localStorage.getItem(key(userUuid));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** 目录树本地缓存：先渲染上次结果，再后台刷新。 */
export function readDirCache(userUuid: string, path: string): DirItem[] | undefined {
  const entry = load(userUuid)[path];
  return Array.isArray(entry?.items) ? entry.items : undefined;
}

export function writeDirCache(userUuid: string, path: string, items: DirItem[]): void {
  try {
    const store = load(userUuid);
    store[path] = { ts: Date.now(), items: items.slice(0, 1000) };
    const keys = Object.keys(store);
    if (keys.length > MAX_ENTRIES) {
      keys
        .sort((a, b) => store[a].ts - store[b].ts)
        .slice(0, keys.length - MAX_ENTRIES)
        .forEach((old) => delete store[old]);
    }
    localStorage.setItem(key(userUuid), JSON.stringify(store));
  } catch {
    // 缓存失败不影响主流程
  }
}
