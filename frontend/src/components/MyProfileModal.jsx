import React, { useState } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { X, User, Mail, Phone, Loader2, CheckCircle, AlertCircle, Edit2, Camera } from 'lucide-react';

export default function MyProfileModal({ user, onClose, onUserUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post('/api/user/profile', {
        name,
        phone
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFeedback({ type: 'success', message: 'Profile updated successfully.' });
      setIsEditing(false);
      if (onUserUpdated) onUserUpdated(response.data.user);
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhotoUploading(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post('/api/user/profile/photo', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setFeedback({ type: 'success', message: 'Profile photo updated successfully.' });
      if (onUserUpdated) {
        onUserUpdated({ ...user, photo_path: response.data.photo_path });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to upload photo.' });
    } finally {
      setPhotoUploading(false);
    }
  };

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div className="animate-fade-in" style={{ 
        width: '100%', maxWidth: '440px', backgroundColor: '#ffffff',
        borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '24px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={20} style={{ color: '#2563eb' }} /> My Profile
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {feedback && (
            <div style={{ padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
              backgroundColor: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: feedback.type === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`
            }}>
              {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {feedback.message}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ 
                width: '80px', height: '80px', borderRadius: '50%', 
                backgroundColor: user?.role === 'admin' ? '#fee2e2' : user?.role === 'partner' ? '#fef3c7' : user?.role === 'manager' ? '#dcfce7' : '#e0e7ff', 
                color: user?.role === 'admin' ? '#dc2626' : user?.role === 'partner' ? '#d97706' : user?.role === 'manager' ? '#16a34a' : '#4f46e5', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '700', 
                marginBottom: '12px', overflow: 'hidden', border: '3px solid #ffffff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' 
              }}>
                {user?.photo_path ? (
                  <img src={`${import.meta.env.VITE_API_URL}/storage/${user.photo_path}`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user?.name?.substring(0, 2).toUpperCase() || 'U'
                )}
              </div>
              <label style={{
                position: 'absolute', bottom: '12px', right: '-4px', backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0', borderRadius: '50%', width: '28px', height: '28px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                color: '#475569', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'all 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.color = '#2563eb'}
              onMouseOut={e => e.currentTarget.style.color = '#475569'}
              >
                {photoUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                <input type="file" accept="image/jpeg,image/png,image/jpg" style={{ display: 'none' }} onChange={handlePhotoUpload} disabled={photoUploading} />
              </label>
            </div>
            {!isEditing ? (
              <>
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{user?.name}</h3>
                <span style={{ fontSize: '12px', fontWeight: '600', padding: '4px 10px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '12px', marginTop: '8px', textTransform: 'capitalize' }}>
                  {user?.role}
                </span>
              </>
            ) : null}
          </div>

          {!isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <Mail size={16} color="#64748b" />
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Email Address</div>
                  <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{user?.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <Phone size={16} color="#64748b" />
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Phone Number</div>
                  <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{user?.phone || 'Not provided'}</div>
                </div>
              </div>
              
              <button 
                onClick={() => setIsEditing(true)}
                style={{ width: '100%', marginTop: '8px', padding: '10px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#334155', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f8fafc'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#ffffff'}
              >
                <Edit2 size={16} /> Edit Profile
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Full Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Phone Number</label>
                <input 
                  type="text" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  placeholder="e.g. 9876543210"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  style={{ flex: 1, padding: '10px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  style={{ flex: 1, padding: '10px', backgroundColor: '#2563eb', border: 'none', borderRadius: '8px', color: '#ffffff', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
