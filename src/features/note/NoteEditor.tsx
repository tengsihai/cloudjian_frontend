import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dropdown, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import {
  CloudDownloadOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  GlobalOutlined,
  HistoryOutlined,
  LockOutlined,
  MoreOutlined,
  PictureOutlined,
  SaveOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { api } from '../../lib/api';
import { ApiError } from '../../lib/errors';
import { MAX_IMAGE_BATCH, hydrateAssetImages, insertImageBlocks, uploadImage } from '../../lib/assets';
import { formatDateTime } from '../../lib/format';
import { renderMarkdown } from '../../lib/markdown';
import { sharedLocation } from '../../lib/paths';
import type { EditorMode, NoteDetail } from '../../lib/types';
import { usePreferences } from '../../app/PreferencesContext';
import { useTaskCenter } from '../../app/TaskCenter';
import { errorText, useToast } from '../../app/ToastContext';
import { ConfirmDialog } from '../../components/Overlays';
import { ConflictPanel } from './ConflictPanel';
import { ShareDrawer } from './ShareDrawer';
import { VersionDrawer } from './VersionDrawer';
import { ImageDrawer } from './ImageDrawer';

type ViewMode = 'edit' | 'split' | 'preview';
type LoadedNote = NoteDetail & { etag: string };

interface DraftPayload {
  etag: string | null;
  title: string;
  content: string;
  tags: string[];
  at: number;
}

export function NoteEditor({
  noteId,
  onDirtyChange,
  onDeleted,
}: {
  noteId: string;
  onDirtyChange?: (dirty: boolean) => void;
  onDeleted?: (categoryPath: string) => void;
}) {
  const queryClient = useQueryClient();
  const { profile, uiLang } = usePreferences();
  const { track } = useTaskCenter();
  const { toast } = useToast();
  const draftKey = `cloudjian.draft.${noteId}`;
  const previewRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [etag, setEtag] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState(0);
  const [version, setVersion] = useState(1);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>('split');
  const [tagInput, setTagInput] = useState('');
  const [conflict, setConflict] = useState<LoadedNote | null>(null);
  const [draft, setDraft] = useState<DraftPayload | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const noteQuery = useQuery({
    queryKey: ['note', noteId],
    queryFn: () => api.getNote(noteId),
    retry: false,
  });

  useEffect(() => {
    const data = noteQuery.data;
    if (!data || loaded) return;
    setTitle(data.title);
    setContent(data.content);
    setTags(data.tags);
    setEtag(data.etag);
    setUpdatedAt(data.updated_at);
    setVersion(data.version);
    setMode(initialMode(profile.editor_mode));
    setLoaded(true);
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw) as DraftPayload;
        if (parsed.content && parsed.content !== data.content) setDraft(parsed);
        else localStorage.removeItem(draftKey);
      }
    } catch {
      localStorage.removeItem(draftKey);
    }
  }, [noteQuery.data, loaded, draftKey, profile.editor_mode]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!dirty || !loaded) return undefined;
    const id = window.setTimeout(() => {
      const payload: DraftPayload = { etag, title, content, tags, at: Date.now() };
      const raw = JSON.stringify(payload);
      if (new Blob([raw]).size <= 256 * 1024) localStorage.setItem(draftKey, raw);
      else localStorage.removeItem(draftKey);
    }, 5000);
    return () => window.clearTimeout(id);
  }, [dirty, loaded, etag, title, content, tags, draftKey]);

  const note = noteQuery.data;
  const canEdit = note?.level !== 'read';
  const isOwner = note?.level === 'owner';

  useEffect(() => {
    if (!previewRef.current) return undefined;
    const id = window.setTimeout(() => {
      if (previewRef.current) void hydrateAssetImages(previewRef.current, noteId);
    }, 0);
    return () => window.clearTimeout(id);
  }, [content, mode, noteId, canEdit]);

  async function refetchServer() {
    const fresh = await api.getNote(noteId);
    setConflict(fresh);
  }

  async function commit(input: {
    title: string;
    content: string;
    tags: string[];
    etag: string;
  }): Promise<boolean> {
    setSaving(true);
    setSaveError(null);
    try {
      const result = await api.saveNote(noteId, input);
      setEtag(result.etag);
      setUpdatedAt(result.updated_at);
      setVersion(result.version);
      setTitle(input.title);
      setContent(input.content);
      setTags(input.tags);
      setDirty(false);
      setDraft(null);
      localStorage.removeItem(draftKey);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['notes'] }),
        queryClient.invalidateQueries({ queryKey: ['dirs'] }),
        queryClient.invalidateQueries({ queryKey: ['versions', noteId] }),
      ]);
      toast('已保存');
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 412) {
        await refetchServer();
        return false;
      }
      setSaveError(errorText(err));
      toast(`保存失败：${errorText(err)}`, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveNow() {
    if (!etag || !canEdit || saving || !dirty) return;
    await commit({ title, content, tags, etag });
  }

  const saveRef = useRef(saveNow);
  saveRef.current = saveNow;

  useEffect(() => {
    const handler = () => {
      void saveRef.current();
    };
    window.addEventListener('cloudjian:save', handler);
    return () => window.removeEventListener('cloudjian:save', handler);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function applyMerged(merged: string) {
    if (!conflict) return;
    const ok = await commit({ title, content: merged, tags, etag: conflict.etag });
    if (ok) setConflict(null);
  }

  async function overwriteServer() {
    if (!conflict) return;
    const ok = await commit({ title, content, tags, etag: conflict.etag });
    if (ok) setConflict(null);
  }

  function discardMine() {
    if (!conflict) return;
    setTitle(conflict.title);
    setContent(conflict.content);
    setTags(conflict.tags);
    setEtag(conflict.etag);
    setDirty(false);
    setSaveError(null);
    setConflict(null);
    setDraft(null);
    localStorage.removeItem(draftKey);
  }

  function addTag(raw: string) {
    const value = raw.trim().replace(/[,.，。]$/, '');
    if (!value) return;
    if (value.length > 24) {
      toast('单个标签不能超过 24 个字符', 'error');
      return;
    }
    if (tags.includes(value)) {
      toast('标签已存在', 'error');
      return;
    }
    if (tags.length >= 20) {
      toast('单篇笔记最多 20 个标签', 'error');
      return;
    }
    setTags((prev) => [...prev, value]);
    setDirty(true);
  }

  function insertImages(markdown: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? content.length;
    const end = textarea?.selectionEnd ?? start;
    const result = insertImageBlocks(content, markdown.split('\n\n'), start, end);
    setContent(result.next);
    setDirty(true);
    setImageOpen(false);
    window.requestAnimationFrame(() => {
      const target = textareaRef.current;
      if (!target) return;
      target.focus();
      target.setSelectionRange(result.caret, result.caret);
    });
  }

  async function uploadDroppedImages(files: File[]) {
    if (!canEdit || !files.length) return;
    if (files.length > MAX_IMAGE_BATCH) {
      toast(`一次最多上传 ${MAX_IMAGE_BATCH} 张图片`, 'error');
      return;
    }
    const blocks: string[] = [];
    const failures: string[] = [];
    for (const file of files) {
      try {
        const result = await uploadImage(file, { note_id: noteId, visibility: note?.visibility ?? 'private' });
        blocks.push(result.markdown);
      } catch (err) {
        failures.push(errorText(err));
      }
    }
    if (blocks.length) {
      insertImages(blocks.join('\n\n'));
      toast(`已插入 ${blocks.length} 张图片`);
    }
    if (failures.length) toast(failures[0], 'error');
  }

  async function toggleVisibility() {
    if (!note || !isOwner) return;
    const next = note.visibility === 'public' ? 'private' : 'public';
    try {
      const { job_id } = await api.setVisibility(noteId, next);
      track(job_id, next === 'public' ? '正在迁移图片可见性…' : '正在撤回公开链接…', () => {
        void queryClient.invalidateQueries({ queryKey: ['note', noteId] });
        void queryClient.invalidateQueries({ queryKey: ['notes'] });
      });
      toast(next === 'public' ? '已开始设为公开' : '已开始设为私有');
    } catch (err) {
      toast(`操作失败：${errorText(err)}`, 'error');
    }
  }

  async function deleteNote() {
    setDeleting(true);
    try {
      await api.deleteNote(noteId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['note', noteId] }),
        queryClient.invalidateQueries({ queryKey: ['notes'] }),
        queryClient.invalidateQueries({ queryKey: ['dirs'] }),
        queryClient.invalidateQueries({ queryKey: ['trash'] }),
      ]);
      toast('笔记已移入回收站');
      setConfirmDelete(false);
      onDeleted?.(note?.category_path ?? '');
    } catch (err) {
      toast(`删除失败：${errorText(err)}`, 'error');
    } finally {
      setDeleting(false);
    }
  }

  function exportMarkdown() {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(title || '未命名笔记').replace(/[\\/:*?"<>|]/g, '-')}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const moreMenu: MenuProps = {
    items: [
      ...(isOwner
        ? [{ key: 'export', icon: <CloudDownloadOutlined />, label: '导出 Markdown' }]
        : []),
      { key: 'image', icon: <PictureOutlined />, label: '图片' },
    ],
    onClick: ({ key }) => {
      if (key === 'export') exportMarkdown();
      if (key === 'image') setImageOpen(true);
    },
  };

  if (noteQuery.isLoading) {
    return (
      <div className="editor-scroll">
        <div className="editor-inner">
          <div className="skeleton" style={{ width: '62%', height: 30 }} />
          <div className="skeleton" style={{ width: '38%', marginTop: 14 }} />
          <div className="skeleton" style={{ width: '100%', height: 260, marginTop: 30 }} />
        </div>
      </div>
    );
  }

  if (noteQuery.isError || !note) {
    return (
      <div className="empty-state" style={{ height: '100%' }}>
        <strong>无法打开这篇笔记</strong>
        <span className="caption">{errorText(noteQuery.error)}</span>
      </div>
    );
  }

  const locationText = isOwner
    ? note.category_path || '未分类'
    : sharedLocation(note.relative_path, note.share_root_name);
  const showEdit = mode !== 'preview' && canEdit;
  const showPreview = mode !== 'edit' || !canEdit;
  const saveState = saving ? '保存中…' : saveError ? '保存失败' : dirty ? '有未保存修改' : '已保存';
  const saveClass = saving ? '' : saveError ? 'dirty' : dirty ? 'dirty' : 'saved';

  return (
    <>
      <div className="editor-scroll">
        <div className="editor-inner">
          {draft && (
            <div className="draft-bar" style={{ marginBottom: 12 }}>
              <span>
                检测到 {formatDateTime(draft.at, uiLang)} 的本地草稿
                {draft.etag && draft.etag !== etag ? '（服务端版本已变化，保存时会进入冲突处理）' : ''}
              </span>
              <span className="sp" />
              <button
                type="button"
                className="btn sm"
                onClick={() => {
                  setTitle(draft.title);
                  setContent(draft.content);
                  setTags(draft.tags);
                  setDirty(true);
                  setDraft(null);
                }}
              >
                恢复
              </button>
              <button
                type="button"
                className="btn sm text"
                onClick={() => {
                  localStorage.removeItem(draftKey);
                  setDraft(null);
                }}
              >
                丢弃
              </button>
            </div>
          )}

          <input
            className="editor-title"
            value={title}
            readOnly={!canEdit}
            placeholder="未命名笔记"
            onChange={(event) => {
              setTitle(event.target.value);
              setDirty(true);
            }}
          />

          <div className="editor-meta">
            <span className="chip">
              <FileTextOutlined /> {locationText}
            </span>
            {note.level === 'owner' && (
              <span className={`badge ${note.visibility === 'public' ? 'info' : 'neutral'}`}>
                {note.visibility === 'public' ? '公开' : '私有'}
              </span>
            )}
            {note.level === 'read' && <span className="badge warn">只读</span>}
            {note.level === 'edit' && <span className="badge ok">可编辑</span>}
            <span>更新于 {formatDateTime(updatedAt, uiLang)}</span>
            <span>v{version}</span>
          </div>

          <div className="editor-meta" style={{ marginTop: -6 }}>
            {tags.map((tag) => (
              <span className="chip" key={tag}>
                {tag}
                {canEdit && (
                  <button
                    type="button"
                    aria-label={`删除标签 ${tag}`}
                    style={{ color: 'var(--ink-3)' }}
                    onClick={() => {
                      setTags((prev) => prev.filter((entry) => entry !== tag));
                      setDirty(true);
                    }}
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
            {canEdit && (
              <input
                className="field"
                style={{ width: 150, minHeight: 28, padding: '2px 8px', fontSize: 12.5 }}
                placeholder="添加标签，回车确认"
                value={tagInput}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value.endsWith(',') || value.endsWith('，')) {
                    addTag(value);
                    setTagInput('');
                  } else {
                    setTagInput(value);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addTag(tagInput);
                    setTagInput('');
                  }
                  if (event.key === 'Backspace' && !tagInput && tags.length > 0) {
                    setTags((prev) => prev.slice(0, -1));
                    setDirty(true);
                  }
                }}
              />
            )}
          </div>

          {saveError && (
            <div className="banner error" style={{ margin: '12px 0', borderRadius: 'var(--r-sm)', border: 0 }}>
              {saveError}
            </div>
          )}

          <div className="editor-toolbar" style={{ marginTop: 14 }}>
            {canEdit ? (
              <div className="seg">
                <button type="button" className={mode === 'edit' ? 'on' : ''} onClick={() => setMode('edit')}>
                  <EditOutlined /> 编辑
                </button>
                <button type="button" className={mode === 'split' ? 'on' : ''} onClick={() => setMode('split')}>
                  分屏
                </button>
                <button type="button" className={mode === 'preview' ? 'on' : ''} onClick={() => setMode('preview')}>
                  <EyeOutlined /> 预览
                </button>
              </div>
            ) : (
              <span className="badge warn">只读共享 · 仅可阅读</span>
            )}
            <span className="sp" />
            <span className={`save-state ${saveClass}`}>{saveState}</span>
            {canEdit && (
              <button type="button" className="btn sm primary" onClick={() => void saveNow()} disabled={saving || !dirty}>
                <SaveOutlined /> 保存
                <span className="kbd" style={{ borderColor: 'rgba(255,255,255,.35)', color: 'inherit' }}>
                  Ctrl S
                </span>
              </button>
            )}
            <Tooltip title="版本历史">
              <button type="button" className="icon-btn" aria-label="版本历史" onClick={() => setVersionOpen(true)}>
                <HistoryOutlined />
              </button>
            </Tooltip>
            {isOwner && (
              <Tooltip title="分享">
                <button type="button" className="icon-btn" aria-label="分享" onClick={() => setShareOpen(true)}>
                  <ShareAltOutlined />
                </button>
              </Tooltip>
            )}
            <Tooltip title={isOwner ? '导出与图片' : '共享内容不可导出'}>
              <span>
                <Dropdown menu={moreMenu} trigger={['click']} placement="bottomRight">
                  <button type="button" className="icon-btn" aria-label="更多操作">
                    <MoreOutlined />
                  </button>
                </Dropdown>
              </span>
            </Tooltip>
            {isOwner && (
              <>
                <Tooltip title={note.visibility === 'public' ? '设为私有' : '设为公开'}>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={note.visibility === 'public' ? '设为私有' : '设为公开'}
                    onClick={() => void toggleVisibility()}
                  >
                    {note.visibility === 'public' ? <GlobalOutlined /> : <LockOutlined />}
                  </button>
                </Tooltip>
                <Tooltip title="删除（移入回收站）">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="删除笔记"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <DeleteOutlined />
                  </button>
                </Tooltip>
              </>
            )}
          </div>

          <div
            className={`editor-body${showEdit && showPreview ? ' split' : ''}`}
            onDragOver={(event) => {
              if (canEdit && event.dataTransfer.types.includes('Files')) event.preventDefault();
            }}
            onDrop={(event) => {
              if (!canEdit || !event.dataTransfer.files.length) return;
              event.preventDefault();
              void uploadDroppedImages(Array.from(event.dataTransfer.files));
            }}
          >
            {showEdit && (
              <textarea
                ref={textareaRef}
                className="md-input"
                value={content}
                spellCheck={false}
                placeholder="开始写点什么，支持 Markdown…"
                onChange={(event) => {
                  setContent(event.target.value);
                  setDirty(true);
                }}
              />
            )}
            {showPreview && (
              <div
                ref={previewRef}
                className="md-preview"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(content || '_还没有内容_'),
                }}
              />
            )}
          </div>

          <div className="editor-actions">
            <span className="caption">
              {canEdit
                ? '输入停止 5 秒后写入本地草稿，上限 256KB；支持内联 SVG 与 svg 代码块，草稿不会上传到服务器。'
                : '共享为只读，服务端会拒绝任何写操作。'}
            </span>
          </div>
        </div>
      </div>

      <ConflictPanel
        open={!!conflict}
        server={conflict}
        mine={{ title, content }}
        busy={saving}
        onApply={(merged) => void applyMerged(merged)}
        onOverwrite={() => void overwriteServer()}
        onDiscard={discardMine}
      />

      <ShareDrawer
        open={shareOpen}
        target={{ type: 'note', noteId, title: title || note.title }}
        onClose={() => setShareOpen(false)}
      />

      <VersionDrawer
        open={versionOpen}
        noteId={noteId}
        canEdit={canEdit}
        isOwner={isOwner}
        currentContent={content}
        onRestored={(nextContent, nextEtag) => {
          setContent(nextContent);
          setEtag(nextEtag);
          setVersion((prev) => prev + 1);
          setDirty(false);
          setDraft(null);
          localStorage.removeItem(draftKey);
        }}
        onClose={() => setVersionOpen(false)}
      />

      <ImageDrawer
        open={imageOpen}
        noteId={noteId}
        canEdit={canEdit}
        isOwner={isOwner}
        visibility={note.visibility}
        onInsert={insertImages}
        onClose={() => setImageOpen(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="删除笔记"
        body={`「${title || '未命名笔记'}」会移入回收站，30 天后自动清理。共享给其他成员的内容也会同步失效。`}
        confirmText="删除"
        busy={deleting}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void deleteNote()}
      />
    </>
  );
}

function initialMode(mode: EditorMode): ViewMode {
  if (mode === 'sv') return 'edit';
  return 'split';
}
