import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../app/AuthContext';
import { useTaskCenter } from '../app/TaskCenter';
import { errorText, useToast } from '../app/ToastContext';
import { JOB_TYPE_LABELS } from '../lib/jobLabels';

export function AdminIndexPage() {
  const { session } = useAuth();
  const { track } = useTaskCenter();
  const { toast } = useToast();
  const [scope, setScope] = useState<'all' | 'user'>('all');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const { job_id } = await api.rebuildIndex(
        scope === 'user' && session ? { user_uuid: session.user.user_uuid } : {},
      );
      track(job_id, JOB_TYPE_LABELS.rebuild_index);
      toast('重建索引任务已提交，可在任务中心查看进度');
    } catch (err) {
      toast(`提交失败：${errorText(err)}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-page" style={{ maxWidth: 800 }}>
      <div className="page-head">
        <div>
          <h1>索引重建</h1>
          <p>从正文重新生成列表、搜索、引用等派生索引，不修改笔记正文。</p>
        </div>
        <span className="sp" />
        <button type="button" className="btn primary" disabled={busy} onClick={() => void submit()}>
          {busy ? '提交中…' : '开始重建'}
        </button>
      </div>

      <div className="banner" style={{ borderRadius: 'var(--r-sm)', border: 0, marginBottom: 14 }}>
        只重建派生索引（<code>index.parquet</code>、搜索段、<code>_refs.json</code>、<code>note_map</code> 等），<b>绝不修改正文</b>。
        同一时刻全局只允许一个重建任务；已有任务时提交会返回 409。
      </div>

      <div className="card">
        <div className="card-title">重建范围</div>
        <p className="caption" style={{ marginBottom: 12 }}>全量适用于索引大面积损坏；单用户用于局部修复。</p>
        <div className="row" style={{ gap: 22 }}>
          <label className="row" style={{ gap: 6, cursor: 'pointer' }}>
            <input type="radio" name="scope" checked={scope === 'all'} onChange={() => setScope('all')} />
            全量（所有用户）
          </label>
          <label className="row" style={{ gap: 6, cursor: 'pointer' }}>
            <input type="radio" name="scope" checked={scope === 'user'} onChange={() => setScope('user')} />
            仅当前用户（{session?.user.username}）
          </label>
        </div>
      </div>

      <div className="card">
        <div className="card-title">执行说明</div>
        <ul className="caption" style={{ paddingLeft: 18, lineHeight: 1.9 }}>
          <li>任务在后台分批执行，进度在右下角任务中心查看。</li>
          <li>重建期间可以正常读写笔记；重建结果是权威全量。</li>
          <li>完成后刷新列表与搜索即可，正文与历史版本不变。</li>
        </ul>
      </div>
    </div>
  );
}
