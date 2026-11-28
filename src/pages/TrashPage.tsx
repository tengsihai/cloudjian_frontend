import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { FileTextOutlined, FolderOutlined } from '@ant-design/icons';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import type { TrashItem } from '../lib/types';
import { usePreferences } from '../app/PreferencesContext';
import { useTaskCenter } from '../app/TaskCenter';
import { errorText, useToast } from '../app/ToastContext';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/Overlays';

const CONFIRM_WORD = { 'zh-CN': '清空', en: 'CLEAR', ja: '空にする' } as const;

export function TrashPage() {
  const [search] = useSearchParams();
  const currentPath = search.get('path') ?? '';
  const { uiLang } = usePreferences();
  const { toast } = useToast();
  const { track } = useTaskCenter();
  const queryClient = useQueryClient();
  const trash = useQuery({ queryKey: ['trash'], queryFn: () => api.getTrash() });
  const [selected, setSelected] = useState<string | null>(null);
  const [batch, setBatch] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const [purgeTarget, setPurgeTarget] = useState<TrashItem | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelected(null);
    setChecked([]);
  }, [currentPath]);

  const items = useMemo(() => {
    const all = trash.data?.items ?? [];
    if (!currentPath) return all;
    return all.filter(
      (item) => item.path === currentPath || item.path.startsWith(`${currentPath}/`),
    );
  }, [trash.data, currentPath]);

  const selectedItem = items.find((item) => item.path === selected) ?? null;

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['trash'] });
    void queryClient.invalidateQueries({ queryKey: ['notes'] });
    void queryClient.invalidateQueries({ queryKey: ['dirs'] });
    void queryClient.invalidateQueries({ queryKey: ['shares'] });
  }

  async function restore(item: TrashItem) {
    setBusy(true);
    try {
      const { job_id } = await api.restoreTrash(
        item.type === 'note' ? { note_id: item.note_id ?? undefined } : { path: item.path },
      );
      track(job_id, '正在恢复…', refresh);
      toast('已开始恢复');
      setSelected(null);
    } catch (err) {
      toast(`恢复失败：${errorText(err)}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function purge(item: TrashItem) {
    setBusy(true);
    try {
      const { job_id } = await api.purgeTrash(
        item.type === 'note'
          ? { scope: 'note', note_id: item.note_id ?? undefined }
          : { scope: 'dir', path: item.path },
      );
      track(job_id, item.type === 'note' ? '正在彻底删除笔记…' : '正在彻底删除目录…', refresh);
      toast('已开始彻底删除');
      setPurgeTarget(null);
      setSelected(null);
    } catch (err) {
      toast(`彻底删除失败：${errorText(err)}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function purgeChecked() {
    const ids = items
      .filter((item) => checked.includes(item.path) && item.type === 'note' && item.note_id)
      .map((item) => item.note_id!);
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const { job_id } = await api.purgeTrash({ scope: 'notes', note_ids: ids });
      track(job_id, '正在批量彻底删除…', refresh);
      toast(`已提交 ${ids.length} 篇笔记`);
      setChecked([]);
      setBatch(false);
    } catch (err) {
      toast(`批量删除失败：${errorText(err)}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function clearAll() {
    setBusy(true);
    try {
      const { job_id } = await api.purgeTrash({ scope: 'all' });
      track(job_id, '正在清空回收站…', refresh);
      toast('已开始清空回收站');
      setClearOpen(false);
      setTyped('');
      setSelected(null);
    } catch (err) {
      toast(`清空失败：${errorText(err)}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workbench">
      <section className="list-pane" style={{ width: 'auto' }}>
        <div className="list-head">
          <div className="row">
            <h2>回收站</h2>
            <span className="sp" />
            <button
              type="button"
              className={`btn sm${batch ? ' primary' : ''}`}
              onClick={() => {
                setBatch((prev) => !prev);
                setChecked([]);
              }}
            >
              {batch ? '退出批量' : '批量选择'}
            </button>
          </div>
          <div className="list-tools">
            {batch ? (
              <>
                <span className="caption">已选 {checked.length} 项</span>
                <span className="sp" />
                <button type="button" className="btn sm danger" disabled={!checked.length || busy} onClick={() => void purgeChecked()}>
                  彻底删除
                </button>
              </>
            ) : (
              <>
                <span className="caption">内容保留 30 天，到期自动清理。</span>
                <span className="sp" />
                <button type="button" className="btn sm danger" onClick={() => setClearOpen(true)} disabled={!items.length}>
                  清空回收站
                </button>
              </>
            )}
          </div>
        </div>

        <div className="note-list" style={{ padding: 0 }}>
          {trash.isLoading && <div className="skeleton" style={{ height: 52, margin: 12 }} />}
          {items.map((item) => (
            <div
              key={item.path}
              className={`trash-row${selected === item.path ? ' on' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => setSelected(item.path)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') setSelected(item.path);
              }}
            >
              {batch && item.type === 'note' && (
                <input
                  type="checkbox"
                  className="check"
                  checked={checked.includes(item.path)}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) =>
                    setChecked((prev) =>
                      event.target.checked ? [...prev, item.path] : prev.filter((entry) => entry !== item.path),
                    )
                  }
                />
              )}
              {item.type === 'dir' ? <FolderOutlined /> : <FileTextOutlined />}
              <div className="t">
                <b>{item.name.replace(/\.md$/, '')}</b>
                <span>{item.path}</span>
              </div>
              <span className="caption">约 {item.days_left} 天后清理</span>
            </div>
          ))}
          {!trash.isLoading && items.length === 0 && (
            <EmptyState title="回收站是空的" hint="删除的笔记和目录会在这里保留 30 天。" />
          )}
        </div>
      </section>

      <section className="editor-pane">
        {selectedItem ? (
          <div className="editor-scroll">
            <div className="editor-inner" style={{ maxWidth: 640 }}>
              <h1 className="h2" style={{ marginBottom: 6 }}>
                {selectedItem.name.replace(/\.md$/, '')}
              </h1>
              <p className="caption" style={{ marginBottom: 24 }}>
                {selectedItem.type === 'dir' ? '目录' : '笔记'} · 删除于{' '}
                {formatDateTime(selectedItem.deleted_at, uiLang)}
              </p>
              <dl className="kv">
                <dt>原路径</dt>
                <dd style={{ wordBreak: 'break-all' }}>{selectedItem.path}</dd>
                <dt>剩余保留</dt>
                <dd>约 {selectedItem.days_left} 天</dd>
                <dt>恢复规则</dt>
                <dd>同名内容已存在时，会自动加 -1。</dd>
              </dl>
              <div className="editor-actions" style={{ marginTop: 26 }}>
                <button type="button" className="btn primary" disabled={busy} onClick={() => void restore(selectedItem)}>
                  恢复
                </button>
                <button type="button" className="btn danger" disabled={busy} onClick={() => setPurgeTarget(selectedItem)}>
                  彻底删除
                </button>
              </div>
              <p className="caption" style={{ marginTop: 12 }}>
                恢复和彻底删除都走异步任务，可在右下角任务中心查看进度。
              </p>
            </div>
          </div>
        ) : (
          <EmptyState
            title="选择左侧的条目"
            hint={currentPath ? `正在查看 ${currentPath} 下的回收内容。` : '可以恢复内容，或彻底删除。'}
          />
        )}
      </section>

      <ConfirmDialog
        open={!!purgeTarget}
        title="彻底删除"
        body={
          purgeTarget
            ? `「${purgeTarget.name}」及其内容会被物理删除，无法恢复。${purgeTarget.type === 'dir' ? '目录下的所有笔记和图片会一并删除。' : ''}`
            : ''
        }
        confirmText="彻底删除"
        busy={busy}
        onClose={() => setPurgeTarget(null)}
        onConfirm={() => purgeTarget && void purge(purgeTarget)}
      />
      <ConfirmDialog
        open={clearOpen}
        title="清空回收站"
        body="回收站中的所有内容会被物理删除，无法恢复。请输入确认词继续。"
        confirmText="清空回收站"
        busy={busy}
        requireText={CONFIRM_WORD[uiLang]}
        typed={typed}
        onTyped={setTyped}
        onClose={() => {
          setClearOpen(false);
          setTyped('');
        }}
        onConfirm={() => void clearAll()}
      />
    </div>
  );
}
