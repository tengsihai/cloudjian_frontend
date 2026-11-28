import { useEffect, useState } from 'react';
import type { NoteDetail } from '../../lib/types';
import { ConfirmDialog } from '../../components/Overlays';

export function ConflictPanel({
  open,
  server,
  mine,
  busy,
  onApply,
  onOverwrite,
  onDiscard,
}: {
  open: boolean;
  server: (NoteDetail & { etag: string }) | null;
  mine: { title: string; content: string };
  busy: boolean;
  onApply: (content: string) => void;
  onOverwrite: () => void;
  onDiscard: () => void;
}) {
  const [merged, setMerged] = useState(mine.content);
  const [confirm, setConfirm] = useState<'overwrite' | 'discard' | null>(null);

  useEffect(() => {
    if (open) {
      setMerged(mine.content);
      setConfirm(null);
    }
  }, [open, mine.content]);

  if (!open || !server) return null;

  return (
    <>
      <div className="conflict" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>这篇笔记已在其他窗口更新，请选择保留方式</h2>
          <span className="sp" />
          <span className="caption">服务端 v{server.version}</span>
        </div>
        <div className="conflict-body">
          <section className="conflict-col">
            <header>服务端版本</header>
            <pre>{server.content || '（空）'}</pre>
          </section>
          <section className="conflict-col">
            <header>我的版本</header>
            <pre>{mine.content || '（空）'}</pre>
          </section>
          <section className="conflict-col">
            <header>合并结果（可编辑）</header>
            <textarea value={merged} onChange={(event) => setMerged(event.target.value)} spellCheck={false} />
          </section>
        </div>
        <div className="conflict-foot">
          <span className="caption">默认以「我的版本」为底，请确认最终内容后再保存。</span>
          <span className="sp" />
          <button type="button" className="btn" disabled={busy} onClick={() => setConfirm('discard')}>
            放弃我的修改
          </button>
          <button type="button" className="btn danger" disabled={busy} onClick={() => setConfirm('overwrite')}>
            覆盖服务端
          </button>
          <button type="button" className="btn primary" disabled={busy} onClick={() => onApply(merged)}>
            {busy ? '保存中…' : '应用合并结果'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === 'overwrite'}
        layer={44}
        title="覆盖服务端"
        body="服务端上其他窗口保存的内容会被你的版本覆盖，且不会保留为版本历史。确定继续吗？"
        confirmText="覆盖服务端"
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={onOverwrite}
      />
      <ConfirmDialog
        open={confirm === 'discard'}
        layer={44}
        title="放弃我的修改"
        body="当前未保存的修改会被丢弃，编辑器将载入服务端最新内容。此操作无法撤销。"
        confirmText="放弃我的修改"
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={onDiscard}
      />
    </>
  );
}
