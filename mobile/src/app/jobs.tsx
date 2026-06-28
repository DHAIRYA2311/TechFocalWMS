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
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useRealTime } from '@/hooks/useRealTime';
import * as Lucide from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as ImagePicker from 'expo-image-picker';

const ArrowLeft = Lucide.ArrowLeft as any;
const Search = Lucide.Search as any;
const Wrench = Lucide.Wrench as any;
const User = Lucide.User as any;
const Cpu = Lucide.Cpu as any;
const CheckCircle = Lucide.CheckCircle as any;
const AlertCircle = Lucide.AlertCircle as any;
const Clock = Lucide.Clock as any;
const RefreshCw = Lucide.RefreshCw as any;
const Info = Lucide.Info as any;
const FileText = Lucide.FileText as any;
const Check = Lucide.Check as any;
const Edit3 = Lucide.Edit3 as any;
const ChevronRight = Lucide.ChevronRight as any;
const X = Lucide.X as any;
const Play = Lucide.Play as any;
const ExternalLink = Lucide.ExternalLink as any;
const Trash2 = Lucide.Trash2 as any;
const Upload = Lucide.Upload as any;

const { width, height } = Dimensions.get('window');
const isTablet = width > 600;

interface JobCard {
  id: number;
  job_card_number: string;
  quantity: number;
  status: 'pending' | 'in_progress' | 'inspection' | 'completed';
  drawing_path: { path: string; name: string }[] | null;
  start_date: string | null;
  end_date: string | null;
  remarks: string | null;
  assigned_worker_id: number | null;
  machine_id: number | null;
  worker?: {
    id: number;
    name: string;
  };
  machine?: {
    id: number;
    machine_code: string;
    name: string;
    status: string;
  };
  po_item?: {
    id: number;
    item_code: string;
    description: string;
    unit: string;
    purchase_order?: {
      po_number: string;
      customer_name: string;
    };
  };
  challan_item?: {
    id: number;
    challan?: {
      challan_number: string;
      challan_date: string;
    };
  };
}

interface Worker {
  id: number;
  name: string;
}

interface Machine {
  id: number;
  machine_code: string;
  name: string;
  status: 'idle' | 'busy' | 'maintenance' | 'inactive';
}

export default function JobsScreen() {
  const { token, apiUrl } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useRealTime('jobs', () => {
    fetchJobsData();
  });

  // Core lists state
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);

  // Loaders
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const horizontalScrollRef = React.useRef<ScrollView>(null);

  // Detail view Modal
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null);

  // Assignment Modal Selector States
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showMachineModal, setShowMachineModal] = useState(false);

  // Temp form fields inside details page
  const [tempWorkerId, setTempWorkerId] = useState<number | null>(null);
  const [tempMachineId, setTempMachineId] = useState<number | null>(null);
  const [tempRemarks, setTempRemarks] = useState('');

  // In-app Viewer state
  const [viewerFile, setViewerFile] = useState<{ path: string; name: string } | null>(null);

  // Mobile Drawing Rename states
  const [editingDrawingPath, setEditingDrawingPath] = useState<string | null>(null);
  const [mobileNewName, setMobileNewName] = useState('');

  const fetchJobsData = async () => {
    if (!token || !apiUrl) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [jobsRes, workersRes, machinesRes] = await Promise.all([
        axios.get(`${apiUrl}/api/jobs`, { headers }),
        axios.get(`${apiUrl}/api/workers`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${apiUrl}/api/machines`, { headers }).catch(() => ({ data: [] }))
      ]);

      setJobs(jobsRes.data);
      setWorkers(workersRes.data);
      setMachines(machinesRes.data);
    } catch (err: any) {
      console.error('Failed to load job data:', err);
      Alert.alert('Error', 'Failed to retrieve job cards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobsData();
  }, []);

  const handleOpenDetails = (job: JobCard) => {
    setSelectedJob(job);
    setTempWorkerId(job.assigned_worker_id);
    setTempMachineId(job.machine_id);
    setTempRemarks(job.remarks || '');
  };

  const handleCloseDetails = () => {
    setSelectedJob(null);
  };

  const handleSaveAssignment = async () => {
    if (!selectedJob || !token || !apiUrl) return;

    if (!tempWorkerId) {
      Alert.alert('Validation Error', 'Please select an operator to assign.');
      return;
    }
    if (!tempMachineId) {
      Alert.alert('Validation Error', 'Please select a machine to assign.');
      return;
    }

    setAssigning(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.put(`${apiUrl}/api/jobs/${selectedJob.id}/assign`, {
        assigned_worker_id: tempWorkerId,
        machine_id: tempMachineId
      }, { headers });

      Alert.alert('Success', res.data.message || 'Job card assigned successfully.');
      
      // Update selectedJob and jobs list states immediately
      const updatedJob = {
        ...selectedJob,
        assigned_worker_id: tempWorkerId,
        machine_id: tempMachineId,
        status: res.data.job?.status || 'in_progress',
        start_date: res.data.job?.start_date || selectedJob.start_date,
        worker: workers.find(w => w.id === tempWorkerId),
        machine: machines.find(m => m.id === tempMachineId)
      } as JobCard;
      setSelectedJob(updatedJob);
      
      // Refresh list in background
      fetchJobsData();
    } catch (err: any) {
      console.error('Failed to assign job:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to save assignments.');
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateStatus = async (targetStatus: JobCard['status'], notesText?: string) => {
    if (!selectedJob || !token || !apiUrl) return;

    setStatusUpdating(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.put(`${apiUrl}/api/jobs/${selectedJob.id}/status`, {
        status: targetStatus,
        remarks: notesText !== undefined ? notesText : tempRemarks
      }, { headers });

      Alert.alert('Success', res.data.message || 'Job status updated successfully.');
      
      const updatedJob = {
        ...selectedJob,
        status: targetStatus,
        remarks: notesText !== undefined ? notesText : tempRemarks,
        end_date: res.data.job?.end_date || selectedJob.end_date,
        start_date: res.data.job?.start_date || selectedJob.start_date
      } as JobCard;
      
      setSelectedJob(updatedJob);
      fetchJobsData();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to transition status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleOpenDrawing = async (drawingPath?: string | null) => {
    const path = drawingPath !== undefined ? drawingPath : (selectedJob?.drawing_path && selectedJob.drawing_path.length > 0 ? selectedJob.drawing_path[0].path : null);
    if (!path) return;
    
    const fileName = selectedJob?.drawing_path?.find(d => d.path === path)?.name || path.split('/').pop() || 'Drawing';
    const isPdf = path.toLowerCase().endsWith('.pdf');
    if (isPdf && Platform.OS !== 'web') {
      try {
        if (!apiUrl) return;
        const fullUrl = `${apiUrl}/${path}`;
        await WebBrowser.openBrowserAsync(fullUrl);
      } catch (err) {
        console.error('Failed to open drawing browser:', err);
        Alert.alert('Error', 'Could not open drawing link.');
      }
    } else {
      setViewerFile({ path, name: fileName });
    }
  };

  const handlePickDrawing = async () => {
    if (Platform.OS === 'web') {
      // Dynamic HTML file input for React Native Web
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.png,.jpg,.jpeg';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          await uploadFileToServer(file);
        }
      };
      input.click();
    } else {
      // Native Photo Library Picker
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Coordinators require library permissions to upload drawings.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await uploadFileToServer(asset);
      }
    }
  };

  const uploadFileToServer = async (fileOrAsset: any) => {
    if (!selectedJob || !token || !apiUrl) return;

    setAssigning(true);
    const formData = new FormData();

    if (Platform.OS === 'web') {
      formData.append('file', fileOrAsset);
    } else {
      const localUri = fileOrAsset.uri;
      const filename = fileOrAsset.fileName || localUri.split('/').pop() || 'drawing.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: localUri,
        name: filename,
        type
      } as any);
    }

    try {
      const headers = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      };

      const res = await axios.post(`${apiUrl}/api/jobs/${selectedJob.id}/drawing`, formData, { headers });
      Alert.alert('Success', 'Drawing uploaded successfully.');
      
      const updatedJob = {
        ...selectedJob,
        drawing_path: res.data.job.drawing_path
      } as JobCard;
      setSelectedJob(updatedJob);
      fetchJobsData();
    } catch (err: any) {
      console.error('Failed to upload mobile drawing:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to upload drawing.');
    } finally {
      setAssigning(false);
    }
  };

  const handleDeleteMobileDrawing = async (pathToDelete: string) => {
    if (!selectedJob || !token || !apiUrl) return;

    Alert.alert(
      'Delete Drawing',
      'Are you sure you want to permanently delete this drawing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setAssigning(true);
            try {
              const headers = { Authorization: `Bearer ${token}` };
              const res = await axios.delete(`${apiUrl}/api/jobs/${selectedJob.id}/drawing`, {
                headers,
                data: { path: pathToDelete }
              });

              Alert.alert('Success', 'Drawing deleted successfully.');
              const updatedJob = {
                ...selectedJob,
                drawing_path: res.data.job.drawing_path
              } as JobCard;
              setSelectedJob(updatedJob);
              fetchJobsData();
            } catch (err: any) {
              console.error('Failed to delete mobile drawing:', err);
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete drawing.');
            } finally {
              setAssigning(false);
            }
          }
        }
      ]
    );
  };

  const handleRenameMobileDrawing = async (path: string, name: string) => {
    if (!selectedJob || !token || !apiUrl) return;
    if (!name.trim()) return;

    setAssigning(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.put(`${apiUrl}/api/jobs/${selectedJob.id}/drawing/rename`, {
        path,
        name
      }, { headers });

      Alert.alert('Success', 'Drawing renamed successfully.');
      const updatedJob = {
        ...selectedJob,
        drawing_path: res.data.job.drawing_path
      } as JobCard;
      setSelectedJob(updatedJob);
      setEditingDrawingPath(null);
      fetchJobsData();
    } catch (err: any) {
      console.error('Failed to rename mobile drawing:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to rename drawing.');
    } finally {
      setAssigning(false);
    }
  };

  const handleQuickUpdateStatus = async (job: JobCard, targetStatus: JobCard['status'], notesText?: string) => {
    if (!token || !apiUrl) return;

    setStatusUpdating(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.put(`${apiUrl}/api/jobs/${job.id}/status`, {
        status: targetStatus,
        remarks: notesText !== undefined ? notesText : (job.remarks || '')
      }, { headers });

      Alert.alert('Success', res.data.message || 'Job status updated successfully.');
      fetchJobsData();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to transition status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Stats calculators
  const stats = jobs.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, { pending: 0, in_progress: 0, inspection: 0, completed: 0 } as Record<string, number>);

  const getStatusMeta = (status: JobCard['status'], hasChallan = false) => {
    switch (status) {
      case 'pending':
        return { bg: '#fefbeb', text: '#d97706', border: '#fde68a', label: 'Pending Allocation' };
      case 'in_progress':
        return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', label: 'Machining' };
      case 'inspection':
        return { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff', label: 'QC Inspection' };
      case 'completed':
        return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', label: hasChallan ? 'Delivered' : 'Completed' };
      default:
        return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', label: status };
    }
  };

  const STATUSES = ['pending', 'in_progress', 'inspection', 'completed'] as const;

  const handleTabPress = (idx: number) => {
    setActiveTab(idx);
    horizontalScrollRef.current?.scrollTo({ x: idx * width, animated: true });
  };

  const handleMomentumScrollEnd = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / width);
    if (index >= 0 && index < 4 && index !== activeTab) {
      setActiveTab(index);
    }
  };

  const getStatusTabStyle = (status: JobCard['status'], isActive: boolean) => {
    const meta = getStatusMeta(status, false);
    if (isActive) {
      return {
        borderBottomColor: meta.text,
        textColor: meta.text,
        bg: '#ffffff',
        badgeBg: meta.bg,
        badgeText: meta.text
      };
    }
    return {
      borderBottomColor: 'transparent',
      textColor: '#64748b',
      bg: 'transparent',
      badgeBg: '#e2e8f0',
      badgeText: '#475569'
    };
  };

  const selectedWorkerName = tempWorkerId ? workers.find(w => w.id === tempWorkerId)?.name : '';
  const selectedMachineName = tempMachineId ? (() => {
    const m = machines.find(m => m.id === tempMachineId);
    return m ? `${m.machine_code} - ${m.name}` : '';
  })() : '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Job Cards</Text>
          <Text style={styles.headerSubtitle}>Floor Controller Panel</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchJobsData} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <RefreshCw size={18} color="#64748b" />
          )}
        </TouchableOpacity>
      </View>

      {/* Kanban Navigation Tabs */}
      <View style={styles.tabsContainer}>
        {STATUSES.map((status, index) => {
          const isActive = activeTab === index;
          const styleMeta = getStatusTabStyle(status, isActive);
          const count = jobs.filter(j => j.status === status).length;
          
          return (
            <TouchableOpacity
              key={status}
              style={[
                styles.tabButton, 
                isActive && styles.tabButtonActive,
                { borderBottomColor: styleMeta.borderBottomColor }
              ]}
              onPress={() => handleTabPress(index)}
            >
              <Text style={[styles.tabLabel, { color: styleMeta.textColor }]}>
                {status === 'pending' ? 'Pending' :
                 status === 'in_progress' ? 'Machining' :
                 status === 'inspection' ? 'QC Insp.' : 'Comp. / Deliv.'}
              </Text>
              <View style={[styles.tabBadge, { backgroundColor: styleMeta.badgeBg }]}>
                <Text style={[styles.tabBadgeText, { color: styleMeta.badgeText }]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={16} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Job Card #, Customer, or Machine..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      {/* Horizontal ScrollView of Kanban Columns */}
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        style={styles.kanbanScroll}
        contentContainerStyle={{ height: '100%' }}
      >
        {STATUSES.map((status) => {
          const statusJobs = jobs.filter(j => {
            const matchesSearch = 
              j.job_card_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (j.po_item?.purchase_order?.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
              (j.machine?.machine_code || '').toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch && j.status === status;
          });

          return (
            <View key={status} style={{ width: width }}>
              <ScrollView 
                contentContainerStyle={styles.scrollContainer} 
                showsVerticalScrollIndicator={false}
              >
                {loading ? (
                  <View style={styles.centerSpinner}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={styles.spinnerText}>Fetching jobs...</Text>
                  </View>
                ) : statusJobs.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Info size={40} color="#cbd5e1" />
                    <Text style={styles.emptyText}>No {status.replace('_', ' ')} jobs found.</Text>
                  </View>
                ) : (
                  <View style={styles.mobileList}>
                    {statusJobs.map(job => {
                      const statusMeta = getStatusMeta(job.status, !!job.delivery_challan_item);
                      return (
                        <TouchableOpacity
                          key={job.id}
                          style={[
                            styles.jobCard, 
                            { borderLeftColor: statusMeta.text, borderLeftWidth: 4 }
                          ]}
                          onPress={() => handleOpenDetails(job)}
                          activeOpacity={0.8}
                        >
                          {job.status === 'completed' && job.delivery_challan_item && (
                            <View style={{
                              position: 'absolute',
                              top: '35%',
                              left: '50%',
                              transform: [{ translateX: -70 }, { translateY: -20 }, { rotate: '-12deg' }],
                              borderWidth: 2,
                              borderStyle: 'dashed',
                              borderColor: '#16a34a',
                              paddingVertical: 4,
                              paddingHorizontal: 8,
                              borderRadius: 4,
                              backgroundColor: '#ffffff',
                              opacity: 0.85,
                              zIndex: 10,
                              shadowColor: '#16a34a',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.1,
                              shadowRadius: 4,
                              elevation: 3,
                            }}>
                              <Text style={{
                                color: '#16a34a',
                                fontSize: 12,
                                fontWeight: '900',
                                letterSpacing: 1,
                                fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                                textTransform: 'uppercase',
                              }}>
                                DELIVERED
                              </Text>
                            </View>
                          )}
                          {/* Card Header */}
                          <View style={styles.cardHeader}>
                            <View style={styles.cardNumberContainer}>
                              <Text style={styles.cardNumber}>{job.job_card_number}</Text>
                              {job.po_item?.item_code && (
                                <Text style={styles.cardItemCode}>{job.po_item.item_code}</Text>
                              )}
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border }]}>
                              <Text style={[styles.statusBadgeText, { color: statusMeta.text }]}>{statusMeta.label}</Text>
                            </View>
                          </View>

                          {/* Customer and quantity */}
                          <View style={styles.cardSection}>
                            <Text style={styles.customerName}>{job.po_item?.purchase_order?.customer_name || 'Direct Log'}</Text>
                            <Text style={styles.descriptionText} numberOfLines={2}>
                              {job.po_item?.description || 'No item description available'}
                            </Text>
                          </View>

                          <View style={styles.divider} />

                          {/* Operational parameters */}
                          <View style={styles.cardDetailsGrid}>
                            <View style={styles.gridCol}>
                              <Text style={styles.gridLabel}>QUANTITY</Text>
                              <Text style={styles.gridValue}>{job.quantity} {job.po_item?.unit || 'PC'}</Text>
                            </View>
                            <View style={styles.gridCol}>
                              <Text style={styles.gridLabel}>MACHINE</Text>
                              <Text style={[styles.gridValue, !job.machine && styles.unassignedText]}>
                                {job.machine?.machine_code || 'Unallocated'}
                              </Text>
                            </View>
                            <View style={styles.gridCol}>
                              <Text style={styles.gridLabel}>OPERATOR</Text>
                              <Text style={[styles.gridValue, !job.worker && styles.unassignedText]} numberOfLines={1}>
                                {job.worker?.name || 'Unallocated'}
                              </Text>
                            </View>
                          </View>

                          {/* Footer details */}
                          <View style={styles.cardBottomBar}>
                            {job.drawing_path && job.drawing_path.length > 0 ? (
                              <TouchableOpacity 
                                style={styles.drawingBadge} 
                                onPress={() => handleOpenDrawing(job.drawing_path?.[0]?.path)}
                              >
                                <FileText size={10} color="#2563eb" style={{ marginRight: 2 }} />
                                <Text style={styles.drawingBadgeText}>
                                  {job.drawing_path.length} Drawing{job.drawing_path.length > 1 ? 's' : ''}
                                </Text>
                              </TouchableOpacity>
                            ) : (
                              <View />
                            )}
                            <View style={styles.manageLink}>
                              <Text style={styles.manageText}>Details</Text>
                              <ChevronRight size={14} color="#2563eb" />
                            </View>
                          </View>

                          {/* Inline Action Row */}
                          <View style={styles.inlineActionRow}>
                            {job.status === 'pending' && (
                              <TouchableOpacity 
                                style={[styles.inlineActionBtn, { backgroundColor: '#fefbeb', borderColor: '#cbd5e1' }]} 
                                onPress={() => handleOpenDetails(job)}
                              >
                                <User size={13} color="#d97706" style={{ marginRight: 4 }} />
                                <Text style={[styles.inlineActionBtnText, { color: '#d97706' }]}>Assign Operator & Machine</Text>
                              </TouchableOpacity>
                            )}

                            {job.status === 'in_progress' && (
                              <TouchableOpacity 
                                style={[styles.inlineActionBtn, { backgroundColor: '#eff6ff', borderColor: '#2563eb' }]} 
                                onPress={() => handleQuickUpdateStatus(job, 'inspection')}
                                disabled={statusUpdating}
                              >
                                <CheckCircle size={13} color="#2563eb" style={{ marginRight: 4 }} />
                                <Text style={[styles.inlineActionBtnText, { color: '#2563eb' }]}>Submit to QC Inspection</Text>
                              </TouchableOpacity>
                            )}

                            {job.status === 'inspection' && (
                              <View style={styles.inlineQCRow}>
                                <TouchableOpacity 
                                  style={[styles.inlineQCBtn, { backgroundColor: '#f0fdf4', borderColor: '#16a34a' }]} 
                                  onPress={() => handleQuickUpdateStatus(job, 'completed', 'Inspection Passed')}
                                  disabled={statusUpdating}
                                >
                                  <Check size={12} color="#16a34a" style={{ marginRight: 2 }} />
                                  <Text style={[styles.inlineQCBtnText, { color: '#16a34a' }]}>Approve</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                  style={[styles.inlineQCBtn, { backgroundColor: '#fef2f2', borderColor: '#ef4444' }]} 
                                  onPress={() => handleQuickUpdateStatus(job, 'in_progress', 'Failed QC, returned for rework')}
                                  disabled={statusUpdating}
                                >
                                  <X size={12} color="#ef4444" style={{ marginRight: 2 }} />
                                  <Text style={[styles.inlineQCBtnText, { color: '#ef4444' }]}>Reject</Text>
                                </TouchableOpacity>
                              </View>
                            )}

                             {job.status === 'completed' && (
                               <View style={styles.inlineCompletedContainer}>
                                 <Check size={14} color="#16a34a" style={{ marginRight: 4 }} />
                                 <Text style={styles.inlineCompletedText}>
                                   {job.delivery_challan_item ? 'Job Signed Off & Delivered' : 'Job Signed Off & Completed'}
                                 </Text>
                               </View>
                             )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>

      {/* DETAIL MODAL DETAILED VIEW */}
      {selectedJob && (
        <Modal
          visible={true}
          animationType="slide"
          onRequestClose={handleCloseDetails}
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContent}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderInfo}>
                  <Text style={styles.modalTitle}>Job: {selectedJob.job_card_number}</Text>
                  <View style={styles.modalBadgeRow}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusMeta(selectedJob.status, !!selectedJob.delivery_challan_item).bg, borderColor: getStatusMeta(selectedJob.status, !!selectedJob.delivery_challan_item).border }]}>
                      <Text style={[styles.statusBadgeText, { color: getStatusMeta(selectedJob.status, !!selectedJob.delivery_challan_item).text }]}>
                        {getStatusMeta(selectedJob.status, !!selectedJob.delivery_challan_item).label}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={styles.modalCloseButton} onPress={handleCloseDetails}>
                  <X size={20} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollBody} keyboardShouldPersistTaps="handled">
                {/* 1. Job details card */}
                <View style={styles.modalSectionCard}>
                  <Text style={styles.modalCardHeader}>Job Specification</Text>
                  <View style={styles.metaDisplayGrid}>
                    <View style={styles.metaDisplayCol}>
                      <Text style={styles.metaDisplayLabel}>Customer</Text>
                      <Text style={styles.metaDisplayVal}>{selectedJob.po_item?.purchase_order?.customer_name || 'N/A'}</Text>
                    </View>
                    <View style={styles.metaDisplayCol}>
                      <Text style={styles.metaDisplayLabel}>PO Reference</Text>
                      <Text style={styles.metaDisplayVal}>#{selectedJob.po_item?.purchase_order?.po_number || 'N/A'}</Text>
                    </View>
                    <View style={styles.metaDisplayCol}>
                      <Text style={styles.metaDisplayLabel}>Quantity</Text>
                      <Text style={styles.metaDisplayVal}>{selectedJob.quantity} {selectedJob.po_item?.unit || 'PC'}</Text>
                    </View>
                    <View style={styles.metaDisplayCol}>
                      <Text style={styles.metaDisplayLabel}>Part Reference</Text>
                      <Text style={styles.metaDisplayVal}>{selectedJob.po_item?.item_code || 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { marginVertical: 12 }]} />
                  
                  <Text style={styles.metaDisplayLabel}>Item Description</Text>
                  <Text style={styles.modalDescriptionText}>{selectedJob.po_item?.description || 'No description'}</Text>
                </View>

                {/* 2. Drawings display files */}
                <View style={{ gap: 10 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                    Technical Drawings & Blueprints ({selectedJob.drawing_path ? selectedJob.drawing_path.length : 0})
                  </Text>
                  {selectedJob.drawing_path && selectedJob.drawing_path.length > 0 ? (
                    selectedJob.drawing_path.map((item: { path: string; name: string }, idx: number) => {
                      const isEditing = editingDrawingPath === item.path;
                      
                      return (
                        <View key={idx} style={styles.drawingFileRow}>
                          {isEditing ? (
                            <View style={styles.inlineRenameRow}>
                              <TextInput
                                style={styles.inlineRenameInput}
                                value={mobileNewName}
                                onChangeText={setMobileNewName}
                                placeholder="Rename file..."
                                placeholderTextColor="#94a3b8"
                              />
                              <TouchableOpacity 
                                style={[styles.inlineRenameBtn, { backgroundColor: '#10b981' }]}
                                onPress={() => handleRenameMobileDrawing(item.path, mobileNewName)}
                              >
                                <Check size={14} color="#ffffff" />
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={[styles.inlineRenameBtn, { backgroundColor: '#ef4444' }]}
                                onPress={() => setEditingDrawingPath(null)}
                              >
                                <X size={14} color="#ffffff" />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity 
                              style={styles.modalDrawingCardCompact} 
                              onPress={() => handleOpenDrawing(item.path)}
                            >
                              <View style={styles.drawingCardLeftCompact}>
                                <FileText size={18} color="#2563eb" style={{ marginRight: 8 }} />
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.drawingCardTitle} numberOfLines={1}>{item.name}</Text>
                                  <Text style={styles.drawingCardDesc}>Tap to open blueprint drawing</Text>
                                </View>
                              </View>
                              
                              <View style={styles.drawingActionIcons}>
                                <TouchableOpacity 
                                  style={styles.drawingActionIcon} 
                                  onPress={() => {
                                    setEditingDrawingPath(item.path);
                                    setMobileNewName(item.name);
                                  }}
                                >
                                  <Edit3 size={14} color="#64748b" />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                  style={styles.drawingActionIcon} 
                                  onPress={() => handleDeleteMobileDrawing(item.path)}
                                >
                                  <Trash2 size={14} color="#ef4444" />
                                </TouchableOpacity>
                              </View>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })
                  ) : (
                    <Text style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', paddingLeft: 4, marginBottom: 4 }}>
                      No blueprint drawings attached.
                    </Text>
                  )}
                  
                  {/* Upload button for mobile drawing attachment */}
                  <TouchableOpacity 
                    style={styles.modalUploadBtn} 
                    onPress={handlePickDrawing}
                  >
                    <Upload size={14} color="#2563eb" style={{ marginRight: 6 }} />
                    <Text style={styles.modalUploadBtnText}>Upload New Drawing / File</Text>
                  </TouchableOpacity>
                </View>

                {/* 3. Operator/Machine assignment */}
                <View style={styles.modalSectionCard}>
                  <Text style={styles.modalCardHeader}>Operator & Machine Allocation</Text>

                  {/* Worker input */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Assigned Operator</Text>
                    <TouchableOpacity
                      style={styles.customSelectorTrigger}
                      onPress={() => setShowWorkerModal(true)}
                    >
                      <User size={16} color="#64748b" style={{ marginRight: 8 }} />
                      <Text style={[styles.customSelectorText, !tempWorkerId && styles.customSelectorPlaceholder]}>
                        {selectedWorkerName || 'Select Operator...'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Machine input */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Assigned Machine</Text>
                    <TouchableOpacity
                      style={styles.customSelectorTrigger}
                      onPress={() => setShowMachineModal(true)}
                    >
                      <Cpu size={16} color="#64748b" style={{ marginRight: 8 }} />
                      <Text style={[styles.customSelectorText, !tempMachineId && styles.customSelectorPlaceholder]}>
                        {selectedMachineName || 'Select Machine...'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Save assignment */}
                  <TouchableOpacity
                    style={styles.modalSaveAssignBtn}
                    onPress={handleSaveAssignment}
                    disabled={assigning}
                  >
                    {assigning ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Check size={16} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.modalSaveAssignBtnText}>Save Allocations</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* 4. Execution details / transitions */}
                <View style={styles.modalSectionCard}>
                  <Text style={styles.modalCardHeader}>Progress & Execution Controls</Text>
                  
                  {/* Execution Date Stamps */}
                  <View style={styles.dateStampRow}>
                    {selectedJob.start_date && (
                      <Text style={styles.dateStamp}>Start Date: <Text style={{ fontWeight: '600' }}>{selectedJob.start_date}</Text></Text>
                    )}
                    {selectedJob.end_date && (
                      <Text style={styles.dateStamp}>End Date: <Text style={{ fontWeight: '600' }}>{selectedJob.end_date}</Text></Text>
                    )}
                  </View>

                  {/* Trigger buttons */}
                  <View style={styles.actionButtonsContainer}>
                    {selectedJob.status === 'pending' && (
                      <View style={styles.infoBanner}>
                        <Info size={14} color="#64748b" style={{ marginRight: 6 }} />
                        <Text style={styles.infoBannerText}>Please select and save worker/machine allocation above to advance this job to In-Progress.</Text>
                      </View>
                    )}

                    {selectedJob.status === 'in_progress' && (
                      <TouchableOpacity
                        style={[styles.statusTransitionBtn, { backgroundColor: '#7c3aed' }]}
                        onPress={() => handleUpdateStatus('inspection')}
                        disabled={statusUpdating}
                      >
                        {statusUpdating ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <CheckCircle size={16} color="#ffffff" style={{ marginRight: 6 }} />
                            <Text style={styles.statusTransitionBtnText}>Submit to QC Inspection</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {selectedJob.status === 'inspection' && (
                      <View style={styles.qcInspectionBox}>
                        <Text style={styles.qcHeader}>Quality Assurance Checks</Text>
                        <View style={styles.qcBtnsRow}>
                          <TouchableOpacity
                            style={[styles.qcActionBtn, { backgroundColor: '#10b981' }]}
                            onPress={() => handleUpdateStatus('completed', 'Inspection Passed')}
                            disabled={statusUpdating}
                          >
                            {statusUpdating ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <>
                                <Check size={14} color="#ffffff" style={{ marginRight: 4 }} />
                                <Text style={styles.qcActionBtnText}>Approve & Pass</Text>
                              </>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.qcActionBtn, { backgroundColor: '#ef4444' }]}
                            onPress={() => handleUpdateStatus('in_progress', 'Failed QC, returned for rework')}
                            disabled={statusUpdating}
                          >
                            {statusUpdating ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <>
                                <X size={14} color="#ffffff" style={{ marginRight: 4 }} />
                                <Text style={styles.qcActionBtnText}>Reject & Rework</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                     {selectedJob.status === 'completed' && (
                       <View style={styles.completedBanner}>
                         <CheckCircle size={18} color="#10b981" style={{ marginRight: 8 }} />
                         <Text style={styles.completedBannerText}>
                           {selectedJob.delivery_challan_item ? 'This Job Card is signed off and delivered.' : 'This Job Card is signed off and completed.'}
                         </Text>
                       </View>
                     )}
                  </View>

                  {/* Remarks Input */}
                  <View style={[styles.fieldGroup, { marginTop: 16 }]}>
                    <Text style={styles.fieldLabel}>Supervisor Remarks</Text>
                    <TextInput
                      style={styles.remarksInput}
                      placeholder="Calibrations, tooling overrides, tolerances etc..."
                      value={tempRemarks}
                      onChangeText={setTempRemarks}
                      multiline={true}
                      numberOfLines={3}
                      textAlignVertical="top"
                      placeholderTextColor="#94a3b8"
                      onBlur={() => handleUpdateStatus(selectedJob.status, tempRemarks)}
                    />
                    <Text style={styles.fieldLabelHelp}>Focus away from input to save remarks.</Text>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      )}

      {/* CUSTOM SELECTOR MODAL FOR WORKERS */}
      <Modal
        visible={showWorkerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWorkerModal(false)}
      >
        <TouchableOpacity 
          style={styles.selectorOverlay} 
          activeOpacity={1} 
          onPress={() => setShowWorkerModal(false)}
        >
          <View style={styles.selectorContainer}>
            <View style={styles.selectorHeader}>
              <Text style={styles.selectorTitle}>Select Operator</Text>
              <TouchableOpacity onPress={() => setShowWorkerModal(false)}>
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.selectorScrollList}>
              {workers.map(w => (
                <TouchableOpacity
                  key={w.id}
                  style={[styles.selectorItem, tempWorkerId === w.id && styles.selectorItemActive]}
                  onPress={() => {
                    setTempWorkerId(w.id);
                    setShowWorkerModal(false);
                  }}
                >
                  <Text style={[styles.selectorItemText, tempWorkerId === w.id && styles.selectorItemTextActive]}>
                    {w.name}
                  </Text>
                  {tempWorkerId === w.id && <Check size={16} color="#2563eb" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* CUSTOM SELECTOR MODAL FOR MACHINES */}
      <Modal
        visible={showMachineModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMachineModal(false)}
      >
        <TouchableOpacity 
          style={styles.selectorOverlay} 
          activeOpacity={1} 
          onPress={() => setShowMachineModal(false)}
        >
          <View style={styles.selectorContainer}>
            <View style={styles.selectorHeader}>
              <Text style={styles.selectorTitle}>Select Machine</Text>
              <TouchableOpacity onPress={() => setShowMachineModal(false)}>
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.selectorScrollList}>
              {machines.map(m => {
                const isUnavailable = m.status === 'maintenance' || m.status === 'inactive';
                
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.selectorItem, 
                      tempMachineId === m.id && styles.selectorItemActive,
                      isUnavailable && styles.selectorItemDisabled
                    ]}
                    disabled={isUnavailable}
                    onPress={() => {
                      setTempMachineId(m.id);
                      setShowMachineModal(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.selectorItemText, 
                        tempMachineId === m.id && styles.selectorItemTextActive,
                        isUnavailable && styles.selectorItemTextDisabled
                      ]}>
                        {m.machine_code} - {m.name}
                      </Text>
                      <Text style={[styles.selectorItemSubtext, isUnavailable && styles.selectorItemSubtextDisabled]}>
                        Status: {m.status.toUpperCase()}
                      </Text>
                    </View>
                    {tempMachineId === m.id && <Check size={16} color="#2563eb" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* IN-APP DRAWING VIEWER MODAL */}
      <Modal
        visible={viewerFile !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewerFile(null)}
      >
        <View style={styles.viewerOverlay}>
          <View style={styles.viewerContainer}>
            <View style={styles.viewerHeader}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={styles.viewerTitle} numberOfLines={1}>
                  {viewerFile?.name || 'Technical Drawing'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.viewerCloseBtn} 
                onPress={() => setViewerFile(null)}
              >
                <X size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <View style={styles.viewerBody}>
              {viewerFile && (
                Platform.OS === 'web' ? (
                  <iframe
                    src={`${apiUrl}/${viewerFile.path}`}
                    style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
                    title={viewerFile.name}
                  />
                ) : (
                  viewerFile.path.toLowerCase().endsWith('.pdf') ? (
                    <View style={styles.nativePdfContainer}>
                      <FileText size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
                      <Text style={styles.nativePdfText}>PDF Blueprint Document</Text>
                      <TouchableOpacity 
                        style={styles.nativePdfBtn}
                        onPress={() => {
                          if (apiUrl) {
                            WebBrowser.openBrowserAsync(`${apiUrl}/${viewerFile.path}`);
                          }
                        }}
                      >
                        <Text style={styles.nativePdfBtnText}>Open Document</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Image
                      source={{ uri: `${apiUrl}/${viewerFile.path}` }}
                      style={{ width: '100%', height: '100%', borderRadius: 8 }}
                      resizeMode="contain"
                    />
                  )
                )
              )}
            </View>
          </View>
        </View>
      </Modal>

    </View>
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 3,
    gap: 4,
  },
  tabButtonActive: {
    backgroundColor: '#f8fafc',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  kanbanScroll: {
    flex: 1,
  },
  cardNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardItemCode: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  cardBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  manageLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineActionRow: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  inlineActionBtn: {
    height: 36,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  inlineActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inlineQCRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inlineQCBtn: {
    flex: 1,
    height: 34,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  inlineQCBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inlineCompletedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 8,
    borderRadius: 6,
  },
  inlineCompletedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  searchContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
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
    padding: 24,
    paddingBottom: 40,
  },
  centerSpinner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
    paddingVertical: 80,
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
  jobCard: {
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
  jobCardTablet: {
    width: '48.5%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  cardSection: {
    marginBottom: 12,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#cbd5e1',
    marginVertical: 10,
    opacity: 0.5,
  },
  cardDetailsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  gridCol: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '700',
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  unassignedText: {
    color: '#ef4444',
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  footerLeft: {
    flexDirection: 'row',
  },
  drawingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  drawingBadgeText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#2563eb',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manageText: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '700',
    marginRight: 2,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalHeaderInfo: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  modalBadgeRow: {
    flexDirection: 'row',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollBody: {
    padding: 24,
    gap: 16,
    paddingBottom: 60,
  },
  modalSectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  modalCardHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    paddingBottom: 6,
  },
  metaDisplayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaDisplayCol: {
    width: '46%',
  },
  metaDisplayLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metaDisplayVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalDescriptionText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginTop: 4,
  },
  modalDrawingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 14,
  },
  drawingCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  drawingCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  drawingCardDesc: {
    fontSize: 10,
    color: '#2563eb',
    marginTop: 1,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  customSelectorTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  customSelectorText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
  },
  customSelectorPlaceholder: {
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  modalSaveAssignBtn: {
    backgroundColor: '#2563eb',
    height: 40,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  modalSaveAssignBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  dateStampRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  dateStamp: {
    fontSize: 11,
    color: '#64748b',
  },
  actionButtonsContainer: {
    gap: 8,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  infoBannerText: {
    fontSize: 10.5,
    color: '#64748b',
    flex: 1,
    lineHeight: 14,
  },
  statusTransitionBtn: {
    height: 44,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTransitionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  qcInspectionBox: {
    backgroundColor: '#faf5ff',
    borderWidth: 1.5,
    borderColor: '#e9d5ff',
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  qcHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b21a8',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  qcBtnsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  qcActionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qcActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  completedBanner: {
    flexDirection: 'row',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
  },
  remarksInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a',
  },
  fieldLabelHelp: {
    fontSize: 9.5,
    color: '#94a3b8',
    marginTop: 4,
  },

  // Selector Overlays
  selectorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  selectorContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  selectorScrollList: {
    padding: 10,
  },
  selectorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  selectorItemActive: {
    backgroundColor: '#eff6ff',
  },
  selectorItemDisabled: {
    backgroundColor: '#f8fafc',
    opacity: 0.5,
  },
  selectorItemText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  selectorItemTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  selectorItemTextDisabled: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  selectorItemSubtext: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  selectorItemSubtextDisabled: {
    color: '#94a3b8',
  },
  // Drawing viewer & management styles
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 40 : 16,
  },
  viewerContainer: {
    width: '100%',
    height: '90%',
    maxWidth: Platform.OS === 'web' ? 1000 : '100%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  viewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
  },
  viewerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  viewerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerBody: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nativePdfContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  nativePdfText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 20,
  },
  nativePdfBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  nativePdfBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  drawingFileRow: {
    marginBottom: 8,
  },
  inlineRenameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 6,
    gap: 6,
  },
  inlineRenameInput: {
    flex: 1,
    height: 36,
    fontSize: 13,
    color: '#0f172a',
    paddingHorizontal: 10,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  inlineRenameBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDrawingCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    padding: 10,
  },
  drawingCardLeftCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  drawingActionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  drawingActionIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f7ff',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 8,
  },
  modalUploadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
});
