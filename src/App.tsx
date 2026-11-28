import { useState } from 'react';

// 构建期由流水线注入（见 .github/workflows/deploy.yml），本地 dev 时为空。
const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? '',
  userPoolId: import.meta.env.VITE_USER_POOL_ID ?? '',
  clientId: import.meta.env.VITE_CLIENT_ID ?? '',
  buildSha: import.meta.env.VITE_BUILD_SHA ?? 'dev',
  buildTime: import.meta.env.VITE_BUILD_TIME ?? '-',
};

type Probe = { state: 'idle' | 'loading' | 'done' | 'error'; detail: string };

export default function App() {
  const [probe, setProbe] = useState<Probe>({ state: 'idle', detail: '' });

  // 不带头请求受保护接口：401 说明「静态资源已上线 + 网关访问控制生效」。
  async function checkGateway() {
    if (!env.apiUrl) {
      setProbe({ state: 'error', detail: '未注入 VITE_API_URL（本地开发属正常）' });
      return;
    }
    setProbe({ state: 'loading', detail: '' });
    try {
      const res = await fetch(`${env.apiUrl}/profile`, { headers: { Accept: 'application/json' } });
      setProbe({ state: 'done', detail: `HTTP ${res.status}（无令牌应为 401）` });
    } catch (err) {
      setProbe({ state: 'error', detail: String(err) });
    }
  }

  return (
    <main className="page">
      <h1>CloudJian</h1>
      <p className="lede">前端脚手架：流水线把 dist/ 推到 S3 的 web/ 前缀并失效 CDN。</p>

      <section className="card">
        <h2>构建信息</h2>
        <dl>
          <dt>commit</dt>
          <dd>{env.buildSha}</dd>
          <dt>构建时间</dt>
          <dd>{env.buildTime}</dd>
          <dt>API</dt>
          <dd>{env.apiUrl || '（未注入）'}</dd>
          <dt>User Pool</dt>
          <dd>{env.userPoolId || '（未注入）'}</dd>
          <dt>Client ID</dt>
          <dd>{env.clientId || '（未注入）'}</dd>
        </dl>
      </section>

      <section className="card">
        <h2>网关联通性</h2>
        <button onClick={checkGateway} disabled={probe.state === 'loading'}>
          {probe.state === 'loading' ? '请求中…' : '请求 GET /profile（不带令牌）'}
        </button>
        {probe.detail && <p className="probe">{probe.detail}</p>}
      </section>
    </main>
  );
}
