import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Cloud, RefreshCw, Database } from 'lucide-react';
import { Badge, Button, Card, SectionHeader, Stat } from '../components/ui';
import { api } from '../api';

export default function OfflineStatusIndicator() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [swSupported, setSwSupported] = useState(false);
  const [swReady, setSwReady] = useState(false);

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

  return (
    <Card className="p-4">
      <SectionHeader title="Offline / PWA Status" description="Service worker + IndexedDB cache for offline learning"/>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Network" value={online ? 'Online' : 'Offline'} icon={online ? <Wifi size={20} className="text-mint-400"/> : <WifiOff size={20} className="text-rose-400"/>}/>
        <Stat label="Service Worker" value={swSupported ? 'Supported' : 'Not supported'} icon={<Cloud size={20} className={swSupported ? 'text-mint-400' : 'text-gray-500'}/>}/>
        <Stat label="Cache Ready" value={swReady ? 'Active' : 'Inactive'} icon={<Database size={20} className={swReady ? 'text-indigo-400' : 'text-gray-500'}/>}/>
      </div>
      <div className="mt-4 flex gap-2">
        {!online && (
          <div className="px-3 py-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
            You are offline. Cached chapters and practice questions remain available. Progress syncs when you reconnect.
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={() => window.location.reload()} icon={<RefreshCw size={16}/>}>
          Reconnect
        </Button>
        {!swSupported && (
          <Button variant="ghost" size="sm">PWA not supported in this browser</Button>
        )}
      </div>
    </Card>
  );
}
