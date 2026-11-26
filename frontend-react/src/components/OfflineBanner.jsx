/**
 * LANNENT — OfflineBanner
 * When the API is unreachable every collection in the store is empty, so the
 * page renders as a blank shell with no explanation. Say so instead.
 */
import { useSelector } from 'react-redux';
import Icon from './Icon';
import { selectIsOnline } from '../store/slices/appSlice';

export default function OfflineBanner() {
  const online = useSelector(selectIsOnline);
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
