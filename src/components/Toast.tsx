import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, X, ArrowRight } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

let addToastFn: ((message: string, action?: { label: string; onClick: () => void }) => void) | null = null;

/**
 * Show a toast notification from anywhere in the app.
 * Optionally include an action button (e.g. "View" to navigate).
 */
export function showToast(message: string, action?: { label: string; onClick: () => void }) {
  addToastFn?.(message, action);
}

/**
 * Toast container — renders at the app root level.
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, action?: { label: string; onClick: () => void }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, action }]);

    // Auto-dismiss after 5s (longer since user may want to click action)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            color: 'var(--text-base)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            pointerEvents: 'auto',
            animation: 'toastSlideIn 300ms ease',
            maxWidth: '400px',
          }}
        >
          <CheckCircle size={16} color="var(--green)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{toast.message}</span>
          {toast.action && (
            <button
              onClick={() => {
                toast.action!.onClick();
                dismiss(toast.id);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(30, 215, 96, 0.12)',
                color: 'var(--green)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 150ms ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(30, 215, 96, 0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(30, 215, 96, 0.12)'; }}
            >
              {toast.action.label}
              <ArrowRight size={11} />
            </button>
          )}
          <button
            onClick={() => dismiss(toast.id)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px',
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
