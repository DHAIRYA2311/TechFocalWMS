import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  Animated
} from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import Svg, { Path, Line, Rect } from 'react-native-svg';
import * as Lucide from 'lucide-react-native';

const ArrowLeft = Lucide.ArrowLeft as any;
const Search = Lucide.Search as any;
const Mail = Lucide.Mail as any;
const Phone = Lucide.Phone as any;
const Shield = Lucide.Shield as any;
const Calendar = Lucide.Calendar as any;
const DollarSign = Lucide.DollarSign as any;
const Briefcase = Lucide.Briefcase as any;
const Clock = Lucide.Clock as any;
const Eye = Lucide.Eye as any;
const RotateCw = Lucide.RotateCw as any;
const Sparkles = Lucide.Sparkles as any;
const ChevronLeft = Lucide.ChevronLeft as any;
const ChevronRight = Lucide.ChevronRight as any;
const Lock = Lucide.Lock as any;

const { width } = Dimensions.get('window');

// TechFocal Logo Component for React Native Svg
function MobileLogo({ height = 24 }: { height?: number }) {
  const widthVal = (height * 0.92).toFixed(0);
  return (
    <Svg viewBox="0 0 92 100" height={height} width={widthVal}>
      {/* Stylized T (Green) */}
      <Path d="M 28,85 L 28,30 L 2,30 L 14,15 L 40,15 L 40,85 Z" fill="#2ba454" />
      {/* Stylized F - Stem & Top Bar (Blue) */}
      <Path d="M 48,85 L 48,15 L 88,15 L 76,30 L 60,30 L 60,85 Z" fill="#31369d" />
      {/* Stylized F - Middle Bar (Green) */}
      <Path d="M 60,48 L 80,48 L 72,58 L 60,58 Z" fill="#2ba454" />
    </Svg>
  );
}

export default function StaffsScreen() {
  const { token, apiUrl } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [staffs, setStaffs] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Details screen navigation
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'progress' | 'attendance' | 'salary' | 'idcard'>('profile');

  // Sub-tab States
  const [workStats, setWorkStats] = useState<any>(null);
  const [loadingWork, setLoadingWork] = useState(false);

  const [attendanceMonth, setAttendanceMonth] = useState(new Date().getMonth() + 1);
  const [attendanceYear, setAttendanceYear] = useState(new Date().getFullYear());
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const [salaryHistory, setSalaryHistory] = useState<any>(null);
  const [loadingSalary, setLoadingSalary] = useState(false);

  // Flip Animation State
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = React.useRef(new Animated.Value(0)).current;

  // Retrieve current user and directory lists
  const fetchData = async () => {
    if (!token || !apiUrl) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [meRes, usersRes] = await Promise.all([
        axios.get(`${apiUrl}/api/me`, { headers }),
        axios.get(`${apiUrl}/api/users`, { headers })
      ]);

      setCurrentUser(meRes.data.user);
      setStaffs(usersRes.data);
    } catch (err) {
      console.error('Failed to load staffs directory:', err);
      Alert.alert('Error', 'Failed to load staff profiles directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, apiUrl]);

  // Load sub-tabs detail content
  useEffect(() => {
    if (!selectedStaff || !token || !apiUrl) return;

    const headers = { Authorization: `Bearer ${token}` };

    if (activeTab === 'progress') {
      setLoadingWork(true);
      axios.get(`${apiUrl}/api/users/${selectedStaff.id}/stats`, { headers })
        .then(res => setWorkStats(res.data))
        .catch(err => console.warn('Failed loading workload stats:', err))
        .finally(() => setLoadingWork(false));
    } else if (activeTab === 'attendance') {
      setLoadingAttendance(true);
      axios.get(`${apiUrl}/api/users/${selectedStaff.id}/attendance`, {
        headers,
        params: { month: attendanceMonth, year: attendanceYear }
      })
        .then(res => setAttendanceLogs(res.data))
        .catch(err => console.warn('Failed loading attendance logs:', err))
        .finally(() => setLoadingAttendance(false));
    } else if (activeTab === 'salary') {
      if (['admin', 'partner', 'manager'].includes(currentUser?.role)) {
        setLoadingSalary(true);
        axios.get(`${apiUrl}/api/users/${selectedStaff.id}/salary-history`, { headers })
          .then(res => setSalaryInfo(res.data)) // wait, setSalaryInfo or setSalaryHistory?
          .catch(err => console.warn('Failed loading salary history:', err))
          .finally(() => setLoadingSalary(false));
      }
    }
  }, [selectedStaff, activeTab, attendanceMonth, attendanceYear, token, apiUrl]);

  // Fix: setSalaryInfo setter to map to salaryHistory state
  const setSalaryInfo = (data: any) => {
    setSalaryHistory(data);
  };

  // Flip Card Animation Trigger
  const handleFlipCard = () => {
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 0 : 180,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  // Month navigation helpers
  const handlePrevMonth = () => {
    setAttendanceMonth(prev => {
      if (prev === 1) {
        setAttendanceYear(y => y - 1);
        return 12;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setAttendanceMonth(prev => {
      if (prev === 12) {
        setAttendanceYear(y => y + 1);
        return 1;
      }
      return prev + 1;
    });
  };

  const getMonthName = (m: number) => {
    const d = new Date(2000, m - 1, 1);
    return d.toLocaleString('default', { month: 'long' });
  };

  // Roles design theme mapping
  const getRoleTheme = (roleVal: string) => {
    switch (roleVal) {
      case 'admin':
        return { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff', label: 'Admin', color: '#7c3aed' };
      case 'partner':
        return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', label: 'Partner', color: '#059669' };
      case 'manager':
        return { bg: '#fffbeb', text: '#d97706', border: '#fde68a', label: 'Manager', color: '#d97706' };
      case 'supervisor':
        return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', label: 'Supervisor', color: '#2563eb' };
      case 'helper':
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', label: 'Helper', color: '#475569' };
      case 'worker':
        return { bg: '#f0fdfa', text: '#0d9488', border: '#99f6e4', label: 'Worker', color: '#0d9488' };
      default:
        return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', label: roleVal, color: '#64748b' };
    }
  };

  // Filters
  const filteredStaffs = staffs.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone && s.phone.includes(searchTerm));
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Calendar Day render helpers
  const getDaysInMonth = (m: number, y: number) => new Date(y, m, 0).getDate();
  const getFirstDayOfMonth = (m: number, y: number) => new Date(y, m - 1, 1).getDay();

  const renderAttendanceDays = () => {
    const totalDays = getDaysInMonth(attendanceMonth, attendanceYear);
    const startOffset = getFirstDayOfMonth(attendanceMonth, attendanceYear);

    const dayCells: React.ReactNode[] = [];

    // Alignment offsets
    for (let i = 0; i < startOffset; i++) {
      dayCells.push(<View key={`empty-${i}`} style={styles.calendarEmptyDay} />);
    }

    const logMap = attendanceLogs.reduce((acc, log) => {
      acc[log.date] = log;
      return acc;
    }, {});

    // Active days grid
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${attendanceYear}-${attendanceMonth.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const log = logMap[dateStr];

      let cellBg = '#f8fafc';
      let cellText = '#334155';
      let borderCol = '#cbd5e1';
      let symbol = '';

      if (log) {
        if (log.status === 'present') { cellBg = '#ecfdf5'; cellText = '#059669'; borderCol = '#a7f3d0'; symbol = 'P'; }
        else if (log.status === 'absent') { cellBg = '#fef2f2'; cellText = '#dc2626'; borderCol = '#fca5a5'; symbol = 'A'; }
        else if (log.status === 'late') { cellBg = '#fffbeb'; cellText = '#d97706'; borderCol = '#fde68a'; symbol = 'L'; }
        else if (log.status === 'half_day') { cellBg = '#ffedd5'; cellText = '#ea580c'; borderCol = '#ffedd5'; symbol = 'H'; }
        else if (log.status === 'leave') { cellBg = '#eff6ff'; cellText = '#2563eb'; borderCol = '#bfdbfe'; symbol = 'V'; }
      } else {
        const dayOfWeek = new Date(attendanceYear, attendanceMonth - 1, d).getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          cellBg = '#f1f5f9';
          cellText = '#94a3b8';
        }
      }

      dayCells.push(
        <TouchableOpacity 
          key={d} 
          style={[styles.calendarDayCell, { backgroundColor: cellBg, borderColor: borderCol }]}
          onPress={() => {
            if (log) {
              Alert.alert(
                `Day ${d} Log`,
                `Status: ${log.status.toUpperCase()}\nClock In: ${log.clock_in || 'N/A'}\nClock Out: ${log.clock_out || 'N/A'}\nRemarks: ${log.notes || 'No notes'}`
              );
            } else {
              Alert.alert(`Day ${d}`, 'No attendance logs registered for this date.');
            }
          }}
        >
          <Text style={[styles.calendarDayNumber, { color: cellText }]}>{d}</Text>
          {symbol ? <Text style={styles.calendarDaySymbol}>{symbol}</Text> : null}
        </TouchableOpacity>
      );
    }

    return dayCells;
  };

  if (loading && staffs.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading staff directory...</Text>
      </View>
    );
  }

  // ==========================================
  // VIEW MODE A: DIRECTORY LIST
  // ==========================================
  if (!selectedStaff) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        
        {/* Header Action Bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Staff Profiles</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={16} color="#64748b" style={styles.searchIcon} />
          <TextInput
            placeholder="Search staff by name, phone..."
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Roles tab selector */}
        <View style={{ height: 42, marginBottom: 14 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollView}>
            {[
              { id: 'all', label: 'All' },
              { id: 'manager', label: 'Managers' },
              { id: 'supervisor', label: 'Supervisors' },
              { id: 'helper', label: 'Helpers' },
              { id: 'worker', label: 'Workers' }
            ].map(tab => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setRoleFilter(tab.id)}
                style={[
                  styles.filterTab,
                  roleFilter === tab.id && styles.filterTabActive
                ]}
              >
                <Text style={[
                  styles.filterTabText,
                  roleFilter === tab.id && styles.filterTabTextActive
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Directory List View */}
        <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
          {filteredStaffs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No matching employees found.</Text>
            </View>
          ) : (
            filteredStaffs.map(staff => {
              const theme = getRoleTheme(staff.role);
              const initials = staff.name.split(' ').map((n: string)=>n[0]).join('').substring(0,2).toUpperCase();
              return (
                <TouchableOpacity
                  key={staff.id}
                  style={styles.staffCard}
                  onPress={() => { setSelectedStaff(staff); setActiveTab('profile'); setIsFlipped(false); }}
                >
                  <View style={[styles.staffCardAccent, { backgroundColor: theme.color }]} />
                  <View style={styles.staffRow}>
                    <View style={[styles.avatarCircle, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                      <Text style={[styles.avatarInitials, { color: theme.text }]}>{initials}</Text>
                    </View>
                    <View style={styles.staffMeta}>
                      <Text style={styles.staffName}>{staff.name}</Text>
                      <View style={styles.badgeRow}>
                        <View style={[styles.roleBadge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                          <Text style={[styles.roleBadgeText, { color: theme.text }]}>{theme.label}</Text>
                        </View>
                        <View style={[styles.statusBadge, { 
                          backgroundColor: staff.status === 'active' ? '#ecfdf5' : '#fef2f2',
                          borderColor: staff.status === 'active' ? '#a7f3d0' : '#fca5a5'
                        }]}>
                          <Text style={[styles.statusBadgeText, { color: staff.status === 'active' ? '#059669' : '#dc2626' }]}>
                            {staff.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Eye size={18} color="#94a3b8" />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    );
  }

  // ==========================================
  // VIEW MODE B: DETAILED PROFILE VIEW
  // ==========================================
  const staffTheme = getRoleTheme(selectedStaff.role);
  const initials = selectedStaff.name.split(' ').map((n: string)=>n[0]).join('').substring(0,2).toUpperCase();
  const staffIdCode = `TF-2026-${selectedStaff.id.toString().padStart(4, '0')}`;
  const isFinanceEligible = ['admin', 'partner', 'manager'].includes(currentUser?.role);

  // Setup ID Card animated properties
  const frontAnimatedStyle = {
    transform: [
      { rotateY: frontInterpolate }
    ]
  };
  const backAnimatedStyle = {
    transform: [
      { rotateY: backInterpolate }
    ]
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Detail Header Action bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSelectedStaff(null)} style={styles.backButton}>
          <ArrowLeft size={20} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Staff profile summary strip */}
      <View style={styles.profileHeaderCard}>
        <View style={[styles.avatarCircleLarge, { backgroundColor: staffTheme.bg, borderColor: staffTheme.border }]}>
          <Text style={[styles.avatarInitialsLarge, { color: staffTheme.text }]}>{initials}</Text>
        </View>
        <Text style={styles.profileHeaderName}>{selectedStaff.name}</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.roleBadge, { backgroundColor: staffTheme.bg, borderColor: staffTheme.border }]}>
            <Text style={[styles.roleBadgeText, { color: staffTheme.text }]}>{staffTheme.label}</Text>
          </View>
          <View style={[styles.statusBadge, { 
            backgroundColor: selectedStaff.status === 'active' ? '#ecfdf5' : '#fef2f2',
            borderColor: selectedStaff.status === 'active' ? '#a7f3d0' : '#fca5a5'
          }]}>
            <Text style={[styles.statusBadgeText, { color: selectedStaff.status === 'active' ? '#059669' : '#dc2626' }]}>
              {selectedStaff.status}
            </Text>
          </View>
        </View>
      </View>

      {/* Scrollable Horizontal Sub-tabs */}
      <View style={{ height: 42, borderBottomWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScrollView}>
          {[
            { id: 'profile', label: 'Info' },
            { id: 'progress', label: 'Work' },
            { id: 'attendance', label: 'Attendance' },
            ...(isFinanceEligible ? [{ id: 'salary', label: 'Salary' }] : []),
            { id: 'idcard', label: 'ID Card' }
          ].map(tab => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => {
                setActiveTab(tab.id as any);
                setIsFlipped(false);
              }}
              style={[
                styles.tabButton,
                activeTab === tab.id && styles.tabButtonActive
              ]}
            >
              <Text style={[
                styles.tabButtonText,
                activeTab === tab.id && styles.tabButtonTextActive
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Viewport content */}
      <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
        
        {/* T1: PERSONAL INFO */}
        {activeTab === 'profile' && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Core Information</Text>
            
            <View style={styles.infoGroup}>
              <Mail size={14} color="#64748b" />
              <View style={styles.infoMeta}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{selectedStaff.email}</Text>
              </View>
            </View>

            <View style={styles.infoGroup}>
              <Phone size={14} color="#64748b" />
              <View style={styles.infoMeta}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{selectedStaff.phone || 'Not Provided'}</Text>
              </View>
            </View>

            <View style={styles.infoGroup}>
              <Shield size={14} color="#64748b" />
              <View style={styles.infoMeta}>
                <Text style={styles.infoLabel}>Account Designation</Text>
                <Text style={[styles.infoValue, { textTransform: 'capitalize' }]}>{selectedStaff.role}</Text>
              </View>
            </View>

            <View style={styles.infoGroup}>
              <Calendar size={14} color="#64748b" />
              <View style={styles.infoMeta}>
                <Text style={styles.infoLabel}>Date Joined</Text>
                <Text style={styles.infoValue}>
                  {selectedStaff.created_at ? new Date(selectedStaff.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                </Text>
              </View>
            </View>

            <View style={styles.notesContainer}>
              <Text style={styles.notesHeader}>Administrative Remarks</Text>
              <Text style={[
                styles.notesText,
                !selectedStaff.extra_notes && styles.italicText
              ]}>
                {selectedStaff.extra_notes || 'No extra performance details configured.'}
              </Text>
            </View>
          </View>
        )}

        {/* T2: WORK / JOB PROGRESS */}
        {activeTab === 'progress' && (
          <View style={{ gap: 16 }}>
            {/* Stats row */}
            {loadingWork ? (
              <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 30 }} />
            ) : !workStats ? (
              <Text style={styles.errorText}>Failed to load job metrics.</Text>
            ) : (
              <>
                <View style={styles.statsRow}>
                  <View style={[styles.miniStatsCard, { backgroundColor: '#f0fdf4', borderColor: '#d1fae5' }]}>
                    <Text style={[styles.miniStatsVal, { color: '#16a34a' }]}>{workStats.completed_jobs_last_month}</Text>
                    <Text style={styles.miniStatsLabel}>Done (30d)</Text>
                  </View>
                  <View style={[styles.miniStatsCard, { backgroundColor: '#eff6ff', borderColor: '#dbeafe' }]}>
                    <Text style={[styles.miniStatsVal, { color: '#2563eb' }]}>{workStats.active_jobs}</Text>
                    <Text style={styles.miniStatsLabel}>Active</Text>
                  </View>
                  <View style={[styles.miniStatsCard, { backgroundColor: '#fefbeb', borderColor: '#fef3c7' }]}>
                    <Text style={[styles.miniStatsVal, { color: '#d97706' }]}>{workStats.pending_jobs}</Text>
                    <Text style={styles.miniStatsLabel}>Pending</Text>
                  </View>
                </View>

                {/* Recent Jobs list */}
                <View style={styles.card}>
                  <Text style={styles.cardHeader}>Recent Assigned Job Cards</Text>
                  {workStats.recent_jobs.length === 0 ? (
                    <Text style={[styles.infoValue, { fontStyle: 'italic', marginVertical: 10 }]}>No job cards allocated.</Text>
                  ) : (
                    workStats.recent_jobs.map((job: any) => (
                      <View key={job.id} style={styles.jobListItem}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.jobItemTitle}>{job.job_card_number}</Text>
                          <Text style={styles.jobItemSubtitle}>PO: {job.po_number} &bull; Qty: {job.quantity}</Text>
                        </View>
                        <Text style={[
                          styles.jobItemStatus,
                          { color: job.status === 'completed' ? '#16a34a' : '#2563eb' }
                        ]}>
                          {job.status.replace('_', ' ')}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </>
            )}
          </View>
        )}

        {/* T3: ATTENDANCE CALENDAR */}
        {activeTab === 'attendance' && (
          <View style={styles.card}>
            <View style={styles.calendarHeaderRow}>
              <Text style={styles.calendarHeaderText}>Logs Register</Text>
              <View style={styles.monthControls}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.monthButton}>
                  <ChevronLeft size={16} color="#64748b" />
                </TouchableOpacity>
                <Text style={styles.monthLabel}>
                  {getMonthName(attendanceMonth)} {attendanceYear}
                </Text>
                <TouchableOpacity onPress={handleNextMonth} style={styles.monthButton}>
                  <ChevronRight size={16} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {loadingAttendance ? (
              <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 40 }} />
            ) : (
              <View style={{ marginTop: 12 }}>
                {/* Days of Week */}
                <View style={styles.weekHeader}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((wd, i) => (
                    <Text key={i} style={styles.weekDayText}>{wd}</Text>
                  ))}
                </View>
                {/* Days Grid */}
                <View style={styles.calendarDaysGrid}>
                  {renderAttendanceDays()}
                </View>

                {/* Legend map */}
                <View style={styles.legendContainer}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendIndicator, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]} />
                    <Text style={styles.legendText}>Present</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendIndicator, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]} />
                    <Text style={styles.legendText}>Late</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendIndicator, { backgroundColor: '#ffedd5', borderColor: '#ffedd5' }]} />
                    <Text style={styles.legendText}>Half Day</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendIndicator, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]} />
                    <Text style={styles.legendText}>Leave</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendIndicator, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]} />
                    <Text style={styles.legendText}>Absent</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* T4: SALARY LEDGER */}
        {activeTab === 'salary' && isFinanceEligible && (
          <View style={{ gap: 16 }}>
            {/* Top base card */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.cardHeader}>Monthly Compensation</Text>
                <Text style={styles.salaryBigVal}>
                  {selectedStaff.salary ? `₹${parseFloat(selectedStaff.salary).toLocaleString('en-IN')}` : 'Not Set'}
                </Text>
              </View>
            </View>

            {loadingSalary ? (
              <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 30 }} />
            ) : !salaryHistory ? (
              <Text style={styles.errorText}>Failed to load wages ledger history.</Text>
            ) : (
              <>
                {/* Advances Sub-ledger */}
                <View style={styles.card}>
                  <Text style={styles.cardHeader}>Salary Cash Advances</Text>
                  {salaryHistory.advances.length === 0 ? (
                    <Text style={[styles.infoValue, { fontStyle: 'italic', marginVertical: 5 }]}>No advances granted.</Text>
                  ) : (
                    salaryHistory.advances.map((adv: any) => (
                      <View key={adv.id} style={styles.salaryItemRow}>
                        <View>
                          <Text style={styles.salaryItemTitle}>Advance Grant</Text>
                          <Text style={styles.salaryItemSubtitle}>{new Date(adv.date).toLocaleDateString('en-IN')} &bull; {adv.notes || 'No remarks'}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.salaryItemValue}>₹{adv.amount}</Text>
                          <Text style={[styles.salaryItemStatus, {
                            color: adv.status === 'pending' ? '#dc2626' : '#16a34a'
                          }]}>
                            {adv.status}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>

                {/* Payslips history */}
                <View style={styles.card}>
                  <Text style={styles.cardHeader}>Processed Payslips</Text>
                  {salaryHistory.payroll_history.length === 0 ? (
                    <Text style={[styles.infoValue, { fontStyle: 'italic', marginVertical: 5 }]}>No slips processed yet.</Text>
                  ) : (
                    salaryHistory.payroll_history.map((slip: any) => (
                      <View key={slip.id} style={styles.salaryItemRow}>
                        <View>
                          <Text style={styles.salaryItemTitle}>{getMonthName(slip.month)} {slip.year}</Text>
                          <Text style={styles.salaryItemSubtitle}>Gross: ₹{slip.gross_salary} &bull; Bonus: +₹{slip.bonus}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.salaryItemValue, { color: '#2563eb' }]}>₹{slip.net_salary}</Text>
                          <Text style={[styles.salaryItemStatus, {
                            color: slip.payment_status === 'paid' ? '#16a34a' : '#d97706'
                          }]}>
                            {slip.payment_status}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </>
            )}
          </View>
        )}

        {/* T5: ID CARD */}
        {activeTab === 'idcard' && (
          <View style={{ alignItems: 'center', gap: 20, paddingVertical: 10 }}>
            {/* Flippable Card Badger Container */}
            <View style={styles.flipCardContainer}>
              {/* Front Card */}
              <Animated.View style={[styles.badgeBaseCard, frontAnimatedStyle, { backfaceVisibility: 'hidden' }]}>
                {/* Header pattern */}
                <View style={styles.badgeHeaderBlue}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MobileLogo height={16} />
                    <Text style={styles.badgeHeaderTitle}>TECHFOCAL</Text>
                  </View>
                  <Text style={styles.badgeHeaderSubtitle}>Enterprises LLP</Text>
                </View>

                {/* Avatar area */}
                <View style={{ alignItems: 'center', marginTop: 15 }}>
                  <View style={[styles.badgeAvatarCircle, { backgroundColor: staffTheme.bg, borderColor: staffTheme.color }]}>
                    <Text style={[styles.badgeAvatarInitials, { color: staffTheme.text }]}>{initials}</Text>
                  </View>
                </View>

                {/* Name */}
                <View style={{ alignItems: 'center', marginTop: 12 }}>
                  <Text style={styles.badgeName}>{selectedStaff.name}</Text>
                  <View style={[styles.badgeRoleBadge, { backgroundColor: staffTheme.bg, borderColor: staffTheme.border }]}>
                    <Text style={[styles.badgeRoleBadgeText, { color: staffTheme.text }]}>{staffTheme.label}</Text>
                  </View>
                </View>

                {/* ID Details list */}
                <View style={styles.badgeDetailsList}>
                  <View style={styles.badgeDetailsRow}>
                    <Text style={styles.badgeDetailsLabel}>EMPLOYEE ID</Text>
                    <Text style={styles.badgeDetailsValue}>{staffIdCode}</Text>
                  </View>
                  <View style={styles.badgeDetailsRow}>
                    <Text style={styles.badgeDetailsLabel}>DATE JOINED</Text>
                    <Text style={styles.badgeDetailsValue}>
                      {selectedStaff.created_at ? new Date(selectedStaff.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'June 2026'}
                    </Text>
                  </View>
                  <View style={styles.badgeDetailsRow}>
                    <Text style={styles.badgeDetailsLabel}>PHONE</Text>
                    <Text style={styles.badgeDetailsValue}>{selectedStaff.phone || 'N/A'}</Text>
                  </View>
                </View>

                {/* Barcode representation */}
                <View style={styles.badgeBarcodeArea}>
                  <Svg viewBox="0 0 100 24" height="24" width="140">
                    <Rect x="0" y="0" width="2" height="24" fill="black" />
                    <Rect x="3" y="0" width="1" height="24" fill="black" />
                    <Rect x="5" y="0" width="3" height="24" fill="black" />
                    <Rect x="9" y="0" width="1" height="24" fill="black" />
                    <Rect x="11" y="0" width="2" height="24" fill="black" />
                    <Rect x="15" y="0" width="4" height="24" fill="black" />
                    <Rect x="20" y="0" width="1" height="24" fill="black" />
                    <Rect x="22" y="0" width="2" height="24" fill="black" />
                    <Rect x="26" y="0" width="3" height="24" fill="black" />
                    <Rect x="30" y="0" width="1" height="24" fill="black" />
                    <Rect x="32" y="0" width="2" height="24" fill="black" />
                    <Rect x="36" y="0" width="4" height="24" fill="black" />
                    <Rect x="42" y="0" width="1" height="24" fill="black" />
                    <Rect x="44" y="0" width="3" height="24" fill="black" />
                    <Rect x="49" y="0" width="1" height="24" fill="black" />
                    <Rect x="51" y="0" width="2" height="24" fill="black" />
                    <Rect x="55" y="0" width="4" height="24" fill="black" />
                    <Rect x="61" y="0" width="1" height="24" fill="black" />
                    <Rect x="63" y="0" width="2" height="24" fill="black" />
                    <Rect x="67" y="0" width="3" height="24" fill="black" />
                    <Rect x="71" y="0" width="1" height="24" fill="black" />
                    <Rect x="73" y="0" width="2" height="24" fill="black" />
                    <Rect x="77" y="0" width="4" height="24" fill="black" />
                    <Rect x="83" y="0" width="1" height="24" fill="black" />
                    <Rect x="85" y="0" width="3" height="24" fill="black" />
                    <Rect x="90" y="0" width="2" height="24" fill="black" />
                  </Svg>
                  <Text style={styles.badgeBarcodeText}>{staffIdCode}</Text>
                </View>
              </Animated.View>

              {/* Back Card */}
              <Animated.View style={[styles.badgeBaseCard, styles.badgeBackCard, backAnimatedStyle, { backfaceVisibility: 'hidden' }]}>
                {/* Back side branding */}
                <View style={{ alignItems: 'center', marginTop: 35 }}>
                  <MobileLogo height={28} />
                  <Text style={styles.badgeBackCompany}>TechFocal Enterprises</Text>
                </View>

                {/* Back side details */}
                <View style={styles.badgeBackBody}>
                  <Text style={styles.badgeBackInstruction}>
                    This card remains the property of TechFocal Enterprises LLP. If found, please return immediately to the address below.
                  </Text>

                  <View style={{ borderTopWidth: 1, borderColor: '#334155', paddingTop: 10, marginTop: 10 }}>
                    <Text style={styles.badgeBackAddressLabel}>Office address</Text>
                    <Text style={styles.badgeBackAddressValue}>Plot No 1 Survey No. 97/1, Canal Road, Village : Lamdapura, Ta : Savali, Dist: Vadodara - 391775</Text>
                  </View>

                  <View style={{ borderTopWidth: 1, borderColor: '#334155', paddingTop: 10, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={styles.badgeBackAddressLabel}>Emergency contact</Text>
                      <Text style={styles.badgeBackAddressValue}>+91 98765 43210</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontFamily: 'sans-serif-condensed', fontStyle: 'italic', fontSize: 13, color: '#38bdf8', height: 16 }}>TechFocal</Text>
                      <Text style={{ fontSize: 7, color: '#94a3b8', fontWeight: 'bold' }}>AUTHORIZED SIGNATORY</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.badgeBackFooter} />
              </Animated.View>
            </View>

            {/* Actions button */}
            <TouchableOpacity onPress={handleFlipCard} style={styles.flipActionButton}>
              <RotateCw size={14} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.flipActionText}>Flip ID Badge (3D Flip)</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#cbd5e1',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1e293b',
    padding: 0,
  },
  filterScrollView: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterTabActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
  staffCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  staffCardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingLeft: 20,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 13,
    fontWeight: '700',
  },
  staffMeta: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  staffName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  profileHeaderCard: {
    backgroundColor: '#ffffff',
    paddingVertical: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarCircleLarge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarInitialsLarge: {
    fontSize: 20,
    fontWeight: '800',
  },
  profileHeaderName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 2,
  },
  tabsScrollView: {
    paddingHorizontal: 20,
    gap: 16,
    alignItems: 'center',
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    borderColor: '#2563eb',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  detailContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    paddingBottom: 8,
    marginBottom: 12,
  },
  infoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoMeta: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
    marginTop: 1,
  },
  notesContainer: {
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 12,
    marginTop: 6,
  },
  notesHeader: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 6,
  },
  italicText: {
    fontStyle: 'italic',
    color: '#94a3b8',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  miniStatsCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  miniStatsVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  miniStatsLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    textAlign: 'center',
    marginVertical: 10,
  },
  jobListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    paddingVertical: 10,
  },
  jobItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  jobItemSubtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  jobItemStatus: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    paddingBottom: 8,
  },
  calendarHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  monthControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 6,
    height: 28,
  },
  monthButton: {
    padding: 2,
  },
  monthLabel: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 70,
    textAlign: 'center',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekDayText: {
    width: '13%',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  calendarDayCell: {
    width: '13%',
    height: 38,
    borderWidth: 1,
    borderRadius: 4,
    justifyContent: 'space-between',
    padding: 3,
  },
  calendarEmptyDay: {
    width: '13%',
    height: 38,
  },
  calendarDayNumber: {
    fontSize: 9,
    fontWeight: '700',
  },
  calendarDaySymbol: {
    fontSize: 9,
    fontWeight: '800',
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 2,
    paddingHorizontal: 2,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 10,
    marginTop: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendIndicator: {
    width: 8,
    height: 8,
    borderRadius: 2,
    borderWidth: 0.5,
  },
  legendText: {
    fontSize: 9,
    color: '#64748b',
  },
  salaryBigVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563eb',
  },
  salaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    paddingVertical: 10,
  },
  salaryItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  salaryItemSubtitle: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 1,
  },
  salaryItemValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  salaryItemStatus: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  flipCardContainer: {
    width: 290,
    height: 420,
    position: 'relative',
  },
  badgeBaseCard: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    position: 'absolute',
  },
  badgeBackCard: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  badgeHeaderBlue: {
    height: 90,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  badgeHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  badgeHeaderSubtitle: {
    fontSize: 8,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 1,
  },
  badgeAvatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  badgeAvatarInitials: {
    fontSize: 22,
    fontWeight: '800',
  },
  badgeName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  badgeRoleBadge: {
    marginTop: 4,
    borderWidth: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 8,
  },
  badgeRoleBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeDetailsList: {
    marginTop: 16,
    paddingHorizontal: 20,
    gap: 6,
  },
  badgeDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderColor: '#e2e8f0',
    paddingBottom: 4,
  },
  badgeDetailsLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '500',
  },
  badgeDetailsValue: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0f172a',
  },
  badgeBarcodeArea: {
    marginTop: 'auto',
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderColor: '#e2e8f0',
  },
  badgeBarcodeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  badgeBackCompany: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  badgeBackBody: {
    paddingHorizontal: 20,
    marginTop: 20,
    flex: 1,
  },
  badgeBackInstruction: {
    fontSize: 9,
    lineHeight: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  badgeBackAddressLabel: {
    fontSize: 8,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  badgeBackAddressValue: {
    fontSize: 9,
    color: '#e2e8f0',
    fontWeight: '600',
    marginTop: 1,
  },
  badgeBackFooter: {
    height: 6,
    backgroundColor: '#2ba454',
    width: '100%',
    marginTop: 'auto',
  },
  flipActionButton: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    flexDirection: 'row',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  flipActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  }
});
