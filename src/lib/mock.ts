import { ApiError } from './errors';
import type {
  AssetItem,
  AdminUser,
  DirItem,
  Job,
  Level,
  NoteDetail,
  NotePage,
  NoteSummary,
  Profile,
  PublicNote,
  SearchHit,
  ShareCandidate,
  ShareItem,
  TeamConfig,
  TrashItem,
  TrashPage,
  VersionDetail,
  VersionItem,
  Visibility,
} from './types';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const T = Date.now();
const DB_KEY = ['cloudjian', 'mock', 'v1'].join('.');

interface MockNote {
  note_id: string;
  slug: string;
  title: string;
  category_path: string;
  tags: string[];
  lang: string;
  visibility: Visibility;
  public_token: string | null;
  created_at: number;
  updated_at: number;
  version: number;
  content: string;
  owner_uuid: string;
  owner_name: string;
  etag: string;
}

interface TrashedDir {
  path: string;
  name: string;
  deleted_at: number;
}

interface MockDb {
  me: { user_uuid: string; username: string; role: 'admin' | 'user' };
  profile: Profile;
  users: AdminUser[];
  notes: MockNote[];
  assets: Record<string, MockAsset>;
  trashedNotes: MockNote[];
  trashedDirs: TrashedDir[];
  shares: ShareItem[];
  versions: Record<string, VersionDetail[]>;
  team: TeamConfig;
  jobs: Job[];
}

interface MockAsset {
  asset_id: string;
  owner_uuid: string;
  note_id: string;
  filename: string;
  content_type: string;
  size: number;
  preview_url: string;
  visibility: Visibility;
  created_at: number;
  ref_count: number;
  public_ref_count: number;
  url: string | null;
}

const me = { user_uuid: 'u-me', username: 'zhang.wei', role: 'admin' as const };

function etagOf(version: number) {
  return `"v${version}"`;
}

function note(
  input: Omit<MockNote, 'etag'> & { etag?: string },
): MockNote {
  return { ...input, etag: input.etag ?? etagOf(input.version) };
}

function seed(): MockDb {
  const notes: MockNote[] = [
    note({
      note_id: 'n-1',
      slug: '2026-Q4-华东区客户拜访纪要',
      title: '2026 Q4 华东区客户拜访纪要（第三轮）与后续跟进计划',
      category_path: '工作/2026/Q4/客户项目',
      tags: ['客户拜访', 'Q4', '纪要'],
      lang: 'zh-CN',
      visibility: 'private',
      public_token: null,
      created_at: T - 9 * DAY,
      updated_at: T - 2 * HOUR,
      version: 12,
      owner_uuid: me.user_uuid,
      owner_name: me.username,
      content:
        '# 2026 Q4 华东区客户拜访纪要\n\n## 结论\n\n- 先做最小闭环，再补自动化。\n- 客户最关心的是权限边界与审计记录。\n\n## 跟进\n\n1. 本周五前给出共享目录的只读方案。\n2. 下周补一版导出样例。\n\n> 参会人：张伟、李娜、王博',
    }),
    note({
      note_id: 'n-2',
      slug: '技术调研-S3-预签名-URL',
      title: '技术调研：S3 预签名 URL 与私有图迁移方案',
      category_path: '工作/技术调研',
      tags: ['架构', 'S3'],
      lang: 'zh-CN',
      visibility: 'private',
      public_token: null,
      created_at: T - 12 * DAY,
      updated_at: T - DAY,
      version: 5,
      owner_uuid: me.user_uuid,
      owner_name: me.username,
      content:
        '# S3 预签名 URL\n\n- 上传走 `PUT` 预签名，不经过 Lambda。\n- 私有图读取走 5 分钟签名地址。\n- 公开图走 CDN，路径固定。\n\n## 待确认\n\n- 批量换签的上限。',
    }),
    note({
      note_id: 'n-3',
      slug: '周会纪要-11-月第-4-周',
      title: '周会纪要 · 11 月第 4 周',
      category_path: '工作',
      tags: ['周会'],
      lang: 'zh-CN',
      visibility: 'private',
      public_token: null,
      created_at: T - 4 * DAY,
      updated_at: T - 2 * DAY,
      version: 3,
      owner_uuid: me.user_uuid,
      owner_name: me.username,
      content: '# 周会纪要\n\n- 本周完成登录与笔记主流程。\n- 下周进入共享与回收站。',
    }),
    note({
      note_id: 'n-4',
      slug: '读书笔记-卡片笔记写作法',
      title: '读书笔记 ·《卡片笔记写作法》',
      category_path: '个人笔记',
      tags: ['阅读'],
      lang: 'zh-CN',
      visibility: 'private',
      public_token: null,
      created_at: T - 20 * DAY,
      updated_at: T - 8 * DAY,
      version: 2,
      owner_uuid: me.user_uuid,
      owner_name: me.username,
      content: '# 卡片笔记写作法\n\n把想法写成独立的卡片，再让卡片之间发生连接。',
    }),
    note({
      note_id: 'n-5',
      slug: '产品需求-版本历史',
      title: '产品需求：版本历史、并排对比与回滚规则',
      category_path: '工作/产品',
      tags: ['PRD', '版本'],
      lang: 'zh-CN',
      visibility: 'private',
      public_token: null,
      created_at: T - 15 * DAY,
      updated_at: T - 6 * DAY,
      version: 7,
      owner_uuid: me.user_uuid,
      owner_name: me.username,
      content:
        '# 版本历史\n\n- 每次保存产生一个历史版本。\n- 对比固定并排双栏。\n- 回滚前自动保存当前内容。',
    }),
    note({
      note_id: 'n-6',
      slug: '出差报销与发票清单',
      title: '出差报销与发票清单（10 月）',
      category_path: '个人笔记',
      tags: ['行政'],
      lang: 'zh-CN',
      visibility: 'private',
      public_token: null,
      created_at: T - 30 * DAY,
      updated_at: T - 10 * DAY,
      version: 1,
      owner_uuid: me.user_uuid,
      owner_name: me.username,
      content: '# 报销清单\n\n- 高铁票 2 张\n- 酒店 3 晚',
    }),
    note({
      note_id: 'n-7',
      slug: 'Security-Review-Follow-ups',
      title: 'Security Review Follow-ups',
      category_path: '工作/2026/Q4/客户项目',
      tags: ['security'],
      lang: 'en',
      visibility: 'private',
      public_token: null,
      created_at: T - 7 * DAY,
      updated_at: T - 3 * DAY,
      version: 4,
      owner_uuid: me.user_uuid,
      owner_name: me.username,
      content: '# Security review\n\n- Confirm token audience.\n- Add audit log fields.',
    }),
    note({
      note_id: 'n-s1',
      slug: '合作方安全评审记录',
      title: '合作方安全评审记录',
      category_path: '协作/评审',
      tags: ['安全', '评审'],
      lang: 'zh-CN',
      visibility: 'private',
      public_token: null,
      created_at: T - 6 * DAY,
      updated_at: T - 5 * HOUR,
      version: 3,
      owner_uuid: 'u-li',
      owner_name: 'li.na',
      content: '# 安全评审记录\n\n- 只读共享给项目成员。\n- 敏感字段不进入导出。',
    }),
    note({
      note_id: 'n-s2',
      slug: '项目A-对接清单',
      title: '项目A 对接清单',
      category_path: '协作/项目A',
      tags: ['项目A'],
      lang: 'zh-CN',
      visibility: 'private',
      public_token: null,
      created_at: T - 5 * DAY,
      updated_at: T - 4 * HOUR,
      version: 2,
      owner_uuid: 'u-li',
      owner_name: 'li.na',
      content: '# 项目A 对接清单\n\n- [x] 确认接口人\n- [ ] 确认验收标准\n- [ ] 排期',
    }),
    note({
      note_id: 'n-p1',
      slug: '公开示例-如何做周复盘',
      title: '公开示例：如何做周复盘',
      category_path: '公开/方法',
      tags: ['复盘', '公开'],
      lang: 'zh-CN',
      visibility: 'public',
      public_token: ['pub', 'demo', '2026'].join('_'),
      created_at: T - 11 * DAY,
      updated_at: T - 9 * DAY,
      version: 2,
      owner_uuid: 'u-li',
      owner_name: 'li.na',
      content:
        '# 如何做周复盘\n\n1. 这周做成了什么？\n2. 哪里卡住了？\n3. 下周最重要的一件事是什么？',
    }),
  ];

  const shares: ShareItem[] = [
    {
      share_id: 's-1',
      owner_uuid: me.user_uuid,
      owner_name: me.username,
      grantee_uuid: 'u-wang',
      grantee_name: 'wang.bo',
      target_type: 'note',
      target_note_id: 'n-1',
      target_dir: null,
      level: 'edit',
      created_at: T - 2 * DAY,
    },
    {
      share_id: 's-2',
      owner_uuid: 'u-li',
      owner_name: 'li.na',
      grantee_uuid: me.user_uuid,
      grantee_name: me.username,
      target_type: 'dir',
      target_note_id: null,
      target_dir: '协作/项目A',
      level: 'edit',
      created_at: T - 3 * DAY,
    },
    {
      share_id: 's-3',
      owner_uuid: 'u-li',
      owner_name: 'li.na',
      grantee_uuid: me.user_uuid,
      grantee_name: me.username,
      target_type: 'note',
      target_note_id: 'n-s1',
      target_dir: null,
      level: 'read',
      created_at: T - 4 * DAY,
    },
    {
      share_id: 's-4',
      owner_uuid: me.user_uuid,
      owner_name: me.username,
      grantee_uuid: 'u-li',
      grantee_name: 'li.na',
      target_type: 'dir',
      target_note_id: null,
      target_dir: '工作/技术调研',
      level: 'read',
      created_at: T - 1 * DAY,
    },
  ];

  const versions: Record<string, VersionDetail[]> = {
    'n-1': [
      {
        ts: T - 2 * HOUR,
        version: 12,
        size: 460,
        author: 'zhang.wei',
        content:
          '# 2026 Q4 华东区客户拜访纪要\n\n## 结论\n\n- 先做最小闭环，再补自动化。\n- 客户最关心的是权限边界与审计记录。',
      },
      {
        ts: T - 3 * DAY,
        version: 11,
        size: 380,
        author: 'zhang.wei',
        content: '# 2026 Q4 华东区客户拜访纪要\n\n- 初次拜访完成。\n- 待补权限方案。',
      },
    ],
    'n-2': [
      {
        ts: T - DAY,
        version: 5,
        size: 320,
        author: 'zhang.wei',
        content: '# S3 预签名 URL\n\n- 上传走 PUT 预签名。\n- 私有图 5 分钟签名。',
      },
    ],
    'n-s2': [
      {
        ts: T - 4 * HOUR,
        version: 2,
        size: 220,
        author: 'li.na',
        content: '# 项目A 对接清单\n\n- [x] 确认接口人\n- [ ] 确认验收标准',
      },
    ],
  };

  return {
    me,
    profile: {
      ui_lang: 'zh-CN',
      tz: 'Asia/Shanghai',
      theme: 'light',
      editor_mode: 'ir',
      list_sort: 'updated',
      page_size: 20,
    },
    users: [
      {
        user_uuid: me.user_uuid,
        username: me.username,
        email: 'zhang.wei@example.com',
        role: 'admin',
        status: 'active',
        created_at: T - 120 * DAY,
        last_login_at: T - HOUR,
      },
      {
        user_uuid: 'u-li',
        username: 'li.na',
        email: 'li.na@example.com',
        role: 'user',
        status: 'active',
        created_at: T - 90 * DAY,
        last_login_at: T - 3 * HOUR,
      },
      {
        user_uuid: 'u-wang',
        username: 'wang.bo',
        email: 'wang.bo@example.com',
        role: 'user',
        status: 'active',
        created_at: T - 60 * DAY,
        last_login_at: T - DAY,
      },
      {
        user_uuid: 'u-chen',
        username: 'chen.yu',
        email: 'chen.yu@example.com',
        role: 'user',
        status: 'disabled',
        created_at: T - 45 * DAY,
        last_login_at: T - 20 * DAY,
      },
      {
        user_uuid: 'u-zhao',
        username: 'zhao.min',
        email: 'zhao.min@example.com',
        role: 'user',
        status: 'deleting',
        created_at: T - 30 * DAY,
        last_login_at: T - 6 * DAY,
        progress: { done: 3, total: 8 },
      },
    ],
    notes,
    trashedNotes: [
      note({
        note_id: 'n-t1',
        slug: '旧版发布检查清单',
        title: '旧版发布检查清单',
        category_path: '工作/旧项目',
        tags: ['发布'],
        lang: 'zh-CN',
        visibility: 'private',
        public_token: null,
        created_at: T - 40 * DAY,
        updated_at: T - 20 * DAY,
        version: 2,
        owner_uuid: me.user_uuid,
        owner_name: me.username,
        content: '# 旧版发布检查清单\n\n- [x] 回归\n- [ ] 灰度',
      }),
    ],
    trashedDirs: [{ path: '工作/旧项目/归档', name: '归档', deleted_at: T - 5 * DAY }],
    shares,
    versions,
    team: {
      default_note_visibility: 'private',
      force_private: false,
      version: 3,
      updated_at: T - 8 * DAY,
    },
    jobs: [],
    assets: {},
  };
}

function loadDb(): MockDb {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const db = JSON.parse(raw) as MockDb;
      db.assets ??= {};
      for (const asset of Object.values(db.assets ?? {})) {
        if (asset.preview_url.startsWith('data:')) {
          objectUrls.set(asset.asset_id, asset.preview_url);
        }
      }
      return db;
    }
  } catch {
    // ignore corrupt local mock state
  }
  const db = seed();
  saveDb(db);
  return db;
}

function saveDb(db: MockDb) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function delay(ms = 160) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

const objectUrls = new Map<string, string>();

function assetUrl(asset: MockAsset) {
  return objectUrls.get(asset.asset_id) ?? (asset.preview_url || null);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'));
    reader.readAsDataURL(blob);
  });
}

function updateAssetRefs(db: MockDb) {
  const usage = new Map<string, { note_ids: Set<string>; public_note_ids: Set<string> }>();

  for (const item of db.notes) {
    for (const match of item.content.matchAll(/asset:\/\/([^)\s"']+)/gi)) {
      const assetId = match[1];
      const entry = usage.get(assetId) ?? { note_ids: new Set<string>(), public_note_ids: new Set<string>() };
      entry.note_ids.add(item.note_id);
      if (item.visibility === 'public') entry.public_note_ids.add(item.note_id);
      usage.set(assetId, entry);
    }
  }

  for (const asset of Object.values(db.assets)) {
    const refs = usage.get(asset.asset_id);
    asset.ref_count = refs?.note_ids.size ?? 0;
    asset.public_ref_count = refs?.public_note_ids.size ?? 0;
  }
}

function resolveAssetPlaceholders(db: MockDb, content: string) {
  return content.replace(/asset:\/\/([^)\s"']+)/g, (placeholder, assetId: string) => {
    const asset = db.assets[assetId];
    return asset ? assetUrl(asset) ?? placeholder : placeholder;
  });
}

function basename(path: string) {
  return path.split('/').filter(Boolean).pop() ?? path;
}

function dirname(path: string) {
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
}

function under(path: string, root: string) {
  return path === root || path.startsWith(`${root}/`);
}

function relativeTo(path: string, root: string) {
  if (!root) return path;
  if (path === root) return '';
  return path.startsWith(`${root}/`) ? path.slice(root.length + 1) : null;
}

function slugify(title: string) {
  return (
    title
      .trim()
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, '-')
      .slice(0, 64) || '未命名笔记'
  );
}

function toSummary(db: MockDb, item: MockNote, share?: ShareItem | null): NoteSummary {
  const level: Level = item.owner_uuid === db.me.user_uuid ? 'owner' : share?.level ?? 'read';
  const relativePath =
    level === 'owner'
      ? item.category_path
      : share?.target_type === 'dir'
        ? relativeTo(item.category_path, share.target_dir ?? '')
        : null;
  return {
    note_id: item.note_id,
    title: item.title,
    slug: item.slug,
    category_path: item.category_path,
    relative_path: relativePath,
    share_root_name:
      level === 'owner' || share?.target_type !== 'dir' || !share.target_dir
        ? null
        : basename(share.target_dir),
    share_id: share?.share_id ?? null,
    level,
    tags: item.tags,
    updated_at: item.updated_at,
    version: item.version,
    visibility: item.visibility,
    own_share: db.shares.some((entry) => entry.owner_uuid === db.me.user_uuid && entry.target_note_id === item.note_id),
  };
}

function toDetail(db: MockDb, item: MockNote, share?: ShareItem | null): NoteDetail {
  return {
    ...toSummary(db, item, share),
    owner_name: item.owner_uuid === db.me.user_uuid ? null : item.owner_name,
    lang: item.lang,
    created_at: item.created_at,
    content: item.content,
  };
}

function accessFor(db: MockDb, noteId: string): { item: MockNote; share: ShareItem | null } {
  const item = db.notes.find((entry) => entry.note_id === noteId);
  if (!item) {
    throw new ApiError(404, '笔记不存在', 'NOTE_NOT_FOUND');
  }
  if (item.owner_uuid === db.me.user_uuid) {
    return { item, share: null };
  }
  const candidates = db.shares
    .filter(
      (share) =>
        share.grantee_uuid === db.me.user_uuid &&
        share.owner_uuid === item.owner_uuid &&
        (share.target_note_id === noteId ||
          (share.target_type === 'dir' && !!share.target_dir && under(item.category_path, share.target_dir))),
    )
    .sort((a, b) => (a.level === 'edit' ? -1 : 1) - (b.level === 'edit' ? -1 : 1));
  const share = candidates[0] ?? null;
  if (!share) {
    throw new ApiError(403, '没有该笔记的访问权限', 'SHARE_FORBIDDEN');
  }
  return { item, share };
}

function requireEdit(db: MockDb, noteId: string) {
  const { item, share } = accessFor(db, noteId);
  const level = item.owner_uuid === db.me.user_uuid ? 'owner' : share?.level;
  if (level !== 'owner' && level !== 'edit') {
    throw new ApiError(403, '没有该笔记的写权限', 'NOTE_FORBIDDEN');
  }
  return { item, share };
}

function incomingShares(db: MockDb) {
  return db.shares.filter((share) => share.grantee_uuid === db.me.user_uuid);
}

function outgoingShares(db: MockDb) {
  return db.shares.filter((share) => share.owner_uuid === db.me.user_uuid);
}

function dirPaths(notes: MockNote[]) {
  const set = new Set<string>();
  for (const item of notes) {
    const parts = item.category_path.split('/').filter(Boolean);
    for (let i = 1; i <= parts.length; i += 1) {
      set.add(parts.slice(0, i).join('/'));
    }
  }
  return set;
}

function sharedItems(db: MockDb, share: ShareItem, path: string, depth: number): DirItem[] {
  if (share.target_type === 'note') {
    return [];
  }
  const root = share.target_dir ?? '';
  const ownerNotes = db.notes.filter((item) => item.owner_uuid === share.owner_uuid && under(item.category_path, root));
  const allDirs = dirPaths(ownerNotes);
  const directDirs = [...allDirs].filter((dir) => dir !== path && dirname(dir) === path && under(dir, root));
  const directNotes = ownerNotes.filter((item) => item.category_path === path);
  const items: DirItem[] = [];

  for (const dir of directDirs) {
    const rel = relativeTo(dir, root);
    if (rel === null) continue;
    items.push({
      path: dir,
      relative_path: rel,
      share_root_name: basename(root),
      share_id: share.share_id,
      owner_name: share.owner_name,
      level: share.level,
      name: basename(dir),
      type: 'dir',
      note_id: null,
      updated_at: share.created_at,
      has_children: [...allDirs].some((candidate) => candidate.startsWith(`${dir}/`)) ||
        ownerNotes.some((item) => item.category_path.startsWith(`${dir}/`)),
    });
  }

  for (const item of directNotes) {
    const relDir = relativeTo(item.category_path, root) ?? '';
    const rel = relDir ? `${relDir}/${item.slug}.md` : `${item.slug}.md`;
    items.push({
      path: `${item.category_path}/${item.slug}.md`,
      relative_path: rel,
      share_root_name: basename(root),
      share_id: share.share_id,
      owner_name: share.owner_name,
      level: share.level,
      name: `${item.slug}.md`,
      type: 'note',
      note_id: item.note_id,
      updated_at: item.updated_at,
      has_children: false,
    });
  }

  return items
    .filter((item) => {
      const rel = relativeTo(item.path, path);
      return rel !== null && rel !== '' && rel.split('/').length <= depth;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

export const mockApi = {
  reset(): void {
    localStorage.removeItem(DB_KEY);
    seed();
  },

  async getProfile(): Promise<Profile> {
    await delay();
    return loadDb().profile;
  },

  async updateProfile(patch: Partial<Profile>): Promise<Profile> {
    await delay();
    const db = loadDb();
    db.profile = { ...db.profile, ...patch };
    saveDb(db);
    return db.profile;
  },

  async getDirs(params: { scope?: 'mine' | 'shared'; share_id?: string; path?: string; depth?: number }): Promise<{ items: DirItem[] }> {
    await delay();
    const db = loadDb();
    const scope = params.scope ?? 'mine';
    const path = params.path ?? '';
    const depth = params.depth ?? 1;

    if (scope === 'mine') {
      const own = db.notes.filter((item) => item.owner_uuid === db.me.user_uuid);
      const allDirs = dirPaths(own);
      const directDirs = [...allDirs].filter((dir) => dir !== path && dirname(dir) === path);
      const directNotes = own.filter((item) => item.category_path === path);
      const items: DirItem[] = [];
      for (const dir of directDirs) {
        items.push({
          path: dir,
          relative_path: dir,
          share_root_name: null,
          share_id: null,
          owner_name: null,
          level: 'owner',
          name: basename(dir),
          type: 'dir',
          note_id: null,
          updated_at: T,
          has_children:
            [...allDirs].some((candidate) => candidate.startsWith(`${dir}/`)) ||
            own.some((item) => item.category_path.startsWith(`${dir}/`)),
        });
      }
      for (const item of directNotes) {
        items.push({
          path: `${item.category_path}/${item.slug}.md`,
          relative_path: `${item.category_path}/${item.slug}.md`,
          share_root_name: null,
          share_id: null,
          owner_name: null,
          level: 'owner',
          name: `${item.slug}.md`,
          type: 'note',
          note_id: item.note_id,
          updated_at: item.updated_at,
          has_children: false,
        });
      }
      return {
        items: items
          .filter((item) => {
            const rel = relativeTo(item.path, path);
            return rel !== null && rel !== '' && rel.split('/').length <= depth;
          })
          .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')),
      };
    }

    const shares = incomingShares(db);
    if (!path) {
      const roots: DirItem[] = [];
      for (const share of shares) {
        if (share.target_type === 'dir' && share.target_dir) {
          roots.push({
            path: share.target_dir,
            relative_path: '',
            share_root_name: basename(share.target_dir),
            share_id: share.share_id,
            owner_name: share.owner_name,
            level: share.level,
            name: basename(share.target_dir),
            type: 'dir',
            note_id: null,
            updated_at: share.created_at,
            has_children: db.notes.some(
              (item) => item.owner_uuid === share.owner_uuid && item.category_path.startsWith(`${share.target_dir}/`),
            ),
          });
        } else if (share.target_type === 'note' && share.target_note_id) {
          const item = db.notes.find((entry) => entry.note_id === share.target_note_id);
          if (!item) continue;
          roots.push({
            path: `${item.category_path}/${item.slug}.md`,
            relative_path: null,
            share_root_name: null,
            share_id: share.share_id,
            owner_name: share.owner_name,
            level: share.level,
            name: `${item.slug}.md`,
            type: 'note',
            note_id: item.note_id,
            updated_at: item.updated_at,
            has_children: false,
          });
        }
      }
      return { items: roots.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')) };
    }

    const share = shares.find((entry) => entry.share_id === params.share_id);
    if (!share) {
      throw new ApiError(403, '没有该共享的访问权限', 'SHARE_FORBIDDEN');
    }
    if (!under(path, share.target_dir ?? '')) {
      throw new ApiError(404, '目录不存在', 'DIR_NOT_FOUND');
    }
    return { items: sharedItems(db, share, path, depth) };
  },

  async getNotes(params: {
    category_path?: string;
    /** mock 专用：目录树根节点展示本人全部笔记；真实后端按 category_path 精确过滤。 */
    all?: boolean;
    sort?: 'updated' | 'created' | 'title';
    tag?: string;
    page?: number;
    page_size?: number;
  }): Promise<NotePage> {
    await delay();
    const db = loadDb();
    const category = params.category_path ?? '';
    const sort = params.sort ?? db.profile.list_sort;
    const page = params.page ?? 1;
    const pageSize = params.page_size ?? db.profile.page_size;
    let items = db.notes.filter(
      (item) =>
        item.owner_uuid === db.me.user_uuid &&
        (params.all || item.category_path === category) &&
        (!params.tag || item.tags.includes(params.tag)),
    );
    items = items.sort((a, b) => {
      if (sort === 'title') {
        return new Intl.Collator(db.profile.ui_lang).compare(a.title, b.title);
      }
      if (sort === 'created') {
        return b.created_at - a.created_at;
      }
      return b.updated_at - a.updated_at;
    });
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize).map((item) => toSummary(db, item)),
      page,
      page_size: pageSize,
      has_more: items.length > page * pageSize,
    };
  },

  async getNote(noteId: string): Promise<NoteDetail & { etag: string }> {
    await delay();
    const db = loadDb();
    const { item, share } = accessFor(db, noteId);
    return { ...toDetail(db, item, share), etag: item.etag };
  },

  async createNote(input: {
    title?: string;
    category_path: string;
    share_id?: string | null;
    content?: string;
    tags?: string[];
  }): Promise<NoteSummary & { share_id: string | null }> {
    await delay();
    const db = loadDb();
    let owner = db.me.user_uuid;
    let share: ShareItem | null = null;
    if (input.share_id) {
      share = incomingShares(db).find((entry) => entry.share_id === input.share_id) ?? null;
      if (!share || share.level !== 'edit' || share.target_type !== 'dir') {
        throw new ApiError(403, '共享目录不可写', 'NOTE_FORBIDDEN');
      }
      if (!under(input.category_path, share.target_dir ?? '')) {
        throw new ApiError(403, '目录与共享根不匹配', 'NOTE_FORBIDDEN');
      }
      owner = share.owner_uuid;
    }
    const title = (input.title ?? '').trim() || '未命名笔记';
    const baseSlug = slugify(title);
    const siblings = db.notes.filter(
      (item) => item.owner_uuid === owner && item.category_path === input.category_path,
    );
    let slug = baseSlug;
    let suffix = 1;
    while (siblings.some((item) => item.slug === slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    const version = 1;
    const created: MockNote = {
      note_id: uid('n'),
      slug,
      title,
      category_path: input.category_path,
      tags: input.tags ?? [],
      lang: 'unknown',
      visibility: db.team.force_private ? 'private' : db.team.default_note_visibility,
      public_token: null,
      created_at: Date.now(),
      updated_at: Date.now(),
      version,
      content: input.content ?? '',
      owner_uuid: owner,
      owner_name: owner === db.me.user_uuid ? db.me.username : share?.owner_name ?? db.me.username,
      etag: etagOf(version),
    };
    db.notes.push(created);
    saveDb(db);
    return { ...toSummary(db, created, share), share_id: share?.share_id ?? null };
  },

  async saveNote(
    noteId: string,
    input: { title?: string; content: string; tags?: string[]; etag: string },
  ): Promise<{ etag: string; version: number; updated_at: number }> {
    await delay(220);
    const db = loadDb();
    const { item } = requireEdit(db, noteId);
    if (new Blob([input.content]).size > 2 * 1024 * 1024) {
      throw new ApiError(413, '正文超过 2MB，请拆分或删减后再保存', 'NOTE_TOO_LARGE');
    }
    if (input.etag !== item.etag) {
      throw new ApiError(412, '笔记已被其他会话修改，请先合并', 'NOTE_CONFLICT');
    }
    db.versions[noteId] = [
      {
        ts: item.updated_at,
        version: item.version,
        size: new Blob([item.content]).size,
        author: item.owner_name,
        content: item.content,
      },
      ...(db.versions[noteId] ?? []),
    ].slice(0, 50);
    item.content = input.content;
    item.title = (input.title ?? item.title).trim() || '未命名笔记';
    item.tags = input.tags ?? item.tags;
    item.version += 1;
    item.updated_at = Date.now();
    item.etag = etagOf(item.version);
    updateAssetRefs(db);
    saveDb(db);
    return { etag: item.etag, version: item.version, updated_at: item.updated_at };
  },

  async deleteNote(noteId: string): Promise<void> {
    await delay();
    const db = loadDb();
    const { item } = accessFor(db, noteId);
    if (item.owner_uuid !== db.me.user_uuid) {
      throw new ApiError(403, '只有笔记所有者可删除', 'NOTE_FORBIDDEN');
    }
    db.notes = db.notes.filter((entry) => entry.note_id !== noteId);
    db.trashedNotes.push(item);
    updateAssetRefs(db);
    saveDb(db);
  },

  async setVisibility(noteId: string, visibility: Visibility): Promise<{ job_id: string }> {
    await delay(260);
    const db = loadDb();
    const { item } = accessFor(db, noteId);
    if (item.owner_uuid !== db.me.user_uuid) {
      throw new ApiError(403, '只有笔记所有者可切换可见性', 'NOTE_FORBIDDEN');
    }
    if (visibility === 'public' && db.team.force_private) {
      throw new ApiError(400, '团队已禁止公开笔记', 'NOTE_VISIBILITY_FORBIDDEN');
    }
    item.visibility = visibility;
    item.public_token = visibility === 'public' ? `pub_${item.note_id}_${Date.now().toString(36)}` : null;
    item.updated_at = Date.now();
    updateAssetRefs(db);
    const job: Job = {
      job_id: uid('job'),
      type: 'visibility_migrate',
      status: 'running',
      progress: 0,
      total: 1,
    };
    db.jobs.push(job);
    saveDb(db);
    window.setTimeout(() => {
      const next = loadDb();
      const target = next.jobs.find((entry) => entry.job_id === job.job_id);
      if (target) {
        target.status = 'done';
        target.progress = 1;
        saveDb(next);
      }
    }, 900);
    return { job_id: job.job_id };
  },

  async getShares(params: {
    scope?: 'incoming' | 'outgoing';
    target_type?: 'note' | 'dir';
    target_note_id?: string;
    target_dir?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ items: ShareItem[]; page: number; page_size: number; has_more: boolean }> {
    await delay();
    const db = loadDb();
    const scope = params.scope ?? 'incoming';
    const page = params.page ?? 1;
    const pageSize = params.page_size ?? 20;
    let items = scope === 'incoming' ? incomingShares(db) : outgoingShares(db);
    if (params.target_type) {
      items = items.filter((item) => item.target_type === params.target_type);
    }
    if (params.target_note_id) {
      items = items.filter((item) => item.target_note_id === params.target_note_id);
    }
    if (params.target_dir) {
      items = items.filter((item) => item.target_dir === params.target_dir);
    }
    items = items.sort((a, b) => b.created_at - a.created_at);
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      page,
      page_size: pageSize,
      has_more: items.length > page * pageSize,
    };
  },

  async getShareCandidates(q: string): Promise<{ items: ShareCandidate[]; page: number; page_size: number; has_more: boolean }> {
    await delay(120);
    const db = loadDb();
    const items = db.users
      .filter(
        (user) =>
          user.user_uuid !== db.me.user_uuid &&
          user.status === 'active' &&
          user.username.toLowerCase().startsWith(q.toLowerCase()),
      )
      .slice(0, 50)
      .map((user) => ({ user_uuid: user.user_uuid, username: user.username }));
    return { items, page: 1, page_size: 50, has_more: false };
  },

  async createShare(input: {
    target_type: 'note' | 'dir';
    target_note_id?: string;
    target_dir?: string;
    grantee: string;
    level: 'read' | 'edit';
  }): Promise<{ share_id: string }> {
    await delay();
    const db = loadDb();
    const grantee = db.users.find((user) => user.user_uuid === input.grantee);
    if (!grantee || grantee.status !== 'active') {
      throw new ApiError(400, '用户不存在', 'USER_NOT_FOUND');
    }
    const existing = db.shares.find(
      (share) =>
        share.owner_uuid === db.me.user_uuid &&
        share.grantee_uuid === input.grantee &&
        share.target_type === input.target_type &&
        (input.target_type === 'note'
          ? share.target_note_id === input.target_note_id
          : share.target_dir === input.target_dir),
    );
    if (existing) {
      return { share_id: existing.share_id };
    }
    const share: ShareItem = {
      share_id: uid('s'),
      owner_uuid: db.me.user_uuid,
      owner_name: db.me.username,
      grantee_uuid: grantee.user_uuid,
      grantee_name: grantee.username,
      target_type: input.target_type,
      target_note_id: input.target_note_id ?? null,
      target_dir: input.target_dir ?? null,
      level: input.level,
      created_at: Date.now(),
    };
    db.shares.push(share);
    saveDb(db);
    return { share_id: share.share_id };
  },

  async revokeShare(shareId: string): Promise<void> {
    await delay();
    const db = loadDb();
    db.shares = db.shares.filter(
      (share) => !(share.share_id === shareId && share.owner_uuid === db.me.user_uuid),
    );
    saveDb(db);
  },

  async search(q: string): Promise<{ items: SearchHit[]; has_more: boolean; total_hint: number }> {
    await delay(180);
    const db = loadDb();
    const needle = q.trim().toLowerCase();
    if (needle.length < 1) {
      throw new ApiError(400, '关键词太短', 'SEARCH_QUERY_TOO_SHORT');
    }
    const hits: SearchHit[] = [];
    for (const item of db.notes) {
      if (!`${item.title}\n${item.content}`.toLowerCase().includes(needle)) continue;
      if (item.owner_uuid === db.me.user_uuid) {
        hits.push({
          note_id: item.note_id,
          title: item.title,
          category_path: item.category_path,
          relative_path: item.category_path,
          share_root_name: null,
          share_id: null,
          level: 'owner',
          snippet: snippet(item.content, needle),
          origin: 'own',
          owner_name: null,
          public_token: null,
          updated_at: item.updated_at,
        });
        continue;
      }
      const share = db.shares.find(
        (entry) =>
          entry.grantee_uuid === db.me.user_uuid &&
          entry.owner_uuid === item.owner_uuid &&
          (entry.target_note_id === item.note_id ||
            (entry.target_type === 'dir' && !!entry.target_dir && under(item.category_path, entry.target_dir))),
      );
      if (share) {
        const rel =
          share.target_type === 'dir' && share.target_dir
            ? relativeTo(item.category_path, share.target_dir)
            : null;
        hits.push({
          note_id: item.note_id,
          title: item.title,
          category_path: item.category_path,
          relative_path: rel,
          share_root_name:
            share.target_type === 'dir' && share.target_dir ? basename(share.target_dir) : null,
          share_id: share.share_id,
          level: share.level,
          snippet: snippet(item.content, needle),
          origin: 'shared',
          owner_name: item.owner_name,
          public_token: null,
          updated_at: item.updated_at,
        });
        continue;
      }
      if (item.visibility === 'public' && item.public_token) {
        hits.push({
          note_id: item.note_id,
          title: item.title,
          category_path: item.category_path,
          relative_path: null,
          share_root_name: null,
          share_id: null,
          level: 'read',
          snippet: snippet(item.content, needle),
          origin: 'public',
          owner_name: item.owner_name,
          public_token: item.public_token,
          updated_at: item.updated_at,
        });
      }
    }
    return { items: hits.slice(0, 20), has_more: hits.length > 20, total_hint: hits.length };
  },

  async getVersions(noteId: string): Promise<{ items: VersionItem[] }> {
    await delay(120);
    const db = loadDb();
    const { item } = accessFor(db, noteId);
    const versions = db.versions[noteId] ?? [
      {
        ts: item.updated_at,
        version: item.version,
        size: new Blob([item.content]).size,
        author: item.owner_name,
        content: item.content,
      },
    ];
    return {
      items: versions.map(({ content: _content, ...rest }) => rest),
    };
  },

  async getVersion(noteId: string, ts: number): Promise<VersionDetail> {
    await delay(100);
    const db = loadDb();
    accessFor(db, noteId);
    const version = (db.versions[noteId] ?? []).find((entry) => entry.ts === ts);
    if (!version) {
      throw new ApiError(404, '版本不存在', 'VERSION_NOT_FOUND');
    }
    return version;
  },

  async rollbackVersion(noteId: string, ts: number): Promise<{ version: number; etag: string }> {
    await delay(220);
    const db = loadDb();
    const { item } = requireEdit(db, noteId);
    const version = (db.versions[noteId] ?? []).find((entry) => entry.ts === ts);
    if (!version) {
      throw new ApiError(404, '版本不存在', 'VERSION_NOT_FOUND');
    }
    db.versions[noteId] = [
      {
        ts: item.updated_at,
        version: item.version,
        size: new Blob([item.content]).size,
        author: item.owner_name,
        content: item.content,
      },
      ...(db.versions[noteId] ?? []),
    ].slice(0, 50);
    item.content = version.content;
    item.version += 1;
    item.updated_at = Date.now();
    item.etag = etagOf(item.version);
    saveDb(db);
    return { version: item.version, etag: item.etag };
  },

  async deleteVersion(noteId: string, ts: number): Promise<void> {
    await delay(120);
    const db = loadDb();
    const { item } = accessFor(db, noteId);
    if (item.owner_uuid !== db.me.user_uuid) {
      throw new ApiError(403, '只有笔记所有者可删除版本', 'VERSION_FORBIDDEN');
    }
    db.versions[noteId] = (db.versions[noteId] ?? []).filter((entry) => entry.ts !== ts);
    saveDb(db);
  },

  async getTrash(): Promise<TrashPage> {
    await delay(150);
    const db = loadDb();
    const noteItems: TrashItem[] = db.trashedNotes.map((item) => ({
      path: `${item.category_path}/${item.slug}.md`,
      name: `${item.slug}.md`,
      type: 'note',
      note_id: item.note_id,
      deleted_at: item.updated_at,
      days_left: 30,
      has_children: false,
    }));
    const dirItems: TrashItem[] = db.trashedDirs.map((item) => ({
      path: item.path,
      name: item.name,
      type: 'dir',
      note_id: null,
      deleted_at: item.deleted_at,
      days_left: 30,
      has_children: true,
    }));
    const items = [...noteItems, ...dirItems].sort((a, b) => b.deleted_at - a.deleted_at);
    return { items, total: items.length };
  },

  async restoreTrash(input: { note_id?: string; path?: string }): Promise<{ job_id: string }> {
    await delay(180);
    const db = loadDb();
    if (input.note_id) {
      const index = db.trashedNotes.findIndex((item) => item.note_id === input.note_id);
      if (index >= 0) {
        const [item] = db.trashedNotes.splice(index, 1);
        db.notes.push(item);
      }
    }
    if (input.path) {
      db.trashedDirs = db.trashedDirs.filter((item) => item.path !== input.path);
    }
    const jobId = uid('job');
    db.jobs.push({
      job_id: jobId,
      type: 'restore_dir',
      status: 'done',
      progress: 1,
      total: 1,
    });
    saveDb(db);
    return { job_id: jobId };
  },

  async purgeTrash(input: {
    scope: 'note' | 'notes' | 'dir' | 'all';
    note_id?: string;
    path?: string;
    note_ids?: string[];
  }): Promise<{ job_id: string }> {
    await delay(180);
    const db = loadDb();
    if (input.scope === 'note' && input.note_id) {
      db.trashedNotes = db.trashedNotes.filter((item) => item.note_id !== input.note_id);
    } else if (input.scope === 'dir' && input.path) {
      db.trashedDirs = db.trashedDirs.filter((item) => item.path !== input.path);
    } else if (input.scope === 'notes' && input.note_ids) {
      db.trashedNotes = db.trashedNotes.filter((item) => !input.note_ids!.includes(item.note_id));
    } else if (input.scope === 'all') {
      db.trashedNotes = [];
      db.trashedDirs = [];
    }
    const jobId = uid('job');
    const jobType: Record<string, string> = {
      note: 'purge_note',
      notes: 'purge_notes',
      dir: 'purge_dir',
      all: 'purge_all',
    };
    db.jobs.push({
      job_id: jobId,
      type: jobType[input.scope] ?? 'purge_note',
      status: 'done',
      progress: 1,
      total: 1,
    });
    saveDb(db);
    return { job_id: jobId };
  },

  async getAdminUsers(params: { q?: string; status?: string; page?: number; page_size?: number }): Promise<{
    items: AdminUser[];
    page: number;
    page_size: number;
    has_more: boolean;
  }> {
    await delay(150);
    const db = loadDb();
    const page = params.page ?? 1;
    const pageSize = params.page_size ?? 20;
    let items = db.users;
    if (params.q) {
      items = items.filter((user) => user.username.toLowerCase().startsWith(params.q!.toLowerCase()));
    }
    if (params.status) {
      items = items.filter((user) => user.status === params.status);
    }
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      page,
      page_size: pageSize,
      has_more: items.length > page * pageSize,
    };
  },

  async createUser(input: { username: string; initial_password: string; email?: string; role: 'admin' | 'user' }): Promise<AdminUser> {
    await delay();
    const db = loadDb();
    if (db.users.some((user) => user.username === input.username)) {
      throw new ApiError(409, '用户名已存在', 'USER_EXISTS');
    }
    const user: AdminUser = {
      user_uuid: uid('u'),
      username: input.username,
      email: input.email ?? null,
      role: input.role,
      status: 'FORCE_CHANGE_PASSWORD',
      created_at: Date.now(),
      last_login_at: null,
    };
    db.users.push(user);
    saveDb(db);
    return user;
  },

  async updateUser(userUuid: string, patch: { status?: 'active' | 'disabled'; role?: 'admin' | 'user' }): Promise<AdminUser> {
    await delay();
    const db = loadDb();
    const user = db.users.find((entry) => entry.user_uuid === userUuid);
    if (!user) throw new ApiError(404, '用户不存在', 'USER_NOT_FOUND');
    if (patch.role === 'user' && user.role === 'admin') {
      const admins = db.users.filter((entry) => entry.role === 'admin' && entry.status === 'active');
      if (admins.length <= 1) {
        throw new ApiError(409, '至少保留一个管理员', 'USER_LAST_ADMIN');
      }
    }
    Object.assign(user, patch);
    saveDb(db);
    return user;
  },

  async deleteUser(userUuid: string, _username?: string): Promise<{ job_id: string }> {
    await delay();
    const db = loadDb();
    const user = db.users.find((entry) => entry.user_uuid === userUuid);
    if (!user) throw new ApiError(404, '用户不存在', 'USER_NOT_FOUND');
    if (user.role === 'admin' || user.user_uuid === db.me.user_uuid) {
      throw new ApiError(403, '管理员账号不可删除', 'USER_DELETE_FORBIDDEN');
    }
    user.status = 'deleting';
    user.progress = { done: 0, total: 6 };
    const jobId = uid('job');
    db.jobs.push({
      job_id: jobId,
      type: 'delete_user',
      status: 'running',
      progress: 0,
      total: 6,
    });
    saveDb(db);
    let done = 0;
    const step = () => {
      const next = loadDb();
      const target = next.users.find((entry) => entry.user_uuid === userUuid);
      const job = next.jobs.find((entry) => entry.job_id === jobId);
      if (!target) return;
      done += 1;
      target.progress = { done, total: 6 };
      if (job) job.progress = done;
      if (done >= 6) {
        next.users = next.users.filter((entry) => entry.user_uuid !== userUuid);
        if (job) job.status = 'done';
      }
      saveDb(next);
      if (done < 6) window.setTimeout(step, 700);
    };
    window.setTimeout(step, 700);
    return { job_id: jobId };
  },

  async resetPassword(userUuid: string, password?: string): Promise<{ new_password: string | null }> {
    await delay();
    const db = loadDb();
    if (!db.users.some((user) => user.user_uuid === userUuid)) {
      throw new ApiError(404, '用户不存在', 'USER_NOT_FOUND');
    }
    if (password) return { new_password: null };
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
    const digits = '23456789';
    const all = lower + upper + digits;
    const pick = (source: string) => source[Math.floor(Math.random() * source.length)];
    const generated = [
      pick(upper),
      pick(lower),
      pick(digits),
      ...Array.from({ length: 8 }, () => pick(all)),
    ]
      .sort(() => Math.random() - 0.5)
      .join('');
    return { new_password: generated };
  },

  async changePassword(previous: string, proposed: string): Promise<void> {
    await delay(260);
    if (previous !== 'demo') {
      throw new ApiError(400, '当前密码不正确', 'PASSWORD_INCORRECT');
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,20}$/.test(proposed)) {
      throw new ApiError(400, '密码需为 8–20 位，且包含大写字母、小写字母和数字', 'PASSWORD_WEAK');
    }
  },

  async getTeamConfig(): Promise<TeamConfig> {
    await delay(120);
    return loadDb().team;
  },

  async updateTeamConfig(patch: Partial<TeamConfig>): Promise<TeamConfig> {
    await delay();
    const db = loadDb();
    db.team = { ...db.team, ...patch, version: db.team.version + 1, updated_at: Date.now() };
    saveDb(db);
    return db.team;
  },

  async presignAsset(input: {
    note_id: string;
    filename: string;
    content_type: string;
    size: number;
  }): Promise<{
    upload_url: string;
    method: 'PUT';
    headers: Record<string, string>;
    key: string;
    asset_id: string;
    expires_in: number;
    asset_visibility: Visibility;
  }> {
    await delay(100);
    const db = loadDb();
    const { item } = requireEdit(db, input.note_id);
    const assetId = uid('asset');
    const safeName = input.filename.replace(/[\\/:*?"<>|]/g, '-').slice(0, 120) || 'image';
    return {
      upload_url: `mock://upload/${assetId}`,
      method: 'PUT',
      headers: { 'Content-Type': input.content_type },
      key: `${db.me.user_uuid}/${input.note_id}/${assetId}/${safeName}`,
      asset_id: assetId,
      expires_in: 300,
      asset_visibility: item.visibility,
    };
  },

  async uploadMockAsset(assetId: string, file: Blob): Promise<{ preview_url: string; etag: string }> {
    await delay(220);
    const preview = file.size <= 300_000 ? await blobToDataUrl(file) : URL.createObjectURL(file);
    objectUrls.set(assetId, preview);
    return { preview_url: preview, etag: 'mock-upload' };
  },

  async registerAsset(input: {
    note_id: string;
    asset_id: string;
    key: string;
    etag: string;
    size: number;
    content_type: string;
    preview_url: string;
  }): Promise<{
    asset_id: string;
    url: string;
    visibility: Visibility;
    preview_url: string;
  }> {
    await delay(180);
    const db = loadDb();
    const { item } = requireEdit(db, input.note_id);
    const existing = db.assets[input.asset_id];
    if (existing) {
      const preview = assetUrl(existing) ?? input.preview_url;
      return {
        asset_id: existing.asset_id,
        url: existing.url ?? `asset://${existing.asset_id}`,
        visibility: existing.visibility,
        preview_url: preview,
      };
    }
    const asset: MockAsset = {
      asset_id: input.asset_id,
      owner_uuid: db.me.user_uuid,
      note_id: input.note_id,
      filename: input.key.split('/').pop() ?? 'image',
      content_type: input.content_type,
      size: input.size,
      preview_url: input.preview_url,
      visibility: item.visibility,
      created_at: Date.now(),
      ref_count: 0,
      public_ref_count: 0,
      url: `asset://${input.asset_id}`,
    };
    db.assets[input.asset_id] = asset;
    updateAssetRefs(db);
    saveDb(db);
    return {
      asset_id: asset.asset_id,
      url: asset.url ?? `asset://${asset.asset_id}`,
      visibility: asset.visibility,
      preview_url: assetUrl(asset) ?? input.preview_url,
    };
  },

  async getAssetUrl(assetId: string, noteId: string): Promise<{ url: string | null; expires_at: number | null }> {
    await delay(60);
    const db = loadDb();
    const { item } = accessFor(db, noteId);
    const asset = db.assets[assetId];
    if (!asset) throw new ApiError(404, '图片不存在', 'ASSET_NOT_FOUND');
    const referenced = item.content.includes(`asset://${assetId}`);
    if (asset.note_id !== noteId && !referenced) {
      throw new ApiError(403, '图片未被该笔记引用', 'ASSET_FORBIDDEN');
    }
    const url = assetUrl(asset);
    if (!url) throw new ApiError(404, '图片地址不可用', 'ASSET_NOT_FOUND');
    return { url, expires_at: null };
  },

  async listAssets(params: {
    note_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<{
    items: AssetItem[];
    page: number;
    page_size: number;
    has_more: boolean;
  }> {
    await delay(140);
    const db = loadDb();
    updateAssetRefs(db);
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.page_size ?? 20));
    const all = Object.values(db.assets)
      .filter((asset) => asset.owner_uuid === db.me.user_uuid)
      .filter((asset) => !params.note_id || asset.note_id === params.note_id)
      .sort((a, b) => b.created_at - a.created_at);
    const start = (page - 1) * pageSize;
    const items = all.slice(start, start + pageSize).map((asset) => ({
      asset_id: asset.asset_id,
      filename: asset.filename,
      size: asset.size,
      created_at: asset.created_at,
      visibility: asset.visibility,
      ref_count: asset.ref_count,
      public_ref_count: asset.public_ref_count,
      url: assetUrl(asset),
    }));
    return {
      items,
      page,
      page_size: pageSize,
      has_more: start + pageSize < all.length,
    };
  },

  async deleteAsset(assetId: string): Promise<void> {
    await delay(160);
    const db = loadDb();
    const asset = db.assets[assetId];
    if (!asset || asset.owner_uuid !== db.me.user_uuid) {
      throw new ApiError(404, '图片不存在', 'ASSET_NOT_FOUND');
    }
    if (asset.ref_count > 0) {
      throw new ApiError(409, '图片仍被笔记引用，请先解除引用', 'ASSET_IN_USE');
    }
    const preview = objectUrls.get(assetId);
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    objectUrls.delete(assetId);
    delete db.assets[assetId];
    saveDb(db);
  },

  async rebuildIndex(input: { user_uuid?: string } = {}): Promise<{ job_id: string }> {
    await delay(240);
    void input;
    const db = loadDb();
    const running = db.jobs.find((entry) => entry.type === 'rebuild_index' && entry.status === 'running');
    if (running) throw new ApiError(409, '相关任务进行中，请稍后再试', 'JOB_RUNNING');
    const job: Job = {
      job_id: uid('job'),
      type: 'rebuild_index',
      status: 'running',
      progress: 0,
      total: 1,
    };
    db.jobs.push(job);
    saveDb(db);
    window.setTimeout(() => {
      const next = loadDb();
      const target = next.jobs.find((entry) => entry.job_id === job.job_id);
      if (target) {
        target.status = 'done';
        target.progress = 1;
        saveDb(next);
      }
    }, 1600);
    return { job_id: job.job_id };
  },

  async getJob(jobId: string): Promise<Job> {
    await delay(80);
    const db = loadDb();
    const job = db.jobs.find((entry) => entry.job_id === jobId);
    if (!job) throw new ApiError(404, '任务不存在', 'JOB_NOT_FOUND');
    return job;
  },

  async getPublicNote(token: string): Promise<PublicNote> {
    await delay(140);
    const db = loadDb();
    const item = db.notes.find((entry) => entry.public_token === token && entry.visibility === 'public');
    if (!item) {
      throw new ApiError(404, '公开笔记不存在或已失效', 'PUBLIC_NOT_FOUND');
    }
    return {
      token,
      title: item.title,
      updated_at: item.updated_at,
      content: resolveAssetPlaceholders(db, item.content),
    };
  },
};

function snippet(content: string, needle: string) {
  const index = content.toLowerCase().indexOf(needle);
  if (index < 0) return content.slice(0, 90);
  const start = Math.max(0, index - 40);
  const end = Math.min(content.length, index + needle.length + 50);
  return `${start > 0 ? '…' : ''}${content.slice(start, end)}${end < content.length ? '…' : ''}`;
}
