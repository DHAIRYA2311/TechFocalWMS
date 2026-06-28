import React, { useState, useEffect } from 'react';

export default function Logo({ 
  variant = 'full', // 'full', 'stacked', 'mark'
  height = 40, 
  textColor = '#31369d', 
  style = {} 
}) {
  const [logoSrc, setLogoSrc] = useState(() => {
    if (variant === 'mark') {
      return '/logo_mark.png';
    }
    try {
      const saved = localStorage.getItem('portal_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        if (settings && settings.company_logo) {
          return settings.company_logo;
        }
      }
    } catch (e) {
      console.error('Error reading portal_settings in Logo component:', e);
    }
    return '/logo.png'; // default fallback logo
  });

  useEffect(() => {
    if (variant === 'mark') {
      setLogoSrc('/logo_mark.png');
      return;
    }
    const handleSettingsUpdate = () => {
      try {
        const saved = localStorage.getItem('portal_settings');
        if (saved) {
          const settings = JSON.parse(saved);
          if (settings && settings.company_logo) {
            setLogoSrc(settings.company_logo);
            return;
          }
        }
      } catch (e) {
        console.error('Error handling portal-settings-updated in Logo component:', e);
      }
      setLogoSrc('/logo.png');
    };

    window.addEventListener('portal-settings-updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('portal-settings-updated', handleSettingsUpdate);
    };
  }, [variant]);

  // Determine width styling based on variant if required, otherwise let it auto-scale
  const getWidthStyle = () => {
    if (variant === 'mark') {
      return { maxWidth: `${height * 1.5}px` }; // Restrict width slightly for mark icons
    }
    if (variant === 'stacked') {
      return { maxWidth: `${height * 3.5}px` };
    }
    return { maxWidth: '100%' };
  };

  return (
    <img 
      src={logoSrc} 
      alt="TechFocal Logo" 
      style={{ 
        height: `${height}px`,
        width: 'auto',
        objectFit: 'contain',
        verticalAlign: 'middle',
        display: 'inline-block',
        ...getWidthStyle(),
        ...style 
      }} 
    />
  );
}
