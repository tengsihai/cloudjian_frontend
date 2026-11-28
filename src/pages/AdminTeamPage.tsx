import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Switch } from 'antd';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import type { TeamConfig, Visibility } from '../lib/types';
import { usePreferences } from '../app/PreferencesContext';
import { errorText, useToast } from '../app/ToastContext';

export function AdminTeamPage() {
  const queryClient = useQueryClient();
  const { uiLang } = usePreferences();
  const { toast } = useToast();
  const config = useQuery({ queryKey: ['team-config'], queryFn: () => api.getTeamConfig() });
  const [draft, setDraft] = useState<TeamConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config.data) setDraft(config.data);
  }, [config.data]);

  if (!draft) {
    return (
      <div className="admin-page">
        <div className="skeleton" style={{ width: 180, height: 28 }} />
        <div className="skeleton" style={{ width: '100%', height: 180, marginTop: 22 }} />
      </div>
    );
  }

  const dirty = !!config.data &&
    (draft.default_note_visibility !== config.data.default_note_visibility ||
      draft.force_private !== config.data.force_private);

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const next = await api.updateTeamConfig({
        default_note_visibility: draft.default_note_visibility,
        force_private: draft.force_private,
      });
      setDraft(next);
      await queryClient.invalidateQueries({ queryKey: ['team-config'] });
      toast('团队设置已保存，生效可能有几分钟延迟');
    } catch (err) {
      toast(`保存失败：${errorText(err)}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-page" style={{ maxWidth: 800 }}>
      <div className="page-head">
        <div>
          <h1>团队设置</h1>
          <p>配置新建笔记的默认可见性与公开限制。</p>
        </div>
        <span className="sp" />
        <span className={`save-state ${dirty ? 'dirty' : 'saved'}`}>{dirty ? '有未保存修改' : '已保存'}</span>
        <button type="button" className="btn primary" disabled={!dirty || saving} onClick={() => void save()}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>

      <div className="banner" style={{ borderRadius: 'var(--r-sm)', border: 0, marginBottom: 14 }}>
        团队内生效可能有几分钟延迟。已有内容不会被静默迁移。
      </div>

      <div className="card">
        <div className="card-title">新建笔记默认可见性</div>
        <p className="caption" style={{ marginBottom: 12 }}>只影响之后新建的笔记，不迁移存量内容。</p>
        <div className="row" style={{ gap: 22 }}>
          {(['private', 'public'] as Visibility[]).map((value) => (
            <label key={value} className="row" style={{ gap: 6, cursor: 'pointer' }}>
              <input
                type="radio"
                name="visibility"
                checked={draft.default_note_visibility === value}
                onChange={() => setDraft({ ...draft, default_note_visibility: value })}
              />
              {value === 'private' ? '私有（仅自己可见）' : '公开（拿到链接即可访问）'}
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="row">
          <div>
            <div className="card-title" style={{ marginBottom: 4 }}>禁止公开</div>
            <p className="caption">开启后只禁止新的公开操作，不迁移、不删除已经公开的内容。</p>
          </div>
          <span className="sp" />
          <Switch
            checked={draft.force_private}
            onChange={(checked) => setDraft({ ...draft, force_private: checked })}
          />
        </div>
        {draft.force_private && (
          <div className="banner" style={{ marginTop: 14, borderRadius: 'var(--r-sm)', border: 0 }}>
            已禁止新的公开操作；已公开的链接仍然有效，需要 owner 手动设为私有。
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">当前配置</div>
        <dl className="kv">
          <dt>默认可见性</dt>
          <dd>{draft.default_note_visibility === 'public' ? '公开' : '私有'}</dd>
          <dt>禁止公开</dt>
          <dd>{draft.force_private ? '开启' : '关闭'}</dd>
          <dt>版本号</dt>
          <dd>v{draft.version}</dd>
          <dt>最近更新</dt>
          <dd>{draft.updated_at ? formatDateTime(draft.updated_at, uiLang) : '—'}</dd>
        </dl>
      </div>
    </div>
  );
}
