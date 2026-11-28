import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PictureOutlined, UploadOutlined } from '@ant-design/icons';
import { api } from '../../lib/api';
import {
  MAX_IMAGE_BATCH,
  imageAccept,
  resolveAssetPreview,
  uploadImage,
} from '../../lib/assets';
import { formatBytes, formatDateTime } from '../../lib/format';
import type { AssetItem, Visibility } from '../../lib/types';
import { errorText, useToast } from '../../app/ToastContext';
import { Drawer } from '../../components/Overlays';

export function ImageDrawer({
  open,
  noteId,
  canEdit,
  isOwner,
  visibility,
  onInsert,
  onClose,
}: {
  open: boolean;
  noteId: string;
  canEdit: boolean;
  isOwner: boolean;
  visibility: Visibility;
  onInsert: (markdown: string) => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [dragging, setDragging] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const assetQuery = useQuery({
    queryKey: ['assets', noteId],
    queryFn: () => api.listAssets({ note_id: noteId, page: 1, page_size: 50 }),
    enabled: open,
  });

  useEffect(() => {
    if (!open || !assetQuery.data) return undefined;
    let active = true;
    void Promise.all(
      assetQuery.data.items.map(async (item) => {
        const url = await resolveAssetPreview(item.asset_id, noteId);
        return { id: item.asset_id, url };
      }),
    ).then((entries) => {
      if (!active) return;
      setUrls((current) => {
        const next = { ...current };
        for (const entry of entries) {
          if (entry.url) next[entry.id] = entry.url;
        }
        return next;
      });
    });
    return () => {
      active = false;
    };
  }, [open, noteId, assetQuery.data]);

  async function uploadFiles(fileList: FileList | File[]) {
    if (!canEdit || uploading) return;
    const files = Array.from(fileList);
    if (!files.length) return;
    if (files.length > MAX_IMAGE_BATCH) {
      toast(`一次最多上传 ${MAX_IMAGE_BATCH} 张图片`, 'error');
      return;
    }
    setUploading(true);
    setProgress({ done: 0, total: files.length });
    const uploaded: string[] = [];
    const failures: string[] = [];
    for (const file of files) {
      try {
        const result = await uploadImage(file, { note_id: noteId, visibility });
        uploaded.push(result.markdown);
        setUrls((current) => ({ ...current, [result.asset_id]: result.preview_url }));
      } catch (err) {
        failures.push(errorText(err));
      } finally {
        setProgress((current) => ({ ...current, done: current.done + 1 }));
      }
    }
    setUploading(false);
    if (uploaded.length) {
      onInsert(uploaded.join('\n\n'));
      await queryClient.invalidateQueries({ queryKey: ['assets', noteId] });
      toast(`已上传并插入 ${uploaded.length} 张图片`);
    }
    if (failures.length) toast(failures[0], 'error');
  }

  async function removeAsset(item: AssetItem) {
    if (!isOwner || item.ref_count > 0) return;
    try {
      await api.deleteAsset(item.asset_id);
      await queryClient.invalidateQueries({ queryKey: ['assets', noteId] });
      toast('图片已删除');
    } catch (err) {
      toast(`删除失败：${errorText(err)}`, 'error');
    }
  }

  const items = assetQuery.data?.items ?? [];

  return (
    <Drawer
      open={open}
      size="wide"
      title={
        <span>
          <PictureOutlined /> 图片
        </span>
      }
      onClose={onClose}
    >
      <p className="caption" style={{ marginBottom: 10 }}>
        图片可见性随笔记：{visibility === 'public' ? '公开' : '私有'} · 单张最大 10MB · 支持 PNG / JPG / GIF / WebP / SVG
      </p>

      {canEdit ? (
        <div
          className={`asset-drop${dragging ? ' dragging' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void uploadFiles(event.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
          }}
        >
          <UploadOutlined />
          <strong>{uploading ? `上传中 ${progress.done}/${progress.total}` : '选择或拖拽图片到这里'}</strong>
          <span className="caption">支持多选，上传后自动插入正文</span>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            accept={imageAccept()}
            onChange={(event) => {
              const files = event.target.files;
              if (files) void uploadFiles(files);
              event.target.value = '';
            }}
          />
        </div>
      ) : (
        <div className="banner" style={{ marginBottom: 12 }}>
          只读共享不能上传图片，可以查看当前笔记引用的图片。
        </div>
      )}

      <div className="editor-meta" style={{ marginTop: 14 }}>
        <span>当前笔记图片 {items.length} 张</span>
        <span className="sp" />
        <span className="caption">引用数按笔记去重</span>
      </div>

      {assetQuery.isLoading ? (
        <div className="skeleton" style={{ height: 100, marginTop: 12 }} />
      ) : items.length ? (
        <div className="asset-list">
          {items.map((item) => (
            <div className="asset-row" key={item.asset_id}>
              <div className="asset-thumb">
                {urls[item.asset_id] ? (
                  <img src={urls[item.asset_id]} alt={item.filename} />
                ) : (
                  <PictureOutlined />
                )}
              </div>
              <div className="asset-info">
                <strong title={item.filename}>{item.filename}</strong>
                <span className="caption">
                  {formatBytes(item.size)} · {formatDateTime(item.created_at)} · {item.visibility === 'public' ? '公开' : '私有'} · 被 {item.ref_count} 篇引用，其中 {item.public_ref_count} 篇公开
                </span>
              </div>
              <span className="sp" />
              <button
                type="button"
                className="btn sm text"
                disabled={!canEdit}
                onClick={() => onInsert(`![${item.filename}](asset://${item.asset_id})`)}
              >
                插入
              </button>
              {isOwner && (
                <button
                  type="button"
                  className="btn sm text"
                  disabled={item.ref_count > 0}
                  title={item.ref_count > 0 ? '仍被引用的图片不能删除' : '删除未引用图片'}
                  onClick={() => void removeAsset(item)}
                >
                  删除
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <PictureOutlined style={{ fontSize: 36, color: 'var(--accent)' }} />
          <strong>当前笔记还没有图片</strong>
          <span className="caption">选择或拖拽 PNG、JPG、GIF、WebP、SVG 上传</span>
        </div>
      )}
    </Drawer>
  );
}
