import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dropdown, Table } from 'antd';
import type { MenuProps, TableColumnsType } from 'antd';
import { MoreOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { api } from '../lib/api';
import { formatDateTime, percent } from '../lib/format';
import type { AdminUser } from '../lib/types';
import { usePreferences } from '../app/PreferencesContext';
import { errorText, useToast } from '../app/ToastContext';
import { ConfirmDialog, Modal } from '../components/Overlays';
import { EmptyState } from '../components/EmptyState';

const STATUS_LABEL: Record<AdminUser['status'], string> = {
  active: '正常',
  disabled: '已禁用',
  FORCE_CHANGE_PASSWORD: '待改密',
  deleting: '删除中',
};

const STATUS_CLASS: Record<AdminUser['status'], string> = {
  active: 'ok',
  disabled: 'neutral',
  FORCE_CHANGE_PASSWORD: 'warn',
  deleting: 'bad',
};

export function AdminUsersPage() {
  const { uiLang } = usePreferences();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setQuery(q.trim());
      setPage(1);
    }, 220);
    return () => window.clearTimeout(id);
  }, [q]);

  const users = useQuery({
    queryKey: ['admin-users', query, status, page],
    queryFn: () => api.getAdminUsers({ q: query || undefined, status: status || undefined, page, page_size: 20 }),
    refetchInterval: 4000,
  });

  const patch = useMutation({
    mutationFn: ({ uuid, body }: { uuid: string; body: { status?: 'active' | 'disabled'; role?: 'admin' | 'user' } }) =>
      api.updateUser(uuid, body),
    onSuccess: () => {
      toast('用户已更新');
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => toast(`更新失败：${errorText(err)}`, 'error'),
  });

  const reset = useMutation({
    mutationFn: ({ uuid, password }: { uuid: string; password?: string }) => api.resetPassword(uuid, password),
    onSuccess: (result) => {
      setResetTarget((prev) => (prev ? { ...prev, new_password: result.new_password } : prev));
    },
    onError: (err) => toast(`重置失败：${errorText(err)}`, 'error'),
  });

  async function remove() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await api.deleteUser(deleteTarget.user_uuid);
      toast('已提交删除任务，进度见任务中心');
      setDeleteTarget(null);
      setTyped('');
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (err) {
      toast(`删除失败：${errorText(err)}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  const columns: TableColumnsType<AdminUser> = [
    {
      title: '用户名',
      dataIndex: 'username',
      render: (_value, row) => (
        <div>
          <b style={{ fontWeight: 500 }}>{row.username}</b>
          {row.email && <div className="caption">{row.email}</div>}
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      width: 90,
      render: (value: AdminUser['role']) => (
        <span className={`badge ${value === 'admin' ? 'info' : 'neutral'}`}>
          {value === 'admin' ? '管理员' : '成员'}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 180,
      render: (value: AdminUser['status'], row) => (
        <div>
          <span className={`badge ${STATUS_CLASS[value]}`}>{STATUS_LABEL[value]}</span>
          {value === 'deleting' && (
            <div style={{ marginTop: 6, width: 130 }}>
              {row.progress ? (
                <>
                  <div className="progress">
                    <span style={{ width: `${percent(row.progress.done, row.progress.total)}%` }} />
                  </div>
                  <span className="caption">{row.progress.done} / {row.progress.total}</span>
                </>
              ) : (
                <span className="caption">准备中</span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 160,
      render: (value: number) => <span className="caption">{formatDateTime(value, uiLang)}</span>,
    },
    {
      title: '最近登录',
      dataIndex: 'last_login_at',
      width: 160,
      render: (value: number | null) => <span className="caption">{formatDateTime(value, uiLang)}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 70,
      render: (_value, row) => (
        <RowActions
          user={row}
          onReset={() => {
            setResetTarget(row);
            reset.reset();
          }}
          onDelete={() => {
            setDeleteTarget(row);
            setTyped('');
          }}
          onPatch={(body) => patch.mutate({ uuid: row.user_uuid, body })}
        />
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="page-head">
        <div>
          <h1>用户管理</h1>
          <p>开号、禁用、调整角色与重置密码。</p>
        </div>
        <span className="sp" />
        <button type="button" className="btn primary" onClick={() => setCreateOpen(true)}>
          <PlusOutlined /> 新建用户
        </button>
      </div>

      <div className="toolbar">
        <div style={{ position: 'relative', width: 280 }}>
          <SearchOutlined style={{ position: 'absolute', left: 10, top: 9, color: 'var(--ink-3)' }} />
          <input
            className="field"
            style={{ paddingLeft: 32 }}
            placeholder="按用户名前缀搜索"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </div>
        <select className="select" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">全部状态</option>
          <option value="active">正常</option>
          <option value="disabled">已禁用</option>
          <option value="FORCE_CHANGE_PASSWORD">待改密</option>
          <option value="deleting">删除中</option>
        </select>
        <span className="sp" />
        <span className="caption">第 {page} 页</span>
        <button type="button" className="btn sm" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
          上一页
        </button>
        <button
          type="button"
          className="btn sm"
          disabled={!users.data?.has_more}
          onClick={() => setPage((prev) => prev + 1)}
        >
          下一页
        </button>
      </div>

      {users.isError ? (
        <EmptyState title="用户列表加载失败" hint={errorText(users.error)} />
      ) : (
        <Table
          rowKey="user_uuid"
          columns={columns}
          dataSource={users.data?.items ?? []}
          loading={users.isLoading}
          pagination={false}
          size="middle"
          locale={{ emptyText: '没有匹配的用户' }}
        />
      )}

      <CreateUserModal
        open={createOpen}
        busy={false}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (input) => {
          try {
            await api.createUser(input);
            toast('用户已创建，首次登录需设置新密码');
            setCreateOpen(false);
            await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
          } catch (err) {
            toast(`创建失败：${errorText(err)}`, 'error');
          }
        }}
      />

      <ResetPasswordModal
        user={resetTarget}
        busy={reset.isPending}
        onClose={() => {
          setResetTarget(null);
          reset.reset();
        }}
        onSubmit={(password) => resetTarget && reset.mutate({ uuid: resetTarget.user_uuid, password })}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除用户"
        body={
          deleteTarget
            ? `删除后不可恢复：${deleteTarget.username} 的全部内容会进入清理任务，公开链接立即失效，旧凭证失效。请输入目标用户名确认。`
            : ''
        }
        confirmText="删除用户"
        busy={busy}
        requireText={deleteTarget?.username}
        typed={typed}
        onTyped={setTyped}
        onClose={() => {
          setDeleteTarget(null);
          setTyped('');
        }}
        onConfirm={() => void remove()}
      />
    </div>
  );
}

function RowActions({
  user,
  onReset,
  onDelete,
  onPatch,
}: {
  user: AdminUser;
  onReset: () => void;
  onDelete: () => void;
  onPatch: (body: { status?: 'active' | 'disabled'; role?: 'admin' | 'user' }) => void;
}) {
  const items: MenuProps['items'] = [
    { key: 'reset', label: '重置密码' },
    {
      key: 'status',
      label: user.status === 'disabled' ? '启用账号' : '禁用账号',
      disabled: user.status === 'deleting',
    },
    {
      key: 'role',
      label: user.role === 'admin' ? '设为成员' : '设为管理员',
      disabled: user.status === 'deleting',
    },
  ];
  if (user.role === 'user' && user.status !== 'deleting') {
    items.push({ type: 'divider' }, { key: 'delete', label: '删除用户', danger: true });
  }
  return (
    <Dropdown
      trigger={['click']}
      placement="bottomRight"
      menu={{
        items,
        onClick: ({ key }) => {
          if (key === 'reset') onReset();
          if (key === 'delete') onDelete();
          if (key === 'status') onPatch({ status: user.status === 'disabled' ? 'active' : 'disabled' });
          if (key === 'role') onPatch({ role: user.role === 'admin' ? 'user' : 'admin' });
        },
      }}
    >
      <button type="button" className="icon-btn" aria-label="更多操作">
        <MoreOutlined />
      </button>
    </Dropdown>
  );
}

function CreateUserModal({
  open,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: { username: string; initial_password: string; email?: string; role: 'admin' | 'user' }) => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');

  useEffect(() => {
    if (open) {
      setUsername('');
      setPassword('');
      setEmail('');
      setRole('user');
    }
  }, [open]);

  const validPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,20}$/.test(password);
  const valid = !!username.trim() && validPassword;

  return (
    <Modal
      open={open}
      title="新建用户"
      width={480}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>取消</button>
          <button
            type="button"
            className="btn primary"
            disabled={!valid || busy}
            onClick={() =>
              onSubmit({
                username: username.trim(),
                initial_password: password,
                email: email.trim() || undefined,
                role,
              })
            }
          >
            创建用户
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <label className="label" htmlFor="admin-new-username">用户名</label>
          <input id="admin-new-username" className="field" value={username} onChange={(event) => setUsername(event.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="admin-new-password">初始密码</label>
          <input
            id="admin-new-password"
            className="field"
            type="text"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className="caption" style={{ marginTop: 5, color: password && !validPassword ? 'var(--danger)' : undefined }}>
            8–20 位，含大写、小写和数字。首次登录会强制改密。
          </p>
        </div>
        <div>
          <label className="label" htmlFor="admin-new-email">邮箱（选填）</label>
          <input id="admin-new-email" className="field" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div>
          <span className="label">角色</span>
          <select className="field" value={role} onChange={(event) => setRole(event.target.value as 'admin' | 'user')}>
            <option value="user">成员</option>
            <option value="admin">管理员</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}

function ResetPasswordModal({
  user,
  busy,
  onClose,
  onSubmit,
}: {
  user: (AdminUser & { new_password?: string | null }) | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (password?: string) => void;
}) {
  const { toast } = useToast();
  const [mode, setMode] = useState<'generate' | 'custom'>('generate');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user) {
      setMode('generate');
      setPassword('');
    }
  }, [user]);

  const result = user?.new_password;
  const customValid = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,20}$/.test(password);

  return (
    <Modal
      open={!!user}
      title={result ? '新密码（仅显示一次）' : `重置密码 · ${user?.username ?? ''}`}
      width={440}
      onClose={onClose}
      footer={
        result ? (
          <button type="button" className="btn primary" onClick={onClose}>我已保存</button>
        ) : (
          <>
            <button type="button" className="btn" onClick={onClose}>取消</button>
            <button
              type="button"
              className="btn primary"
              disabled={busy || (mode === 'custom' && !customValid)}
              onClick={() => onSubmit(mode === 'custom' ? password : undefined)}
            >
              {busy ? '重置中…' : '重置密码'}
            </button>
          </>
        )
      }
    >
      {result ? (
        <div>
          <p className="caption" style={{ marginBottom: 10 }}>
            关闭后无法再次查看，请立即复制并安全地交给用户。用户下次登录需改密。
          </p>
          <div className="row" style={{ gap: 8 }}>
            <code className="field" style={{ fontFamily: 'var(--mono)' }}>{result}</code>
            <button
              type="button"
              className="btn"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(result);
                  toast('已复制');
                } catch {
                  toast('复制失败，请手动选择复制', 'error');
                }
              }}
            >
              复制
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          <label className="row" style={{ gap: 8 }}>
            <input type="radio" checked={mode === 'generate'} onChange={() => setMode('generate')} />
            由服务端生成随机密码
          </label>
          <label className="row" style={{ gap: 8 }}>
            <input type="radio" checked={mode === 'custom'} onChange={() => setMode('custom')} />
            自定义新密码
          </label>
          {mode === 'custom' && (
            <div>
              <input
                className="field"
                type="text"
                value={password}
                placeholder="8–20 位，含大写、小写和数字"
                onChange={(event) => setPassword(event.target.value)}
              />
              {password && !customValid && (
                <p className="caption" style={{ color: 'var(--danger)', marginTop: 5 }}>密码不满足规则</p>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
