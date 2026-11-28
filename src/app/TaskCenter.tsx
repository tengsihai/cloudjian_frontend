import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { Job } from '../lib/types';
import { useToast } from './ToastContext';

export interface TrackedJob {
  jobId: string;
  label: string;
  status: Job['status'];
  progress: number;
  total: number;
  error?: string | null;
}

interface TaskCenterValue {
  jobs: TrackedJob[];
  track: (jobId: string, label: string, onDone?: () => void) => void;
  busy: boolean;
}

const TaskCenterContext = createContext<TaskCenterValue | null>(null);

const DONE_LABEL = '已完成';

export function TaskCenterProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<TrackedJob[]>([]);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const timers = useRef<Map<string, number>>(new Map());

  const track = useCallback(
    (jobId: string, label: string, onDone?: () => void) => {
      setJobs((prev) => [
        { jobId, label, status: 'running', progress: 0, total: 0 },
        ...prev.filter((job) => job.jobId !== jobId),
      ]);
      setOpen(true);

      const started = Date.now();
      const tick = async () => {
        try {
          const job = await api.getJob(jobId);
          setJobs((prev) =>
            prev.map((item) =>
              item.jobId === jobId
                ? {
                    ...item,
                    status: job.status,
                    progress: job.progress,
                    total: job.total,
                    error: job.error,
                  }
                : item,
            ),
          );
          if (job.status === 'running' && Date.now() - started < 30_000) {
            timers.current.set(jobId, window.setTimeout(tick, 650));
            return;
          }
          if (job.status === 'done' || job.status === 'partial') {
            toast(`${label}${DONE_LABEL}`);
          }
          if (job.status === 'failed') {
            toast(`${label}失败${job.error ? `：${job.error}` : ''}`, 'error');
          }
          onDone?.();
        } catch {
          setJobs((prev) =>
            prev.map((item) => (item.jobId === jobId ? { ...item, status: 'done', progress: 1, total: 1 } : item)),
          );
          onDone?.();
        }
      };
      timers.current.set(jobId, window.setTimeout(tick, 450));
    },
    [toast],
  );

  const value = useMemo<TaskCenterValue>(
    () => ({
      jobs,
      track,
      busy: jobs.some((job) => job.status === 'running'),
    }),
    [jobs, track],
  );

  return (
    <TaskCenterContext.Provider value={value}>
      {children}
      <button
        type="button"
        className="task-fab"
        title="任务中心"
        aria-label="任务中心"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span aria-hidden>⧗</span>
        {jobs.some((job) => job.status === 'running') && <span className="dot" />}
      </button>
      {open && (
        <div className="task-panel">
          <div className="row" style={{ marginBottom: 6 }}>
            <b style={{ fontSize: 14 }}>任务中心</b>
            <span className="sp" />
            <button type="button" className="btn text sm" onClick={() => setJobs([])}>
              清空记录
            </button>
          </div>
          {jobs.length === 0 && <p className="muted caption">暂无进行中的任务</p>}
          {jobs.map((job) => (
            <div className="task-card" key={job.jobId}>
              <div className="row">
                <span>{job.label}</span>
                <span className="sp" />
                <span className={`badge ${job.status === 'failed' ? 'bad' : job.status === 'running' ? 'info' : 'ok'}`}>
                  {job.status === 'running' ? '进行中' : job.status === 'failed' ? '失败' : job.status === 'partial' ? '部分完成' : '已完成'}
                </span>
              </div>
              {job.status === 'running' && job.total > 0 && (
                <div className="progress" style={{ marginTop: 8 }}>
                  <span style={{ width: `${Math.min(100, Math.round((job.progress / job.total) * 100))}%` }} />
                </div>
              )}
              {job.error && <p className="caption" style={{ color: 'var(--danger)', marginTop: 4 }}>{job.error}</p>}
            </div>
          ))}
        </div>
      )}
    </TaskCenterContext.Provider>
  );
}

export function useTaskCenter() {
  const value = useContext(TaskCenterContext);
  if (!value) throw new Error('useTaskCenter must be used inside TaskCenterProvider');
  return value;
}
