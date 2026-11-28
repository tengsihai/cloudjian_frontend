import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { DEMO_LOGIN_HINT, PasswordChangeRequiredError } from '../lib/auth';

export function LoginPage() {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = new URLSearchParams(location.search).get('redirect') || '/notes';
  if (session) return <Navigate to={session.mustChangePassword ? '/change-password' : from} replace />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const next = await signIn(username, password);
      navigate(next.mustChangePassword ? '/change-password' : from, { replace: true });
    } catch (err) {
      if (err instanceof PasswordChangeRequiredError) {
        navigate('/change-password', { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : '登录失败，请稍后重试');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="standalone">
      <section className="login-left">
        <div className="lg-brand">
          <div className="brand-mark">云</div>
          <b>云笺</b>
        </div>
        <h1>打开就能写，写完能共享，删了能找回。</h1>
        <p>为小团队准备的 Markdown 笔记工作台：专注写作、清楚的权限、完整的历史版本。</p>
      </section>
      <section className="login-right">
        <form className="login-card" onSubmit={submit}>
          <h2>登录云笺</h2>
          <p className="sub">使用团队管理员发放的账号登录。</p>

          {error && (
            <div className="banner error" style={{ border: 0, borderRadius: 'var(--r-sm)', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div className="form-row" style={{ marginBottom: 14 }}>
            <label className="label" htmlFor="username">用户名</label>
            <input
              id="username"
              className="field"
              value={username}
              autoFocus
              autoComplete="username"
              disabled={busy}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>

          <div className="form-row" style={{ marginBottom: 22 }}>
            <label className="label" htmlFor="password">密码</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                className="field"
                style={{ paddingRight: 58 }}
                type={visible ? 'text' : 'password'}
                value={password}
                autoComplete="current-password"
                disabled={busy}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="btn text sm"
                style={{ position: 'absolute', right: 5, top: 3 }}
                onClick={() => setVisible((prev) => !prev)}
              >
                {visible ? '隐藏' : '显示'}
              </button>
            </div>
          </div>

          <button className="btn primary" type="submit" disabled={busy || !username || !password} style={{ width: '100%' }}>
            {busy ? '登录中…' : '登录'}
          </button>

          {DEMO_LOGIN_HINT && (
            <div className="login-hint">演示账号：{DEMO_LOGIN_HINT}</div>
          )}
        </form>
      </section>
    </div>
  );
}
