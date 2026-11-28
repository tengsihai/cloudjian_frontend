import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Dropdown, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import {
  BulbOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  FileTextOutlined,
  GlobalOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SettingOutlined,
  ShareAltOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { api } from '../lib/api';
import { canNavigate } from '../lib/events';
import { formatTime } from '../lib/format';
import { baseName } from '../lib/paths';
import type { UiLang } from '../lib/types';
import { useAuth } from '../app/AuthContext';
import { usePreferences } from '../app/PreferencesContext';
import { TaskCenterProvider } from '../app/TaskCenter';
import { useToast } from '../app/ToastContext';
import { TrashTree } from './SidebarTree';
import { SearchPalette } from './SearchPalette';

const LANG_LABEL: Record<UiLang, string> = {
  'zh-CN': '中文',
  en: 'English',
  ja: '日本語',
};

export function AppShell() {
  const { session, signOut } = useAuth();
  const { uiLang, theme, applyTheme, saveProfile } = usePreferences();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  const trash = useQuery({ queryKey: ['trash', 'count'], queryFn: () => api.getTrash() });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const section = useMemo(() => {
    if (location.pathname.startsWith('/shared')) return 'shared';
    if (location.pathname.startsWith('/trash')) return 'trash';
    if (location.pathname.startsWith('/settings')) return 'settings';
    if (location.pathname.startsWith('/admin')) return 'admin';
    return 'notes';
  }, [location.pathname]);

  const crumb = useMemo(() => {
    const dir = new URLSearchParams(location.search).get('dir') ?? '';
    const map: Record<string, string> = {
      notes: '我的笔记',
      shared: '共享给我',
      trash: '回收站',
      settings: '个人设置',
      admin: location.pathname.endsWith('/team')
        ? '管理后台 · 团队设置'
        : location.pathname.endsWith('/index')
          ? '管理后台 · 索引重建'
          : '管理后台 · 用户管理',
    };
    const root = map[section];
    if (dir && section !== 'trash') return { root, leaf: baseName(dir) };
    return { root, leaf: '' };
  }, [section, location.pathname, location.search]);

  const langMenu: MenuProps = {
    items: (Object.keys(LANG_LABEL) as UiLang[]).map((key) => ({
      key,
      label: (
        <span className="row" style={{ gap: 10, minWidth: 110 }}>
          {LANG_LABEL[key]}
          <span className="sp" />
          {uiLang === key ? '✓' : ''}
        </span>
      ),
    })),
    onClick: async ({ key }) => {
      try {
        await saveProfile({ ui_lang: key as UiLang });
        document.documentElement.lang = key;
        toast(`界面语言已切换为 ${LANG_LABEL[key as UiLang]}`);
      } catch {
        toast('语言切换失败，请稍后重试', 'error');
      }
    },
  };

  const userMenu: MenuProps = {
    items: [
      { key: 'name', label: <span className="muted">{session?.user.username}</span>, disabled: true },
      { type: 'divider' },
      { key: 'settings', icon: <SettingOutlined />, label: '个人设置' },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' },
    ],
    onClick: ({ key }) => {
      if (key === 'settings') navigate('/settings');
      if (key === 'logout') {
        signOut();
        navigate('/login', { replace: true });
      }
    },
  };

  const isAdmin = session?.user.role === 'admin';
  const trashCount = trash.data?.total ?? 0;

  return (
    <TaskCenterProvider>
      <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">云</div>
          <div className="brand-name">
            云笺
            <small>CloudJian</small>
          </div>
        </div>

        <nav className="nav">
          <Link
            to="/notes"
            className={section === 'notes' ? 'on' : ''}
            onClick={(event) => {
              if (!canNavigate()) event.preventDefault();
            }}
          >
            <FileTextOutlined />
            我的笔记
          </Link>
          <Link
            to="/shared"
            className={section === 'shared' ? 'on' : ''}
            onClick={(event) => {
              if (!canNavigate()) event.preventDefault();
            }}
          >
            <ShareAltOutlined />
            共享给我
          </Link>
          <Link
            to="/trash"
            className={section === 'trash' ? 'on' : ''}
            onClick={(event) => {
              if (!canNavigate()) event.preventDefault();
            }}
          >
            <DeleteOutlined />
            回收站
            <span className="count">{trashCount}</span>
          </Link>
          <Link
            to="/settings"
            className={section === 'settings' ? 'on' : ''}
            onClick={(event) => {
              if (!canNavigate()) event.preventDefault();
            }}
          >
            <SettingOutlined />
            个人设置
          </Link>
          {isAdmin && (
            <Link
              to="/admin/users"
              className={section === 'admin' ? 'on' : ''}
              onClick={(event) => {
                if (!canNavigate()) event.preventDefault();
              }}
            >
              <SafetyCertificateOutlined />
              管理后台
            </Link>
          )}
        </nav>

        {section === 'trash' && <div className="nav-grp">回收站目录</div>}
        {section === 'settings' && <div className="nav-grp">偏好</div>}
        {section === 'admin' && <div className="nav-grp">管理</div>}

        {section === 'trash' && <TrashTree />}
        {section === 'settings' && (
          <div className="tree">
            <p className="caption" style={{ padding: '4px 10px' }}>
              偏好会同步到你的所有设备。
            </p>
          </div>
        )}
        {section === 'admin' && (
          <div className="tree">
            <Link className={`tree-node${location.pathname === '/admin/users' ? ' on' : ''}`} to="/admin/users">
              <span className="tree-caret" />
              <TeamOutlined />
              <span className="tree-label">用户管理</span>
            </Link>
            <Link className={`tree-node${location.pathname === '/admin/team' ? ' on' : ''}`} to="/admin/team">
              <span className="tree-caret" />
              <SafetyCertificateOutlined />
              <span className="tree-label">团队设置</span>
            </Link>
            <Link className={`tree-node${location.pathname === '/admin/index' ? ' on' : ''}`} to="/admin/index">
              <span className="tree-caret" />
              <DatabaseOutlined />
              <span className="tree-label">索引重建</span>
            </Link>
          </div>
        )}

        <Dropdown menu={userMenu} trigger={['click']} placement="topLeft">
          <button type="button" className="side-user" style={{ width: '100%', textAlign: 'left' }}>
            <div className="avatar">{session?.user.username.slice(0, 1).toUpperCase()}</div>
            <div className="meta">
              <b>{session?.user.username}</b>
              <span>{isAdmin ? '管理员' : '成员'}</span>
            </div>
            <span className="sp" />
            <UserOutlined />
          </button>
        </Dropdown>
      </aside>

      <div className="main">
        <SessionBar />
        <header className="topbar">
          <div className="crumb">
            {crumb.root}
            {crumb.leaf && (
              <>
                {' / '}
                <b>{crumb.leaf}</b>
              </>
            )}
          </div>
          <span className="sp" />
          <button type="button" className="search-entry" onClick={() => setSearchOpen(true)}>
            <SearchOutlined />
            搜索笔记
            <span className="kbd">Ctrl K</span>
          </button>
          <div className="top-actions">
            <Dropdown menu={langMenu} trigger={['click']} placement="bottomRight">
              <Tooltip title={`界面语言：${LANG_LABEL[uiLang]}`}>
                <button type="button" className="icon-btn" aria-label="界面语言">
                  <GlobalOutlined />
                </button>
              </Tooltip>
            </Dropdown>
            <Tooltip title={theme === 'light' ? '切换到暗色' : '切换到浅色'}>
              <button
                type="button"
                className="icon-btn"
                aria-label="切换主题"
                onClick={async () => {
                  const next = theme === 'light' ? 'dark' : 'light';
                  applyTheme(next);
                  try {
                    await saveProfile({ theme: next });
                  } catch {
                    toast('主题偏好保存失败，本次仅在本机生效', 'error');
                  }
                }}
              >
                <BulbOutlined />
              </button>
            </Tooltip>
            <span className="caption" style={{ marginLeft: 6 }}>
              {formatTime(Date.now(), uiLang)}
            </span>
          </div>
        </header>

        <Outlet />
      </div>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </TaskCenterProvider>
  );
}

function SessionBar() {
  const { session } = useAuth();
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((value) => value + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);
  if (!session) return null;
  const remaining = session.expiresAt - Date.now();
  if (remaining > 10 * 60 * 1000) return null;
  const minutes = Math.max(0, Math.ceil(remaining / 60_000));
  return (
    <div className="session-bar">
      会话将在 {minutes} 分钟后结束
      <span className="sp" />
      <button
        type="button"
        className="btn sm"
        onClick={() => window.dispatchEvent(new CustomEvent('cloudjian:save'))}
      >
        立即保存
      </button>
    </div>
  );
}
