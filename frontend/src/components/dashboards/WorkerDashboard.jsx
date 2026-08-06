import React, { useState, useEffect } from 'react';
import { Play, Pause, Clock, Wrench, Calendar, ChevronRight } from 'lucide-react';

export default function WorkerDashboard({ user, data, jobs }) {
  const [isRunning, setIsRunning] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(3492); // Fake time for now

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Find job assigned to this worker that is running. For now we just pick the first 'in_progress' job if any
  const runningJob = jobs?.find(j => j.status === 'in_progress') || null;
  const pendingJobs = jobs?.filter(j => j.status === 'pending' || j.status === 'allocated') || [];

  const assignedJobs = pendingJobs.slice(0, 3).map((j, i) => ({
    id: j.job_number || `JOB-${j.id}`,
    status: i === 0 ? 'Next' : 'Pending',
    name: j.item_name || 'Machining Task'
  }));

  if (assignedJobs.length === 0) {
    assignedJobs.push(
      { id: 'JOB-2026-012', status: 'Pending', name: 'Flange Machining (Mock)' },
      { id: 'JOB-2026-015', status: 'Next', name: 'Shaft Turning (Mock)' }
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Hero Card */}
      <div className="card" style={{ padding: '30px', background: 'linear-gradient(135deg, var(--color-primary) 0%, #1e3a8a 100%)', color: 'white', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>Welcome, {user?.name || 'Worker'}</h1>
            <div style={{ display: 'flex', gap: '20px', fontSize: '14px', opacity: 0.9 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} /> Clocked In
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={16} /> Shift Active
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '48px', fontWeight: '700' }}>
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              {new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Current Job Card */}
        <div className="card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--color-primary-light)' }}>
          <h2 style={{ fontSize: '14px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600', marginBottom: '16px' }}>
            Current Job
          </h2>
          
          <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: 'var(--color-primary)' }}>
            {runningJob ? (runningJob.job_number || `JOB-${runningJob.id}`) : 'No Active Job'}
          </div>
          
          <div style={{ display: 'flex', gap: '16px', marginBottom: '30px' }}>
            <span style={{ fontSize: '14px', backgroundColor: 'var(--color-bg-base)', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Wrench size={14} /> {runningJob?.machine_id ? `Machine ID: ${runningJob.machine_id}` : 'Assigned Machine'}
            </span>
            <span style={{ fontSize: '14px', backgroundColor: 'var(--color-bg-base)', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} /> {runningJob ? 'In Progress' : 'Waiting'}
            </span>
          </div>

          <div style={{ fontSize: '64px', fontWeight: '700', fontFamily: 'monospace', color: isRunning && runningJob ? 'var(--color-success)' : 'var(--color-text-main)', marginBottom: '30px', letterSpacing: '2px', lineHeight: '1' }}>
            {runningJob ? formatTime(elapsedTime) : '00:00:00'}
          </div>

          <button 
            disabled={!runningJob}
            onClick={() => setIsRunning(!isRunning)}
            style={{ 
              width: '100%', 
              padding: '16px', 
              fontSize: '18px', 
              fontWeight: '600',
              borderRadius: '12px', 
              border: 'none', 
              backgroundColor: !runningJob ? 'var(--color-border)' : isRunning ? 'var(--color-warning)' : 'var(--color-primary)', 
              color: !runningJob ? 'var(--color-text-muted)' : isRunning ? 'var(--color-text-main)' : 'white',
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '12px',
              cursor: runningJob ? 'pointer' : 'not-allowed',
              boxShadow: runningJob ? 'var(--shadow-md)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            {isRunning && runningJob ? (
              <><Pause size={24} /> Pause Job / Break</>
            ) : (
              <><Play size={24} /> {runningJob ? 'Resume Job' : 'Start Next Job'}</>
            )}
          </button>
        </div>

        {/* Assigned Jobs & Notifications */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="card" style={{ padding: '24px', flex: 1 }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Upcoming Jobs</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {assignedJobs.map((job, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '12px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-main)', marginBottom: '4px' }}>{job.id}</div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{job.name}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ 
                      fontSize: '12px', 
                      fontWeight: '600', 
                      padding: '4px 10px', 
                      borderRadius: '12px',
                      backgroundColor: job.status === 'Pending' ? 'var(--color-warning-light)' : job.status === 'Next' ? 'var(--color-primary-light)' : 'var(--color-border)',
                      color: job.status === 'Pending' ? 'var(--color-warning)' : job.status === 'Next' ? 'var(--color-primary)' : 'var(--color-text-muted)'
                    }}>
                      {job.status}
                    </span>
                    <ChevronRight size={18} color="var(--color-text-light)" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
