import { useEffect, useRef } from 'react';
import { useNavigation } from 'expo-router';
import { useAuth } from './useAuth';

export function useRealTime(resource: string, callback: (event: any) => void) {
  const { token, apiUrl } = useAuth();
  const navigation = useNavigation();
  const callbackRef = useRef(callback);

  // Keep callback reference updated to prevent resetting WebSocket connection when callback updates
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!token || !apiUrl || !navigation) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isComponentActive = true;

    const connect = () => {
      if (!isComponentActive) return;

      try {
        // Resolve Reverb host IP dynamically from apiUrl
        let cleanUrl = apiUrl.replace(/^(https?:\/\/)/, '');
        let host = cleanUrl.split(':')[0]; // Get IP address / domain name
        host = host.split('/')[0]; // Strip path

        const port = '8080';
        const key = 'x0e2wapuiluowxd89e3k';
        const isSecure = apiUrl.startsWith('https');
        const wsScheme = isSecure ? 'wss' : 'ws';

        const wsUrl = `${wsScheme}://${host}:${port}/app/${key}?protocol=7&client=js&version=7.0.3&flash=false`;
        
        console.log(`[RealTime] Connecting WebSocket for resource '${resource}' to: ${wsUrl}`);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log(`[RealTime] WebSocket connected for resource '${resource}'`);
          ws?.send(JSON.stringify({
            event: 'pusher:subscribe',
            data: { channel: 'workshop' }
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'resource.updated') {
              const payload = JSON.parse(data.data);
              
              // Trigger callback if it's 'all' or matches specific resource
              if (
                resource === 'all' ||
                payload.resource === resource ||
                (resource === 'dashboard' && ['machines', 'jobs', 'attendance', 'purchase_orders'].includes(payload.resource))
              ) {
                console.log(`[RealTime] Update event for resource '${payload.resource}' matches hook key '${resource}'`);
                callbackRef.current(payload);
              }
            }
          } catch (e) {
            console.error('[RealTime] Failed to parse WebSocket payload:', e);
          }
        };

        ws.onclose = (e) => {
          console.log(`[RealTime] WebSocket closed for resource '${resource}' (code: ${e.code}, reason: ${e.reason})`);
          if (isComponentActive && navigation.isFocused()) {
            // Reconnect after 3 seconds if component is active and screen is focused
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };

        ws.onerror = (err) => {
          console.warn(`[RealTime] WebSocket connection error for resource '${resource}':`, err);
        };
      } catch (e) {
        console.error('[RealTime] Failed to initialize WebSocket client:', e);
      }
    };

    const disconnect = () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      if (ws) {
        console.log(`[RealTime] Closing WebSocket client for resource '${resource}'`);
        ws.close();
        ws = null;
      }
    };

    // Subscriptions to focus and blur events for React Navigation lifecycle
    const unsubscribeFocus = navigation.addListener('focus', () => {
      connect();
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      disconnect();
    });

    // Handle initial connection state
    if (navigation.isFocused()) {
      connect();
    }

    return () => {
      isComponentActive = false;
      unsubscribeFocus();
      unsubscribeBlur();
      disconnect();
    };
  }, [token, apiUrl, navigation, resource]);
}
