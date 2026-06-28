import React, { useState, useEffect } from 'react';
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
const Calendar = Lucide.Calendar as any;
const ChevronLeft = Lucide.ChevronLeft as any;
const ChevronRight = Lucide.ChevronRight as any;
const Search = Lucide.Search as any;
const Check = Lucide.Check as any;
const Clock = Lucide.Clock as any;
const FileText = Lucide.FileText as any;
const RefreshCw = Lucide.RefreshCw as any;
const Info = Lucide.Info as any;
const User = Lucide.User as any;

const { width } = Dimensions.get('window');
const isTablet = width > 600;

interface AttendanceRecord {
  user_id: number;
  name: string;
  role: string;
  phone: string | null;
  status: 'present' | 'late' | 'half_day' | 'absent' | 'leave';
  clock_in: string;
  clock_out: string;
  notes: string;
  hasExisting: boolean;
}

export default function AttendanceScreen() {
  const { token, apiUrl } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useRealTime('attendance', () => {
    fetchAttendance();
  });

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [selectedShift, setSelectedShift] = useState<'day' | 'night'>('day');
  const [workers, setWorkers] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

  const fetchAttendance = async () => {
    if (!token || !apiUrl) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${apiUrl}/api/attendance?date=${selectedDate}&shift=${selectedShift}`, { headers });
      
      if (res.data && res.data.records) {
        const mapped: AttendanceRecord[] = res.data.records.map((r: any) => {
          const status = r.attendance?.status || 'present';
          let defaultClockIn = '';
          let defaultClockOut = '';

          const isNight = selectedShift === 'night';

          if (status === 'present') {
            defaultClockIn = isNight ? '21:00' : '09:00';
            defaultClockOut = isNight ? '06:00' : '18:00';
          } else if (status === 'late') {
            defaultClockIn = isNight ? '21:30' : '09:30';
            defaultClockOut = isNight ? '06:00' : '18:00';
          } else if (status === 'half_day') {
            defaultClockIn = isNight ? '21:00' : '09:00';
            defaultClockOut = isNight ? '01:00' : '13:00';
          }

          return {
            user_id: r.id,
            name: r.name,
            role: r.role,
            phone: r.phone,
            status: status,
            clock_in: r.attendance?.clock_in || defaultClockIn,
            clock_out: r.attendance?.clock_out || defaultClockOut,
            notes: r.attendance?.notes || '',
            hasExisting: !!r.attendance
          };
        });
        setWorkers(mapped);
      }
    } catch (err: any) {
      console.error('Failed to fetch attendance:', err);
      Alert.alert('Error', 'Could not load attendance records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, selectedShift]);

  const adjustDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const setStatus = (userId: number, status: AttendanceRecord['status']) => {
    setWorkers(prev => prev.map(w => {
      if (w.user_id !== userId) return w;
      
      let defaultClockIn = '';
      let defaultClockOut = '';

      const isNight = selectedShift === 'night';

      if (status === 'present') {
        defaultClockIn = isNight ? '21:00' : '09:00';
        defaultClockOut = isNight ? '06:00' : '18:00';
      } else if (status === 'late') {
        defaultClockIn = isNight ? '21:30' : '09:30';
        defaultClockOut = isNight ? '06:00' : '18:00';
      } else if (status === 'half_day') {
        defaultClockIn = isNight ? '21:00' : '09:00';
        defaultClockOut = isNight ? '01:00' : '13:00';
      }

      return {
        ...w,
        status,
        clock_in: defaultClockIn,
        clock_out: defaultClockOut
      };
    }));
  };

  const updateField = (userId: number, field: keyof AttendanceRecord, value: string) => {
    setWorkers(prev => prev.map(w => {
      if (w.user_id !== userId) return w;
      return {
        ...w,
        [field]: value
      };
    }));
  };

  const handleSave = async () => {
    if (!token || !apiUrl || workers.length === 0) return;
    
    // Quick validation of format for clock-in/out
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    for (const w of workers) {
      if (['present', 'late', 'half_day'].includes(w.status)) {
        if (w.clock_in && !timeRegex.test(w.clock_in)) {
          Alert.alert('Validation Error', `Invalid clock-in time format for ${w.name}. Use HH:MM format.`);
          return;
        }
        if (w.clock_out && !timeRegex.test(w.clock_out)) {
          Alert.alert('Validation Error', `Invalid clock-out time format for ${w.name}. Use HH:MM format.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const recordsToSubmit = workers.map(w => ({
        user_id: w.user_id,
        status: w.status,
        clock_in: ['present', 'late', 'half_day'].includes(w.status) ? (w.clock_in || null) : null,
        clock_out: ['present', 'late', 'half_day'].includes(w.status) ? (w.clock_out || null) : null,
        notes: w.notes || null
      }));

      await axios.post(`${apiUrl}/api/attendance`, {
        date: selectedDate,
        shift: selectedShift,
        records: recordsToSubmit
      }, { headers });

      Alert.alert('Success', 'Attendance sheet saved successfully.');
      fetchAttendance();
    } catch (err: any) {
      console.error('Failed to save attendance:', err);
      Alert.alert('Error', 'Failed to save attendance. ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const filteredWorkers = workers.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (w.phone && w.phone.includes(searchQuery));
    const matchesRole = selectedRole === 'all' || w.role.toLowerCase() === selectedRole.toLowerCase();
    return matchesSearch && matchesRole;
  });

  // Calculate stats based on current local state
  const stats = workers.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, { present: 0, late: 0, half_day: 0, absent: 0, leave: 0 } as Record<string, number>);

  const uniqueRoles = Array.from(new Set(workers.map(w => w.role)));

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
          <Text style={styles.headerTitle}>Attendance Register</Text>
          <Text style={styles.headerSubtitle}>Supervisor Panel</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchAttendance} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <RefreshCw size={18} color="#64748b" />
          )}
        </TouchableOpacity>
      </View>

      {/* Date Switcher */}
      <View style={styles.dateSelector}>
        <TouchableOpacity style={styles.dateArrow} onPress={() => adjustDate(-1)}>
          <ChevronLeft size={20} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.dateDisplayContainer}>
          <Calendar size={16} color="#2563eb" style={{ marginRight: 6 }} />
          <Text style={styles.dateText}>{formatDateDisplay(selectedDate)}</Text>
        </View>
        <TouchableOpacity style={styles.dateArrow} onPress={() => adjustDate(1)}>
          <ChevronRight size={20} color="#1e293b" />
        </TouchableOpacity>
      </View>

      {/* Shift Switcher */}
      <View style={styles.shiftSelectorRow}>
        <TouchableOpacity 
          style={[styles.shiftBtn, selectedShift === 'day' && styles.shiftBtnDayActive]}
          onPress={() => setSelectedShift('day')}
        >
          <Text style={[styles.shiftBtnText, selectedShift === 'day' && styles.shiftBtnTextActive]}>Day Shift</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.shiftBtn, selectedShift === 'night' && styles.shiftBtnNightActive]}
          onPress={() => setSelectedShift('night')}
        >
          <Text style={[styles.shiftBtnText, selectedShift === 'night' && styles.shiftBtnTextActive]}>Night Shift</Text>
        </TouchableOpacity>
      </View>

      {/* Main content */}
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* KPI Panel */}
        <View style={styles.kpiContainer}>
          <View style={[styles.kpiCard, { borderColor: '#10b981' }]}>
            <Text style={[styles.kpiVal, { color: '#10b981' }]}>{stats.present}</Text>
            <Text style={styles.kpiLabel}>Present</Text>
          </View>
          <View style={[styles.kpiCard, { borderColor: '#f59e0b' }]}>
            <Text style={[styles.kpiVal, { color: '#f59e0b' }]}>{stats.late}</Text>
            <Text style={styles.kpiLabel}>Late</Text>
          </View>
          <View style={[styles.kpiCard, { borderColor: '#3b82f6' }]}>
            <Text style={[styles.kpiVal, { color: '#3b82f6' }]}>{stats.half_day}</Text>
            <Text style={styles.kpiLabel}>Half-Day</Text>
          </View>
          <View style={[styles.kpiCard, { borderColor: '#ef4444' }]}>
            <Text style={[styles.kpiVal, { color: '#ef4444' }]}>{stats.absent}</Text>
            <Text style={styles.kpiLabel}>Absent</Text>
          </View>
          <View style={[styles.kpiCard, { borderColor: '#8b5cf6' }]}>
            <Text style={[styles.kpiVal, { color: '#8b5cf6' }]}>{stats.leave}</Text>
            <Text style={styles.kpiLabel}>Leave</Text>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filtersSection}>
          <View style={styles.searchBar}>
            <Search size={16} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by worker name..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Role Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleFiltersScroll}>
            <TouchableOpacity 
              style={[styles.rolePill, selectedRole === 'all' && styles.rolePillActive]}
              onPress={() => setSelectedRole('all')}
            >
              <Text style={[styles.rolePillText, selectedRole === 'all' && styles.rolePillTextActive]}>All Roles</Text>
            </TouchableOpacity>
            {uniqueRoles.map(role => (
              <TouchableOpacity
                key={role}
                style={[styles.rolePill, selectedRole.toLowerCase() === role.toLowerCase() && styles.rolePillActive]}
                onPress={() => setSelectedRole(role)}
              >
                <Text style={[styles.rolePillText, selectedRole.toLowerCase() === role.toLowerCase() && styles.rolePillTextActive]}>
                  {role.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Worker Cards List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading attendance register...</Text>
          </View>
        ) : filteredWorkers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Info size={36} color="#cbd5e1" />
            <Text style={styles.emptyText}>No workers match your filter criteria.</Text>
          </View>
        ) : (
          <View style={isTablet ? styles.tabletGrid : styles.mobileList}>
            {filteredWorkers.map(w => {
              const isPresentType = ['present', 'late', 'half_day'].includes(w.status);
              
              return (
                <View key={w.user_id} style={[styles.workerCard, isTablet && styles.workerCardTablet]}>
                  {/* Worker Title and Role */}
                  <View style={styles.workerHeader}>
                    <View style={styles.avatarRow}>
                      <View style={styles.avatar}>
                        <User size={16} color="#64748b" />
                      </View>
                      <View>
                        <Text style={styles.workerName}>{w.name}</Text>
                        <Text style={styles.workerRole}>{w.role.toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={styles.badgeRow}>
                      {w.hasExisting ? (
                        <View style={styles.savedBadge}>
                          <Check size={10} color="#10b981" style={{ marginRight: 2 }} />
                          <Text style={styles.savedBadgeText}>Saved</Text>
                        </View>
                      ) : (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>Unsaved</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Status Button Segment */}
                  <View style={styles.statusSegment}>
                    <TouchableOpacity
                      style={[styles.statusBtn, w.status === 'present' && styles.statusBtnPresent]}
                      onPress={() => setStatus(w.user_id, 'present')}
                    >
                      <Text style={[styles.statusBtnText, w.status === 'present' && styles.statusBtnTextActive]}>Present</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusBtn, w.status === 'late' && styles.statusBtnLate]}
                      onPress={() => setStatus(w.user_id, 'late')}
                    >
                      <Text style={[styles.statusBtnText, w.status === 'late' && styles.statusBtnTextActive]}>Late</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusBtn, w.status === 'half_day' && styles.statusBtnHalfDay]}
                      onPress={() => setStatus(w.user_id, 'half_day')}
                    >
                      <Text style={[styles.statusBtnText, w.status === 'half_day' && styles.statusBtnTextActive]}>Half-Day</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusBtn, w.status === 'absent' && styles.statusBtnAbsent]}
                      onPress={() => setStatus(w.user_id, 'absent')}
                    >
                      <Text style={[styles.statusBtnText, w.status === 'absent' && styles.statusBtnTextActive]}>Absent</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusBtn, w.status === 'leave' && styles.statusBtnLeave]}
                      onPress={() => setStatus(w.user_id, 'leave')}
                    >
                      <Text style={[styles.statusBtnText, w.status === 'leave' && styles.statusBtnTextActive]}>Leave</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Times input for Present/Late/Half Day */}
                  {isPresentType && (
                    <View style={styles.timeInputsRow}>
                      <View style={styles.timeInputCol}>
                        <View style={styles.inputLabelRow}>
                          <Clock size={12} color="#64748b" style={{ marginRight: 4 }} />
                          <Text style={styles.inputLabel}>Clock In</Text>
                        </View>
                        <TextInput
                          style={styles.timeInput}
                          placeholder="09:00"
                          value={w.clock_in}
                          onChangeText={(val) => updateField(w.user_id, 'clock_in', val)}
                          keyboardType="numbers-and-punctuation"
                          maxLength={5}
                        />
                      </View>
                      <View style={styles.timeInputCol}>
                        <View style={styles.inputLabelRow}>
                          <Clock size={12} color="#64748b" style={{ marginRight: 4 }} />
                          <Text style={styles.inputLabel}>Clock Out</Text>
                        </View>
                        <TextInput
                          style={styles.timeInput}
                          placeholder="18:00"
                          value={w.clock_out}
                          onChangeText={(val) => updateField(w.user_id, 'clock_out', val)}
                          keyboardType="numbers-and-punctuation"
                          maxLength={5}
                        />
                      </View>
                    </View>
                  )}

                  {/* Notes text input */}
                  <View style={styles.notesContainer}>
                    <View style={styles.inputLabelRow}>
                      <FileText size={12} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.inputLabel}>Notes</Text>
                    </View>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Add supervisor notes (optional)..."
                      value={w.notes}
                      onChangeText={(val) => updateField(w.user_id, 'notes', val)}
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity 
          style={styles.resetButton} 
          onPress={fetchAttendance}
          disabled={loading || saving}
        >
          <Text style={styles.resetButtonText}>Reset Page</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
          disabled={loading || saving || workers.length === 0}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Check size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.saveButtonText}>Save Attendance Register</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 120,
  },
  kpiContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 3,
    elevation: 1,
  },
  kpiVal: {
    fontSize: 18,
    fontWeight: '700',
  },
  kpiLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  filtersSection: {
    marginBottom: 20,
    gap: 12,
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
  roleFiltersScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  rolePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
  },
  rolePillActive: {
    backgroundColor: '#2563eb',
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  rolePillTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
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
  workerCard: {
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
  workerCardTablet: {
    width: '48.5%', // two columns on tablets
  },
  workerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  workerRole: {
    fontSize: 10,
    color: '#2563eb',
    fontWeight: '700',
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfeff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a5f3fc',
  },
  savedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0891b2',
  },
  newBadge: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748b',
  },
  statusSegment: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
    gap: 2,
    marginBottom: 12,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  statusBtnPresent: {
    backgroundColor: '#10b981',
  },
  statusBtnLate: {
    backgroundColor: '#f59e0b',
  },
  statusBtnHalfDay: {
    backgroundColor: '#3b82f6',
  },
  statusBtnAbsent: {
    backgroundColor: '#ef4444',
  },
  statusBtnLeave: {
    backgroundColor: '#8b5cf6',
  },
  statusBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  statusBtnTextActive: {
    color: '#ffffff',
  },
  timeInputsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  timeInputCol: {
    flex: 1,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  timeInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0f172a',
    textAlign: 'center',
  },
  notesContainer: {
    gap: 4,
  },
  notesInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0f172a',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
  },
  resetButton: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  saveButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  shiftSelectorRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  shiftBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftBtnDayActive: {
    backgroundColor: '#eab308',
    borderColor: '#eab308',
  },
  shiftBtnNightActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  shiftBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  shiftBtnTextActive: {
    color: '#ffffff',
  },
});
