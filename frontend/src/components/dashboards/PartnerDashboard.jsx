import React from 'react';
import { 
  IndianRupee, TrendingUp, Users, ShoppingCart, 
  ArrowUpRight, ArrowDownRight, FileText, CheckCircle, Activity, CreditCard
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';

export default function PartnerDashboard({ user, data, jobs }) {
  const formatCurrency = (val) => {
    if (!val) return '₹0';
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    return `₹${val.toLocaleString()}`;
  };

  const financialKPIs = [
    { title: "Today's Revenue", value: data?.financial_kpis ? formatCurrency(data.financial_kpis.today_revenue) : '₹0', icon: <IndianRupee size={20} />, trend: 'Live', isPositive: true },
    { title: 'Monthly Revenue', value: data?.financial_kpis ? formatCurrency(data.financial_kpis.monthly_revenue) : '₹0', icon: <TrendingUp size={20} />, trend: 'Live', isPositive: true },
    { title: 'Outstanding', value: data?.financial_kpis ? formatCurrency(data.financial_kpis.outstanding) : '₹0', icon: <CreditCard size={20} />, trend: 'Live', isPositive: true },
    { title: 'Monthly Expenses', value: data?.financial_kpis ? formatCurrency(data.financial_kpis.monthly_expenses) : '₹0', icon: <ArrowDownRight size={20} />, trend: 'Live', isPositive: false },
    { title: 'Net Profit', value: data?.financial_kpis ? formatCurrency(data.financial_kpis.net_profit) : '₹0', icon: <Activity size={20} />, trend: 'Live', isPositive: data?.financial_kpis?.net_profit >= 0 },
  ];

  const customerStats = [
    { label: 'Total Orders', value: data?.customer_stats?.total_orders || '0' },
    { label: 'Completed', value: data?.customer_stats?.completed || '0' },
    { label: 'Pending', value: data?.customer_stats?.pending || '0' },
    { label: 'New Customers', value: data?.customer_stats?.new_customers || '0' },
  ];

  const poStats = [
    { label: "Today's PO", value: data?.po_stats?.today ? `₹${data.po_stats.today.toLocaleString()}` : 'NR' },
    { label: 'Weekly PO', value: data?.po_stats?.weekly ? `₹${data.po_stats.weekly.toLocaleString()}` : 'NR' },
    { label: 'Monthly PO', value: data?.po_stats?.monthly ? `₹${data.po_stats.monthly.toLocaleString()}` : 'NR' },
  ];

  const analyticsData = data?.monthly_revenue || [];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-main)' }}>Welcome, {user?.name || 'Partner'}</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Partner Dashboard • Business Performance & Financial Analytics</p>
      </div>

      {/* Financial KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
        {financialKPIs.map((kpi, i) => (
          <div key={i} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                {kpi.icon}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600', color: kpi.isPositive ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {kpi.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {kpi.trend}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>{kpi.value}</div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '500' }}>{kpi.title}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* Left Col - Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>Revenue Growth</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} tickFormatter={(val) => `₹${val/100000}L`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <RechartsTooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  <Legend iconType="circle" />
                  <Area type="monotone" dataKey="revenue" name="Total Revenue" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="var(--color-primary)" />
                Customer Summary
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {customerStats.map((stat, i) => (
                  <div key={i}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-text-main)' }}>{stat.value}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart size={18} color="var(--color-primary)" />
                Purchase Orders
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {poStats.map((stat, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: i !== poStats.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{stat.label}</span>
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right Col - Activities */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="card" style={{ padding: '24px', flex: 1 }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>Recent Activities</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', paddingLeft: '12px' }}>
              
              {data?.timeline?.length > 0 && (
                <div style={{ position: 'absolute', left: '16px', top: '10px', bottom: '10px', width: '2px', backgroundColor: 'var(--color-border)' }}></div>
              )}

              {data?.timeline?.map((item, i) => (
                <div key={i} style={{ position: 'relative', paddingLeft: '20px' }}>
                  <div style={{ position: 'absolute', left: '-5px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: i === 0 ? 'var(--color-primary)' : 'var(--color-text-muted)', border: '2px solid white', boxShadow: '0 0 0 1px var(--color-border)' }}></div>
                  <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: i === 0 ? 'var(--color-primary)' : 'var(--color-text-main)' }}>{item.event}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{item.description}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '4px' }}>{item.time}</div>
                </div>
              ))}

              {(!data?.timeline || data.timeline.length === 0) && (
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px' }}>No recent activities.</div>
              )}

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
