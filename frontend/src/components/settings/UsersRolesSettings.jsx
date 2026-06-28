import React, { useState, useEffect } from 'react';
import { Users, Shield, CheckCircle, XCircle, Save, Loader2, Search, Info, X, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const DEFAULT_ROLE_PERMISSIONS = {
  partner: { purchase_orders: true, jobs: true, payroll: true, finance: true, settings: true },
  admin: { purchase_orders: true, jobs: true, payroll: true, finance: true, settings: true },
  manager: { purchase_orders: true, jobs: true, payroll: true, finance: false, settings: false },
  supervisor: { purchase_orders: false, jobs: true, payroll: false, finance: false, settings: false },
  worker: { purchase_orders: false, jobs: false, payroll: false, finance: false, settings: false },
  helper: { purchase_orders: false, jobs: false, payroll: false, finance: false, settings: false }
};

const PERMISSION_METADATA = {
  purchase_orders: {
    label: 'PO Approvals',
    desc: 'Allows creation, modification, and approval of Purchase Orders.'
  },
  jobs: {
    label: 'Assign Job Cards',
    desc: 'Allows creating and assigning Job Cards to machines and operators.'
  },
  payroll: {
    label: 'Calculate Wages',
    desc: 'Allows viewing/calculating worker daily wages, advances, and payroll sheets.'
  },
  finance: {
    label: 'Expense & Invoices',
    desc: 'Allows recording company expenses and creating delivery challans or tax invoices.'
  },
  settings: {
    label: 'System Configs',
    desc: 'Allows modifying email templates, device pairings, prefix documents, and permissions.'
  }
};

export default function UsersRolesSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [activeTab, setActiveTab] = useState('roles'); // 'roles' or 'users'
  
  // Permissions State
  const [rolePermissions, setRolePermissions] = useState({});
  const [userPermissions, setUserPermissions] = useState({});
  const [originalRolePermissions, setOriginalRolePermissions] = useState({});
  const [originalUserPermissions, setOriginalUserPermissions] = useState({});
  const [users, setUsers] = useState([]);
  
  // User search/filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // Active User for overrides modal
  const [activeUser, setActiveUser] = useState(null);
  const [tempUserOverrides, setTempUserOverrides] = useState({});

  const fetchPermissions = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('http://127.0.0.1:8000/api/settings/permissions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { role_permissions, user_permissions, users } = response.data;
      
      // Initialize roles permissions, applying defaults if missing
      const rolesConfig = {};
      Object.keys(DEFAULT_ROLE_PERMISSIONS).forEach(role => {
        rolesConfig[role] = {
          ...DEFAULT_ROLE_PERMISSIONS[role],
          ...(role_permissions?.[role] || {})
        };
      });
      
      setRolePermissions(rolesConfig);
      setOriginalRolePermissions(JSON.parse(JSON.stringify(rolesConfig)));
      
      setUserPermissions(user_permissions || {});
      setOriginalUserPermissions(JSON.parse(JSON.stringify(user_permissions || {})));
      
      setUsers(users || []);
    } catch (err) {
      console.error(err);
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to fetch permissions settings from the server.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post('http://127.0.0.1:8000/api/settings/permissions', {
        role_permissions: rolePermissions,
        user_permissions: userPermissions
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFeedback({
        type: 'success',
        message: response.data.message || 'Permissions updated successfully.'
      });
      
      // Update original states
      setOriginalRolePermissions(JSON.parse(JSON.stringify(rolePermissions)));
      setOriginalUserPermissions(JSON.parse(JSON.stringify(userPermissions)));
    } catch (err) {
      console.error(err);
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to save permissions settings.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRoleToggle = (role, permission) => {
    if (role === 'admin') return; // Cannot edit admin role
    setRolePermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permission]: !prev[role][permission]
      }
    }));
  };

  const openOverridesModal = (user) => {
    setActiveUser(user);
    setTempUserOverrides(userPermissions[user.id] || {});
  };

  const handleOverrideChange = (permission, val) => {
    setTempUserOverrides(prev => {
      const next = { ...prev };
      if (val === null) {
        delete next[permission]; // Revert to inherit
      } else {
        next[permission] = val; // Set explicit grant/deny
      }
      return next;
    });
  };

  const applyOverrides = () => {
    setUserPermissions(prev => {
      const next = { ...prev };
      if (Object.keys(tempUserOverrides).length === 0) {
        delete next[activeUser.id];
      } else {
        next[activeUser.id] = tempUserOverrides;
      }
      return next;
    });
    setActiveUser(null);
  };

  const getOverrideCount = (userId) => {
    return Object.keys(userPermissions[userId] || {}).length;
  };

  const hasUnsavedChanges = 
    JSON.stringify(rolePermissions) !== JSON.stringify(originalRolePermissions) ||
    JSON.stringify(userPermissions) !== JSON.stringify(originalUserPermissions);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px', flexDirection: 'column', gap: '12px' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Loading permissions data...</span>
      </div>
    );
  }

  // Filter users based on query and role filter
  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query);
      
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Header Card */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} style={{ color: 'var(--color-primary)' }} />
            Users & Roles Permissions
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Configure roles & permissions matrix or manage user-specific overrides.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {hasUnsavedChanges && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-warning)', fontWeight: '600', backgroundColor: 'var(--color-warning-light)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-warning)' }}></span>
              Unsaved changes
            </div>
          )}
          
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            style={{
              padding: '10px 18px',
              backgroundColor: hasUnsavedChanges ? 'var(--color-primary)' : 'var(--color-text-light)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: hasUnsavedChanges && !saving ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: hasUnsavedChanges ? 1 : 0.6,
              transition: 'all 0.2s ease',
              boxShadow: hasUnsavedChanges ? '0 4px 6px -1px rgba(37, 99, 235, 0.15)' : 'none'
            }}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`} style={{ margin: '0' }}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Tabs Layout */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            style={{
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '600',
              border: 'none',
              borderBottom: activeTab === 'roles' ? '2px solid var(--color-primary)' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'roles' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <Shield size={16} />
            Role Permissions Matrix
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            style={{
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '600',
              border: 'none',
              borderBottom: activeTab === 'users' ? '2px solid var(--color-primary)' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'users' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <Users size={16} />
            User Overrides
            {users.length > 0 && (
              <span style={{
                fontSize: '11px',
                backgroundColor: activeTab === 'users' ? 'var(--color-primary-light)' : 'var(--color-bg-base)',
                color: activeTab === 'users' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                padding: '2px 8px',
                borderRadius: '10px',
                fontWeight: 'normal',
                border: '1px solid var(--color-border)'
              }}>
                {users.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content: Roles Matrix */}
        {activeTab === 'roles' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '16px', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', width: '220px' }}>
                      Role
                    </th>
                    {Object.entries(PERMISSION_METADATA).map(([key, meta]) => (
                      <th key={key} style={{ padding: '16px', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'center' }}>
                        <div>{meta.label}</div>
                        <div style={{ fontSize: '9px', fontWeight: 'normal', textTransform: 'none', color: 'var(--color-text-light)', marginTop: '4px', maxWidth: '160px', margin: '4px auto 0', lineHeight: '1.2' }}>
                          {meta.desc}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(DEFAULT_ROLE_PERMISSIONS).map(role => {
                    const isSelfAdmin = role === 'admin';
                    return (
                      <tr key={role} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.2s', backgroundColor: isSelfAdmin ? 'rgba(241, 245, 249, 0.4)' : '#ffffff' }}>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: '600', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {role === 'partner' ? 'Partner (Founder)' :
                             role === 'admin' ? 'System Administrator' :
                             role === 'manager' ? 'Workshop Manager' :
                             role === 'supervisor' ? 'Workshop Supervisor' :
                             role === 'worker' ? 'Shop Floor Worker' :
                             role === 'helper' ? 'Shop Floor Helper' : role}
                            {isSelfAdmin && <Lock size={12} style={{ color: 'var(--color-text-light)' }} />}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            role: {role}
                          </div>
                        </td>
                        {Object.keys(PERMISSION_METADATA).map(perm => {
                          const checked = isSelfAdmin ? true : !!rolePermissions[role]?.[perm];
                          return (
                            <td key={perm} style={{ padding: '16px', textAlign: 'center' }}>
                              <button
                                type="button"
                                disabled={isSelfAdmin}
                                onClick={() => handleRoleToggle(role, perm)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: isSelfAdmin ? 'not-allowed' : 'pointer',
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  backgroundColor: checked ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.05)',
                                  border: `1px solid ${checked ? 'rgba(34, 197, 94, 0.18)' : 'rgba(239, 68, 68, 0.12)'}`,
                                  transition: 'all 0.15s ease',
                                  padding: 0
                                }}
                              >
                                {checked ? (
                                  <CheckCircle size={18} style={{ color: 'var(--color-success)' }} />
                                ) : (
                                  <XCircle size={18} style={{ color: 'var(--color-danger)' }} />
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <Info size={14} style={{ color: 'var(--color-primary)' }} />
              <span>Roles changes here will apply to all users under that role automatically, unless overridden individually in the User Overrides tab.</span>
            </div>
          </div>
        )}

        {/* Tab Content: User Overrides */}
        {activeTab === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Filter controls */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search users by name, email, or role..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '38px', height: '42px' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '500' }}>Filter Role:</span>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="form-input"
                  style={{ width: '160px', height: '42px', paddingLeft: '12px', paddingRight: '12px', cursor: 'pointer' }}
                >
                  <option value="all">All Roles</option>
                  <option value="partner">Partner</option>
                  <option value="admin">Administrator</option>
                  <option value="manager">Manager</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="worker">Worker</option>
                  <option value="helper">Helper</option>
                </select>
              </div>
            </div>

            {/* Users list table */}
            {filteredUsers.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <Users size={32} style={{ color: 'var(--color-text-light)' }} />
                <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>No users match the search criteria.</p>
              </div>
            ) : (
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' }}>
                      <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        User Name & Email
                      </th>
                      <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        Role
                      </th>
                      <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        Override Status
                      </th>
                      <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'right' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => {
                      const overridesCount = getOverrideCount(user.id);
                      const isUserAdmin = user.role === 'admin';
                      
                      return (
                        <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: '#ffffff', transition: 'background-color 0.2s' }}>
                          <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--color-primary-light)',
                              color: 'var(--color-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifycontent: 'center',
                              fontWeight: '600',
                              fontSize: '13px'
                            }}>
                              {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: '600', color: 'var(--color-text-main)', fontSize: '14px' }}>{user.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{user.email}</div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              backgroundColor: 
                                user.role === 'partner' ? 'rgba(34, 197, 94, 0.08)' :
                                user.role === 'admin' ? 'rgba(37, 99, 235, 0.08)' :
                                user.role === 'manager' ? 'rgba(147, 51, 234, 0.08)' :
                                user.role === 'supervisor' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(100, 116, 139, 0.08)',
                              color: 
                                user.role === 'partner' ? 'var(--color-success)' :
                                user.role === 'admin' ? 'var(--color-primary)' :
                                user.role === 'manager' ? '#9333ea' :
                                user.role === 'supervisor' ? 'var(--color-warning)' : 'var(--color-text-muted)',
                              border: `1px solid ${
                                user.role === 'partner' ? 'rgba(34, 197, 94, 0.15)' :
                                user.role === 'admin' ? 'rgba(37, 99, 235, 0.15)' :
                                user.role === 'manager' ? 'rgba(147, 51, 234, 0.15)' :
                                user.role === 'supervisor' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(100, 116, 139, 0.15)'
                              }`
                            }}>
                              {user.role}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {isUserAdmin ? (
                              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Lock size={12} /> Bypasses rules
                              </span>
                            ) : overridesCount > 0 ? (
                              <span style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                                color: 'var(--color-warning)',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                border: '1px solid rgba(245, 158, 11, 0.15)'
                              }}>
                                {overridesCount} override{overridesCount > 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>
                                Inherited from role
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => openOverridesModal(user)}
                              disabled={isUserAdmin}
                              style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid var(--color-border)',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: '500',
                                color: isUserAdmin ? 'var(--color-text-light)' : 'var(--color-primary)',
                                cursor: isUserAdmin ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              Manage Overrides
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Overrides Modal Overlay */}
      {activeUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
          backdropFilter: 'blur(3px)'
        }}>
          <div className="animate-fade-in" style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '550px',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--color-bg-base)'
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text-main)' }}>
                  Manage Overrides: {activeUser.name}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px', textTransform: 'capitalize' }}>
                  Role: {activeUser.role} • {activeUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveUser(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  borderRadius: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                fontSize: '12px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                lineHeight: '1.4',
                border: '1px solid rgba(37, 99, 235, 0.1)',
                display: 'flex',
                gap: '8px'
              }}>
                <Info size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>
                  Overrides will force allow or deny access, ignoring the default role-based policy. Select <strong>Inherit</strong> to restore default behavior.
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.entries(PERMISSION_METADATA).map(([perm, meta]) => {
                  const roleDefault = !!rolePermissions[activeUser.role]?.[perm];
                  const overrideVal = tempUserOverrides[perm]; // true, false, or undefined
                  const isInherited = overrideVal === undefined;
                  const resolvedValue = isInherited ? roleDefault : overrideVal;
                  
                  return (
                    <div key={perm} style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'var(--color-bg-base)',
                      gap: '12px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {meta.label}
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            color: resolvedValue ? 'var(--color-success)' : 'var(--color-danger)',
                            backgroundColor: resolvedValue ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.05)',
                            padding: '2px 6px',
                            borderRadius: '8px',
                            border: `1px solid ${resolvedValue ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.1)'}`
                          }}>
                            {resolvedValue ? 'Access Allowed' : 'Denied'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', lineHeight: '1.3' }}>
                          {meta.desc}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '4px' }}>
                          Role default: {roleDefault ? 'Allowed' : 'Denied'}
                        </div>
                      </div>

                      {/* 3-State Button Selector */}
                      <div style={{
                        display: 'flex',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        backgroundColor: '#ffffff',
                        flexShrink: 0
                      }}>
                        <button
                          type="button"
                          onClick={() => handleOverrideChange(perm, null)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            border: 'none',
                            backgroundColor: isInherited ? 'var(--color-primary-light)' : 'transparent',
                            color: isInherited ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          Inherit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOverrideChange(perm, true)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            border: 'none',
                            borderLeft: '1px solid var(--color-border)',
                            backgroundColor: overrideVal === true ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                            color: overrideVal === true ? 'var(--color-success)' : 'var(--color-text-muted)',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          Grant
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOverrideChange(perm, false)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            border: 'none',
                            borderLeft: '1px solid var(--color-border)',
                            backgroundColor: overrideVal === false ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                            color: overrideVal === false ? 'var(--color-danger)' : 'var(--color-text-muted)',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              backgroundColor: 'var(--color-bg-base)'
            }}>
              <button
                type="button"
                onClick={() => setActiveUser(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--color-text-main)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyOverrides}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--color-primary)',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Apply Overrides
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

