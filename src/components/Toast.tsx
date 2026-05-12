import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[9999] pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-center gap-2.5 px-4 py-3 rounded-md",
            "bg-muted border border-border shadow-[0_8px_24px_rgba(0,0,0,0.4)]",
            "text-foreground text-[0.8125rem] font-medium",
            "pointer-events-auto animate-slide-up max-w-[400px]"
          )}
        >
          <CheckCircle size={16} className="text-primary flex-shrink-0" />
          <span className="flex-1">{toast.message}</span>
          {toast.action && (
            <button
              onClick={() => {
                toast.action!.onClick();
                dismiss(toast.id);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[0.6875rem] font-bold whitespace-nowrap transition-all duration-150 hover:bg-primary/25 flex-shrink-0"
            >
              {toast.action.label}
              <ArrowRight size={11} />
            </button>
          )}
          <button
            onClick={() => dismiss(toast.id)}
            className="text-muted-foreground hover:text-foreground p-0.5 flex-shrink-0 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
