import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Safe helper to get Pusher constructor and prevent top-level module load exceptions
const getPusher = () => {
  if (typeof window === 'undefined') return null;
  if (window.Pusher) return window.Pusher;
  
  const PusherClass = typeof Pusher === 'function' ? Pusher : (Pusher.Pusher || Pusher.default || Pusher);
  window.Pusher = PusherClass;
  return PusherClass;
};

// Safe helper to get Echo instance
const getEchoInstance = () => {
  if (typeof window === 'undefined') return null;
  if (window.Echo) return window.Echo;

  try {
    const PusherClass = getPusher();
    if (!PusherClass) return null;

    window.Echo = new Echo({
      broadcaster: 'pusher',
      key: 'any-key', // dummy key for self‑hosted server
      cluster: 'mt1', // dummy cluster to satisfy pusher-js package requirements
      wsHost: window.location.hostname,
      wsPort: 6001,
      forceTLS: false,
      disableStats: true,
      authEndpoint: 'http://127.0.0.1:8000/api/broadcasting/auth',
      auth: {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          Accept: 'application/json',
        }
      }
    });
    return window.Echo;
  } catch (error) {
    console.error('Failed to initialize Laravel Echo:', error);
    return null;
  }
};

// Play dynamic notification beep using Web Audio API (no external file dependencies)
const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // First tone (higher pitch chime)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.08, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.4);
    
    // Second tone (slightly higher pitch, slightly delayed)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1); // A5
    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (err) {
    console.error('Audio chime error:', err);
  }
};

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Helper to fetch notifications from backend
  const fetchNotifications = () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    axios
      .get('http://127.0.0.1:8000/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (Array.isArray(res.data)) {
          setNotifications(res.data);
        }
      })
      .catch((err) => console.error('Notification fetch error:', err));
  };

  // Fetch notifications on component mount and poll every 30s as a fallback
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Listen for real‑time notifications via Echo
  useEffect(() => {
    let userId = null;
    try {
      const profileStr = localStorage.getItem('user_profile');
      if (profileStr) {
        const userProfile = JSON.parse(profileStr);
        userId = userProfile ? userProfile.id : null;
      }
    } catch (e) {
      console.error('Error parsing user_profile:', e);
    }
    if (!userId) return;

    const echo = getEchoInstance();
    if (!echo) return;

    try {
      const channelName = `App.Models.User.${userId}`;
      const channel = echo.private(channelName);
      
      channel.notification((notification) => {
        const newNotif = {
          id: notification.id || Math.random().toString(),
          title: notification.title || 'New Notification',
          message: notification.message || notification.body || '',
          type: notification.type || 'general',
          read_at: null,
          created_at: new Date().toISOString(),
          data: notification.data || {}
        };
        
        setNotifications((prev) => [newNotif, ...prev]);
        playNotificationSound();
      });

      return () => {
        if (echo && typeof echo.leave === 'function') {
          echo.leave(channelName);
        }
      };
    } catch (e) {
      console.error('Echo channel connection error:', e);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    const token = localStorage.getItem('auth_token');
    try {
      await axios.post(
        'http://127.0.0.1:8000/api/notifications/mark-read',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Mark all local notifications as read
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
    } catch (err) {
      console.error('Mark all as read error:', err);
    }
  };

  const toggleDropdown = () => setShowDropdown((prev) => !prev);
  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div style={{ position: 'relative', marginRight: '16px' }} ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px',
          borderRadius: '50%',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <Bell size={20} style={{ color: 'var(--color-text-main, #cbd5e1)' }} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              minWidth: '16px',
              height: '16px',
              backgroundColor: 'var(--color-danger, #ef4444)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#fff',
              padding: '0 4px',
              boxShadow: '0 0 0 2px var(--color-bg, #0b0f19)',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '42px',
            width: '320px',
            maxHeight: '400px',
            overflowY: 'auto',
            backgroundColor: '#0c0f1d',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
            zIndex: 100,
            padding: '4px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary, #6366f1)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  padding: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
              >
                Mark all as read
              </button>
            )}
          </div>
          <div style={{ maxHeight: '330px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '24px 12px', fontSize: '13px' }}>
                No notifications
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.read_at;
                return (
                  <div
                    key={n.id}
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      color: '#fff',
                      cursor: 'pointer',
                      backgroundColor: isUnread ? 'rgba(99, 102, 241, 0.06)' : 'transparent',
                      transition: 'background-color 0.2s',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isUnread ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.03)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isUnread ? 'rgba(99, 102, 241, 0.06)' : 'transparent'; }}
                    onClick={() => {
                      // Mark this local notification as read
                      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item));
                      
                      // Handle routing
                      let route = null;
                      try {
                        const dataObj = typeof n.data === 'string' ? JSON.parse(n.data) : n.data;
                        if (dataObj && dataObj.route) {
                          route = dataObj.route;
                        } else if (n.type === 'purchase_order' || n.type === 'purchase_orders') {
                          route = '/purchase-orders';
                        }
                      } catch (e) {}

                      if (route) {
                        navigate(route);
                      }
                      setShowDropdown(false);
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: isUnread ? '600' : '400', fontSize: '13px', color: isUnread ? '#fff' : '#94a3b8', paddingRight: '8px' }}>
                        {n.title}
                      </div>
                      {isUnread && (
                        <span style={{
                          width: '6px',
                          height: '6px',
                          backgroundColor: 'var(--color-primary, #6366f1)',
                          borderRadius: '50%',
                          display: 'inline-block',
                          marginTop: '5px',
                          flexShrink: 0,
                        }} />
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: isUnread ? '#cbd5e1' : '#64748b', marginTop: '4px', lineHeight: '1.4' }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: '10px', color: '#475569', marginTop: '6px' }}>
                      {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
