import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return <ErrorPage code="404" title="页面或内容不存在" hint="这个地址不存在，或者内容已被彻底删除。" />;
}

export function ForbiddenPage() {
  return <ErrorPage code="403" title="没有访问权限" hint="你的角色或资源权限不足。" />;
}

function ErrorPage({ code, title, hint }: { code: string; title: string; hint: string }) {
  return (
    <div className="error-page">
      <div>
        <div className="caption" style={{ letterSpacing: '0.12em' }}>CLOUDJIAN</div>
        <h1 className="h1" style={{ margin: '18px 0 8px' }}>{code}</h1>
        <p style={{ color: 'var(--ink-2)' }}>{title}</p>
        <p className="caption" style={{ margin: '4px 0 24px' }}>{hint}</p>
        <Link to="/notes" className="btn primary">返回我的笔记</Link>
      </div>
    </div>
  );
}
