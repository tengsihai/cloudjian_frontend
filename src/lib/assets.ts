import { api } from './api';
import { sanitizeSvg } from './markdown';
import type { Visibility } from './types';

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const MAX_IMAGE_BATCH = 50;

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

const previewCache = new Map<string, { url: string; expiresAt: number | null }>();

function extensionOf(filename: string) {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

export function imageAccept() {
  return 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml,.png,.jpg,.jpeg,.gif,.webp,.svg';
}

export function validateImageFile(file: File): { ok: true; content_type: string } | { ok: false; message: string } {
  const content_type = CONTENT_TYPES[extensionOf(file.name)] ?? file.type;
  if (!content_type || !Object.values(CONTENT_TYPES).includes(content_type)) {
    return { ok: false, message: `${file.name || '图片'} 格式不支持，仅支持 PNG、JPG、GIF、WebP、SVG` };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { ok: false, message: `${file.name || '图片'} 超过 10MB` };
  }
  return { ok: true, content_type };
}

export async function prepareImageFile(file: File): Promise<{ file: File; content_type: string }> {
  const validation = validateImageFile(file);
  if (!validation.ok) throw new Error(validation.message);
  if (validation.content_type !== 'image/svg+xml') {
    return { file, content_type: validation.content_type };
  }
  const source = await file.text();
  const clean = sanitizeSvg(source);
  if (!clean.trim() || !/<svg[\s>]/i.test(clean)) {
    throw new Error('SVG 内容无效');
  }
  return {
    file: new File([clean], file.name, { type: 'image/svg+xml' }),
    content_type: 'image/svg+xml',
  };
}

export function cacheAssetPreview(
  assetId: string,
  url: string,
  expiresAt?: number | null,
): void {
  if (!url) return;
  previewCache.set(assetId, { url, expiresAt: expiresAt ?? null });
}

export async function resolveAssetPreview(
  assetId: string,
  noteId: string,
): Promise<string | null> {
  const cached = previewCache.get(assetId);
  if (cached && (!cached.expiresAt || cached.expiresAt > Date.now() + 30_000)) {
    return cached.url;
  }
  try {
    const result = await api.getAssetUrl(assetId, noteId);
    if (!result.url) return null;
    cacheAssetPreview(assetId, result.url, result.expires_at);
    return result.url;
  } catch {
    return null;
  }
}

export async function uploadImage(
  file: File,
  input: {
    note_id: string;
    visibility: Visibility;
  },
): Promise<{ filename: string; markdown: string; asset_id: string; preview_url: string }> {
  const prepared = await prepareImageFile(file);
  const presign = await api.presignAsset({
    note_id: input.note_id,
    filename: prepared.file.name,
    content_type: prepared.content_type,
    size: prepared.file.size,
  });
  const uploaded = await api.uploadMockAsset(presign.asset_id, prepared.file);
  const registered = await api.registerAsset({
    note_id: input.note_id,
    asset_id: presign.asset_id,
    key: presign.key,
    etag: uploaded.etag,
    size: prepared.file.size,
    content_type: prepared.content_type,
    preview_url: uploaded.preview_url,
  });
  cacheAssetPreview(registered.asset_id, registered.preview_url);
  return {
    filename: prepared.file.name,
    asset_id: registered.asset_id,
    preview_url: registered.preview_url,
    markdown: `![${prepared.file.name}](asset://${registered.asset_id})`,
  };
}

export async function hydrateAssetImages(
  container: HTMLElement,
  noteId: string,
): Promise<void> {
  const images = Array.from(container.querySelectorAll<HTMLImageElement>('img[data-asset-id]'));
  await Promise.all(
    images.map(async (image) => {
      const assetId = image.dataset.assetId;
      if (!assetId || image.src.startsWith('blob:') || (image.src && !image.src.includes('data:image/gif'))) {
        return;
      }
      const url = await resolveAssetPreview(assetId, noteId);
      if (url) {
        image.src = url;
      } else {
        image.removeAttribute('src');
        image.alt = `${image.alt}（图片暂不可用）`;
      }
    }),
  );
}

export function insertImageBlocks(
  value: string,
  markdownBlocks: string[],
  start: number,
  end: number,
): { next: string; caret: number } {
  if (!markdownBlocks.length) return { next: value, caret: end };
  const prefix = value.slice(0, start);
  const suffix = value.slice(end);
  const block = markdownBlocks.join('\n\n');
  const before = prefix.endsWith('\n\n') || prefix === '' ? prefix : `${prefix}\n\n`;
  const next = `${before}${block}${suffix}`;
  const caret = before.length + block.length;
  return { next, caret };
}
