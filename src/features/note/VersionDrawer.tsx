import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { VersionItem } from '../../lib/types';
import { formatBytes, formatDateTime } from '../../lib/format';
import { usePreferences } from '../../app/PreferencesContext';
import { errorText, useToast } from '../../app/ToastContext';
import { ConfirmDialog, Drawer } from '../../components/Overlays';

export function VersionDrawer({
  open,
  noteId,
  canEdit,
  isOwner,
  currentContent,
  onRestored,
  onClose,
}: {
  open: boolean;
  noteId: string;
  canEdit: boolean;
  isOwner: boolean;
  currentContent: string;
  onRestored: (content: string, etag: string) => void;
  onClose: () => void;
}) {
  const { uiLang } = usePreferences();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [compareTs, setCompareTs] = useState<number | null>(null);
  const [rollbackTs, setRollbackTs] = useState<number | null>(null);
  const [deleteTs, setDeleteTs] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setCompareTs(null);
      setRollbackTs(null);
      setDeleteTs(null);
    }
  }, [open]);

  const versions = useQuery({
    queryKey: ['versions', noteId],
    queryFn: () => api.getVersions(noteId),
    enabled: open,
  });

  const detail = useQuery({
    queryKey: ['version', noteId, compareTs],
    queryFn: () => api.getVersion(noteId, compareTs!),
    enabled: open && compareTs !== null,
  });

  const rollback = useMutation({
    mutationFn: (ts: number) => api.rollbackVersion(noteId, ts),
    onSuccess: async (result) => {
      const version = compareTs === null ? null : detail.data;
      toast('已回滚到所选版本，当前内容已先保存为新版本');
      setRollbackTs(null);
      setCompareTs(null);
      onRestored(version?.content ?? currentContent, result.etag);
      await queryClient.invalidateQueries({ queryKey: ['versions', noteId] });
    },
    onError: (err) => toast(`回滚失败：${errorText(err)}`, 'error'),
  });

  const remove = useMutation({
    mutationFn: (ts: number) => api.deleteVersion(noteId, ts),
    onSuccess: async () => {
      toast('版本已删除');
      setDeleteTs(null);
      await queryClient.invalidateQueries({ queryKey: ['versions', noteId] });
    },
    onError: (err) => toast(`删除失败：${errorText(err)}`, 'error'),
  });

  const items = versions.data?.items ?? [];
  const current = items.find((item) => item.ts === compareTs) ?? null;

  return (
    <>
      <Drawer
        open={open}
        size="wide"
        title={compareTs ? '版本对比' : '版本历史'}
        onClose={onClose}
        footer={
          compareTs && current ? (
            <>
              <button type="button" className="btn" onClick={() => setCompareTs(null)}>
                返回列表
              </button>
              <span className="sp" />
              {isOwner && (
                <button type="button" className="btn danger" onClick={() => setDeleteTs(current.ts)}>
                  删除此版本
                </button>
              )}
              {canEdit && (
                <button type="button" className="btn primary" onClick={() => setRollbackTs(current.ts)}>
                  回滚到此版本
                </button>
              )}
            </>
          ) : undefined
        }
      >
        {!compareTs && (
          <>
            <p className="caption" style={{ marginBottom: 10 }}>
              每次保存都会生成历史版本，单篇最多保留 50 条。
            </p>
            {versions.isLoading && <p className="caption">加载中…</p>}
            {items.map((item) => (
              <VersionRow
                key={item.ts}
                item={item}
                lang={uiLang}
                onCompare={() => setCompareTs(item.ts)}
                isOwner={isOwner}
                onDelete={() => setDeleteTs(item.ts)}
              />
            ))}
            {!versions.isLoading && items.length === 0 && <p className="caption">还没有历史版本</p>}
          </>
        )}

        {compareTs && (
          <>
            <div className="row" style={{ marginBottom: 10 }}>
              <div>
                <div className="caption">选中版本</div>
                <b>{formatDateTime(current?.ts, uiLang)}</b>
              </div>
              <span className="sp" />
              <div style={{ textAlign: 'right' }}>
                <div className="caption">当前内容</div>
                <b>正在编辑的版本</b>
              </div>
            </div>
            {detail.isLoading && <p className="caption">加载版本内容…</p>}
            {detail.data && (
              <div className="split-view">
                <div>
                  <div className="caption" style={{ marginBottom: 6 }}>历史版本</div>
                  <DiffPre base={detail.data.content} other={currentContent} side="base" />
                </div>
                <div>
                  <div className="caption" style={{ marginBottom: 6 }}>当前内容</div>
                  <DiffPre base={detail.data.content} other={currentContent} side="other" />
                </div>
              </div>
            )}
          </>
        )}
      </Drawer>

      <ConfirmDialog
        open={rollbackTs !== null}
        layer={46}
        title="回滚版本"
        body="回滚前会先自动保存当前内容为新版本。回滚后这篇笔记的版本号会继续增加。"
        confirmText="回滚"
        busy={rollback.isPending}
        onClose={() => setRollbackTs(null)}
        onConfirm={() => rollbackTs !== null && rollback.mutate(rollbackTs)}
      />
      <ConfirmDialog
        open={deleteTs !== null}
        layer={46}
        title="删除版本"
        body="删除后这个历史版本无法恢复，当前正文不受影响。"
        confirmText="删除版本"
        busy={remove.isPending}
        onClose={() => setDeleteTs(null)}
        onConfirm={() => deleteTs !== null && remove.mutate(deleteTs)}
      />
    </>
  );
}

function VersionRow({
  item,
  lang,
  isOwner,
  onCompare,
  onDelete,
}: {
  item: VersionItem;
  lang: 'zh-CN' | 'en' | 'ja';
  isOwner: boolean;
  onCompare: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="share-row">
      <div className="t">
        <b>{formatDateTime(item.ts, lang)}</b>
        <span>
          v{item.version} · {formatBytes(item.size)} · {item.author}
        </span>
      </div>
      <button type="button" className="btn sm" onClick={onCompare}>
        并排对比
      </button>
      {isOwner && (
        <button type="button" className="btn sm danger" onClick={onDelete}>
          删除
        </button>
      )}
    </div>
  );
}

function DiffPre({ base, other, side }: { base: string; other: string; side: 'base' | 'other' }) {
  const lines = useMemo(() => {
    const baseSet = new Set(base.split('\n'));
    const otherSet = new Set(other.split('\n'));
    return (side === 'base' ? base : other).split('\n').map((line) => ({
      line,
      changed: side === 'base' ? !otherSet.has(line) : !baseSet.has(line),
    }));
  }, [base, other, side]);

  return (
    <pre>
      {lines.map((entry, index) => (
        <span
          key={`${index}-${entry.line.slice(0, 8)}`}
          style={
            entry.changed
              ? {
                  display: 'block',
                  background: side === 'base' ? 'var(--danger-soft)' : 'var(--success-soft)',
                }
              : { display: 'block' }
          }
        >
          {entry.line || ' '}
        </span>
      ))}
    </pre>
  );
}
