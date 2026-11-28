import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { EditorMode, ListSort, Profile, Theme, UiLang } from '../lib/types';
import { useAuth } from '../app/AuthContext';
import { usePreferences } from '../app/PreferencesContext';
import { errorText, useToast } from '../app/ToastContext';

type Tab = 'general' | 'editor' | 'security';

const LANG_OPTIONS: Array<{ value: UiLang; label: string }> = [
  { value: 'zh-CN', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
];

const TZ_OPTIONS = ['Asia/Shanghai', 'Asia/Tokyo', 'UTC', 'Europe/London', 'America/New_York'];

export function SettingsPage() {
  const navigate = useNavigate();
  const { profile, loaded, saveProfile, applyTheme } = usePreferences();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('general');
  const [draft, setDraft] = useState<Profile>(profile);
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef(false);
  const savedThemeRef = useRef<Theme>(profile.theme);

  useEffect(() => {
    if (loaded) setDraft(profile);
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    savedThemeRef.current = profile.theme;
  }, [profile.theme]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  useEffect(
    () => () => {
      if (dirtyRef.current) applyTheme(savedThemeRef.current);
    },
    [applyTheme],
  );

  async function save() {
    setSaving(true);
    try {
      await saveProfile(draft);
      toast('设置已保存');
    } catch (err) {
      toast(`保存失败：${errorText(err)}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-page">
      <div className="page-head" style={{ alignItems: 'center' }}>
        <div>
          <h1>个人设置</h1>
          <p>偏好会同步到你的所有设备。</p>
        </div>
        <span className="sp" />
        <span className={`save-state ${dirty ? 'dirty' : 'saved'}`}>
          {saving ? '保存中…' : dirty ? '有未保存修改' : '已保存'}
        </span>
        <button type="button" className="btn primary" disabled={!dirty || saving} onClick={() => void save()}>
          保存设置
        </button>
      </div>

      <div className="settings-layout">
        <nav className="settings-nav">
          <button type="button" className={tab === 'general' ? 'on' : ''} onClick={() => setTab('general')}>
            通用
          </button>
          <button type="button" className={tab === 'editor' ? 'on' : ''} onClick={() => setTab('editor')}>
            编辑器
          </button>
          <button type="button" className={tab === 'security' ? 'on' : ''} onClick={() => setTab('security')}>
            账户安全
          </button>
        </nav>

        <div>
          {tab === 'general' && (
            <>
              <div className="card">
                <div className="card-title">界面</div>
                <div style={{ display: 'grid', gap: 18 }}>
                  <div>
                    <span className="label">界面语言</span>
                    <select
                      className="field"
                      value={draft.ui_lang}
                      onChange={(event) => setDraft({ ...draft, ui_lang: event.target.value as UiLang })}
                    >
                      {LANG_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <p className="caption" style={{ marginTop: 5 }}>保存后生效，日期与数字按所选语言格式化。</p>
                  </div>
                  <div>
                    <span className="label">时区</span>
                    <select
                      className="field"
                      value={draft.tz}
                      onChange={(event) => setDraft({ ...draft, tz: event.target.value })}
                    >
                      {TZ_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="label">主题</span>
                    <div className="row" style={{ gap: 20 }}>
                      {(['light', 'dark'] as Theme[]).map((value) => (
                        <label key={value} className="row" style={{ gap: 6, cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="theme"
                            checked={draft.theme === value}
                            onChange={() => {
                              setDraft({ ...draft, theme: value });
                              applyTheme(value);
                            }}
                          />
                          {value === 'light' ? '浅色（默认）' : '暗色'}
                        </label>
                      ))}
                    </div>
                    <p className="caption" style={{ marginTop: 5 }}>切换立即预览，保存后同步到其他设备。</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === 'editor' && (
            <div className="card">
              <div className="card-title">编辑器与列表</div>
              <div style={{ display: 'grid', gap: 18 }}>
                <div>
                  <span className="label">默认编辑模式</span>
                  <select
                    className="field"
                    value={draft.editor_mode}
                    onChange={(event) => setDraft({ ...draft, editor_mode: event.target.value as EditorMode })}
                  >
                    <option value="ir">所见即所得</option>
                    <option value="split">分屏</option>
                    <option value="sv">纯文本</option>
                  </select>
                </div>
                <div>
                  <span className="label">列表默认排序</span>
                  <select
                    className="field"
                    value={draft.list_sort}
                    onChange={(event) => setDraft({ ...draft, list_sort: event.target.value as ListSort })}
                  >
                    <option value="updated">更新时间</option>
                    <option value="created">创建时间</option>
                    <option value="title">标题</option>
                  </select>
                  <p className="caption" style={{ marginTop: 5 }}>
                    标题排序由服务端使用 Intl.Collator 定序，前端不二次排序。
                  </p>
                </div>
                <div>
                  <span className="label">每页条数</span>
                  <select
                    className="field"
                    value={draft.page_size}
                    onChange={(event) =>
                      setDraft({ ...draft, page_size: Number(event.target.value) as 20 | 50 | 100 })
                    }
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {tab === 'security' && (
            <PasswordForm
              onDone={async () => {
                toast('密码已修改，请重新登录');
                signOut();
                navigate('/login', { replace: true });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordForm({ onDone }: { onDone: () => Promise<void> | void }) {
  const { toast } = useToast();
  const [previous, setPrevious] = useState('');
  const [proposed, setProposed] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const rules = {
    length: proposed.length >= 8 && proposed.length <= 20,
    upper: /[A-Z]/.test(proposed),
    lower: /[a-z]/.test(proposed),
    digit: /\d/.test(proposed),
  };
  const valid = rules.length && rules.upper && rules.lower && rules.digit && proposed === confirm && !!previous;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      await api.changePassword(previous, proposed);
      await onDone();
    } catch (err) {
      toast(`修改失败：${errorText(err)}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="card-title">修改密码</div>
      <p className="caption" style={{ marginBottom: 16 }}>
        修改成功后所有设备会退出登录，旧凭证最长 60 秒内失效。
      </p>
      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <label className="label" htmlFor="prev-password">当前密码</label>
          <input
            id="prev-password"
            className="field"
            type="password"
            autoComplete="current-password"
            value={previous}
            onChange={(event) => setPrevious(event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="new-password">新密码</label>
          <input
            id="new-password"
            className="field"
            type="password"
            autoComplete="new-password"
            value={proposed}
            onChange={(event) => setProposed(event.target.value)}
          />
          <ul style={{ listStyle: 'none', marginTop: 8, display: 'grid', gap: 4 }}>
            <Rule ok={rules.length}>8–20 位</Rule>
            <Rule ok={rules.upper}>包含大写字母</Rule>
            <Rule ok={rules.lower}>包含小写字母</Rule>
            <Rule ok={rules.digit}>包含数字</Rule>
          </ul>
        </div>
        <div>
          <label className="label" htmlFor="confirm-password">确认新密码</label>
          <input
            id="confirm-password"
            className="field"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
          {confirm && confirm !== proposed && (
            <p className="caption" style={{ color: 'var(--danger)', marginTop: 5 }}>两次输入的密码不一致</p>
          )}
        </div>
        <div>
          <button type="submit" className="btn primary" disabled={!valid || busy}>
            {busy ? '修改中…' : '修改密码'}
          </button>
        </div>
      </div>
    </form>
  );
}

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="caption" style={{ color: ok ? 'var(--success-ink)' : 'var(--ink-3)' }}>
      {ok ? '✓' : '○'} {children}
    </li>
  );
}
