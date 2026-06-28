import React, { useState } from 'react';
import CustomSelect from './CustomSelect';
import { Package, Search, Plus, ArrowUpRight, ArrowDownRight, Tag, AlertTriangle } from 'lucide-react';

const MOCK_INVENTORY = [
  { id: 'INV-001', name: 'Mild Steel Plate (10mm)', category: 'raw_materials', stock: 45, unit: 'sheets', reorder: 20, location: 'Rack A-2' },
  { id: 'INV-002', name: 'Stainless Steel Round Bar (Ø50mm)', category: 'raw_materials', stock: 12, unit: 'meters', reorder: 15, location: 'Rack B-1' },
  { id: 'INV-003', name: 'CNC Cutting Inserts (APMT 1604)', category: 'tools', stock: 120, unit: 'pcs', reorder: 50, location: 'Cabinet 1' },
  { id: 'INV-004', name: 'Soluble Cutting Oil (Cooldex)', category: 'consumables', stock: 3, unit: 'barrels', reorder: 5, location: 'Storage Bay' },
  { id: 'INV-005', name: 'Aluminum Plate (5mm)', category: 'raw_materials', stock: 30, unit: 'sheets', reorder: 10, location: 'Rack A-4' },
  { id: 'INV-006', name: 'M12 Hex Cap Bolts (Grade 8.8)', category: 'hardware', stock: 850, unit: 'pcs', reorder: 200, location: 'Drawer 3-B' },
  { id: 'INV-007', name: 'TIG Welding Filler Wire (SS308L)', category: 'consumables', stock: 8, unit: 'kg', reorder: 10, location: 'Welding Section' }
];

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const filteredItems = MOCK_INVENTORY.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.id.toLowerCase().includes(searchTerm.toLowerCase());
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
    if (item.stock <= item.reorder / 2) {
      return { bg: 'var(--color-danger-light)', text: 'var(--color-danger)', border: 'rgba(239, 68, 68, 0.15)', label: 'Critical Stock' };
    }
    if (item.stock <= item.reorder) {
      return { bg: 'var(--color-warning-light)', text: 'var(--color-warning)', border: 'rgba(245, 158, 11, 0.15)', label: 'Low Stock' };
    }
    return { bg: 'var(--color-success-light)', text: 'var(--color-success)', border: 'rgba(34, 197, 94, 0.15)', label: 'In Stock' };
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={iconBoxStyle('var(--color-primary-light)', 'var(--color-primary)')}>
            <Package size={20} />
          </div>
          <div>
            <span style={cardLabelStyle}>Total Item SKUs</span>
            <h4 style={cardValueStyle}>{MOCK_INVENTORY.length}</h4>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={iconBoxStyle('var(--color-warning-light)', 'var(--color-warning)')}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <span style={cardLabelStyle}>Low Stock SKUs</span>
            <h4 style={cardValueStyle}>3 Items</h4>
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
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No inventory items match search filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const badge = getStockBadgeColor(item);
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }} className="table-row-hover">
                      <td style={{ ...tdStyle, fontWeight: '600', color: 'var(--color-primary)' }}>{item.id}</td>
                      <td style={{ ...tdStyle, fontWeight: '500' }}>{item.name}</td>
                      <td style={tdStyle}>{getCategoryLabel(item.category)}</td>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>
                        {item.stock} {item.unit}
                      </td>
                      <td style={tdStyle}>{item.reorder} {item.unit}</td>
                      <td style={tdStyle}>{item.location}</td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`
                        }}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
