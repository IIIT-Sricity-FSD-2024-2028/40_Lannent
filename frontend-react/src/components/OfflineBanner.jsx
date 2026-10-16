/**
 * LANNENT — OfflineBanner
 * When the API is unreachable every Store read returns an empty array, so the
 * page renders as a blank shell with no explanation. Say so instead.
 */
import { useState } from 'react';
import Icon from './Icon';
import { useStore } from '../context/StoreContext';

export default function OfflineBanner() {
  const Store = useStore();
  // Decided once per page load, as before.
  const [online] = useState(() => Store.isOnline());
  if (online) return null;
  return (
    <div className="offline-banner" role="alert">
      <Icon name="plug-zap" style={{ width: 18, height: 18, flex: 'none' }} />
      <div>
        <strong>Backend unavailable.</strong>
        This page has no data to show. Start the API with
        <code>npm run start:dev</code> in <code>back-end/</code>, then reload.
      </div>
    </div>
  );
}
