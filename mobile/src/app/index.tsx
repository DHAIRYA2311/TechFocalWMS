import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView, 
  Alert,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useRealTime } from '@/hooks/useRealTime';
import * as Lucide from 'lucide-react-native';
import { offlineGet } from '@/utils/offlineApi';
import TechFocalLoader from '@/components/tech-focal-loader';

// Icons
const {
  UserCheck, Briefcase, FileText, Cpu, DollarSign, Archive, ClipboardList,
  LogOut, RefreshCw, Settings, User, Users, Activity, CheckCircle, AlertTriangle,
  AlertCircle, Plus, Wrench, Factory, List, Clock, Wifi, WifiOff
} = Lucide as any;

export default function HomeScreen() {
  const { token, apiUrl, unpairDevice } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useRealTime('dashboard', () => {
    fetchData();
  });
  
  const [profile, setProfile] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Check if LaunchScreen successfully pre-fetched data
    const prefetched = (global as any).__PREFETCHED_DASHBOARD;
    if (prefetched && prefetched.dashboardData) {
      setProfile(prefetched.profile);
      setDashboardData(prefetched.dashboardData);
      setIsOffline(prefetched.isOffline);
      setLastSync(new Date());
      setLoading(false);
      
      // Clear it so pull-to-refresh will actually fetch later
      delete (global as any).__PREFETCHED_DASHBOARD;
    } else {
      fetchData(false);
    }
  }, []);

  const fetchData = async (isRefresh = false) => {
    if (!token || !apiUrl) return;
    
    // Only set loading if we are NOT refreshing
    if (!isRefresh) setLoading(true);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch authenticated profile
      const profileRes = await offlineGet(`${apiUrl}/api/me`, { headers });
      setProfile(profileRes.data.user);

      // Fetch unified dashboard data
      const dashboardRes = await offlineGet(`${apiUrl}/api/dashboard`, { headers });
      setDashboardData((dashboardRes as any).data || dashboardRes.data);
      
      setIsOffline((dashboardRes as any).offline || false);
      setLastSync(new Date());

    } catch (err: any) {
      console.error('Data loading failed:', err);
      if (err.response?.status === 401) {
        Alert.alert(
          'Session Revoked',
          'This device pairing has been revoked by the administrator. Re-pairing is required.',
          [{ text: 'OK', onPress: () => unpairDevice() }]
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const handleUnpair = () => {
    Alert.alert(
      'Unpair Device',
      'Are you sure you want to unpair this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unpair', style: 'destructive', onPress: async () => await unpairDevice() }
      ]
    );
  };

  if (loading) {
    return <TechFocalLoader />;
  }

  if (!dashboardData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={{color: '#ef4444'}}>Failed to load dashboard data.</Text>
        <TouchableOpacity style={{marginTop: 20}} onPress={handleRefresh}>
          <Text style={{color: '#2563eb'}}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { kpis, workshop_status, priority_actions, production_progress, modules_data, machines, timeline } = dashboardData;

  const getStatusColor = (level: string) => {
    switch(level) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'normal': 
      default: return '#22c55e';
    }
  };

  const statusColor = getStatusColor(workshop_status.level);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      {/* Dynamic Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.greetingText}>{getGreeting()}, <Text style={styles.boldText}>{profile?.name?.split(' ')[0]}</Text></Text>
          <Text style={styles.roleText}>{profile?.role === 'admin' ? 'Production Supervisor' : profile?.role}</Text>
          
          <View style={styles.syncRow}>
            {isOffline ? <WifiOff size={12} color="#ef4444" /> : <Wifi size={12} color="#22c55e" />}
            <Text style={styles.syncText}>
              {isOffline ? ' Offline' : ' Connected'} • Last Sync: {lastSync ? lastSync.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionCircle} onPress={() => router.push('/settings')}>
            <Settings size={18} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCircle} onPress={handleRefresh} disabled={refreshing}>
            {refreshing ? <ActivityIndicator size="small" color="#64748b" /> : <RefreshCw size={18} color="#64748b" />}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCircle, {backgroundColor: '#fef2f2'}]} onPress={handleUnpair}>
            <LogOut size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Workshop Status Card */}
        <View style={[styles.statusCard, { backgroundColor: statusColor + '15', borderColor: statusColor + '30' }]}>
          <View style={styles.statusHeader}>
            {workshop_status.level === 'normal' ? <CheckCircle size={20} color={statusColor} /> : <AlertTriangle size={20} color={statusColor} />}
            <Text style={[styles.statusTitle, { color: statusColor }]}>{workshop_status.title}</Text>
          </View>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusItemValue}>{kpis.machines_running}</Text>
              <Text style={styles.statusItemLabel}>Machines Running</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusItemValue}>{kpis.active_jobs}</Text>
              <Text style={styles.statusItemLabel}>Active Jobs</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusItemValue}>{kpis.workers_present}</Text>
              <Text style={styles.statusItemLabel}>Operators Present</Text>
            </View>
          </View>
        </View>

        {/* Priority Actions (Requires Attention) */}
        {priority_actions && priority_actions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requires Attention</Text>
            {priority_actions.map((alert: any, index: number) => (
              <TouchableOpacity key={index} style={styles.alertCard} onPress={() => router.push(alert.route)}>
                <AlertCircle size={20} color="#ef4444" style={{marginRight: 12}} />
                <View style={{flex: 1}}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Dashboard KPI Cards (Horizontal) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiScroll}>
          <View style={styles.kpiCard}>
            <Users size={20} color="#3b82f6" />
            <Text style={styles.kpiVal}>{kpis.workers_present}</Text>
            <Text style={styles.kpiLabel}>Workers Present</Text>
          </View>
          <View style={styles.kpiCard}>
            <Factory size={20} color="#10b981" />
            <Text style={styles.kpiVal}>{kpis.machines_running}</Text>
            <Text style={styles.kpiLabel}>Machines Running</Text>
          </View>
          <View style={styles.kpiCard}>
            <Briefcase size={20} color="#8b5cf6" />
            <Text style={styles.kpiVal}>{kpis.active_jobs}</Text>
            <Text style={styles.kpiLabel}>Active Jobs</Text>
          </View>
          <View style={styles.kpiCard}>
            <Clock size={20} color="#f59e0b" />
            <Text style={styles.kpiVal}>{kpis.delayed_jobs}</Text>
            <Text style={styles.kpiLabel}>Delayed Jobs</Text>
          </View>
        </ScrollView>

        {/* Today's Production Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Production Progress</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>{production_progress.completed} Jobs Completed</Text>
              <Text style={styles.progressText}>{production_progress.percentage}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${production_progress.percentage}%` }]} />
            </View>
            <Text style={styles.progressSubtext}>{production_progress.remaining} Jobs Remaining</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsScroll}>
            <TouchableOpacity style={styles.qaButton} onPress={() => router.push('/jobs')}>
              <Plus size={16} color="#ffffff" />
              <Text style={styles.qaText}>Create Job</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qaButtonSecondary} onPress={() => router.push('/attendance')}>
              <UserCheck size={16} color="#1e293b" />
              <Text style={styles.qaTextSecondary}>Mark Attendance</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qaButtonSecondary} onPress={() => router.push('/machines')}>
              <Wrench size={16} color="#1e293b" />
              <Text style={styles.qaTextSecondary}>Report Breakdown</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Operational Modules */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operational Modules</Text>
          <View style={styles.modulesGrid}>
            <TouchableOpacity style={styles.moduleCard} onPress={() => router.push('/staffs')}>
              <View style={[styles.iconContainer, { backgroundColor: '#f1f5f9' }]}>
                <Users size={24} color="#0f172a" />
              </View>
              <View style={styles.moduleMeta}>
                <Text style={styles.moduleTitle}>Staff Profiles</Text>
                <Text style={styles.moduleDesc}>Directory & Badges</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.moduleCard} onPress={() => router.push('/attendance')}>
              <View style={[styles.iconContainer, { backgroundColor: '#f0fdf4' }]}>
                <UserCheck size={24} color="#22c55e" />
              </View>
              <View style={styles.moduleMeta}>
                <Text style={styles.moduleTitle}>Attendance</Text>
                <Text style={styles.moduleDesc}>{modules_data.attendance.present} Present • {modules_data.attendance.absent} Absent</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.moduleCard} onPress={() => router.push('/jobs')}>
              <View style={[styles.iconContainer, { backgroundColor: '#eff6ff' }]}>
                <Briefcase size={24} color="#2563eb" />
              </View>
              <View style={styles.moduleMeta}>
                <Text style={styles.moduleTitle}>Job Cards</Text>
                <Text style={styles.moduleDesc}>{modules_data.jobs.active} Active • {modules_data.jobs.delayed} Delayed</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.moduleCard} onPress={() => router.push('/purchase-orders')}>
              <View style={[styles.iconContainer, { backgroundColor: '#fefbeb' }]}>
                <FileText size={24} color="#f59e0b" />
              </View>
              <View style={styles.moduleMeta}>
                <Text style={styles.moduleTitle}>Purchase Orders</Text>
                <Text style={styles.moduleDesc}>{modules_data.purchase_orders.pending} Pending</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.moduleCard} onPress={() => router.push('/machines')}>
              <View style={[styles.iconContainer, { backgroundColor: '#ecfeff' }]}>
                <Cpu size={24} color="#06b6d4" />
              </View>
              <View style={styles.moduleMeta}>
                <Text style={styles.moduleTitle}>Machine Logs</Text>
                <Text style={styles.moduleDesc}>{kpis.machines_running} Running</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.moduleCard} onPress={() => router.push('/expenses')}>
              <View style={[styles.iconContainer, { backgroundColor: '#fef2f2' }]}>
                <DollarSign size={24} color="#ef4444" />
              </View>
              <View style={styles.moduleMeta}>
                <Text style={styles.moduleTitle}>Expenses</Text>
                <Text style={styles.moduleDesc}>Log Workshop Claims</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.moduleCard} onPress={() => router.push('/invoices')}>
              <View style={[styles.iconContainer, { backgroundColor: '#f8fafc' }]}>
                <FileText size={24} color="#475569" />
              </View>
              <View style={styles.moduleMeta}>
                <Text style={styles.moduleTitle}>Invoices</Text>
                <Text style={styles.moduleDesc}>{modules_data.invoices.pending} Pending Billing</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.moduleCard} onPress={() => router.push('/inventory')}>
              <View style={[styles.iconContainer, { backgroundColor: '#eff6ff' }]}>
                <Archive size={24} color="#3b82f6" />
              </View>
              <View style={styles.moduleMeta}>
                <Text style={styles.moduleTitle}>Inventory</Text>
                <Text style={styles.moduleDesc}>Manage Stock</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Machine Overview */}
        {machines && machines.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Machine Overview</Text>
            <View style={styles.machineList}>
              {machines.slice(0, 3).map((machine: any) => (
                <TouchableOpacity key={machine.id} style={styles.machineItem} onPress={() => router.push('/machines')}>
                  <View style={[styles.machineIndicator, { 
                    backgroundColor: (machine.status === 'running' || machine.status === 'busy') ? '#10b981' : 
                                     machine.status === 'breakdown' ? '#ef4444' : 
                                     machine.status === 'maintenance' ? '#f59e0b' : '#94a3b8' 
                  }]} />
                  <Text style={styles.machineName}>{machine.name}</Text>
                  <Text style={styles.machineStatus}>{machine.status}</Text>
                </TouchableOpacity>
              ))}
              {machines.length > 3 && (
                <TouchableOpacity onPress={() => router.push('/machines')}>
                  <Text style={styles.viewAllText}>View all {machines.length} machines</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: { flex: 1 },
  greetingText: { fontSize: 20, color: '#0f172a' },
  boldText: { fontWeight: '700' },
  roleText: { fontSize: 13, color: '#64748b', marginTop: 2 },
  syncRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  syncText: { fontSize: 11, color: '#64748b', marginLeft: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center'
  },
  scrollContainer: { padding: 20 },
  
  // Status Card
  statusCard: {
    padding: 20, borderRadius: 16, borderWidth: 1,
    marginBottom: 24,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  statusTitle: { fontSize: 16, fontWeight: '700', marginLeft: 8 },
  statusGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statusItem: { flex: 1 },
  statusItemValue: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  statusItemLabel: { fontSize: 11, color: '#64748b', marginTop: 2 },

  // Sections
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },

  // Alert Cards
  alertCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fef2f2', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#fecaca', marginBottom: 8
  },
  alertTitle: { fontSize: 14, fontWeight: '700', color: '#991b1b' },
  alertMessage: { fontSize: 13, color: '#b91c1c', marginTop: 2 },

  // KPI Scroll
  kpiScroll: { paddingRight: 20, gap: 12, paddingBottom: 10 },
  kpiCard: {
    backgroundColor: '#ffffff', padding: 16, borderRadius: 12,
    width: 130, borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02, shadowRadius: 8, elevation: 1
  },
  kpiVal: { fontSize: 24, fontWeight: '700', color: '#0f172a', marginTop: 12 },
  kpiLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },

  // Progress Card
  progressCard: {
    backgroundColor: '#ffffff', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#f1f5f9'
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressText: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  progressBarBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#2563eb', borderRadius: 4 },
  progressSubtext: { fontSize: 12, color: '#64748b', marginTop: 10, textAlign: 'right' },

  // Quick Actions
  quickActionsScroll: { gap: 10 },
  qaButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0f172a', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, gap: 6
  },
  qaText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  qaButtonSecondary: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', gap: 6
  },
  qaTextSecondary: { color: '#1e293b', fontSize: 13, fontWeight: '600' },

  // Modules Grid
  modulesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  moduleCard: {
    width: '48.5%', backgroundColor: '#ffffff', padding: 16,
    borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02, shadowRadius: 8, elevation: 1
  },
  iconContainer: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  moduleMeta: { flex: 1 },
  moduleTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  moduleDesc: { fontSize: 11, color: '#64748b', marginTop: 4 },

  // Machine Overview
  machineList: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' },
  machineItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9'
  },
  machineIndicator: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  machineName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a' },
  machineStatus: { fontSize: 12, color: '#64748b', textTransform: 'capitalize' },
  viewAllText: { padding: 16, textAlign: 'center', fontSize: 13, color: '#2563eb', fontWeight: '500' },

  // Timeline
  timelineContainer: { paddingLeft: 10 },
  timelineEvent: { flexDirection: 'row', marginBottom: 0 },
  timelineTimeCol: { width: 50, paddingTop: 2 },
  timelineTime: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  timelineLine: { alignItems: 'center', paddingHorizontal: 12 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#cbd5e1', zIndex: 2 },
  timelineConnector: { width: 2, flex: 1, backgroundColor: '#f1f5f9', marginTop: 4, marginBottom: 4 },
  timelineContent: { flex: 1, paddingBottom: 24, paddingTop: -2 },
  timelineTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  timelineDesc: { fontSize: 13, color: '#64748b', marginTop: 2 }
});
