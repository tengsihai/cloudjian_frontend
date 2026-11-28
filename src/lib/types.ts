export type Role = 'admin' | 'user';
export type Level = 'owner' | 'read' | 'edit';
export type Theme = 'light' | 'dark';
export type UiLang = 'zh-CN' | 'en' | 'ja';
export type EditorMode = 'ir' | 'split' | 'sv';
export type ListSort = 'updated' | 'created' | 'title';
export type Visibility = 'private' | 'public';

export interface Profile {
  ui_lang: UiLang;
  tz: string;
  theme: Theme;
  editor_mode: EditorMode;
  list_sort: ListSort;
  page_size: 20 | 50 | 100;
}

export interface SessionUser {
  user_uuid: string;
  username: string;
  role: Role;
  /** 首登/重置后必须改密；仅前端会话态，服务端以 Cognito 挑战为准 */
  must_change_password?: boolean;
}

export interface DirItem {
  path: string;
  relative_path: string | null;
  share_root_name: string | null;
  share_id: string | null;
  owner_name: string | null;
  level: Level;
  name: string;
  type: 'dir' | 'note';
  note_id: string | null;
  updated_at: number;
  has_children: boolean;
}

export interface NoteSummary {
  note_id: string;
  title: string;
  slug: string;
  category_path: string;
  relative_path: string | null;
  share_root_name: string | null;
  share_id: string | null;
  level: Level;
  tags: string[];
  updated_at: number;
  version: number;
  visibility: Visibility;
  own_share?: boolean;
}

export interface NoteDetail extends NoteSummary {
  owner_name: string | null;
  lang: string;
  created_at: number;
  content: string;
}

export interface NotePage {
  items: NoteSummary[];
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface ShareItem {
  share_id: string;
  owner_uuid: string;
  owner_name: string;
  grantee_uuid: string;
  grantee_name: string;
  target_type: 'note' | 'dir';
  target_note_id: string | null;
  target_dir: string | null;
  level: Exclude<Level, 'owner'>;
  created_at: number;
}

export interface ShareCandidate {
  user_uuid: string;
  username: string;
}

export interface VersionItem {
  ts: number;
  version: number;
  size: number;
  author: string;
}

export interface VersionDetail extends VersionItem {
  content: string;
}

export interface TrashItem {
  path: string;
  name: string;
  type: 'dir' | 'note';
  note_id: string | null;
  deleted_at: number;
  days_left: number;
  has_children: boolean;
}

export interface TrashPage {
  items: TrashItem[];
  total: number;
}

export interface SearchHit {
  note_id: string;
  title: string;
  category_path: string;
  relative_path: string | null;
  share_root_name: string | null;
  share_id: string | null;
  level: Level;
  snippet: string;
  origin: 'own' | 'shared' | 'public';
  owner_name: string | null;
  public_token: string | null;
  updated_at: number;
}

export interface AdminUser {
  user_uuid: string;
  username: string;
  email: string | null;
  role: Role;
  status: 'active' | 'disabled' | 'FORCE_CHANGE_PASSWORD' | 'deleting';
  created_at: number;
  last_login_at: number | null;
  progress?: { done: number; total: number } | null;
}

export interface TeamConfig {
  default_note_visibility: Visibility;
  force_private: boolean;
  version: number;
  updated_at: number;
}

export interface Job {
  job_id: string;
  type: string;
  status: 'running' | 'done' | 'failed' | 'partial';
  progress: number;
  total: number;
  error?: string | null;
  result?: Record<string, unknown> | null;
}

export interface AssetItem {
  asset_id: string;
  filename: string;
  size: number;
  created_at: number;
  visibility: Visibility;
  ref_count: number;
  public_ref_count: number;
  url: string | null;
}

export interface PublicNote {
  token: string;
  title: string;
  updated_at: number;
  content: string;
}

export interface ApiErrorShape {
  status: number;
  message: string;
  code?: string;
}
