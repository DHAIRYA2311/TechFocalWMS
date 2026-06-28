import React, { Suspense, useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Logo from './Logo';
import NotificationBell from './NotificationBell';
import { 
  LayoutDashboard,
  FileText,
  Wrench,
  ClipboardList,
  FileCheck,
  Receipt,
  Users,
  Cpu,
  CreditCard,
  Package,
  LogOut,
  Settings,
  Bell,
  Search,
  Wallet,
  Briefcase,
  BarChart3,
  Loader2,
} from 'lucide-react';

export default function DashboardPlaceholder({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await axios.get(`http://127.0.0.1:8000/api/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setSearchResults(response.data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem('auth_token');
    
    try {
      await axios.post('http://127.0.0.1:8000/api/logout', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_profile');
      onLogout();
      navigate('/');
    }
  };

  const getRoleLabel = (role) => {
    switch(role) {
      case 'partner': return 'Partner (Founder)';
      case 'admin': return 'System Administrator';
      case 'manager': return 'Workshop Manager';
      case 'supervisor': return 'Workshop Supervisor';
      case 'helper': return 'Shop Floor Helper';
      case 'worker': return 'Shop Floor Worker';
      default: return role;
    }
  };

  const getRoleThemeColor = (role) => {
    switch(role) {
      case 'partner': return 'var(--color-success)';
      case 'admin': return 'var(--color-primary)';
      case 'manager': return 'var(--color-warning)';
      case 'supervisor': return '#2563eb';
      case 'helper': return '#475569';
      default: return 'var(--color-text-muted)';
    }
  };

  // Automated breadcrumb generation based on URL segments
  const getBreadcrumbs = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    const breadcrumbs = [];

    // Base segment
    if (segments[0] !== 'dashboard') {
      breadcrumbs.push('Dashboard');
    }

    segments.forEach((segment) => {
      switch(segment) {
        case 'dashboard': breadcrumbs.push('Dashboard'); break;
        case 'purchase-orders': breadcrumbs.push('Purchase Orders'); break;
        case 'jobs': breadcrumbs.push('Job Operations'); break;
        case 'incoming-challans': breadcrumbs.push('Incoming Challans'); break;
        case 'delivery-challans': breadcrumbs.push('Delivery Challans'); break;
        case 'invoices': breadcrumbs.push('Invoices & Billing'); break;
        case 'attendance': breadcrumbs.push('Staff Attendance'); break;
        case 'machines': breadcrumbs.push('Machines'); break;
        case 'payroll': breadcrumbs.push('Payroll'); break;
        case 'expenses': breadcrumbs.push('Expenses'); break;
        case 'inventory': breadcrumbs.push('Inventory'); break;
        case 'reports': breadcrumbs.push('Reports & Analytics'); break;
        case 'staffs': breadcrumbs.push('Staff Profiles'); break;
        case 'users': breadcrumbs.push('User Accounts'); break;
        case 'settings': breadcrumbs.push('Settings'); break;
        case 'company': breadcrumbs.push('Company Information'); break;
        case 'branding': breadcrumbs.push('Branding'); break;
        case 'domains': breadcrumbs.push('DNS & Domains'); break;
        case 'documents': breadcrumbs.push('Document Serializations'); break;
        case 'notifications': breadcrumbs.push('Notification Alerts'); break;
        case 'email': breadcrumbs.push('Email Settings'); break;
        case 'users-roles': breadcrumbs.push('Users & Roles'); break;
        case 'system': breadcrumbs.push('System Environment'); break;
        default: 
          breadcrumbs.push(segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' '));
      }
    });

    return breadcrumbs;
  };

  const hasPermission = (perm) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    // Check dynamic permissions returned by API
    if (user.permissions && user.permissions[perm] !== undefined) {
      return !!user.permissions[perm];
    }
    
    // Fallback defaults in case local storage is stale
    const fallbacks = {
      partner: { purchase_orders: true, jobs: true, payroll: true, finance: true, settings: true },
      manager: { purchase_orders: true, jobs: true, payroll: true, finance: false, settings: false },
      supervisor: { purchase_orders: false, jobs: true, payroll: false, finance: false, settings: false },
      worker: { purchase_orders: false, jobs: false, payroll: false, finance: false, settings: false },
      helper: { purchase_orders: false, jobs: false, payroll: false, finance: false, settings: false }
    };
    
    return !!fallbacks[user.role]?.[perm];
  };

  return (
    <div className="dashboard-layout" style={{ width: '100%' }}>
      
      {/* 1. Fixed Sidebar */}
      <aside className="dashboard-sidebar" style={{ zIndex: 40 }}>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Logo variant="mark" height={28} />
          <span style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '-0.5px' }}>TechFocal WMS</span>
        </div>

        <nav className="sidebar-menu" style={{ overflowY: 'auto' }}>
          <NavLink 
            to="/dashboard" 
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          {(hasPermission('purchase_orders') || hasPermission('jobs') || hasPermission('payroll') || hasPermission('finance')) && (
            <NavLink 
              to="/reports" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <BarChart3 size={18} />
              <span>Reports & Analytics</span>
            </NavLink>
          )}
          
          {hasPermission('purchase_orders') && (
            <NavLink 
              to="/purchase-orders" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <FileText size={18} />
              <span>Purchase Orders</span>
            </NavLink>
          )}

          {hasPermission('jobs') && (
            <NavLink 
              to="/jobs" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <Wrench size={18} />
              <span>Job Operations</span>
            </NavLink>
          )}

          {hasPermission('jobs') && (
            <NavLink 
              to="/incoming-challans" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <ClipboardList size={18} />
              <span>Incoming Challans</span>
            </NavLink>
          )}

          {hasPermission('jobs') && (
            <NavLink 
              to="/delivery-challans" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <FileCheck size={18} />
              <span>Delivery Challans</span>
            </NavLink>
          )}

          {hasPermission('finance') && (
            <NavLink 
              to="/invoices" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <Receipt size={18} />
              <span>Invoices & Billing</span>
            </NavLink>
          )}

          {hasPermission('settings') && user && ['admin', 'partner'].includes(user.role) && (
            <NavLink 
              to="/users" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <Users size={18} />
              <span>User Accounts</span>
            </NavLink>
          )}

          {user && (hasPermission('payroll') || hasPermission('settings') || hasPermission('jobs') || ['admin', 'partner', 'manager', 'supervisor'].includes(user.role)) && (
            <NavLink 
              to="/staffs" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <Briefcase size={18} />
              <span>Staff Profiles</span>
            </NavLink>
          )}

          <NavLink 
            to="/attendance" 
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            <Users size={18} />
            <span>Staff Attendance</span>
          </NavLink>

          {hasPermission('jobs') && (
            <NavLink 
              to="/machines" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <Cpu size={18} />
              <span>Machines</span>
            </NavLink>
          )}

          {hasPermission('payroll') && (
            <NavLink 
              to="/payroll" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <CreditCard size={18} />
              <span>Payroll</span>
            </NavLink>
          )}

          {hasPermission('finance') && (
            <NavLink 
              to="/expenses" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <Wallet size={18} />
              <span>Expenses</span>
            </NavLink>
          )}

          {hasPermission('jobs') && (
            <NavLink 
              to="/inventory" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <Package size={18} />
              <span>Inventory</span>
            </NavLink>
          )}
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
          {hasPermission('settings') && (
            <NavLink 
              to="/settings/company" 
              className={({ isActive }) => `sidebar-item ${isActive || location.pathname.startsWith('/settings') ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <Settings size={18} />
              <span>Settings</span>
            </NavLink>
          )}
          
          <div className="sidebar-item" onClick={handleLogout} style={{ cursor: 'pointer' }}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </div>
        </div>
      </aside>

      {/* 2. Main Dashboard Panel */}
      <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        
        {/* Sticky Header */}
        <header className="dashboard-header" style={{ position: 'sticky', top: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', backgroundColor: 'var(--color-card-bg)', borderBottom: '1px solid var(--color-border)' }}>
          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-muted)' }}>
            {getBreadcrumbs().map((crumb, idx, arr) => (
              <React.Fragment key={idx}>
                <span style={{ 
                  color: idx === arr.length - 1 ? 'var(--color-text-main)' : 'var(--color-text-light)', 
                  fontWeight: idx === arr.length - 1 ? '600' : 'normal' 
                }}>
                  {crumb}
                </span>
                {idx < arr.length - 1 && <span style={{ color: 'var(--color-text-light)' }}>&gt;</span>}
              </React.Fragment>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Global Search Bar */}
            <div ref={searchContainerRef} style={{ position: 'relative' }}>
              <div className="input-wrapper" style={{ width: '220px', display: 'flex', alignItems: 'center' }}>
                <span className="input-icon" style={{ left: '10px', display: 'flex', alignItems: 'center' }}>
                  {searchLoading ? (
                    <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                  ) : (
                    <Search size={14} style={{ color: 'var(--color-text-light)' }} />
                  )}
                </span>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Search anything..." 
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  onFocus={() => setShowSearchDropdown(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setShowSearchDropdown(false);
                  }}
                  style={{ height: '34px', fontSize: '12px', paddingLeft: '32px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              {/* Dropdown Overlay */}
              {showSearchDropdown && searchQuery.trim().length >= 2 && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '40px',
                    right: '0',
                    width: '420px',
                    backgroundColor: '#0e0363',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
                    zIndex: 100,
                    maxHeight: '480px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    backdropFilter: 'blur(10px)',
                    padding: '8px 0'
                  }}
                >
                  {searchLoading && !searchResults && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', gap: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
                      <Loader2 size={16} className="animate-spin" />
                      Searching...
                    </div>
                  )}
                  
                  {!searchLoading && searchResults && !Object.values(searchResults).some(arr => arr && arr.length > 0) && (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px' }}>
                      No results found for "{searchQuery}"
                    </div>
                  )}

                  {searchResults && [
                    {
                      key: 'purchase_orders',
                      title: 'Purchase Orders',
                      icon: <FileText size={14} style={{ color: '#60a5fa' }} />,
                      route: '/purchase-orders',
                      stateKey: 'viewPoId',
                      renderItem: (item) => (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '13px' }}>{item.po_number}</div>
                            <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px' }}>{item.customer_name}</div>
                          </div>
                          <span style={{ 
                            fontSize: '9px', 
                            padding: '2px 6px', 
                            borderRadius: '10px', 
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            backgroundColor: item.status === 'approved' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: item.status === 'approved' ? '#4ade80' : '#fbbf24',
                            border: item.status === 'approved' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                          }}>{item.status === 'approved' ? 'Approved' : 'Pending Review'}</span>
                        </div>
                      )
                    },
                    {
                      key: 'users',
                      title: 'Staff Profiles',
                      icon: <Users size={14} style={{ color: '#34d399' }} />,
                      route: '/staffs',
                      stateKey: 'viewStaffId',
                      renderItem: (item) => (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '13px' }}>{item.name}</div>
                            <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px' }}>{item.email}</div>
                          </div>
                          <span style={{ 
                            fontSize: '9px', 
                            padding: '2px 6px', 
                            borderRadius: '10px', 
                            fontWeight: '600',
                            textTransform: 'capitalize',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            color: '#e2e8f0',
                            border: '1px solid rgba(255, 255, 255, 0.15)'
                          }}>{item.role}</span>
                        </div>
                      )
                    },
                    {
                      key: 'job_cards',
                      title: 'Job Cards',
                      icon: <Wrench size={14} style={{ color: '#fb7185' }} />,
                      route: '/jobs',
                      stateKey: 'viewJobId',
                      renderItem: (item) => (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '13px' }}>{item.job_card_number}</div>
                          </div>
                          <span style={{ 
                            fontSize: '9px', 
                            padding: '2px 6px', 
                            borderRadius: '10px', 
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            backgroundColor: item.status === 'completed' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(37, 99, 235, 0.2)',
                            color: item.status === 'completed' ? '#4ade80' : '#60a5fa',
                            border: item.status === 'completed' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(37, 99, 235, 0.3)'
                          }}>{item.status}</span>
                        </div>
                      )
                    },
                    {
                      key: 'machines',
                      title: 'Machines',
                      icon: <Cpu size={14} style={{ color: '#a78bfa' }} />,
                      route: '/machines',
                      stateKey: 'viewMachineId',
                      renderItem: (item) => (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '13px' }}>{item.machine_code}</div>
                            <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px' }}>{item.name}</div>
                          </div>
                          <span style={{ 
                            fontSize: '9px', 
                            padding: '2px 6px', 
                            borderRadius: '10px', 
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            backgroundColor: item.status === 'running' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: item.status === 'running' ? '#4ade80' : '#fbbf24',
                            border: item.status === 'running' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                          }}>{item.status}</span>
                        </div>
                      )
                    },
                    {
                      key: 'invoices',
                      title: 'Invoices',
                      icon: <Receipt size={14} style={{ color: '#fbbf24' }} />,
                      route: '/invoices',
                      stateKey: 'viewInvoiceId',
                      renderItem: (item) => (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '13px' }}>{item.invoice_number}</div>
                          </div>
                          <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '500' }}>₹{parseFloat(item.grand_total).toLocaleString()}</span>
                        </div>
                      )
                    },
                    {
                      key: 'delivery_challans',
                      title: 'Delivery Challans',
                      icon: <FileCheck size={14} style={{ color: '#22d3ee' }} />,
                      route: '/delivery-challans',
                      stateKey: 'viewDcId',
                      renderItem: (item) => (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '13px' }}>{item.challan_number}</div>
                          </div>
                        </div>
                      )
                    }
                  ].map(cat => {
                    const items = searchResults[cat.key] || [];
                    if (items.length === 0) return null;
                    
                    return (
                      <div key={cat.key} style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          padding: '6px 16px', 
                          fontSize: '10px', 
                          fontWeight: '700', 
                          letterSpacing: '0.05em', 
                          textTransform: 'uppercase', 
                          color: 'rgba(255, 255, 255, 0.5)',
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                          marginTop: '4px'
                        }}>
                          {cat.icon}
                          {cat.title}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', padding: '4px' }}>
                          {items.map(item => (
                            <div 
                              key={item.id}
                              onClick={() => {
                                setSearchQuery('');
                                setSearchResults(null);
                                setShowSearchDropdown(false);
                                navigate(cat.route, { state: { [cat.stateKey]: item.id } });
                              }}
                              style={{
                                padding: '8px 12px',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                              {cat.renderItem(item)}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notification area */}
            {typeof window !== 'undefined' && <NotificationBell />}


            <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--color-border)' }}></div>
            
            {/* User Profile Menu */}
            <div className="header-user">
              <div className="user-info">
                <p className="user-name" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-main)' }}>{user?.name || 'User Profile'}</p>
                <p className="user-role" style={{ fontSize: '11px', color: getRoleThemeColor(user?.role), textTransform: 'capitalize' }}>
                  {getRoleLabel(user?.role)}
                </p>
              </div>
              <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                {user?.name ? user.name.split(' ').map(n=>n[0]).join('') : 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content Panel */}
        <div className="dashboard-content" style={{ flexGrow: 1, padding: '30px' }}>
          <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', width: '100%' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid var(--color-border)',
                borderTopColor: 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
            </div>
          }>
            <Outlet />
          </Suspense>
        </div>
      </main>

    </div>
  );
}
