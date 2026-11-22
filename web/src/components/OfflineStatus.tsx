import React, { useEffect, useState } from 'react';
import { Cloud, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { isMockMode, setMockMode } from '../api';

export function MockModeBanner() {
  const [mockActive, setMockActive] = useState(() => isMockMode());

  useEffect(() => {
    const checkStatus = () => setMockActive(isMockMode());
    window.addEventListener('storage', checkStatus);
    const interval = setInterval(checkStatus, 1500);
    return () => {
      window.removeEventListener('storage', checkStatus);
      clearInterval(interval);
    };
  }, []);

  const handleToggle = () => {
    const next = !mockActive;
    setMockMode(next);
    setMockActive(next);
  };

  if (!mockActive) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.4rem 1rem',
        background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.1) 100%)',
        borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
        color: '#f59e0b',
        fontSize: '0.82rem',
        fontWeight: 500,
      }}
      role="status"
      aria-label="Offline Mock Mode Active"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Cloud size={15} />
        <span>
          <strong>Offline / Mock API Active</strong> · Static fallback mode active. All 29 curriculum, practice, and exam endpoints function seamlessly.
        </span>
      </div>
      <button
        onClick={handleToggle}
        style={{
          background: 'rgba(245, 158, 11, 0.2)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '4px',
          padding: '0.2rem 0.6rem',
          color: '#fef3c7',
          cursor: 'pointer',
          fontSize: '0.75rem',
        }}
      >
        Switch to Live
      </button>
    </div>
  );
}

export function OfflineIndicatorPill() {
  const [mockActive, setMockActive] = useState(() => isMockMode());
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const checkStatus = () => setMockActive(isMockMode());
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);

    window.addEventListener('storage', checkStatus);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const interval = setInterval(checkStatus, 2000);

    return () => {
      window.removeEventListener('storage', checkStatus);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(interval);
    };
  }, []);

  const toggleMock = () => {
    const next = !mockActive;
    setMockMode(next);
    setMockActive(next);
  };

  return (
    <button
      onClick={toggleMock}
      title={
        mockActive
          ? 'Running in Client Mock Mode (Offline Fallback). Click to switch to Live API.'
          : 'Running in Live API Mode. Click to force Client Mock Mode.'
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.25rem 0.65rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        cursor: 'pointer',
        border: '1px solid',
        background: mockActive ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
        borderColor: mockActive ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)',
        color: mockActive ? '#fbbf24' : '#34d399',
        transition: 'all 0.2s ease',
      }}
      aria-label={`API Status: ${mockActive ? 'Mock Mode' : 'Live Mode'}`}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: mockActive ? '#f59e0b' : '#10b981',
          boxShadow: mockActive ? '0 0 6px #f59e0b' : '0 0 6px #10b981',
        }}
      />
      <span>{mockActive ? 'Mock API' : (online ? 'Live API' : 'Offline')}</span>
    </button>
  );
}

export default OfflineIndicatorPill;
