import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView, 
  Alert,
  Dimensions,
  StatusBar,
  Platform
} from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useRealTime } from '@/hooks/useRealTime';
import * as Lucide from 'lucide-react-native';
const UserCheck = Lucide.UserCheck as any;
const Briefcase = Lucide.Briefcase as any;
const FileText = Lucide.FileText as any;
const Cpu = Lucide.Cpu as any;
const DollarSign = Lucide.DollarSign as any;
const Archive = Lucide.Archive as any;
const ClipboardList = Lucide.ClipboardList as any;
const LogOut = Lucide.LogOut as any;
const RefreshCw = Lucide.RefreshCw as any;
const User = Lucide.User as any;
const Users = Lucide.Users as any;
const Activity = Lucide.Activity as any;

const { width } = Dimensions.get('window');
const isTablet = width > 600;

export default function HomeScreen() {
  const { token, apiUrl, unpairDevice } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useRealTime('dashboard', () => {
    fetchData();
  });
  
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>({
    activeJobs: 0,
    activeMachines: 0,
    clockedInCount: 0,
    pendingPO: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!token || !apiUrl) return;
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch authenticated profile
      const profileRes = await axios.get(`${apiUrl}/api/me`, { headers });
      setProfile(profileRes.data.user);

      // Fetch dashboard metrics in parallel (with safe fallbacks)
      try {
        const [jobsRes, machinesRes, attendanceRes, poRes] = await Promise.all([
          axios.get(`${apiUrl}/api/jobs`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${apiUrl}/api/machines/stats`, { headers }).catch(() => ({ data: { active_count: 0 } })),
          axios.get(`${apiUrl}/api/attendance/stats`, { headers }).catch(() => ({ data: { today: { present: 0 } } })),
          axios.get(`${apiUrl}/api/purchase-orders`, { headers }).catch(() => ({ data: [] }))
        ]);

        const runningJobs = Array.isArray(jobsRes.data) 
          ? jobsRes.data.filter((j: any) => j.status === 'in_progress' || j.status === 'inspection').length 
          : 0;

        const pendingPOs = Array.isArray(poRes.data)
          ? poRes.data.filter((po: any) => po.status !== 'completed' && po.status !== 'rejected').length
          : 0;

        setStats({
          activeJobs: runningJobs,
          activeMachines: machinesRes.data?.active_count || 0,
          clockedInCount: attendanceRes.data?.today?.present || 0,
          pendingPO: pendingPOs
        });
      } catch (err) {
        console.warn('Failed to load dashboard metrics:', err);
      }

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

  useEffect(() => {
    fetchData();
  }, []);

  // Notifications Poller
  useEffect(() => {
    if (!token || !apiUrl) return;

    let lastNotificationId: number | null = null;

    const pollNotifications = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const res = await axios.get(`${apiUrl}/api/notifications`, { headers });
        const list = res.data;
        if (Array.isArray(list) && list.length > 0) {
          const newest = list[0];
          
          if (lastNotificationId !== null && newest.id > lastNotificationId && !newest.read_at) {
            Alert.alert(newest.title, newest.message, [
              { text: 'View PO', onPress: () => router.push('/purchase-orders') },
              { text: 'Dismiss', style: 'cancel' }
            ]);
          }
          lastNotificationId = newest.id;
        }
      } catch (err) {
        console.warn('Failed to poll notifications:', err);
      }
    };

    const initialTimeout = setTimeout(pollNotifications, 2000);
    const interval = setInterval(pollNotifications, 30000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [token, apiUrl]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleUnpair = () => {
    Alert.alert(
      'Unpair Device',
      'Are you sure you want to unpair this device from the workshop portal? You will need to scan a new QR code or enter a PIN to log in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unpair', 
          style: 'destructive',
          onPress: async () => {
            await unpairDevice();
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Fetching system metrics...</Text>
      </View>
    );
  }

  const modules = [
    ...(profile && ['admin', 'partner', 'manager', 'supervisor'].includes(profile.role) ? [{
      title: 'Staff Profiles',
      desc: 'Directory & ID Badges',
      icon: <Users size={28} color="#0f172a" />,
      color: '#0f172a',
      bgColor: '#f1f5f9',
      route: 'Staffs'
    }] : []),
    {
      title: 'Attendance',
      desc: `${stats.clockedInCount} Workers Active`,
      icon: <UserCheck size={28} color="#22c55e" />,
      color: '#22c55e',
      bgColor: '#f0fdf4',
      route: 'Attendance'
    },
    {
      title: 'Job Cards',
      desc: `${stats.activeJobs} Assigned Jobs`,
      icon: <Briefcase size={28} color="#2563eb" />,
      color: '#2563eb',
      bgColor: '#eff6ff',
      route: 'Jobs'
    },
    {
      title: 'Purchase Orders',
      desc: `${stats.pendingPO} Open Orders`,
      icon: <FileText size={28} color="#f59e0b" />,
      color: '#f59e0b',
      bgColor: '#fefbeb',
      route: 'PurchaseOrders'
    },
    {
      title: 'Machine logs',
      desc: 'Monitor CNC & Lathes',
      icon: <Cpu size={28} color="#06b6d4" />,
      color: '#06b6d4',
      bgColor: '#ecfeff',
      route: 'Machines'
    },
    {
      title: 'Expenses',
      desc: 'Log Workshop Claims',
      icon: <DollarSign size={28} color="#ef4444" />,
      color: '#ef4444',
      bgColor: '#fef2f2',
      route: 'Expenses'
    },
    {
      title: 'Challans',
      desc: 'Incoming & Delivery Notes',
      icon: <ClipboardList size={28} color="#8b5cf6" />,
      color: '#8b5cf6',
      bgColor: '#f5f3ff',
      route: 'Challans'
    },
    {
      title: 'Inventory',
      desc: 'Manage Stock & Locations',
      icon: <Archive size={28} color="#3b82f6" />,
      color: '#3b82f6',
      bgColor: '#eff6ff',
      route: 'Inventory'
    }
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header bar */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.appTitle}>TechFocal WMS</Text>
          <View style={styles.profileRow}>
            <User size={14} color="#64748b" />
            <Text style={styles.profileText}>
              Paired by: <Text style={styles.boldText}>{profile?.name || 'Administrator'}</Text> ({profile?.role || 'admin'})
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionCircle} onPress={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <ActivityIndicator size="small" color="#64748b" />
            ) : (
              <RefreshCw size={18} color="#64748b" />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCircle, styles.unpairCircle]} onPress={handleUnpair}>
            <LogOut size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Banner Section */}
        <View style={styles.banner}>
          <View>
            <Text style={styles.bannerTitle}>Workshop Controller</Text>
            <Text style={styles.bannerSubtitle}>Real-time shop floor supervisor terminal.</Text>
          </View>
          <Activity size={32} color="#ffffff" style={{ opacity: 0.8 }} />
        </View>

        {/* Stats Summary Rows */}
        <View style={styles.statsGrid}>
          <View style={styles.statsCard}>
            <Text style={styles.statsVal}>{stats.clockedInCount}</Text>
            <Text style={styles.statsLabel}>Clocked In</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsVal}>{stats.activeJobs}</Text>
            <Text style={styles.statsLabel}>Active Jobs</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsVal}>{stats.pendingPO}</Text>
            <Text style={styles.statsLabel}>Pending PO</Text>
          </View>
        </View>

        {/* Section title */}
        <Text style={styles.sectionHeader}>Operational Modules</Text>

        {/* Modules Grid */}
        <View style={styles.modulesGrid}>
          {modules.map((mod, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={[
                styles.moduleCard, 
                isTablet ? styles.moduleCardTablet : styles.moduleCardMobile
              ]}
              onPress={() => {
                if (mod.route === 'Staffs') {
                  router.push('/staffs');
                } else if (mod.route === 'Attendance') {
                  router.push('/attendance');
                } else if (mod.route === 'Jobs') {
                  router.push('/jobs');
                } else if (mod.route === 'PurchaseOrders') {
                  router.push('/purchase-orders');
                } else if (mod.route === 'Machines') {
                  router.push('/machines');
                } else if (mod.route === 'Challans') {
                  router.push('/challans');
                } else if (mod.route === 'Expenses') {
                  router.push('/expenses');
                } else if (mod.route === 'Inventory') {
                  router.push('/inventory');
                } else {
                  Alert.alert('Module Navigation', `Loading ${mod.title} subsystem...`);
                }
              }}
            >
              <View style={[styles.iconContainer, { backgroundColor: mod.bgColor }]}>
                {mod.icon}
              </View>
              <View style={styles.moduleMeta}>
                <Text style={styles.moduleTitle}>{mod.title}</Text>
                <Text style={styles.moduleDesc}>{mod.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#cbd5e1',
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  profileText: {
    fontSize: 11,
    color: '#64748b',
  },
  boldText: {
    fontWeight: '600',
    color: '#334155',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unpairCircle: {
    backgroundColor: '#fef2f2',
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  banner: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  statsVal: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2563eb',
  },
  statsLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  moduleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  moduleCardMobile: {
    width: '100%',
  },
  moduleCardTablet: {
    width: '48.5%', // 2 columns with gaps
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleMeta: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  moduleDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  }
});
