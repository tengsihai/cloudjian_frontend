import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  layer?: number;
  onClose?: () => void;
  dismissible?: boolean;
}

export function Modal({
  open,
  title,
  children,
  footer,
  width = 460,
  layer = 41,
  onClose,
  dismissible = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dismissible, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="scrim" style={{ zIndex: layer - 1 }} onClick={dismissible ? onClose : undefined} />
      <div className="modal" style={{ width, zIndex: layer }} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{title}</h2>
          <span className="sp" />
          {dismissible && (
            <button type="button" className="icon-btn" aria-label="关闭" onClick={onClose}>
              ✕
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </>
  );
}

interface DrawerProps {
  open: boolean;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'narrow' | 'normal' | 'wide';
  onClose: () => void;
}

export function Drawer({ open, title, children, footer, size = 'normal', onClose }: DrawerProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const cls = size === 'narrow' ? 'drawer narrow' : size === 'wide' ? 'drawer wide' : 'drawer';
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className={cls} role="dialog" aria-modal="true">
        <div className="drawer-head">
          <h2>{title}</h2>
          <span className="sp" />
          <button type="button" className="icon-btn" aria-label="关闭" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </aside>
    </>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmText: string;
  danger?: boolean;
  busy?: boolean;
  layer?: number;
  requireText?: string;
  typed?: string;
  onTyped?: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmText,
  danger = true,
  busy = false,
  layer,
  requireText,
  typed = '',
  onTyped,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const blocked = !!requireText && typed !== requireText;
  return (
    <Modal
      open={open}
      title={title}
      width={420}
      layer={layer}
      onClose={busy ? undefined : onClose}
      dismissible={!busy}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button
            type="button"
            className={danger ? 'btn primary' : 'btn primary'}
            style={danger ? { background: 'var(--danger)', borderColor: 'var(--danger)' } : undefined}
            disabled={blocked || busy}
            onClick={onConfirm}
          >
            {busy ? '处理中…' : confirmText}
          </button>
        </>
      }
    >
      <div style={{ color: 'var(--ink-2)', fontSize: 13.5, lineHeight: 1.7 }}>{body}</div>
      {requireText && (
        <div style={{ marginTop: 14 }}>
          <label className="label" htmlFor="confirm-text">
            输入「{requireText}」确认
          </label>
          <input
            id="confirm-text"
            className="field"
            value={typed}
            autoFocus
            onChange={(event) => onTyped?.(event.target.value)}
          />
        </div>
      )}
    </Modal>
  );
}
