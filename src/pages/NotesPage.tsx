import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Tooltip } from 'antd';
import { FolderOutlined, PlusOutlined, ShareAltOutlined } from '@ant-design/icons';
import { api } from '../lib/api';
import { canNavigate, onNewNote, setNavGuard } from '../lib/events';
import { baseName } from '../lib/paths';
import { errorText, useToast } from '../app/ToastContext';
import { Modal } from '../components/Overlays';
import { MineTree, SharedTree } from '../components/SidebarTree';
import { NoteEditor } from '../features/note/NoteEditor';
import { ShareDrawer } from '../features/note/ShareDrawer';

export function NotesPage({ scope }: { scope: 'mine' | 'shared' }) {
  const params = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const noteId = params.noteId ?? null;
  const dir = search.get('dir') ?? '';
  const shareId = search.get('share') ?? '';
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDirty(false);
  }, [noteId]);

  useEffect(() => {
    if (!dirty) return undefined;
    return setNavGuard(() => window.confirm('当前笔记有未保存的修改，确定离开吗？'));
  }, [dirty]);

  function showCollection(categoryPath: string) {
    const query = new URLSearchParams();
    if (scope === 'shared' && shareId) query.set('share', shareId);
    if (categoryPath) query.set('dir', categoryPath);
    const suffix = query.toString();
    navigate(`/${scope === 'mine' ? 'notes' : 'shared'}${suffix ? `?${suffix}` : ''}`);
  }

  return (
    <div className="workbench">
      {scope === 'mine' ? <MinePane dir={dir} /> : <SharedPane dir={dir} shareId={shareId} />}
      <section className="editor-pane">
        {noteId ? (
          <NoteEditor
            key={noteId}
            noteId={noteId}
            onDirtyChange={setDirty}
            onDeleted={showCollection}
          />
        ) : (
          <div className="empty-state" style={{ height: '100%' }}>
            <FolderOutlined style={{ fontSize: 46, color: 'var(--accent)' }} />
            <strong>{scope === 'mine' ? '从中间的目录树选择一篇笔记' : '从中间的共享目录选择内容'}</strong>
            <span className="caption">
              {scope === 'mine'
                ? '选中目录后可以继续在该目录下新建笔记。Ctrl+K 全局搜索。'
                : '共享内容按服务端返回的权限只读或可编辑。'}
            </span>
          </div>
        )}
      </section>
    </div>
  );
}

function MinePane({ dir }: { dir: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newDir, setNewDir] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(
    () =>
      onNewNote((detail) => {
        if (detail.shareId) return;
        setNewDir(detail.dir ?? dir);
      }),
    [dir],
  );

  const create = useMutation({
    mutationFn: (input: { title: string; category_path: string }) => api.createNote(input),
    onSuccess: (note) => {
      setNewDir(null);
      void queryClient.invalidateQueries({ queryKey: ['dirs'] });
      void queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast('笔记已创建');
      if (!canNavigate()) {
        toast('笔记已创建；当前笔记尚未保存，已留在本页');
        return;
      }
      const query = new URLSearchParams();
      if (note.category_path) query.set('dir', note.category_path);
      const suffix = query.toString();
      navigate(`/notes/${note.note_id}${suffix ? `?${suffix}` : ''}`);
    },
    onError: (err) => toast(`新建失败：${errorText(err)}`, 'error'),
  });

  return (
    <section className="list-pane">
      <div className="list-head tree-head">
        <div className="row">
          <h2>目录</h2>
          <span className="sp" />
          {dir && (
            <Tooltip title={`分享「${baseName(dir)}」目录`}>
              <button type="button" className="icon-btn" aria-label="分享目录" onClick={() => setShareOpen(true)}>
                <ShareAltOutlined />
              </button>
            </Tooltip>
          )}
          <Tooltip title={dir ? `在「${baseName(dir)}」下新建笔记` : '在根目录新建笔记'}>
            <button type="button" className="btn sm primary" onClick={() => setNewDir(dir)}>
              <PlusOutlined /> 新建
            </button>
          </Tooltip>
        </div>
        {dir && (
          <div className="meta-line tree-location" title={dir}>
            <FolderOutlined />
            <b>{baseName(dir)}</b>
            {dir.includes('/') && <span>{dir}</span>}
          </div>
        )}
      </div>

      <MineTree />

      <NewNoteModal
        open={newDir !== null}
        initialDir={newDir ?? dir}
        busy={create.isPending}
        onClose={() => setNewDir(null)}
        onSubmit={(title, categoryPath) => create.mutate({ title, category_path: categoryPath })}
      />
      <ShareDrawer
        open={shareOpen}
        target={{ type: 'dir', dir, title: baseName(dir) }}
        onClose={() => setShareOpen(false)}
      />
    </section>
  );
}

function SharedPane({ dir, shareId }: { dir: string; shareId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newDir, setNewDir] = useState<string | null>(null);

  const incoming = useQuery({
    queryKey: ['shares', 'incoming', 'pane'],
    queryFn: () => api.getShares({ scope: 'incoming', page_size: 50 }),
  });

  const share = incoming.data?.items.find((item) => item.share_id === shareId) ?? null;
  const targetDir = dir || share?.target_dir || '';
  const canCreate = !!shareId && share?.level === 'edit' && share?.target_type === 'dir';

  useEffect(
    () =>
      onNewNote((detail) => {
        if (!detail.shareId) return;
        if (detail.shareId !== shareId) {
          if (!canNavigate()) return;
          const query = new URLSearchParams({ share: detail.shareId });
          if (detail.dir) query.set('dir', detail.dir);
          navigate(`/shared?${query.toString()}`);
        }
        setNewDir(detail.dir ?? '');
      }),
    [shareId, navigate],
  );

  const create = useMutation({
    mutationFn: (input: { title: string; category_path: string }) =>
      api.createNote({ ...input, share_id: shareId }),
    onSuccess: (note) => {
      setNewDir(null);
      void queryClient.invalidateQueries({ queryKey: ['dirs'] });
      void queryClient.invalidateQueries({ queryKey: ['notes'] });
      void queryClient.invalidateQueries({ queryKey: ['shares'] });
      toast('已在共享目录新建笔记');
      if (!canNavigate()) {
        toast('笔记已创建；当前笔记尚未保存，已留在本页');
        return;
      }
      const query = new URLSearchParams({ share: shareId });
      if (note.category_path) query.set('dir', note.category_path);
      navigate(`/shared/${note.note_id}?${query.toString()}`);
    },
    onError: (err) => toast(`新建失败：${errorText(err)}`, 'error'),
  });

  const title =
    share?.target_type === 'dir'
      ? baseName(targetDir) || share.owner_name
      : share
        ? '共享笔记'
        : '共享目录';

  return (
    <section className="list-pane">
      <div className="list-head tree-head">
        <div className="row">
          <h2>{title}</h2>
          <span className="sp" />
          {canCreate && (
            <Tooltip title={`在「${baseName(targetDir)}」下新建笔记`}>
              <button type="button" className="btn sm primary" onClick={() => setNewDir(targetDir)}>
                <PlusOutlined /> 新建
              </button>
            </Tooltip>
          )}
        </div>
        <div className="meta-line">
          <span>{share ? `${share.owner_name} 共享` : '同事共享给你的内容'}</span>
          {share && (
            <span className={`badge ${share.level === 'edit' ? 'ok' : 'warn'}`}>
              {share.level === 'edit' ? '可编辑' : '只读'}
            </span>
          )}
        </div>
      </div>

      <SharedTree />

      <NewNoteModal
        open={newDir !== null}
        initialDir={newDir ?? targetDir}
        busy={create.isPending}
        onClose={() => setNewDir(null)}
        onSubmit={(nextTitle, categoryPath) => create.mutate({ title: nextTitle, category_path: categoryPath })}
      />
    </section>
  );
}

export function NewNoteModal({
  open,
  initialDir,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initialDir: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (title: string, categoryPath: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [targetDir, setTargetDir] = useState(initialDir);

  useEffect(() => {
    if (open) {
      setTitle('');
      setTargetDir(initialDir);
    }
  }, [open, initialDir]);

  const disabled = !title.trim() || busy;

  return (
    <Modal
      open={open}
      title="新建笔记"
      width={480}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={disabled}
            onClick={() => onSubmit(title.trim(), targetDir.trim())}
          >
            {busy ? '创建中…' : '创建并打开'}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <label className="label" htmlFor="new-note-title">标题</label>
          <input
            id="new-note-title"
            className="field"
            value={title}
            autoFocus
            placeholder="例如：周会纪要 · 12 月第 1 周"
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !disabled) onSubmit(title.trim(), targetDir.trim());
            }}
          />
        </div>
        <div>
          <label className="label" htmlFor="new-note-dir">目标目录</label>
          <input
            id="new-note-dir"
            className="field"
            value={targetDir}
            placeholder="留空表示根目录，例如：工作/2026/Q4"
            onChange={(event) => setTargetDir(event.target.value)}
          />
          <p className="caption" style={{ marginTop: 5 }}>目录不存在时会自动创建。</p>
        </div>
      </div>
    </Modal>
  );
}
