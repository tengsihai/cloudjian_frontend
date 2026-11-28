import { request } from './http';
import type {
  AdminUser,
  AssetItem,
  DirItem,
  Job,
  NoteDetail,
  NotePage,
  NoteSummary,
  Profile,
  PublicNote,
  SearchHit,
  ShareCandidate,
  ShareItem,
  TeamConfig,
  TrashPage,
  VersionDetail,
  VersionItem,
  Visibility,
} from './types';

interface PresignResult {
  upload_url: string;
  method: 'PUT';
  headers: Record<string, string>;
  key: string;
  asset_id: string;
  expires_in: number;
  asset_visibility: Visibility;
}

const pendingUploads = new Map<string, PresignResult>();

function asSummary(detail: NoteDetail): NoteSummary {
  return {
    note_id: detail.note_id,
    title: detail.title,
    slug: detail.slug,
    category_path: detail.category_path,
    relative_path: detail.relative_path,
    share_root_name: detail.share_root_name,
    share_id: detail.share_id,
    level: detail.level,
    tags: detail.tags,
    updated_at: detail.updated_at,
    version: detail.version,
    visibility: detail.visibility,
    own_share: detail.own_share,
  };
}

async function findAdminUser(userUuid: string): Promise<AdminUser | null> {
  const page = await request<{ items: AdminUser[] }>('GET', '/admin/users', {
    query: { page: 1, page_size: 100 },
  });
  return page.data.items.find((user) => user.user_uuid === userUuid) ?? null;
}

export const realApi = {
  reset() {
    // 真实接口没有本地数据可重置
  },

  async getProfile(): Promise<Profile> {
    const res = await request<Profile>('GET', '/profile');
    return res.data;
  },

  async updateProfile(patch: Partial<Profile>): Promise<Profile> {
    const res = await request<Profile>('PUT', '/profile', { body: patch });
    return res.data;
  },

  async getDirs(params: {
    scope?: 'mine' | 'shared';
    share_id?: string;
    path?: string;
    depth?: number;
  }): Promise<{ items: DirItem[] }> {
    const res = await request<{ items: DirItem[] }>('GET', '/dirs', {
      query: {
        scope: params.scope ?? 'mine',
        share_id: params.share_id,
        path: params.path,
        depth: params.depth,
      },
    });
    return { items: res.data.items };
  },

  async createDir(input: { path: string; name: string }): Promise<{ path: string }> {
    const res = await request<{ path: string }>('POST', '/dirs', {
      body: { path: input.path, name: input.name },
    });
    return res.data;
  },

  async getNotes(params: {
    category_path?: string;
    all?: boolean;
    sort?: 'updated' | 'created' | 'title';
    tag?: string;
    page?: number;
    page_size?: number;
  }): Promise<NotePage> {
    const res = await request<{
      items: Array<Omit<NoteSummary, 'relative_path' | 'share_root_name' | 'share_id' | 'level'>>;
      page: number;
      page_size: number;
      has_more: boolean;
    }>('GET', '/notes', {
      query: {
        category_path: params.all ? undefined : (params.category_path ?? ''),
        sort: params.sort,
        tag: params.tag,
        page: params.page,
        page_size: params.page_size,
      },
    });
    return {
      ...res.data,
      items: res.data.items.map((item) => ({
        ...item,
        relative_path: item.category_path,
        share_root_name: null,
        share_id: null,
        level: 'owner' as const,
      })),
    };
  },

  async getNote(noteId: string): Promise<NoteDetail & { etag: string }> {
    const res = await request<NoteDetail>('GET', `/notes/${encodeURIComponent(noteId)}`, {
      query: { include: 'content' },
    });
    return { ...res.data, etag: res.etag ?? '' };
  },

  async createNote(input: {
    title?: string;
    category_path: string;
    share_id?: string | null;
    content?: string;
    tags?: string[];
  }): Promise<NoteSummary & { share_id: string | null }> {
    const created = await request<{ note_id: string; share_id: string | null }>('POST', '/notes', {
      body: {
        title: input.title,
        category_path: input.category_path,
        share_id: input.share_id ?? null,
        content: input.content ?? '',
        tags: input.tags ?? [],
      },
    });
    const detail = await this.getNote(created.data.note_id);
    return { ...asSummary(detail), share_id: created.data.share_id };
  },

  async saveNote(
    noteId: string,
    input: { title?: string; content: string; tags?: string[]; etag: string },
  ): Promise<{ etag: string; version: number; updated_at: number }> {
    const res = await request<{ note_id: string; version: number; updated_at: number }>(
      'PUT',
      `/notes/${encodeURIComponent(noteId)}`,
      {
        headers: { 'If-Match': input.etag },
        body: { title: input.title, content: input.content, tags: input.tags },
      },
    );
    return { etag: res.etag ?? '', version: res.data.version, updated_at: res.data.updated_at };
  },

  async deleteNote(noteId: string): Promise<void> {
    await request<null>('DELETE', `/notes/${encodeURIComponent(noteId)}`);
  },

  async setVisibility(noteId: string, visibility: Visibility): Promise<{ job_id: string }> {
    const res = await request<{ job_id: string }>(
      'POST',
      `/notes/${encodeURIComponent(noteId)}/visibility`,
      { body: { visibility } },
    );
    return res.data;
  },

  async getShares(params: {
    scope?: 'incoming' | 'outgoing';
    target_type?: 'note' | 'dir';
    target_note_id?: string;
    target_dir?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ items: ShareItem[]; page: number; page_size: number; has_more: boolean }> {
    const res = await request<{
      items: ShareItem[];
      page: number;
      page_size: number;
      has_more: boolean;
    }>('GET', '/shares', {
      query: {
        scope: params.scope ?? 'incoming',
        target_type: params.target_type,
        target_note_id: params.target_note_id,
        target_dir: params.target_dir,
        page: params.page,
        page_size: params.page_size,
      },
    });
    return res.data;
  },

  async getShareCandidates(
    q: string,
  ): Promise<{ items: ShareCandidate[]; page: number; page_size: number; has_more: boolean }> {
    const res = await request<{
      items: ShareCandidate[];
      page: number;
      page_size: number;
      has_more: boolean;
    }>('GET', '/share-candidates', { query: { q, page: 1, page_size: 50 } });
    return res.data;
  },

  async createShare(input: {
    target_type: 'note' | 'dir';
    target_note_id?: string;
    target_dir?: string;
    grantee: string;
    level: 'read' | 'edit';
  }): Promise<{ share_id: string }> {
    const res = await request<{ share_id: string }>('POST', '/shares', { body: input });
    return res.data;
  },

  async revokeShare(shareId: string): Promise<void> {
    await request<null>('DELETE', `/shares/${encodeURIComponent(shareId)}`);
  },

  async search(q: string): Promise<{ items: SearchHit[]; has_more: boolean; total_hint: number }> {
    const res = await request<{
      items: SearchHit[];
      has_more: boolean;
      total_hint?: number;
    }>('GET', '/search', { query: { q, page: 1, page_size: 20 } });
    return {
      items: res.data.items,
      has_more: res.data.has_more,
      total_hint: res.data.total_hint ?? res.data.items.length,
    };
  },

  async getVersions(noteId: string): Promise<{ items: VersionItem[] }> {
    const res = await request<{ items: VersionItem[] }>(
      'GET',
      `/notes/${encodeURIComponent(noteId)}/versions`,
      { query: { page: 1, page_size: 50 } },
    );
    return {
      items: res.data.items.map((item) => ({ ...item, created_at: item.created_at ?? item.ts })),
    };
  },

  async getVersion(noteId: string, ts: number): Promise<VersionDetail> {
    const res = await request<{ ts: number; content: string }>(
      'GET',
      `/notes/${encodeURIComponent(noteId)}/versions/${ts}`,
    );
    return { ts: res.data.ts, content: res.data.content, size: 0 };
  },

  async rollbackVersion(noteId: string, ts: number): Promise<{ version: number; etag: string }> {
    const note = await this.getNote(noteId);
    const res = await request<{ note_id: string; version: number; restored_from: number }>(
      'POST',
      `/notes/${encodeURIComponent(noteId)}/versions/${ts}/restore`,
      { body: { base_version: note.version } },
    );
    return { version: res.data.version, etag: res.etag ?? '' };
  },

  async deleteVersion(noteId: string, ts: number): Promise<void> {
    await request<null>('DELETE', `/notes/${encodeURIComponent(noteId)}/versions/${ts}`);
  },

  async getTrash(): Promise<TrashPage> {
    const res = await request<TrashPage>('GET', '/trash', { query: { depth: 8 } });
    return res.data;
  },

  async restoreTrash(input: { note_id?: string; path?: string }): Promise<{ job_id: string }> {
    const res = await request<{ job_id: string }>('POST', '/dirs/restore', {
      body: input.note_id
        ? { scope: 'note', note_id: input.note_id }
        : { scope: 'dir', category_path: input.path ?? '' },
    });
    return res.data;
  },

  async purgeTrash(input: {
    scope: 'note' | 'notes' | 'dir' | 'all';
    note_id?: string;
    path?: string;
    note_ids?: string[];
  }): Promise<{ job_id: string }> {
    const body: Record<string, unknown> = { scope: input.scope };
    if (input.scope === 'note') body.note_ids = input.note_id ? [input.note_id] : [];
    if (input.scope === 'notes') {
      body.note_ids = input.note_ids ?? [];
      body.ack = true;
    }
    if (input.scope === 'dir') body.category_path = input.path ?? '';
    if (input.scope === 'all') body.confirm = 'EMPTY_ALL';
    const res = await request<{ job_id: string }>('POST', '/trash/purge', { body });
    return res.data;
  },

  async getAdminUsers(params: {
    q?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ items: AdminUser[]; page: number; page_size: number; has_more: boolean }> {
    const res = await request<{
      items: AdminUser[];
      page: number;
      page_size: number;
      has_more: boolean;
    }>('GET', '/admin/users', {
      query: { q: params.q, status: params.status, page: params.page, page_size: params.page_size },
    });
    return {
      ...res.data,
      items: res.data.items.map((user) => ({ ...user, email: user.email ?? null })),
    };
  },

  async createUser(input: {
    username: string;
    initial_password: string;
    email?: string;
    role: 'admin' | 'user';
  }): Promise<AdminUser> {
    const res = await request<{ user_uuid: string; status: AdminUser['status'] }>(
      'POST',
      '/admin/users',
      { body: input },
    );
    return {
      user_uuid: res.data.user_uuid,
      username: input.username,
      email: input.email ?? null,
      role: input.role,
      status: res.data.status,
      created_at: Date.now(),
      last_login_at: null,
    };
  },

  async updateUser(
    userUuid: string,
    patch: { status?: 'active' | 'disabled'; role?: 'admin' | 'user' },
  ): Promise<AdminUser> {
    const res = await request<{ user_uuid: string; status: AdminUser['status']; role: AdminUser['role'] }>(
      'PATCH',
      `/admin/users/${encodeURIComponent(userUuid)}`,
      { body: patch },
    );
    const existing = await findAdminUser(userUuid);
    return {
      user_uuid: res.data.user_uuid,
      username: existing?.username ?? '',
      email: existing?.email ?? null,
      role: res.data.role,
      status: res.data.status,
      created_at: existing?.created_at ?? 0,
      last_login_at: existing?.last_login_at ?? null,
    };
  },

  async deleteUser(userUuid: string, username?: string): Promise<{ job_id: string }> {
    const target = username ?? (await findAdminUser(userUuid))?.username;
    if (!target) throw new Error('用户不存在');
    const res = await request<{ job_id: string; user_uuid: string }>(
      'DELETE',
      `/admin/users/${encodeURIComponent(userUuid)}`,
      { body: { confirm: target } },
    );
    return { job_id: res.data.job_id };
  },

  async resetPassword(userUuid: string, password?: string): Promise<{ new_password: string | null }> {
    const res = await request<{ user_uuid: string; new_password: string | null }>(
      'POST',
      `/admin/users/${encodeURIComponent(userUuid)}/reset`,
      { body: password ? { new_password: password } : {} },
    );
    return { new_password: res.data.new_password };
  },

  async changePassword(previous: string, proposed: string): Promise<void> {
    await request<{ password_changed_at: number }>('POST', '/profile/password', {
      body: { previous_password: previous, proposed_password: proposed },
    });
  },

  async getTeamConfig(): Promise<TeamConfig> {
    const res = await request<TeamConfig>('GET', '/admin/team-config');
    return res.data;
  },

  async updateTeamConfig(patch: Partial<TeamConfig>): Promise<TeamConfig> {
    const current = await this.getTeamConfig();
    const res = await request<TeamConfig>('PUT', '/admin/team-config', {
      body: {
        default_note_visibility: patch.default_note_visibility ?? current.default_note_visibility,
        force_private: patch.force_private ?? current.force_private,
      },
    });
    return res.data;
  },

  async presignAsset(input: {
    note_id: string;
    filename: string;
    content_type: string;
    size: number;
  }): Promise<PresignResult> {
    const res = await request<PresignResult>('POST', '/assets/presign', { body: input });
    pendingUploads.set(res.data.asset_id, res.data);
    return res.data;
  },

  async uploadMockAsset(assetId: string, file: Blob): Promise<{ preview_url: string; etag: string }> {
    const presign = pendingUploads.get(assetId);
    if (!presign) throw new Error('上传地址已失效，请重试');
    const res = await fetch(presign.upload_url, {
      method: presign.method,
      headers: presign.headers,
      body: file,
    });
    if (!res.ok) throw new Error(`图片上传失败（${res.status}）`);
    return {
      preview_url: URL.createObjectURL(file),
      etag: (res.headers.get('etag') ?? '').replace(/"/g, ''),
    };
  },

  async registerAsset(input: {
    note_id: string;
    asset_id: string;
    key: string;
    etag: string;
    size: number;
    content_type: string;
    preview_url: string;
  }): Promise<{ asset_id: string; url: string; visibility: Visibility; preview_url: string }> {
    const res = await request<{
      asset_id: string;
      url: string;
      visibility: Visibility;
      preview_url: string;
    }>('POST', '/assets/register', {
      body: {
        note_id: input.note_id,
        asset_id: input.asset_id,
        key: input.key,
        etag: input.etag,
        size: input.size,
        content_type: input.content_type,
      },
    });
    pendingUploads.delete(input.asset_id);
    return res.data;
  },

  async getAssetUrl(
    assetId: string,
    noteId: string,
  ): Promise<{ url: string | null; expires_at: number | null }> {
    const res = await request<{ url: string; expires_at: number }>(
      'GET',
      `/assets/${encodeURIComponent(assetId)}/url`,
      { query: { note_id: noteId } },
    );
    return { url: res.data.url, expires_at: res.data.expires_at };
  },

  async listAssets(params: {
    note_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ items: AssetItem[]; page: number; page_size: number; has_more: boolean }> {
    const res = await request<{
      items: AssetItem[];
      page: number;
      page_size: number;
      has_more: boolean;
    }>('GET', '/assets', {
      query: { note_id: params.note_id, page: params.page, page_size: params.page_size },
    });
    return res.data;
  },

  async deleteAsset(assetId: string): Promise<void> {
    await request<null>('DELETE', `/assets/${encodeURIComponent(assetId)}`);
  },

  async rebuildIndex(input: { user_uuid?: string } = {}): Promise<{ job_id: string }> {
    const res = await request<{ job_id: string }>('POST', '/admin/index-rebuild', {
      body: input.user_uuid ? { user_uuid: input.user_uuid } : {},
    });
    return res.data;
  },

  async getJob(jobId: string): Promise<Job> {
    const res = await request<Job>('GET', `/jobs/${encodeURIComponent(jobId)}`);
    return res.data;
  },

  async getPublicNote(token: string): Promise<PublicNote> {
    const res = await request<PublicNote>('GET', `/public/notes/${encodeURIComponent(token)}`, {
      anonymous: true,
    });
    return res.data;
  },
};
