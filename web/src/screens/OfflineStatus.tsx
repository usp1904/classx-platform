import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Cloud, RefreshCw, Database, Server, Cpu } from 'lucide-react';
import { Button, Card, SectionHeader, Stat } from '../components/ui';
import { isMockMode, setMockMode } from '../api';

export default function OfflineStatusIndicator() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [swSupported, setSwSupported] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const [mockMode, setLocalMockMode] = useState(() => isMockMode());

  useEffect(() => {
    setSwSupported('serviceWorker' in navigator);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => setSwReady(true)).catch(() => setSwReady(false));
    }
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const toggleMock = () => {
    const next = !mockMode;
    setMockMode(next);
    setLocalMockMode(next);
  };

  return (
    <Card className="p-4">
      <SectionHeader
        title="Offline / PWA & Mock API Status"
        description="Client-side mock layer + Service worker + IndexedDB cache for offline & static deployment"
      />
      <div className="grid grid-cols-4 gap-4">
        <Stat
          label="Network"
          value={online ? 'Online' : 'Offline'}
          icon={online ? <Wifi size={20} className="text-mint-400" /> : <WifiOff size={20} className="text-rose-400" />}
        />
        <Stat
          label="API Layer"
          value={mockMode ? 'Mock Mode' : 'Live Mode'}
          icon={mockMode ? <Cpu size={20} className="text-amber-400" /> : <Server size={20} className="text-mint-400" />}
        />
        <Stat
          label="Service Worker"
          value={swSupported ? 'Supported' : 'Not supported'}
          icon={<Cloud size={20} className={swSupported ? 'text-mint-400' : 'text-gray-500'} />}
        />
        <Stat
          label="Cache Ready"
          value={swReady ? 'Active' : 'Inactive'}
          icon={<Database size={20} className={swReady ? 'text-indigo-400' : 'text-gray-500'} />}
        />
      </div>

      <div className="mt-4 p-3 rounded bg-surface-raised border border-border text-sm">
        <p className="mb-2">
          <strong>Static Hosting & Fallback Status:</strong>{' '}
          {mockMode
            ? 'The application is running with the standalone Client-Side Mock API. All 29 backend API endpoints (curriculum, chapter notes, AI tutor, practice questions, mock tests, and analytics) are simulated completely in-browser without external server dependencies.'
            : 'The application is attempting to connect to the live backend server. If requests fail (e.g. 404 or network loss), it automatically falls back to client-side mock data.'}
        </p>
      </div>

      <div className="mt-4 flex gap-2 items-center flex-wrap">
        <Button
          variant={mockMode ? 'secondary' : 'primary'}
          size="sm"
          onClick={toggleMock}
          icon={<Cpu size={16} />}
        >
          {mockMode ? 'Switch to Live API Mode' : 'Force Mock API Mode'}
        </Button>

        <Button variant="ghost" size="sm" onClick={() => window.location.reload()} icon={<RefreshCw size={16} />}>
          Reconnect / Reload
        </Button>

        {!online && (
          <div className="px-3 py-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
            You are offline. Mock API and cached chapters remain fully available.
          </div>
        )}
      </div>
    </Card>
  );
}
