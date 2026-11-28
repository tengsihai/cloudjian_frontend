import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type ToastKind = 'info' | 'error';

interface ToastState {
  id: number;
  text: string;
  kind: ToastKind;
}

interface ToastContextValue {
  toast: (text: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastState | null>(null);
  const seq = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  const toast = useCallback((text: string, kind: ToastKind = 'info') => {
    seq.current += 1;
    setCurrent({ id: seq.current, text, kind });
  }, []);

  useEffect(() => {
    if (!current) return undefined;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCurrent(null), 3000);
    return () => window.clearTimeout(timer.current);
  }, [current]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {current && (
        <div className={`toast${current.kind === 'error' ? ' error' : ''}`} role="status">
          {current.text}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
}

export function errorText(err: unknown) {
  if (err instanceof Error && err.message) return err.message;
  return '请求失败，请稍后重试';
}
