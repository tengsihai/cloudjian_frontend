import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { hasPendingPasswordChallenge, validatePassword } from '../lib/auth';

/**
 * 首登 / 管理员重置密码后的强制改密页。
 * 真实环境由 Cognito `NEW_PASSWORD_REQUIRED` 挑战完成，前端直连 Cognito；
 * mock 阶段由 `completePasswordChange` 在本地完成同等状态迁移。
 */
export function ChangePasswordPage() {
  const { session, changePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending = hasPendingPasswordChallenge();
  if (!session && !pending) return <Navigate to="/login" replace />;
  if (session && !session.mustChangePassword) return <Navigate to="/notes" replace />;

  const policyError = password ? validatePassword(password) : null;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = !busy && !policyError && !mismatch && password.length > 0 && confirm.length > 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await changePassword(password);
      navigate('/notes', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '改密失败，请稍后重试');
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
        <h1>先设置一个新密码。</h1>
        <p>首次登录或管理员重置密码后，需要改密才能进入工作台。</p>
      </section>
      <section className="login-right">
        <form className="login-card" onSubmit={(event) => void submit(event)}>
          <h2>设置新密码</h2>
          <p className="sub">账号：{session?.user.username ?? '新账号'}</p>

          {error && (
            <div className="banner error" style={{ border: 0, borderRadius: 'var(--r-sm)', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div className="form-row" style={{ marginBottom: 14 }}>
            <label className="label" htmlFor="new-password">新密码</label>
            <div style={{ position: 'relative' }}>
              <input
                id="new-password"
                className="field"
                style={{ paddingRight: 58 }}
                type={visible ? 'text' : 'password'}
                value={password}
                autoFocus
                autoComplete="new-password"
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
            <p className="caption" style={{ marginTop: 6 }}>
              8–20 位，需包含大写字母、小写字母和数字。
            </p>
            {policyError && password.length > 0 && (
              <p className="caption" style={{ color: 'var(--danger, #c0392b)', marginTop: 4 }}>{policyError}</p>
            )}
          </div>

          <div className="form-row" style={{ marginBottom: 22 }}>
            <label className="label" htmlFor="confirm-password">确认新密码</label>
            <input
              id="confirm-password"
              className="field"
              type={visible ? 'text' : 'password'}
              value={confirm}
              autoComplete="new-password"
              disabled={busy}
              onChange={(event) => setConfirm(event.target.value)}
            />
            {mismatch && (
              <p className="caption" style={{ color: 'var(--danger, #c0392b)', marginTop: 4 }}>两次输入不一致</p>
            )}
          </div>

          <button className="btn primary" type="submit" disabled={!canSubmit} style={{ width: '100%' }}>
            {busy ? '提交中…' : '设置新密码并进入'}
          </button>

          <div className="login-hint">改密前不能进入任何业务页面，也不能跳过。</div>
        </form>
      </section>
    </div>
  );
}
