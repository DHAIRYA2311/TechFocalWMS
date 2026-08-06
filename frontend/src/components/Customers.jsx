import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, Plus, Search, Pencil, Trash2, X, Save, AlertTriangle, Loader2, Eye 
} from 'lucide-react';

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '', gstin: '', contact_person: '', notes: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const res = await axios.get(`/api/customers${searchQuery ? `?search=${searchQuery}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (customer = null) => {
    setError(null);
    if (customer) {
      setEditingId(customer.id);
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        gstin: customer.gstin || '',
        contact_person: customer.contact_person || '',
        notes: customer.notes || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '', email: '', phone: '', address: '', gstin: '', contact_person: '', notes: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const token = localStorage.getItem('auth_token');
      const url = editingId 
        ? `/api/customers/${editingId}`
        : `/api/customers`;
      
      const method = editingId ? 'put' : 'post';
      
      await axios[method](url, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      handleCloseModal();
      fetchCustomers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      await axios.delete(`/api/customers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCustomers();
    } catch (err) {
      alert('Failed to delete customer');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={28} color="var(--color-primary)" />
            Customers Directory
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Manage client details, addresses, and GSTINs centrally.
          </p>
        </div>
        <button 
          className="form-button" 
          onClick={() => handleOpenModal()} 
          style={{ width: 'auto', marginTop: 0, height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--color-primary)' }}
        >
          <Plus size={14} /> Add Customer
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: '12px', padding: '16px', borderBottom: '1px solid var(--color-border)', backgroundColor: '#ffffff' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={16} color="var(--color-text-light)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search by name, email, phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '36px', margin: 0, height: '38px', width: '100%' }}
            />
          </div>
        </div>

        {error && <div style={{ padding: '12px', backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)', margin: '16px' }}><AlertTriangle size={16} />{error}</div>}

        <div className="table-responsive" style={{ margin: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '16px' }}>Customer Name</th>
                <th style={{ padding: '16px' }}>Contact Person</th>
                <th style={{ padding: '16px' }}>Email / Phone</th>
                <th style={{ padding: '16px' }}>GSTIN</th>
                <th style={{ padding: '16px', width: '100px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px' }}>
                      <div className="skeleton-line animate-pulse" style={{ height: '16px', width: '140px', marginBottom: '8px' }} />
                      <div className="skeleton-line animate-pulse" style={{ height: '12px', width: '200px' }} />
                    </td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '14px', width: '100px' }} /></td>
                    <td style={{ padding: '16px' }}>
                      <div className="skeleton-line animate-pulse" style={{ height: '14px', width: '140px', marginBottom: '6px' }} />
                      <div className="skeleton-line animate-pulse" style={{ height: '12px', width: '90px' }} />
                    </td>
                    <td style={{ padding: '16px' }}><div className="skeleton-line animate-pulse" style={{ height: '22px', width: '130px', borderRadius: '4px' }} /></td>
                    <td style={{ padding: '16px', textAlign: 'right' }}><div className="skeleton-line animate-pulse" style={{ height: '28px', width: '60px', marginLeft: 'auto' }} /></td>
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
                    <Users size={40} style={{ color: 'var(--color-text-light)', margin: '0 auto 12px' }} />
                    <p style={{ margin: 0 }}>No customers found.</p>
                  </td>
                </tr>
              ) : (
                customers.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }} className="table-row-hover">
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--color-text-main)' }}>{c.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px', whiteSpace: 'pre-wrap' }}>{c.address}</div>
                    </td>
                    <td style={{ padding: '16px' }}>{c.contact_person || '-'}</td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '13px' }}>{c.email || '-'}</div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{c.phone || '-'}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '13px', backgroundColor: 'var(--color-bg-light)', padding: '2px 6px', borderRadius: '4px' }}>{c.gstin || 'N/A'}</span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                        <button onClick={() => navigate(`/customers/${c.id}`)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '6px' }} title="View Dashboard"><Eye size={16} /></button>
                        <button onClick={() => handleOpenModal(c)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '6px' }} title="Edit"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '6px' }} title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '40px 20px',
          overflowY: 'auto',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="animate-fade-in" style={{
            width: '100%',
            maxWidth: '600px',
            backgroundColor: 'var(--color-card-bg)',
            border: '1px solid var(--color-border)',
            padding: '24px 30px',
            boxShadow: 'var(--shadow-lg)',
            borderRadius: 'var(--radius-lg)',
            position: 'relative',
            marginBottom: '40px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text-main)', margin: 0 }}>
                {editingId ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button type="button" onClick={handleCloseModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Company Name *</label>
                  <input type="text" className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required style={{ padding: '8px 12px', fontSize: '13px', height: '36px', width: '100%', boxSizing: 'border-box', margin: 0 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Contact Person</label>
                  <input type="text" className="form-input" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} style={{ padding: '8px 12px', fontSize: '13px', height: '36px', width: '100%', boxSizing: 'border-box', margin: 0 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '4px' }}>GSTIN</label>
                  <input type="text" className="form-input" value={formData.gstin} onChange={e => setFormData({...formData, gstin: e.target.value})} style={{ textTransform: 'uppercase', padding: '8px 12px', fontSize: '13px', height: '36px', width: '100%', boxSizing: 'border-box', margin: 0 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Email</label>
                  <input type="email" className="form-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ padding: '8px 12px', fontSize: '13px', height: '36px', width: '100%', boxSizing: 'border-box', margin: 0 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Phone Number</label>
                  <input type="text" className="form-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ padding: '8px 12px', fontSize: '13px', height: '36px', width: '100%', boxSizing: 'border-box', margin: 0 }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Billing Address</label>
                  <textarea className="form-input" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows={3} style={{ padding: '8px 12px', fontSize: '13px', width: '100%', boxSizing: 'border-box', margin: 0, resize: 'vertical' }}></textarea>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Internal Notes</label>
                  <textarea className="form-input" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={2} style={{ padding: '8px 12px', fontSize: '13px', width: '100%', boxSizing: 'border-box', margin: 0, resize: 'vertical' }}></textarea>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="logout-btn" onClick={handleCloseModal} style={{ padding: '8px 16px' }}>Cancel</button>
                <button type="submit" className="form-button" disabled={saving} style={{ width: 'auto', marginTop: 0, padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {saving ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
