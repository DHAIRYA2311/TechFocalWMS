import React from 'react';
import { 
  AlertTriangle, Cpu, TrendingUp, Users, ClipboardList, CheckCircle, Play, Settings
} from 'lucide-react';

export default function ManagerDashboard({ user, data, jobs }) {
  // Use real-time data if available
  const kpis = [
    { title: 'Delayed Jobs', value: data?.kpis?.delayed_jobs || '0', icon: <AlertTriangle size={20} color="var(--color-danger)" />, bgColor: 'var(--color-danger-light)' },
    { title: 'Machine Utilization', value: data?.machines?.length > 0 ? `${Math.round((data.kpis.machines_running / data.machines.length) * 100)}%` : '0%', icon: <Cpu size={20} color="var(--color-primary)" />, bgColor: 'var(--color-primary-light)' },
    { title: "Today's Production", value: `${data?.production_progress?.completed || 0} / ${data?.production_progress?.total || 0}`, icon: <TrendingUp size={20} color="var(--color-success)" />, bgColor: 'var(--color-success-light)' },
    { title: 'Worker Availability', value: `${data?.kpis?.workers_present || 0} Present`, icon: <Users size={20} color="var(--color-primary)" />, bgColor: 'var(--color-primary-light)' },
    { title: 'Pending Allocation', value: jobs?.filter(j => j.status === 'pending').length || '0', icon: <ClipboardList size={20} color="var(--color-warning)" />, bgColor: 'var(--color-warning-light)' },
    { title: 'QC Pending', value: jobs?.filter(j => j.status === 'inspection').length || '0', icon: <CheckCircle size={20} color="var(--color-success)" />, bgColor: 'var(--color-success-light)' },
  ];

  // Group jobs for Kanban
  const pendingJobs = jobs?.filter(j => j.status === 'pending') || [];
  const machiningJobs = jobs?.filter(j => j.status === 'in_progress') || [];
  const qcJobs = jobs?.filter(j => j.status === 'inspection') || [];
  const completedJobs = jobs?.filter(j => j.status === 'completed') || [];

  const kanbanStages = [
    { name: 'Pending', count: pendingJobs.length, color: 'var(--color-warning)', items: pendingJobs.map(j => j.job_number || `JOB-${j.id}`) },
    { name: 'Machining', count: machiningJobs.length, color: 'var(--color-primary)', items: machiningJobs.map(j => j.job_number || `JOB-${j.id}`) },
    { name: 'QC', count: qcJobs.length, color: 'var(--color-success)', items: qcJobs.map(j => j.job_number || `JOB-${j.id}`) },
    { name: 'Completed', count: completedJobs.length, color: 'var(--color-text-muted)', items: completedJobs.map(j => j.job_number || `JOB-${j.id}`) },
  ];

  const delayedJobsList = jobs?.filter(j => j.status === 'delayed') || [];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-main)' }}>Welcome, {user?.name || 'Manager'}</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Workshop Manager Dashboard • Operations & Resource Allocation</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {kpis.map((kpi, i) => (
          <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px' }}>
            <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: kpi.bgColor }}>
              {kpi.icon}
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '500' }}>{kpi.title}</div>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        
        {/* LEFT COL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Live Kanban */}
          <div className="card" style={{ padding: '20px', flex: 1 }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Live Job Kanban</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', height: '100%', minHeight: '300px' }}>
              {kanbanStages.map((stage, i) => (
                <div key={i} style={{ backgroundColor: 'var(--color-bg-base)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: stage.color }}></div>
                      {stage.name}
                    </div>
                    <div style={{ fontSize: '12px', backgroundColor: 'var(--color-border)', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                      {stage.count}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
                    {stage.items.slice(0, 10).map((item, j) => (
                      <div key={j} style={{ backgroundColor: 'white', padding: '10px', borderRadius: '6px', fontSize: '12px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', cursor: 'grab' }}>
                        {item}
                      </div>
                    ))}
                    {stage.count > 10 && (
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '4px' }}>
                        + {stage.count - 10} more...
                      </div>
                    )}
                    {stage.count === 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '20px', fontStyle: 'italic' }}>
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Allocation Board */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Quick Allocation Board</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'var(--color-bg-base)', padding: '16px', borderRadius: '8px', border: '1px dashed var(--color-border)' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Waiting Job</label>
                <select style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px' }}>
                  {pendingJobs.map(j => (
                    <option key={j.id} value={j.id}>{j.job_number || `JOB-${j.id}`}</option>
                  ))}
                  {pendingJobs.length === 0 && <option disabled>No waiting jobs</option>}
                </select>
              </div>
              <span style={{ color: 'var(--color-text-muted)' }}>→</span>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Assign Worker</label>
                <select style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px' }}>
                  <option>Any Available Worker</option>
                  <option>Rahul</option>
                  <option>Suresh</option>
                </select>
              </div>
              <span style={{ color: 'var(--color-text-muted)' }}>→</span>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Assign Machine</label>
                <select style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px' }}>
                  {data?.machines?.filter(m => !['breakdown', 'running'].includes(m.status)).map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.status})</option>
                  ))}
                  <option>Any Available</option>
                </select>
              </div>
              <button style={{ backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', marginTop: '20px' }}>
                <Play size={16} /> Allocate
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Machine Availability */}
          <div className="card" style={{ padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={18} />
              Machine Availability
            </h3>
            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', textAlign: 'left' }}>
                  <th style={{ paddingBottom: '8px' }}>Machine</th>
                  <th style={{ paddingBottom: '8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.machines?.map((m, i) => {
                  const isRunning = ['running', 'busy'].includes(m.status);
                  const isBreakdown = m.status === 'breakdown';
                  const color = isBreakdown ? 'var(--color-danger)' : isRunning ? 'var(--color-success)' : 'var(--color-warning)';
                  const bgColor = isBreakdown ? 'var(--color-danger-light)' : isRunning ? 'var(--color-success-light)' : 'var(--color-warning-light)';

                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-bg-base)' }}>
                      <td style={{ padding: '12px 0', fontWeight: '500' }}>{m.name}</td>
                      <td style={{ padding: '12px 0' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', backgroundColor: bgColor, color: color, fontSize: '11px', fontWeight: '600', textTransform: 'capitalize' }}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {(!data?.machines || data.machines.length === 0) && (
                  <tr><td colSpan="2" style={{ padding: '12px 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>No machines found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Delayed Jobs */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-danger)' }}>
              ⚠ Delayed Jobs
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto' }}>
              {delayedJobsList.map((job, i) => (
                <div key={i} style={{ border: '1px solid #fca5a5', backgroundColor: 'var(--color-danger-light)', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--color-danger)', fontSize: '14px' }}>{job.job_number || `JOB-${job.id}`}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-main)', marginTop: '4px' }}>
                      Status: <span style={{ fontWeight: '500' }}>Delayed</span>
                    </div>
                  </div>
                  <button style={{ backgroundColor: 'var(--color-danger)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                    View
                  </button>
                </div>
              ))}
              {delayedJobsList.length === 0 && (
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '10px' }}>No delayed jobs.</div>
              )}
            </div>
          </div>

          {/* Today's Targets */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Today's Targets</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Completed: <strong>{data?.production_progress?.completed || 0}</strong> / {data?.production_progress?.total || 0}</div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Remaining: <strong>{data?.production_progress?.remaining || 0}</strong></div>
            </div>
            <div style={{ height: '8px', backgroundColor: 'var(--color-bg-base)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${data?.production_progress?.percentage || 0}%`, height: '100%', backgroundColor: 'var(--color-success)', borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
