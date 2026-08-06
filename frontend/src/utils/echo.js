import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

let echoInstance = null;

export const initEcho = () => {
  if (echoInstance) return echoInstance;

  // Dynamically resolve Reverb host to ensure it works over local networks
  const host = import.meta.env.VITE_REVERB_HOST === 'localhost' || !import.meta.env.VITE_REVERB_HOST
    ? window.location.hostname
    : import.meta.env.VITE_REVERB_HOST;

  const key = import.meta.env.VITE_REVERB_APP_KEY || 'x0e2wapuiluowxd89e3k';
  const port = import.meta.env.VITE_REVERB_PORT || 8085;
  const scheme = import.meta.env.VITE_REVERB_SCHEME || 'http';

  const token = localStorage.getItem('auth_token');

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: key,
    wsHost: host || '127.0.0.1',
    wsPort: parseInt(port),
    wssPort: parseInt(port),
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  // Listen to the public workshop channel and dispatch browser CustomEvents
  echoInstance.channel('workshop')
    .listen('.resource.updated', (event) => {
      window.dispatchEvent(new CustomEvent('workshop-update', { detail: event }));
    });

  return echoInstance;
};
