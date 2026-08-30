import React, { useState } from 'react';
import { RefreshCw, ExternalLink } from 'lucide-react';

export default function SystemMonitoring() {
  const [iframeKey, setIframeKey] = useState(0);
  const backendBaseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  
  // Align hostname to prevent SameSite=Lax cookie issues in iframe
  const parsedUrl = new URL(backendBaseUrl);
  if (parsedUrl.hostname === '127.0.0.1' && window.location.hostname === 'localhost') {
    parsedUrl.hostname = 'localhost';
  } else if (parsedUrl.hostname === 'localhost' && window.location.hostname === '127.0.0.1') {
    parsedUrl.hostname = '127.0.0.1';
  }
  
  const pulseUrl = `${parsedUrl.origin}/pulse`;

  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>System Monitoring</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Real-time insights into server health, active users, and system performance via Laravel Pulse.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={handleRefresh}
            className="form-button"
            style={{ width: 'auto', marginTop: 0, height: '36px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)' }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <a 
            href={pulseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="form-button"
            style={{ width: 'auto', marginTop: 0, height: '36px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
          >
            <ExternalLink size={14} />
            Open in New Tab
          </a>
        </div>
      </div>

      {/* Pulse iframe container */}
      <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <iframe 
          key={iframeKey}
          src={pulseUrl} 
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Laravel Pulse System Monitoring"
        />
      </div>
    </div>
  );
}
