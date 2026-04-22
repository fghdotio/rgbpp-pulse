import React from 'react';
import { X, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';

const icons = {
  info: <Info size={16} color="var(--text-announcement)" />,
  warn: <AlertTriangle size={16} color="var(--text-warning)" />,
  error: <AlertCircle size={16} color="var(--text-negative)" />,
};

const bgColors = {
  info: 'rgba(83, 157, 245, 0.1)',
  warn: 'rgba(255, 164, 43, 0.1)',
  error: 'rgba(243, 114, 127, 0.1)',
};

const borderColors = {
  info: 'rgba(83, 157, 245, 0.3)',
  warn: 'rgba(255, 164, 43, 0.3)',
  error: 'rgba(243, 114, 127, 0.3)',
};

export function Notifications() {
  const { notifications, dismissNotification } = useApp();

  if (notifications.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 2000,
        maxWidth: '380px',
        width: '100%',
      }}
    >
      {notifications.slice(0, 5).map((n, i) => (
        <div
          key={n.id}
          style={{
            background: bgColors[n.level],
            border: `1px solid ${borderColors[n.level]}`,
            borderRadius: 'var(--radius-lg)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            animation: `slideIn 200ms ease ${i * 50}ms both`,
            backdropFilter: 'blur(12px)',
          }}
        >
          <div style={{ marginTop: '2px', flexShrink: 0 }}>{icons[n.level]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '2px' }}>{n.title}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
              {n.message}
            </div>
          </div>
          <button
            onClick={() => dismissNotification(n.id)}
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
