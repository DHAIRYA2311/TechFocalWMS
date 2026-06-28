import { useEffect } from 'react';
import { initEcho } from '../utils/echo';

export function useRealTime(resource, callback) {
  useEffect(() => {
    if (!callback) return;

    // Initialize Echo WebSocket listeners
    initEcho();

    const handleUpdate = (e) => {
      const event = e.detail;
      // Trigger callback if the updated resource matches our hook configuration
      if (event.resource === resource || resource === 'all') {
        callback(event);
      }
    };

    window.addEventListener('workshop-update', handleUpdate);
    return () => {
      window.removeEventListener('workshop-update', handleUpdate);
    };
  }, [resource, callback]);
}
