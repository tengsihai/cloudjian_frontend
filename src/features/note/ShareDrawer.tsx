import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Level, ShareCandidate } from '../../lib/types';
import { formatDateTime } from '../../lib/format';
import { usePreferences } from '../../app/PreferencesContext';
import { errorText, useToast } from '../../app/ToastContext';
import { ConfirmDialog, Drawer } from '../../components/Overlays';

export interface ShareTarget {
  type: 'note' | 'dir';
  noteId?: string;
  dir?: string;
  title: string;
}

export function ShareDrawer({
  open,
  target,
  onClose,
}: {
  open: boolean;
  target: ShareTarget | null;
  onClose: () => void;
}) {
  const { uiLang } = usePreferences();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [level, setLevel] = useState<Exclude<Level, 'owner'>>('read');
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQ('');
      setLevel('read');
      setRevoking(null);
    }
  }, [open]);

  const outgoing = useQuery({
    queryKey: ['shares', 'outgoing', target?.type, target?.noteId ?? target?.dir ?? ''],
    queryFn: () =>
      api.getShares({
        scope: 'outgoing',
        target_type: target?.type,
        target_note_id: target?.type === 'note' ? target?.noteId : undefined,
        target_dir: target?.type === 'dir' ? target?.dir : undefined,
        page_size: 50,
      }),
    enabled: open && !!target,
  });

  const candidates = useQuery({
    queryKey: ['share-candidates', q],
    queryFn: () => api.getShareCandidates(q),
    enabled: open && q.trim().length > 0,
  });

  const create = useMutation({
    mutationFn: (candidate: ShareCandidate) =>
      api.createShare({
        target_type: target!.type,
        target_note_id: target!.type === 'note' ? target!.noteId : undefined,
        target_dir: target!.type === 'dir' ? target!.dir : undefined,
        grantee: candidate.user_uuid,
        level,
      }),
    onSuccess: () => {
      toast('已添加共享成员');
      setQ('');
      void queryClient.invalidateQueries({ queryKey: ['shares'] });
    },
    onError: (err) => toast(`共享失败：${errorText(err)}`, 'error'),
  });

  const revoke = useMutation({
    mutationFn: (shareId: string) => api.revokeShare(shareId),
    onSuccess: () => {
      toast('已撤销共享，对方最长 15 分钟后失去访问');
      setRevoking(null);
      void queryClient.invalidateQueries({ queryKey: ['shares'] });
    },
    onError: (err) => toast(`撤销失败：${errorText(err)}`, 'error'),
  });

  if (!target) return null;

  return (
    <>
      <Drawer open={open} title={target.type === 'dir' ? `分享目录 · ${target.title}` : `分享笔记 · ${target.title}`} onClose={onClose}>
        <p className="caption" style={{ marginBottom: 12 }}>
          共享给团队成员后，对方会在「共享给我」中看到{target.type === 'dir' ? '这个目录' : '这篇笔记'}。
        </p>

        <label className="label" htmlFor="share-search">添加成员</label>
        <div className="inline-form">
          <input
            id="share-search"
            className="field"
            placeholder="按用户名前缀搜索"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
          <select className="select" value={level} onChange={(event) => setLevel(event.target.value as 'read' | 'edit')}>
            <option value="read">只读</option>
            <option value="edit">可编辑</option>
          </select>
        </div>

        {q.trim() && (
          <div className="card" style={{ marginTop: 10, padding: 6 }}>
            {candidates.isLoading && <p className="caption" style={{ padding: 8 }}>搜索中…</p>}
            {candidates.data?.items.length === 0 && <p className="caption" style={{ padding: 8 }}>没有匹配的成员</p>}
            {candidates.data?.items.map((candidate) => (
              <div className="share-row" key={candidate.user_uuid} style={{ padding: '8px 6px' }}>
                <div className="avatar">{candidate.username.slice(0, 1).toUpperCase()}</div>
                <div className="t">
                  <b>{candidate.username}</b>
                </div>
                <button
                  type="button"
                  className="btn sm primary"
                  disabled={create.isPending}
                  onClick={() => create.mutate(candidate)}
                >
                  添加
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="section-title">我发出的共享</div>
        {outgoing.isLoading && <p className="caption">加载中…</p>}
        {outgoing.data?.items.length === 0 && <p className="caption">还没有共享给任何人</p>}
        {outgoing.data?.items.map((share) => (
          <div className="share-row" key={share.share_id}>
            <div className="avatar">{share.grantee_name.slice(0, 1).toUpperCase()}</div>
            <div className="t">
              <b>{share.grantee_name}</b>
              <span>
                {share.level === 'edit' ? '可编辑' : '只读'} · {formatDateTime(share.created_at, uiLang)}
              </span>
            </div>
            <button type="button" className="btn sm danger" onClick={() => setRevoking(share.share_id)}>
              撤销
            </button>
          </div>
        ))}
      </Drawer>

      <ConfirmDialog
        open={!!revoking}
        layer={46}
        title="撤销共享"
        body="撤销后对方将失去访问权限，最长 15 分钟后生效。对方正在编辑的内容会保留。"
        confirmText="撤销共享"
        busy={revoke.isPending}
        onClose={() => setRevoking(null)}
        onConfirm={() => revoking && revoke.mutate(revoking)}
      />
    </>
  );
}
