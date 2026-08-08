import React from 'react';
import { 
  ShoppingCart, Wrench, Cpu, IndianRupee, FileText, Truck, Users, AlertTriangle, 
  Bell, Activity
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, CartesianGrid
} from 'recharts';

export default function AdminDashboard({ user, data, jobs }) {
  // Use real-time data if available, fallback to 0 or mock
  const kpis = [
    { title: 'Total Purchase Orders', value: data?.modules_data?.purchase_orders?.pending || '0', icon: <ShoppingCart size={20} />, change: 'Pending POs' },
    { title: 'Active Jobs', value: data?.kpis?.active_jobs || '0', icon: <Wrench size={20} />, change: `${data?.kpis?.delayed_jobs || 0} delayed` },
    { title: 'Machines Running', value: `${data?.kpis?.machines_running || 0} / ${data?.machines?.length || 0}`, icon: <Cpu size={20} />, change: 'Active machines' },
    { title: "Today's Revenue", value: '₹45,200', icon: <IndianRupee size={20} />, change: 'Mocked Financial Data' },
    { title: 'Pending Invoice Amt', value: '₹1.2L', icon: <FileText size={20} />, change: `${data?.modules_data?.invoices?.pending || 0} invoices pending` },
    { title: 'Pending Dispatch', value: data?.kpis?.pending_dispatch || '0', icon: <Truck size={20} />, change: 'Jobs ready for dispatch' },
    { title: 'Staff Present', value: data?.modules_data?.attendance?.present ?? data?.kpis?.workers_present ?? '0', icon: <Users size={20} />, change: `${data?.modules_data?.attendance?.absent || 0} absent, ${data?.modules_data?.attendance?.pending || 0} pending` },
    { title: 'Quality Rejection %', value: '1.2%', icon: <AlertTriangle size={20} />, change: 'Mocked Quality Data' },
  ];

  const pendingJobs = jobs?.filter(j => j.status === 'pending').length || 0;
  const runningJobs = data?.kpis?.active_jobs || 0;
  const completedJobs = data?.production_progress?.completed || 0;
  const delayedJobs = data?.kpis?.delayed_jobs || 0;

  const productionData = [
    { name: 'Jobs Waiting', value: pendingJobs, color: '#f59e0b' },
    { name: 'Jobs Running', value: runningJobs, color: '#2563eb' },
    { name: 'Jobs Completed', value: completedJobs, color: '#22c55e' },
    { name: 'Jobs Delayed', value: delayedJobs, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const revenueData = data?.revenue_chart || [];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-main)' }}>Welcome, {user?.name || 'Admin'}</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Admin Dashboard • Complete Business Overview</p>
        </div>
        <div style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: data?.workshop_status?.level === 'critical' ? 'var(--color-danger-light)' : data?.workshop_status?.level === 'warning' ? 'var(--color-warning-light)' : 'var(--color-success-light)', color: data?.workshop_status?.level === 'critical' ? 'var(--color-danger)' : data?.workshop_status?.level === 'warning' ? 'var(--color-warning)' : 'var(--color-success)', fontWeight: '600', fontSize: '14px', border: `1px solid ${data?.workshop_status?.level === 'critical' ? '#fca5a5' : data?.workshop_status?.level === 'warning' ? '#fcd34d' : '#86efac'}` }}>
          {data?.workshop_status?.title || 'Workshop Status'}
        </div>
      </div>

      {/* Top KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {kpis.map((kpi, i) => (
          <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-muted)' }}>{kpi.title}</span>
              <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                {kpi.icon}
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-main)' }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {kpi.change}
            </div>
          </div>
        ))}
      </div>

      {/* Main 3-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Production Overview */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Production Overview</h3>
            <div style={{ height: '200px' }}>
              {productionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={productionData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {productionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: '14px' }}>No production data available</div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
              {productionData.map((entry, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: entry.color }}></div>
                  <span style={{ color: 'var(--color-text-muted)' }}>{entry.name}:</span>
                  <strong style={{ color: 'var(--color-text-main)' }}>{entry.value}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Machine Status */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Machine Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
              {data?.machines?.map((machine, i) => {
                const isRunning = ['running', 'busy'].includes(machine.status);
                const isBreakdown = machine.status === 'breakdown';
                const color = isBreakdown ? 'var(--color-danger)' : isRunning ? 'var(--color-success)' : 'var(--color-warning)';
                const bgColor = isBreakdown ? 'var(--color-danger-light)' : 'transparent';
                const borderColor = isBreakdown ? '#fca5a5' : 'var(--color-border)';

                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '8px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, cursor: 'pointer' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: color }}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: isBreakdown ? 'var(--color-danger)' : 'var(--color-text-main)' }}>{machine.name}</div>
                      <div style={{ fontSize: '12px', color: isBreakdown ? 'var(--color-danger)' : 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                        {machine.status}
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!data?.machines || data.machines.length === 0) && (
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '10px' }}>No machines configured.</div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--color-primary)" />
            Live Workshop Timeline
          </h3>
          
          <div style={{ position: 'relative', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
            {/* Timeline Line */}
            {data?.timeline?.length > 0 && (
              <div style={{ position: 'absolute', left: '7px', top: '10px', bottom: '0', width: '2px', backgroundColor: 'var(--color-border)' }}></div>
            )}
            
            {data?.timeline?.map((item, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-20px', top: '4px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: i === 0 ? 'var(--color-primary)' : 'var(--color-text-muted)', border: '3px solid white', boxShadow: '0 0 0 1px var(--color-border)' }}></div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: i === 0 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{item.time}</div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-main)', marginTop: '4px', fontWeight: '500' }}>{item.event}</div>
                {item.description && (
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{item.description}</div>
                )}
              </div>
            ))}
            
            {(!data?.timeline || data.timeline.length === 0) && (
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px' }}>No recent activities.</div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Revenue */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Revenue</h3>
              <select style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                <option>Weekly</option>
                <option>Today</option>
                <option>Monthly</option>
              </select>
            </div>
            <div style={{ height: '160px', width: '100%', marginBottom: '12px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                  <RechartsTooltip cursor={{ fill: 'var(--color-bg-base)' }} />
                  <Bar dataKey="revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Notifications */}
          <div className="card" style={{ padding: '20px', flex: 1 }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} />
              Priority Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data?.priority_actions?.map((action, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', paddingBottom: i !== data.priority_actions.length - 1 ? '12px' : '0', borderBottom: i !== data.priority_actions.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: action.type === 'machine_breakdown' || action.type === 'delayed_jobs' ? 'var(--color-danger)' : 'var(--color-warning)' }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600' }}>{action.title}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>{action.message}</div>
                  </div>
                  <span style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: '500' }}>Review</span>
                </div>
              ))}

              {(!data?.priority_actions || data.priority_actions.length === 0) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }}></div>
                  <span style={{ flex: 1, color: 'var(--color-text-muted)' }}>All clear. No priority actions.</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
