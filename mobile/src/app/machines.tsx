import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useRealTime } from '@/hooks/useRealTime';
import * as Lucide from 'lucide-react-native';

const ArrowLeft = Lucide.ArrowLeft as any;
const Search = Lucide.Search as any;
const Cpu = Lucide.Cpu as any;
const Wrench = Lucide.Wrench as any;
const History = Lucide.History as any;
const User = Lucide.User as any;
const Clock = Lucide.Clock as any;
const DollarSign = Lucide.DollarSign as any;
const AlertCircle = Lucide.AlertCircle as any;
const CheckCircle = Lucide.CheckCircle as any;
const RefreshCw = Lucide.RefreshCw as any;
const Info = Lucide.Info as any;
const X = Lucide.X as any;
const Check = Lucide.Check as any;
const ChevronRight = Lucide.ChevronRight as any;
const Plus = Lucide.Plus as any;
const AlertTriangle = Lucide.AlertTriangle as any;
const Play = Lucide.Play as any;
const FileText = Lucide.FileText as any;

const { width } = Dimensions.get('window');
const isTablet = width > 600;

interface DefaultOperator {
  id: number;
  name: string;
  role: string;
}

interface ActiveJob {
  id: number;
  job_card_number: string;
  quantity: number;
  status: string;
  worker_name: string;
  customer: string;
  po_number: string;
  description?: string;
}

interface MachineLog {
  id: number;
  log_type: 'maintenance' | 'breakdown' | 'tooling_change' | 'status_override';
  description: string;
  cost: number | string;
  logged_by: string;
  date: string;
}

interface Machine {
  id: number;
  machine_code: string;
  name: string;
  type: string;
  status: 'idle' | 'busy' | 'maintenance' | 'inactive';
  hourly_rate: number | string | null;
  specifications: string | null;
  default_operator_id: number | null;
  last_maintenance_date: string | null;
  next_maintenance_due: string | null;
  default_operator?: DefaultOperator | null;
  active_jobs?: ActiveJob[];
  logs?: MachineLog[];
}

interface Stats {
  total: number;
  idle: number;
  busy: number;
  maintenance: number;
  inactive: number;
  utilization_rate: number;
}

export default function MachinesScreen() {
  const { token, apiUrl } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Core Data States
  const [machines, setMachines] = useState<Machine[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    idle: 0,
    busy: 0,
    maintenance: 0,
    inactive: 0,
    utilization_rate: 0
  });
  const [userRole, setUserRole] = useState<string | null>(null);

  // Loaders
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submittingLog, setSubmittingLog] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'idle' | 'busy' | 'maintenance' | 'inactive'>('all');

  // Detail Modal States
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [activeTab, setActiveTab] = useState<'specs' | 'jobs' | 'history'>('specs');

  // Log Form States
  const [logType, setLogType] = useState<'maintenance' | 'breakdown' | 'tooling_change' | 'status_override'>('maintenance');
  const [logDescription, setLogDescription] = useState('');
  const [logCost, setLogCost] = useState('');
  const [showLogForm, setShowLogForm] = useState(false);

  const refreshSelectedMachine = async (id: number) => {
    if (!token || !apiUrl) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${apiUrl}/api/machines/${id}`, { headers });
      setSelectedMachine(res.data);
    } catch (err) {
      console.warn('Failed to refresh selected machine details:', err);
    }
  };

  useRealTime('machines', (event) => {
    fetchData();
    if (selectedMachine) {
      refreshSelectedMachine(selectedMachine.id);
    }
  });

  // Fetch all machines & dashboard stats
  const fetchData = async () => {
    if (!token || !apiUrl) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [machinesRes, statsRes, meRes] = await Promise.all([
        axios.get(`${apiUrl}/api/machines`, { headers }),
        axios.get(`${apiUrl}/api/machines/stats`, { headers }),
        axios.get(`${apiUrl}/api/me`, { headers }).catch(() => null)
      ]);

      setMachines(machinesRes.data);
      if (statsRes.data) {
        setStats(statsRes.data);
      }
      if (meRes?.data?.user) {
        setUserRole(meRes.data.user.role);
      }
    } catch (err: any) {
      console.error('Failed to load machine data:', err);
      Alert.alert('Error', 'Failed to retrieve shop floor machines. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch full details of a specific machine (to load maintenance logs & full specs)
  const handleOpenDetails = async (machine: Machine) => {
    // Open modal with current list item details first
    setSelectedMachine(machine);
    setActiveTab('specs');
    setShowLogForm(false);
    setLogType('maintenance');
    setLogDescription('');
    setLogCost('');

    if (!token || !apiUrl) return;
    setLoadingDetails(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${apiUrl}/api/machines/${machine.id}`, { headers });
      
      // Update selected machine state with logs and detailed active jobs
      setSelectedMachine(res.data);
    } catch (err: any) {
      console.error('Failed to fetch machine logs:', err);
      Alert.alert('Warning', 'Could not load the full history of maintenance logs.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedMachine(null);
  };

  // Submit new activity log
  const handleSubmitLog = async () => {
    if (!selectedMachine || !token || !apiUrl) return;

    if (!logDescription.trim()) {
      Alert.alert('Validation Error', 'Please enter a description for the activity log.');
      return;
    }

    setSubmittingLog(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const costValue = logCost.trim() ? parseFloat(logCost) : null;

      const response = await axios.post(
        `${apiUrl}/api/machines/${selectedMachine.id}/maintenance`,
        {
          log_type: logType,
          description: logDescription.trim(),
          cost: costValue
        },
        { headers }
      );

      Alert.alert('Success', response.data.message || 'Machine log recorded successfully.');
      
      // Reset log form fields
      setLogDescription('');
      setLogCost('');
      setShowLogForm(false);

      // Re-fetch machine details to update logs list inside modal
      const detailsRes = await axios.get(`${apiUrl}/api/machines/${selectedMachine.id}`, { headers });
      setSelectedMachine(detailsRes.data);

      // Refresh parent machine list & metrics in background
      fetchData();
    } catch (err: any) {
      console.error('Failed to save machine log:', err);
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Failed to submit the maintenance log. Please verify your role permissions.'
      );
    } finally {
      setSubmittingLog(false);
    }
  };

  // Check if current user is manager or higher
  const isSupervisorOrAbove = useMemo(() => {
    return userRole && ['admin', 'partner', 'manager'].includes(userRole);
  }, [userRole]);

  // Filtered & Searched machines list
  const filteredMachines = useMemo(() => {
    return machines.filter(m => {
      const matchesSearch = 
        m.machine_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.default_operator?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [machines, searchQuery, statusFilter]);

  // Colors & badges helper
  const getStatusMeta = (status: Machine['status']) => {
    switch (status) {
      case 'idle':
        return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', label: 'Idle / Available' };
      case 'busy':
        return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', label: 'Busy / Operating' };
      case 'maintenance':
        return { bg: '#fef2f2', text: '#ef4444', border: '#fca5a5', label: 'Breakdown / Maintenance' };
      case 'inactive':
        return { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1', label: 'Inactive' };
      default:
        return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', label: status };
    }
  };

  const getLogTypeMeta = (type: MachineLog['log_type']) => {
    switch (type) {
      case 'maintenance':
        return { bg: '#eff6ff', text: '#2563eb', label: 'Maintenance' };
      case 'breakdown':
        return { bg: '#fef2f2', text: '#ef4444', label: 'Breakdown' };
      case 'tooling_change':
        return { bg: '#ecfeff', text: '#0891b2', label: 'Tooling Change' };
      case 'status_override':
        return { bg: '#faf5ff', text: '#7c3aed', label: 'Status Override' };
      default:
        return { bg: '#f8fafc', text: '#64748b', label: type };
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Machine Logs & Status</Text>
          <Text style={styles.headerSubtitle}>Floor Controller Panel</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchData} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <RefreshCw size={18} color="#64748b" />
          )}
        </TouchableOpacity>
      </View>

      {/* KPI metrics row */}
      <View style={styles.kpiContainer}>
        <TouchableOpacity 
          style={[styles.kpiCard, statusFilter === 'all' && styles.kpiCardActive, { borderColor: '#cbd5e1' }]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={styles.kpiVal}>{stats.total}</Text>
          <Text style={styles.kpiLabel}>Total</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.kpiCard, statusFilter === 'idle' && styles.kpiCardActive, { borderColor: '#10b981' }]}
          onPress={() => setStatusFilter('idle')}
        >
          <Text style={[styles.kpiVal, { color: '#10b981' }]}>{stats.idle}</Text>
          <Text style={styles.kpiLabel}>Idle</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.kpiCard, statusFilter === 'busy' && styles.kpiCardActive, { borderColor: '#2563eb' }]}
          onPress={() => setStatusFilter('busy')}
        >
          <Text style={[styles.kpiVal, { color: '#2563eb' }]}>{stats.busy}</Text>
          <Text style={styles.kpiLabel}>Busy</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.kpiCard, statusFilter === 'maintenance' && styles.kpiCardActive, { borderColor: '#ef4444' }]}
          onPress={() => setStatusFilter('maintenance')}
        >
          <Text style={[styles.kpiVal, { color: '#ef4444' }]}>{stats.maintenance}</Text>
          <Text style={styles.kpiLabel}>Maint.</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={16} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by code, name, type, or operator..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      {/* Scrollable list */}
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerSpinner}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.spinnerText}>Loading shop floor machines...</Text>
          </View>
        ) : filteredMachines.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Info size={40} color="#cbd5e1" />
            <Text style={styles.emptyText}>No machines found matching search criteria.</Text>
          </View>
        ) : (
          <View style={isTablet ? styles.tabletGrid : styles.mobileList}>
            {filteredMachines.map(m => {
              const statusMeta = getStatusMeta(m.status);
              const activeJob = m.active_jobs && m.active_jobs.length > 0 ? m.active_jobs[0] : null;

              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.machineCard, isTablet && styles.machineCardTablet]}
                  onPress={() => handleOpenDetails(m)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.codeRow}>
                      <Cpu size={16} color="#475569" style={{ marginRight: 6 }} />
                      <Text style={styles.machineCode}>{m.machine_code}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border }]}>
                      <Text style={[styles.statusBadgeText, { color: statusMeta.text }]}>
                        {m.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.machineName}>{m.name}</Text>
                  <Text style={styles.machineType}>{m.type} Machine</Text>

                  <View style={styles.divider} />

                  <View style={styles.cardInfoGrid}>
                    <View style={styles.gridCol}>
                      <Text style={styles.gridLabel}>OPERATOR</Text>
                      <Text style={[styles.gridValue, !m.default_operator && styles.unassignedText]} numberOfLines={1}>
                        {m.default_operator?.name || 'Unassigned'}
                      </Text>
                    </View>
                    <View style={styles.gridCol}>
                      <Text style={styles.gridLabel}>HOURLY RATE</Text>
                      <Text style={styles.gridValue}>
                        {m.hourly_rate ? `₹${m.hourly_rate}/hr` : 'N/A'}
                      </Text>
                    </View>
                  </View>

                  {/* Active Job Alert Bar if busy */}
                  {activeJob ? (
                    <View style={styles.activeJobBanner}>
                      <Play size={12} color="#2563eb" style={{ marginRight: 6 }} />
                      <Text style={styles.activeJobText} numberOfLines={1}>
                        Running: <Text style={{ fontWeight: '600' }}>{activeJob.job_card_number}</Text> ({activeJob.customer})
                      </Text>
                    </View>
                  ) : m.status === 'maintenance' ? (
                    <View style={[styles.activeJobBanner, styles.activeMaintBanner]}>
                      <Wrench size={12} color="#ef4444" style={{ marginRight: 6 }} />
                      <Text style={[styles.activeJobText, styles.activeMaintText]} numberOfLines={1}>
                        Down for Breakdown/Maintenance
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <Text style={styles.manageText}>View logs & details</Text>
                    <ChevronRight size={14} color="#0891b2" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* DETAIL MODAL DISPLAY */}
      {selectedMachine && (
        <Modal
          visible={true}
          animationType="slide"
          onRequestClose={handleCloseDetails}
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderInfo}>
                  <Text style={styles.modalTitle}>{selectedMachine.machine_code}</Text>
                  <Text style={styles.modalSubtitle}>{selectedMachine.name}</Text>
                </View>
                <View style={styles.headerRightActions}>
                  <View style={[styles.statusBadge, { 
                    backgroundColor: getStatusMeta(selectedMachine.status).bg, 
                    borderColor: getStatusMeta(selectedMachine.status).border,
                    marginRight: 10
                  }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusMeta(selectedMachine.status).text }]}>
                      {selectedMachine.status.toUpperCase()}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.modalCloseButton} onPress={handleCloseDetails}>
                    <X size={20} color="#475569" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tabs selectors */}
              <View style={styles.tabsContainer}>
                <TouchableOpacity 
                  style={[styles.tabButton, activeTab === 'specs' && styles.tabButtonActive]}
                  onPress={() => setActiveTab('specs')}
                >
                  <Info size={14} color={activeTab === 'specs' ? '#2563eb' : '#64748b'} style={{ marginRight: 6 }} />
                  <Text style={[styles.tabButtonText, activeTab === 'specs' && styles.tabButtonTextActive]}>Specifications</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tabButton, activeTab === 'jobs' && styles.tabButtonActive]}
                  onPress={() => setActiveTab('jobs')}
                >
                  <Play size={14} color={activeTab === 'jobs' ? '#2563eb' : '#64748b'} style={{ marginRight: 6 }} />
                  <Text style={[styles.tabButtonText, activeTab === 'jobs' && styles.tabButtonTextActive]}>Active Jobs</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
                  onPress={() => setActiveTab('history')}
                >
                  <History size={14} color={activeTab === 'history' ? '#2563eb' : '#64748b'} style={{ marginRight: 6 }} />
                  <Text style={[styles.tabButtonText, activeTab === 'history' && styles.tabButtonTextActive]}>Logs ({selectedMachine.logs?.length || 0})</Text>
                </TouchableOpacity>
              </View>

              {/* Modal Scrollable Body */}
              <ScrollView contentContainerStyle={styles.modalScrollBody} keyboardShouldPersistTaps="handled">
                
                {/* 1. Tab - Specifications */}
                {activeTab === 'specs' && (
                  <View style={styles.modalSectionCard}>
                    <Text style={styles.modalCardHeader}>Machine Profile</Text>
                    <View style={styles.metaDisplayGrid}>
                      <View style={styles.metaDisplayCol}>
                        <Text style={styles.metaDisplayLabel}>Machine Code</Text>
                        <Text style={styles.metaDisplayVal}>{selectedMachine.machine_code}</Text>
                      </View>
                      <View style={styles.metaDisplayCol}>
                        <Text style={styles.metaDisplayLabel}>Machine Name</Text>
                        <Text style={styles.metaDisplayVal}>{selectedMachine.name}</Text>
                      </View>
                      <View style={styles.metaDisplayCol}>
                        <Text style={styles.metaDisplayLabel}>Type / Category</Text>
                        <Text style={styles.metaDisplayVal}>{selectedMachine.type}</Text>
                      </View>
                      <View style={styles.metaDisplayCol}>
                        <Text style={styles.metaDisplayLabel}>Hourly Rate</Text>
                        <Text style={styles.metaDisplayVal}>{selectedMachine.hourly_rate ? `₹${selectedMachine.hourly_rate}/hr` : 'N/A'}</Text>
                      </View>
                      <View style={styles.metaDisplayCol}>
                        <Text style={styles.metaDisplayLabel}>Default Operator</Text>
                        <Text style={styles.metaDisplayVal}>{selectedMachine.default_operator?.name || 'Unassigned'}</Text>
                      </View>
                      <View style={styles.metaDisplayCol}>
                        <Text style={styles.metaDisplayLabel}>Last Maintenance</Text>
                        <Text style={styles.metaDisplayVal}>{selectedMachine.last_maintenance_date || 'N/A'}</Text>
                      </View>
                      <View style={styles.metaDisplayCol}>
                        <Text style={styles.metaDisplayLabel}>Next Maintenance Due</Text>
                        <Text style={styles.metaDisplayVal}>{selectedMachine.next_maintenance_due || 'N/A'}</Text>
                      </View>
                    </View>

                    <View style={[styles.divider, { marginVertical: 12 }]} />
                    
                    <Text style={styles.metaDisplayLabel}>Technical Specifications</Text>
                    <Text style={styles.modalDescriptionText}>
                      {selectedMachine.specifications || 'No technical specifications provided for this machine.'}
                    </Text>
                  </View>
                )}

                {/* 2. Tab - Active Jobs */}
                {activeTab === 'jobs' && (
                  <View style={styles.modalSectionCard}>
                    <Text style={styles.modalCardHeader}>Currently Running Job Cards</Text>
                    {!selectedMachine.active_jobs || selectedMachine.active_jobs.length === 0 ? (
                      <View style={styles.emptySubContainer}>
                        <CheckCircle size={24} color="#10b981" style={{ marginBottom: 6 }} />
                        <Text style={styles.emptySubText}>No active jobs currently allocated to this machine. Status is {selectedMachine.status}.</Text>
                      </View>
                    ) : (
                      selectedMachine.active_jobs.map((job) => (
                        <View key={job.id} style={styles.jobAllocationRow}>
                          <View style={styles.jobAllocHeader}>
                            <Text style={styles.jobAllocCode}>{job.job_card_number}</Text>
                            <View style={styles.jobAllocBadge}>
                              <Text style={styles.jobAllocBadgeText}>{job.status.toUpperCase()}</Text>
                            </View>
                          </View>
                          <Text style={styles.jobAllocCustomer}>Client: <Text style={{ fontWeight: '600' }}>{job.customer}</Text> (PO: {job.po_number})</Text>
                          <Text style={styles.jobAllocDesc}>{job.description || 'No job item details'}</Text>
                          <View style={[styles.divider, { marginVertical: 8 }]} />
                          <View style={styles.allocOperatorRow}>
                            <User size={12} color="#64748b" style={{ marginRight: 4 }} />
                            <Text style={styles.allocOperatorText}>Operator: {job.worker_name}</Text>
                            <Text style={[styles.allocOperatorText, { marginLeft: 'auto' }]}>Qty: {job.quantity}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* 3. Tab - History & Logs List */}
                {activeTab === 'history' && (
                  <View style={styles.modalSectionCard}>
                    <Text style={styles.modalCardHeader}>Maintenance & Activity Logs</Text>
                    {loadingDetails ? (
                      <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 20 }} />
                    ) : !selectedMachine.logs || selectedMachine.logs.length === 0 ? (
                      <View style={styles.emptySubContainer}>
                        <Info size={24} color="#cbd5e1" style={{ marginBottom: 6 }} />
                        <Text style={styles.emptySubText}>No history logs found for this machine.</Text>
                      </View>
                    ) : (
                      selectedMachine.logs.map((log) => {
                        const typeMeta = getLogTypeMeta(log.log_type);
                        return (
                          <View key={log.id} style={styles.logHistoryItem}>
                            <View style={styles.logItemHeader}>
                              <View style={[styles.logTypeBadge, { backgroundColor: typeMeta.bg }]}>
                                <Text style={[styles.logTypeBadgeText, { color: typeMeta.text }]}>{typeMeta.label}</Text>
                              </View>
                              <Text style={styles.logItemDate}>{log.date}</Text>
                            </View>
                            <Text style={styles.logItemDesc}>{log.description}</Text>
                            
                            <View style={styles.logItemFooter}>
                              <Text style={styles.logItemLogger}>Logged by: <Text style={{ fontWeight: '500' }}>{log.logged_by}</Text></Text>
                              {log.cost ? (
                                <Text style={styles.logItemCost}>Cost: ₹{log.cost}</Text>
                              ) : null}
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}

                {/* Maintenance Activity Log Form (Visible to Supervisor/Admins) */}
                {isSupervisorOrAbove ? (
                  <View style={styles.modalSectionCard}>
                    <TouchableOpacity 
                      style={styles.formCollapseHeader} 
                      onPress={() => setShowLogForm(!showLogForm)}
                    >
                      <Wrench size={16} color="#2563eb" style={{ marginRight: 8 }} />
                      <Text style={styles.formCollapseTitle}>Log Maintenance / Breakdown</Text>
                      <Plus 
                        size={16} 
                        color="#2563eb" 
                        style={{ marginLeft: 'auto', transform: [{ rotate: showLogForm ? '45deg' : '0deg' }] }} 
                      />
                    </TouchableOpacity>

                    {showLogForm && (
                      <View style={styles.formContainer}>
                        <Text style={styles.formHelpText}>
                          Use this form to log breakdown events, routine maintenance, tooling changes, or status overrides. The machine status will update automatically based on your entry.
                        </Text>

                        {/* Log Type Selector */}
                        <Text style={styles.fieldLabel}>Activity Type</Text>
                        <View style={styles.logTypeSelectGrid}>
                          {(['maintenance', 'breakdown', 'tooling_change', 'status_override'] as const).map((type) => {
                            const active = logType === type;
                            const meta = getLogTypeMeta(type);
                            return (
                              <TouchableOpacity
                                key={type}
                                style={[
                                  styles.logTypeSelectorBtn, 
                                  active && { borderColor: meta.text, backgroundColor: meta.bg }
                                ]}
                                onPress={() => setLogType(type)}
                              >
                                <Text style={[
                                  styles.logTypeSelectorText, 
                                  active && { color: meta.text, fontWeight: '700' }
                                ]}>
                                  {meta.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Description */}
                        <Text style={styles.fieldLabel}>Logs Description</Text>
                        <TextInput
                          style={styles.remarksInput}
                          placeholder="Describe the issue, work completed, parts replaced, etc..."
                          value={logDescription}
                          onChangeText={setLogDescription}
                          multiline={true}
                          numberOfLines={3}
                          textAlignVertical="top"
                          placeholderTextColor="#94a3b8"
                        />

                        {/* Cost */}
                        <Text style={styles.fieldLabel}>Maintenance Cost (₹, Optional)</Text>
                        <TextInput
                          style={styles.costInput}
                          placeholder="Enter cost (e.g. 1500)..."
                          value={logCost}
                          onChangeText={setLogCost}
                          keyboardType="numeric"
                          placeholderTextColor="#94a3b8"
                        />

                        {/* Submit Button */}
                        <TouchableOpacity
                          style={styles.formSubmitBtn}
                          onPress={handleSubmitLog}
                          disabled={submittingLog}
                        >
                          {submittingLog ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <>
                              <CheckCircle size={16} color="#ffffff" style={{ marginRight: 6 }} />
                              <Text style={styles.formSubmitBtnText}>Submit Activity Log</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={[styles.modalSectionCard, styles.permissionNoticeCard]}>
                    <AlertTriangle size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                    <Text style={styles.permissionNoticeText}>
                      Only supervisors (admins, managers, partners) can log maintenance activity.
                    </Text>
                  </View>
                )}

              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 3,
    elevation: 1,
  },
  kpiCardActive: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
  },
  kpiVal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  kpiLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 0,
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  centerSpinner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  spinnerText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  mobileList: {
    gap: 16,
  },
  tabletGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  machineCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  machineCardTablet: {
    width: '48.5%', // two columns on tablets
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  machineCode: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  machineName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 2,
  },
  machineType: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },
  cardInfoGrid: {
    flexDirection: 'row',
    paddingVertical: 8,
    gap: 12,
  },
  gridCol: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  unassignedText: {
    color: '#94a3b8',
    fontWeight: '400',
    fontStyle: 'italic',
  },
  activeJobBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  activeJobText: {
    fontSize: 11,
    color: '#2563eb',
    flex: 1,
  },
  activeMaintBanner: {
    backgroundColor: '#fef2f2',
  },
  activeMaintText: {
    color: '#ef4444',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  manageText: {
    fontSize: 11,
    color: '#0891b2',
    fontWeight: '700',
  },

  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalHeaderInfo: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#2563eb',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  modalScrollBody: {
    padding: 20,
    paddingBottom: 60,
    gap: 16,
  },
  modalSectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 1,
  },
  modalCardHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  metaDisplayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaDisplayCol: {
    width: '47%',
    marginBottom: 8,
  },
  metaDisplayLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 2,
  },
  metaDisplayVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalDescriptionText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },

  // Active job details
  emptySubContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptySubText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  jobAllocationRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  jobAllocHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  jobAllocCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  jobAllocBadge: {
    backgroundColor: '#bfdbfe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  jobAllocBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1e40af',
  },
  jobAllocCustomer: {
    fontSize: 11,
    color: '#475569',
    marginBottom: 4,
  },
  jobAllocDesc: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
  },
  allocOperatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  allocOperatorText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },

  // Logs list
  logHistoryItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 12,
  },
  logItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  logTypeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  logItemDate: {
    fontSize: 10,
    color: '#94a3b8',
  },
  logItemDesc: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
    marginVertical: 4,
  },
  logItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  logItemLogger: {
    fontSize: 10,
    color: '#64748b',
  },
  logItemCost: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600',
  },

  // Log Form collapses
  formCollapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  formCollapseTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  formContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  formHelpText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginTop: 12,
    marginBottom: 6,
  },
  logTypeSelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  logTypeSelectorBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  logTypeSelectorText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
  remarksInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    minHeight: 60,
  },
  costInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    height: 40,
  },
  formSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    height: 44,
    marginTop: 16,
  },
  formSubmitBtnText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
  },
  permissionNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  permissionNoticeText: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
  }
});
