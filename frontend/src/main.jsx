import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// Dynamic API URL rewriting for production/Vercel deployment
axios.interceptors.request.use((config) => {
  const backendUrl = import.meta.env.VITE_API_URL;
  if (backendUrl && config.url) {
    config.url = config.url.replace(/^http:\/\/(127\.0\.0\.1|localhost):8000/, backendUrl);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('[Service Worker] Registered successfully:', reg.scope))
      .catch((err) => console.error('[Service Worker] Registration failed:', err));
  });
}
