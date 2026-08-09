import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { Plus, Loader2, CheckCircle2, AlertCircle, Edit, Trash2, Calendar, Check, X } from 'lucide-react';
import CustomSelect from '../CustomSelect';

export default function HolidayCalendar() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'public',
    applies_to: 'all',
    target_shift: '',
    description: '',
    is_active: true
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.get('/api/holidays', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHolidays(res.data);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to load holiday calendar.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (holiday = null) => {
    if (holiday) {
      setEditingId(holiday.id);
      setFormData({
        name: holiday.name,
        date: holiday.date.split('T')[0], // ensure format
        type: holiday.type,
        applies_to: holiday.applies_to,
        target_shift: holiday.target_shift || '',
        description: holiday.description || '',
        is_active: holiday.is_active
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        date: '',
        type: 'public',
        applies_to: 'all',
        target_shift: '',
        description: '',
        is_active: true
      });
    }
    setFeedback(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const token = localStorage.getItem('auth_token');
      
      const payload = {
        ...formData,
        target_shift: formData.applies_to === 'shift' ? formData.target_shift : null
      };

      if (editingId) {
        await axios.put(`/api/holidays/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/holidays', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      setShowModal(false);
      fetchHolidays();
    } catch (err) {
      console.error(err);
      if (err.response?.data?.message) {
        setFeedback({ type: 'danger', message: err.response.data.message });
      } else {
        setFeedback({ type: 'danger', message: 'Failed to save holiday.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this holiday?")) return;
    try {
      const token = localStorage.getItem('auth_token');
      await axios.delete(`/api/holidays/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchHolidays();
    } catch (err) {
      console.error(err);
      alert('Failed to delete holiday.');
    }
  };

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} style={{ color: 'var(--color-primary)' }} />
            Holiday Calendar
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Manage public and company holidays. Holidays are excluded from attendance tracking.
          </p>
        </div>
        <button className="form-button" onClick={() => handleOpenModal()} style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', height: '38px', padding: '0 16px', margin: 0, backgroundColor: 'var(--color-primary)' }}>
          <Plus size={16} /> Add Holiday
        </button>
      </div>

      {feedback && !showModal && (
        <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '20px' }}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : (
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--color-text-main)' }}>Date</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--color-text-main)' }}>Holiday Name</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--color-text-main)' }}>Type</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--color-text-main)' }}>Applies To</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--color-text-main)' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--color-text-main)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {holidays.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                    No holidays configured yet.
                  </td>
                </tr>
              ) : (
                holidays.map(h => (
                  <tr key={h.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '16px', fontWeight: '500', color: '#0f172a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={14} style={{ color: '#64748b' }} />
                        {new Date(h.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: '#334155', fontWeight: '500' }}>{h.name}</td>
                    <td style={{ padding: '16px', textTransform: 'capitalize', color: '#64748b' }}>{h.type}</td>
                    <td style={{ padding: '16px', color: '#64748b' }}>{h.applies_to === 'all' ? 'All Staff' : `${h.target_shift.charAt(0).toUpperCase() + h.target_shift.slice(1)} Shift`}</td>
                    <td style={{ padding: '16px' }}>
                      <span className={`badge badge-${h.is_active ? 'success' : 'secondary'}`} style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                        {h.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleOpenModal(h)} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: 'var(--color-text-main)', cursor: 'pointer', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '500' }}>
                          <Edit size={14} /> Edit
                        </button>
                        <button onClick={() => handleDelete(h.id)} style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', cursor: 'pointer', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '500' }}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && ReactDOM.createPortal(
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="modal-content animate-fade-in" style={{ backgroundColor: 'var(--color-bg-base)', width: '100%', maxWidth: '500px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--color-text-main)' }}>{editingId ? 'Edit Holiday' : 'Add New Holiday'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
              {feedback && showModal && (
                <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '16px' }}>
                  <AlertCircle size={18} /> <span>{feedback.message}</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Holiday Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="e.g. Independence Day" />
                </div>

                <div className="form-group">
                  <label className="form-label">Date <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="date" className="form-input" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Type</label>
                    <CustomSelect 
                      options={[
                        {value: 'public', label: 'Public Holiday'},
                        {value: 'company', label: 'Company Holiday'},
                        {value: 'festival', label: 'Festival'},
                        {value: 'custom', label: 'Custom / Emergency'}
                      ]}
                      value={formData.type}
                      onChange={v => setFormData({...formData, type: v})}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Applies To</label>
                    <CustomSelect 
                      options={[
                        {value: 'all', label: 'All Staff'},
                        {value: 'shift', label: 'Specific Shift'}
                      ]}
                      value={formData.applies_to}
                      onChange={v => setFormData({...formData, applies_to: v})}
                    />
                  </div>
                </div>

                {formData.applies_to === 'shift' && (
                  <div className="form-group animate-fade-in">
                    <label className="form-label">Target Shift</label>
                    <CustomSelect 
                      options={[
                        {value: 'day', label: 'Day Shift'},
                        {value: 'night', label: 'Night Shift'}
                      ]}
                      value={formData.target_shift || 'day'}
                      onChange={v => setFormData({...formData, target_shift: v})}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Description (Optional)</label>
                  <textarea className="form-input" style={{ height: '60px', resize: 'none' }} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} style={{ width: '16px', height: '16px' }} />
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>Active Holiday</span>
                  </label>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: '24px', marginTop: '4px' }}>Inactive holidays are ignored by the system but kept for historical records.</p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ height: '40px', padding: '0 20px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', color: 'var(--color-text-main)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="form-button" disabled={saving} style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', height: '40px', padding: '0 24px', margin: 0, backgroundColor: 'var(--color-primary)' }}>
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
