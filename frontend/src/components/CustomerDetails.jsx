import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Users, Building, Mail, Phone, FileText, Settings, 
  Briefcase, IndianRupee, Truck, Calendar, ArrowRight, Activity
} from 'lucide-react';

export default function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pos');

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await axios.get(`/api/customers/${id}/details`);
        setData(response.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load customer details');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }}></div>
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: '200px', height: '24px', marginBottom: '8px', borderRadius: '4px' }}></div>
            <div className="skeleton" style={{ width: '300px', height: '14px', borderRadius: '4px' }}></div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="card skeleton" style={{ height: '100px' }}></div>
          ))}
        </div>
        <div className="card skeleton" style={{ height: '300px' }}></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-danger)' }}>
        <p>{error || 'Customer not found'}</p>
        <button className="form-button" onClick={() => navigate('/customers')} style={{ width: 'auto', marginTop: '16px' }}>
          Back to Customers
        </button>
      </div>
    );
  }

  const { customer, metrics, purchase_orders } = data;

  const navigateToPO = (po) => {
    navigate('/purchase-orders', { state: { viewPoId: po.id } });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Profile Section */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px' }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ 
            width: '64px', height: '64px', borderRadius: '16px', 
            backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Building size={32} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: 'var(--color-text-main)' }}>
                {customer.name}
              </h2>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
              {customer.email && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} /> {customer.email}</span>}
              {customer.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> {customer.phone}</span>}
              {customer.gstin && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={14} /> GSTIN: {customer.gstin}</span>}
            </div>
          </div>
        </div>
        <button className="logout-btn" onClick={() => navigate('/customers')} style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px' }}>
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <FileText size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Total POs</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-main)' }}>{metrics.total_pos}</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#fef3c7', color: '#d97706' }}>
            <Activity size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Running Jobs</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-main)' }}>{metrics.running_jobs}</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            <Briefcase size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Completed Jobs</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-main)' }}>{metrics.completed_jobs}</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#f3e8ff', color: '#9333ea' }}>
            <IndianRupee size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Total Billings</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-main)' }}>
              ₹{metrics.total_billing.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', backgroundColor: '#f8fafc' }}>
          <button 
            onClick={() => setActiveTab('pos')}
            style={{ 
              padding: '16px 24px', background: 'none', border: 'none', cursor: 'pointer',
              fontWeight: '600', fontSize: '14px',
              color: activeTab === 'pos' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: activeTab === 'pos' ? '2px solid var(--color-primary)' : '2px solid transparent'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} /> Purchase Orders
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: '0' }}>
          {activeTab === 'pos' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: '#ffffff' }}>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: 'var(--color-text-muted)' }}>PO NUMBER & DATE</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: 'var(--color-text-muted)' }}>STATUS</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: 'var(--color-text-muted)' }}>PROGRESS</th>
                    <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '12px', color: 'var(--color-text-muted)' }}>INVOICED</th>
                    <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '12px', color: 'var(--color-text-muted)' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {purchase_orders.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        No Purchase Orders found for this customer.
                      </td>
                    </tr>
                  ) : (
                    purchase_orders.map(po => {
                      const totalQty = po.total_qty || 0;
                      const compQty = po.completed_qty || 0;
                      const progressPct = totalQty > 0 ? Math.round((compQty / totalQty) * 100) : 0;
                      
                      const invoiceTotal = po.invoices.filter(i => i.status !== 'cancelled').reduce((sum, inv) => sum + floatval(inv.grand_total), 0);

                      return (
                        <tr key={po.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }} onClick={() => navigateToPO(po)}>
                          <td style={{ padding: '16px 24px' }}>
                            <div style={{ fontWeight: '600', color: 'var(--color-text-main)' }}>{po.po_number}</div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                              <Calendar size={12} /> {po.po_date || 'No Date'}
                            </div>
                          </td>
                          <td style={{ padding: '16px 24px' }}>
                            <span style={{ 
                              padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600',
                              backgroundColor: po.status === 'approved' ? 'var(--color-success-light)' : 'var(--color-primary-light)',
                              color: po.status === 'approved' ? 'var(--color-success)' : 'var(--color-primary)'
                            }}>
                              {po.status === 'approved' ? 'APPROVED' : po.status.toUpperCase().replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '16px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '100px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${progressPct}%`, height: '100%', backgroundColor: progressPct === 100 ? 'var(--color-success)' : 'var(--color-primary)' }}></div>
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)' }}>{progressPct}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: '600' }}>
                            ₹{invoiceTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                            <button className="logout-btn" style={{ padding: '4px 8px', height: '28px', fontSize: '11px' }}>
                              View PO <ArrowRight size={12} style={{ marginLeft: '4px' }} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const floatval = (val) => parseFloat(val) || 0;
