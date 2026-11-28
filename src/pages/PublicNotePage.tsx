import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { renderMarkdown } from '../lib/markdown';
import { usePreferences } from '../app/PreferencesContext';
import { errorText } from '../app/ToastContext';
import { EmptyState } from '../components/EmptyState';

export function PublicNotePage() {
  const { token = '' } = useParams();
  const { uiLang } = usePreferences();
  const query = useQuery({
    queryKey: ['public-note', token],
    queryFn: () => api.getPublicNote(token),
    retry: false,
  });

  if (query.isLoading) {
    return (
      <div className="public-page">
        <div className="skeleton" style={{ width: 140, height: 24, marginTop: 8 }} />
        <div className="skeleton" style={{ width: '70%', height: 32, marginTop: 34 }} />
        <div className="skeleton" style={{ width: '100%', height: 240, marginTop: 20 }} />
      </div>
    );
  }

  if (query.isError || !query.data) {
    const status = (query.error as { status?: number } | null)?.status;
    return (
      <div className="error-page">
        <div className="public-page" style={{ maxWidth: 520 }}>
          <div className="public-top">
            <b>云笺</b>
            <span className="sp" />
            <span className="caption">CloudJian</span>
          </div>
          <EmptyState
            title={status === 429 ? '请求过于频繁，请稍后再试' : '链接无效或已失效'}
            hint={status === 429 ? '请等待片刻后重新打开链接。' : errorText(query.error)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="public-page">
      <div className="public-top">
        <b>云笺</b>
        <span className="caption">CloudJian</span>
      </div>
      <article>
        <h1 className="h1" style={{ marginTop: 36, marginBottom: 8 }}>{query.data.title}</h1>
        <p className="caption" style={{ marginBottom: 30 }}>
          更新于 {formatDateTime(query.data.updated_at, uiLang)}
        </p>
        <div
          className="md-preview"
          style={{ padding: 0, fontSize: 16, lineHeight: 1.85 }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(query.data.content) }}
        />
      </article>
      <footer className="public-foot">内容由云笺用户公开分享</footer>
    </div>
  );
}
