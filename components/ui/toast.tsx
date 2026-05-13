"use client";

import { useApp } from "@/lib/context/app-context";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

const levelConfig = {
  info: { icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  warn: { icon: Info, color: "text-warning", bg: "bg-warning/10 border-warning/20" },
  error: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
};

export function ToastContainer() {
  const { notifications, dismissNotification } = useApp();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {notifications.map((n) => {
        const { icon: Icon, color, bg } = levelConfig[n.level];
        return (
          <div
            key={n.id}
            className={cn(
              "flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm animate-in slide-in-from-bottom-2 fade-in duration-300",
              bg
            )}
          >
            <Icon className={cn("size-5 shrink-0 mt-0.5", color)} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{n.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
              {n.actionLabel && n.actionHref && (
                <Link
                  href={n.actionHref}
                  onClick={() => dismissNotification(n.id)}
                  className={cn("inline-block text-xs font-medium mt-1.5 hover:underline", color)}
                >
                  {n.actionLabel} →
                </Link>
              )}
            </div>
            <button
              onClick={() => dismissNotification(n.id)}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
