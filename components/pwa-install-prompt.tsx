'use client';

import { useEffect, useState } from 'react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (standalone) return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos =
      /iphone|ipad|ipod/.test(userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIos) setShowIosHelp(true);

    const handleInstallAvailable = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallEvent(null);
      setShowIosHelp(false);
      setHidden(true);
    };

    window.addEventListener('beforeinstallprompt', handleInstallAvailable);
    window.addEventListener('appinstalled', handleInstalled);

    // Register a network-only worker: it does not cache private or changing app data.
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallAvailable);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (hidden || (!installEvent && !showIosHelp)) return null;

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') setHidden(true);
    setInstallEvent(null);
  };

  return (
    <aside
      aria-label="Install PharmaHub"
      style={{
        position: 'fixed',
        zIndex: 1000,
        right: 16,
        bottom: 16,
        width: 'min(360px, calc(100vw - 32px))',
        boxSizing: 'border-box',
        padding: 16,
        border: '1px solid #d1d5db',
        borderRadius: 12,
        background: '#ffffff',
        color: '#111827',
        boxShadow: '0 8px 28px rgba(0, 0, 0, 0.18)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <button
        type="button"
        onClick={() => setHidden(true)}
        aria-label="Dismiss install instructions"
        style={{
          float: 'right',
          border: 0,
          background: 'transparent',
          color: '#4b5563',
          fontSize: 20,
          lineHeight: 1,
          cursor: 'pointer',
        }}
      >
        ×
      </button>
      <strong style={{ display: 'block', marginBottom: 6 }}>Use PharmaHub like an app</strong>
      {installEvent ? (
        <>
          <p style={{ margin: '0 0 12px', fontSize: 14 }}>
            Add PharmaHub to your home screen or desktop for quick access.
          </p>
          <button
            type="button"
            onClick={install}
            style={actionButtonStyle}
          >
            Install PharmaHub
          </button>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 14 }}>
          In Safari, tap the Share button, then choose <strong>Add to Home Screen</strong>.
        </p>
      )}
    </aside>
  );
}

const actionButtonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: 8,
  padding: '9px 13px',
  background: '#0f766e',
  color: '#ffffff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};
