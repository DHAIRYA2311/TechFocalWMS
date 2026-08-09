import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import CustomSelect from './CustomSelect';
import { Package, Search, Plus, ArrowUpRight, ArrowDownRight, Tag, AlertTriangle, Loader2, X } from 'lucide-react';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [feedback, setFeedback] = useState(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockItem, setRestockItem] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [restocking, setRestocking] = useState(false);
  
  const [newItem, setNewItem] = useState({
    sku: '', name: '', category: 'raw_materials', stock: '', unit: 'pcs', reorder_level: '', location: ''
  });
  const [adding, setAdding] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.get('/api/inventory', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(res.data);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: 'Failed to load inventory.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAddItem = async (e) => {
    e.preventDefault();
    setAdding(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      await axios.post('/api/inventory', newItem, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeedback({ type: 'success', message: 'Item added successfully.' });
      setShowAddModal(false);
      setNewItem({ sku: '', name: '', category: 'raw_materials', stock: '', unit: 'pcs', reorder_level: '', location: '' });
      fetchInventory();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to add item.' });
    } finally {
      setAdding(false);
    }
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    setRestocking(true);
    try {
      const token = localStorage.getItem('auth_token');
      await axios.post(`/api/inventory/${restockItem.id}/restock`, { quantity: restockQty }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchInventory();
      setShowRestockModal(false);
      setRestockQty('');
      setFeedback({ type: 'success', message: 'Stock added successfully!' });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to restock item.' });
    } finally {
      setRestocking(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === '' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'raw_materials': return 'Raw Materials';
      case 'tools': return 'Tools & Tooling';
      case 'consumables': return 'Consumables';
      case 'hardware': return 'Hardware Components';
      default: return cat;
    }
  };

  const getStockBadgeColor = (item) => {
    if (item.stock <= item.reorder_level / 2) {
      return { bg: 'var(--color-danger-light)', text: 'var(--color-danger)', border: 'rgba(239, 68, 68, 0.15)', label: 'Critical Stock' };
    }
    if (item.stock <= item.reorder_level) {
      return { bg: 'var(--color-warning-light)', text: 'var(--color-warning)', border: 'rgba(245, 158, 11, 0.15)', label: 'Low Stock' };
    }
    return { bg: 'var(--color-success-light)', text: 'var(--color-success)', border: 'rgba(34, 197, 94, 0.15)', label: 'In Stock' };
  };

  const lowStockCount = items.filter(i => i.stock <= i.reorder_level).length;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {feedback && (
        <div className={`alert alert-${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={iconBoxStyle('var(--color-primary-light)', 'var(--color-primary)')}>
            <Package size={20} />
          </div>
          <div>
            <span style={cardLabelStyle}>Total Item SKUs</span>
            <h4 style={cardValueStyle}>{items.length}</h4>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={iconBoxStyle('var(--color-warning-light)', 'var(--color-warning)')}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <span style={cardLabelStyle}>Low Stock SKUs</span>
            <h4 style={cardValueStyle}>{lowStockCount} Items</h4>
          </div>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="card" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', padding: '16px 24px' }}>
        <div className="input-wrapper" style={{ flexGrow: 1, minWidth: '240px' }}>
          <span className="input-icon" style={{ left: '12px' }}>
            <Search size={16} />
          </span>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search by part name or SKU..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '38px', height: '38px' }}
          />
        </div>

        <CustomSelect
          value={categoryFilter}
          onChange={val => setCategoryFilter(val)}
          options={[
            { value: '', label: 'All Categories' },
            { value: 'raw_materials', label: 'Raw Materials' },
            { value: 'tools', label: 'Tools & Tooling' },
            { value: 'consumables', label: 'Consumables' },
            { value: 'hardware', label: 'Hardware Components' }
          ]}
          style={{ width: '200px', height: '38px' }}
        />

        <button 
          className="form-button"
          onClick={() => setShowAddModal(true)}
          style={{ width: 'auto', marginTop: 0, height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} />
          Add Item
        </button>
      </div>

      {/* Ledger Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                <th style={thStyle}>SKU / ID</th>
                <th style={thStyle}>Item Description</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Available Stock</th>
                <th style={thStyle}>Reorder Level</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Status</th>
                <th style={{ padding: '16px', color: 'var(--color-text-muted)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ padding: '30px', textAlign: 'center' }}><Loader2 className="animate-spin" /></td></tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No inventory items match search filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const badge = getStockBadgeColor(item);
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }} className="table-row-hover">
                      <td style={{ ...tdStyle, fontWeight: '600', color: 'var(--color-primary)' }}>{item.sku}</td>
                      <td style={{ ...tdStyle, fontWeight: '500' }}>{item.name}</td>
                      <td style={tdStyle}>{getCategoryLabel(item.category)}</td>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>
                        {item.stock} {item.unit}
                      </td>
                      <td style={tdStyle}>{item.reorder_level} {item.unit}</td>
                      <td style={tdStyle}>{item.location}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: badge.bg, color: badge.text, border: `1px solid ${badge.border}`, borderRadius: '12px', fontWeight: '600' }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button 
                          onClick={() => {
                            setRestockItem(item);
                            setRestockQty('');
                            setShowRestockModal(true);
                          }}
                          className="form-button"
                          style={{ height: '28px', padding: '0 12px', fontSize: '11px', backgroundColor: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: '4px', width: 'auto' }}
                        >
                          <Plus size={12} /> Restock
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content animate-scale-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Add New Inventory Item</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">SKU / Item ID</label>
                  <input required type="text" className="form-input" value={newItem.sku} onChange={e => setNewItem({...newItem, sku: e.target.value})} placeholder="e.g. INV-008" />
                </div>
                <div className="form-group">
                  <label className="form-label">Item Name</label>
                  <input required type="text" className="form-input" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <CustomSelect 
                      value={newItem.category} 
                      onChange={val => setNewItem({...newItem, category: val})}
                      options={[
                        { value: 'raw_materials', label: 'Raw Materials' },
                        { value: 'tools', label: 'Tools' },
                        { value: 'consumables', label: 'Consumables' },
                        { value: 'hardware', label: 'Hardware Components' }
                      ]}
                      style={{ height: '36px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit (e.g. pcs, kg, m)</label>
                    <input required type="text" className="form-input" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Initial Stock</label>
                    <input required type="number" step="any" min="0" className="form-input" value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reorder Level</label>
                    <input required type="number" step="any" min="0" className="form-input" value={newItem.reorder_level} onChange={e => setNewItem({...newItem, reorder_level: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Location (Rack/Bin)</label>
                  <input type="text" className="form-input" value={newItem.location} onChange={e => setNewItem({...newItem, location: e.target.value})} />
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button type="button" className="form-button" style={{ backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-main)' }} onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="form-button" disabled={adding}>
                    {adding ? <Loader2 size={16} className="animate-spin" /> : 'Save Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showRestockModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowRestockModal(false)}>
          <div className="modal-content animate-scale-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Restock Item</h2>
              <button 
                onClick={() => setShowRestockModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--color-text-main)' }}>
                Adding stock for <strong>{restockItem?.name}</strong> ({restockItem?.sku})<br/>
                Current Stock: <strong>{restockItem?.stock} {restockItem?.unit}</strong>
              </div>
              <form onSubmit={handleRestock} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Stock to Add ({restockItem?.unit})</label>
                  <input required type="number" step="1" min="1" className="form-input" value={restockQty} onChange={e => setRestockQty(e.target.value)} />
                </div>
                <button type="submit" className="form-button" disabled={restocking} style={{ marginTop: '8px' }}>
                  {restocking ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Restock'}
                </button>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

const thStyle = { padding: '12px 16px', fontWeight: '600' };
const tdStyle = { padding: '12px 16px', color: 'var(--color-text-main)' };

const iconBoxStyle = (bg, color) => ({
  backgroundColor: bg,
  color: color,
  padding: '10px',
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
});

const cardLabelStyle = { fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' };
const cardValueStyle = { fontSize: '20px', fontWeight: '700', color: 'var(--color-text-main)' };
