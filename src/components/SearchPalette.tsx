import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { canNavigate } from '../lib/events';
import type { SearchHit } from '../lib/types';
import { sharedLocation } from '../lib/paths';

const GROUP_LABEL: Record<SearchHit['origin'], string> = {
  own: '我的笔记',
  shared: '共享给我',
  public: '公开',
};

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!open) {
      setValue('');
      setQ('');
      setActive(0);
      return undefined;
    }
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    const id = window.setTimeout(() => setQ(value.trim()), 180);
    return () => window.clearTimeout(id);
  }, [value]);

  const search = useQuery({
    queryKey: ['search', q],
    queryFn: () => api.search(q),
    enabled: open && q.length > 0,
    retry: false,
  });

  const flat = useMemo(() => search.data?.items ?? [], [search.data]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActive((prev) => (flat.length ? (prev + 1) % flat.length : 0));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActive((prev) => (flat.length ? (prev - 1 + flat.length) % flat.length : 0));
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const hit = flat[active];
        if (hit) openHit(hit);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function openHit(hit: SearchHit) {
    if (!canNavigate()) return;
    onClose();
    if (hit.origin === 'own') {
      navigate(`/notes/${hit.note_id}?dir=${encodeURIComponent(hit.category_path)}`);
    } else if (hit.origin === 'shared') {
      navigate(`/shared/${hit.note_id}?share=${hit.share_id ?? ''}`);
    } else if (hit.public_token) {
      navigate(`/p/${hit.public_token}`);
    }
  }

  if (!open) return null;

  let lastOrigin: SearchHit['origin'] | null = null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="palette" role="dialog" aria-modal="true">
        <div className="palette-input">
          <span aria-hidden>⌕</span>
          <input
            ref={inputRef}
            value={value}
            placeholder="搜索标题和正文…"
            onChange={(event) => setValue(event.target.value)}
          />
          <span className="kbd">Esc</span>
        </div>
        <div className="palette-body">
          {!q && <p className="caption" style={{ padding: '18px 12px' }}>输入关键词搜索我的、共享的和公开的笔记</p>}
          {q && search.isLoading && <p className="caption" style={{ padding: '18px 12px' }}>搜索中…</p>}
          {q && search.isError && (
            <p className="caption" style={{ padding: '18px 12px', color: 'var(--danger)' }}>搜索失败，请稍后重试</p>
          )}
          {q && search.data && flat.length === 0 && (
            <p className="caption" style={{ padding: '18px 12px' }}>没有找到「{q}」相关的内容</p>
          )}
          {flat.map((hit, index) => {
            const header = hit.origin !== lastOrigin ? GROUP_LABEL[hit.origin] : null;
            lastOrigin = hit.origin;
            return (
              <div key={`${hit.origin}-${hit.note_id}`}>
                {header && <div className="palette-grp">{header}</div>}
                <button
                  type="button"
                  className={`palette-row${index === active ? ' on' : ''}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => openHit(hit)}
                >
                  <div className="t">
                    <b>{highlight(hit.title, q)}</b>
                    <span>
                      {hit.origin === 'own'
                        ? hit.relative_path || '未分类'
                        : hit.origin === 'shared'
                          ? `${hit.owner_name ?? ''} · ${sharedLocation(hit.relative_path, hit.share_root_name)}`
                          : `公开 · ${hit.owner_name ?? ''}`}
                    </span>
                  </div>
                  {hit.origin === 'shared' && (
                    <span className={`badge ${hit.level === 'edit' ? 'ok' : 'warn'}`}>
                      {hit.level === 'edit' ? '可编辑' : '只读'}
                    </span>
                  )}
                  {hit.origin === 'public' && <span className="badge info">公开</span>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function highlight(text: string, q: string) {
  if (!q) return text;
  const index = text.toLowerCase().indexOf(q.toLowerCase());
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + q.length)}</mark>
      {text.slice(index + q.length)}
    </>
  );
}
