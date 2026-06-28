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
  Platform
} from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useRealTime } from '@/hooks/useRealTime';
import * as Lucide from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';

const ArrowLeft = Lucide.ArrowLeft as any;
const Search = Lucide.Search as any;
const FileText = Lucide.FileText as any;
const RefreshCw = Lucide.RefreshCw as any;
const Check = Lucide.Check as any;
const X = Lucide.X as any;
const AlertTriangle = Lucide.AlertTriangle as any;
const Calendar = Lucide.Calendar as any;
const Info = Lucide.Info as any;
const User = Lucide.User as any;
const Mail = Lucide.Mail as any;
const MapPin = Lucide.MapPin as any;
const ChevronRight = Lucide.ChevronRight as any;
const ExternalLink = Lucide.ExternalLink as any;
const Briefcase = Lucide.Briefcase as any;

const { width } = Dimensions.get('window');
const isTablet = width > 600;

interface PoItem {
  id: number;
  item_code: string | null;
  description: string;
  delivery_date: string | null;
  hsn_sac: string | null;
  uqc: string;
  quantity: number;
  unit: string;
  rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_amount: number;
  received_qty?: number;
  completed_qty?: number;
  delivered_qty?: number;
  jobs_status_breakdown?: {
    pending: number;
    in_progress: number;
    inspection: number;
    completed: number;
  };
}

interface PurchaseOrder {
  id: number;
  po_number: string;
  po_date: string | null;
  customer_name: string;
  customer_address: string | null;
  customer_gstin: string | null;
  customer_email: string | null;
  pdf_path: string | null;
  status: 'draft_review' | 'approved' | 'rejected' | 'marked_review' | 'completed';
  items?: PoItem[];
  items_count?: number;
  total_qty?: number;
  completed_qty?: number;
  delivered_qty?: number;
  jobs_status_breakdown?: {
    pending: number;
    in_progress: number;
    inspection: number;
    completed: number;
  };
}

interface PurchaseOrderRevision {
  id: number;
  purchase_order_id: number;
  po_number: string;
  po_date: string;
  customer_name: string;
  customer_email: string;
  pdf_path: string;
  status: 'pending' | 'applied' | 'ignored';
  has_differences: boolean;
  existing_stats?: {
    status: string;
    created_at: string;
    customer_name: string;
    jobs_count: number;
    delivery_status: string;
    invoice_status: string;
  } | null;
}

export default function PurchaseOrdersScreen() {
  const { token, apiUrl } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [revisions, setRevisions] = useState<PurchaseOrderRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft_review' | 'approved' | 'rejected' | 'marked_review'>('all');
  const [lastFetchTime, setLastFetchTime] = useState<string>('');

  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);

  const refreshSelectedPo = async (id: number) => {
    if (!token || !apiUrl) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${apiUrl}/api/purchase-orders/${id}`, { headers });
      setSelectedPo(response.data);
    } catch (err) {
      console.warn('Failed to refresh selected PO details:', err);
    }
  };

  useRealTime('purchase_orders', (event) => {
    fetchPos();
    fetchSettings();
    if (selectedPo) {
      refreshSelectedPo(selectedPo.id);
    }
  });

  const fetchPos = async () => {
    if (!token || !apiUrl) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${apiUrl}/api/purchase-orders`, { headers });
      setPos(response.data);
    } catch (err: any) {
      console.error('Failed to load purchase orders:', err);
      Alert.alert('Error', 'Failed to retrieve purchase orders.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRevisions = async () => {
    if (!token || !apiUrl) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${apiUrl}/api/purchase-orders/revisions`, { headers });
      setRevisions(response.data);
    } catch (err: any) {
      console.warn('Failed to load PO revisions:', err);
    }
  };

  const fetchSettings = async () => {
    if (!token || !apiUrl) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${apiUrl}/api/settings`, { headers });
      if (response.data && response.data.po_last_fetch_at) {
        setLastFetchTime(response.data.po_last_fetch_at);
      }
    } catch (err) {
      console.warn('Failed to load settings on mobile:', err);
    }
  };

  const handleRefresh = () => {
    fetchPos();
    fetchRevisions();
    fetchSettings();
  };

  useEffect(() => {
    fetchPos();
    fetchRevisions();
    fetchSettings();
  }, [token, apiUrl]);

  const handleOpenReview = async (po: PurchaseOrder) => {
    if (!token || !apiUrl) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${apiUrl}/api/purchase-orders/${po.id}`, { headers });
      setSelectedPo(response.data);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to load purchase order details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseReview = () => {
    setSelectedPo(null);
  };

  const handleUpdateStatus = async (status: PurchaseOrder['status']) => {
    if (!selectedPo || !token || !apiUrl) return;
    
    setActionLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.put(`${apiUrl}/api/purchase-orders/${selectedPo.id}/status`, {
        status
      }, { headers });

      Alert.alert('Success', response.data.message || 'PO status updated successfully.');
      
      // Update local state
      setSelectedPo(prev => prev ? { ...prev, status } : null);
      fetchPos();
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to update PO status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToJobs = async () => {
    if (!selectedPo || !token || !apiUrl) return;

    setActionLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${apiUrl}/api/purchase-orders/${selectedPo.id}/convert-jobs`, {}, { headers });

      Alert.alert('Jobs Generated', response.data.message || 'PO line items converted to Jobs.');
      
      // Since it converted, state updates to 'approved'
      setSelectedPo(prev => prev ? { ...prev, status: 'approved' } : null);
      fetchPos();
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to convert PO items.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePreviewPdf = async () => {
    if (!selectedPo || !selectedPo.pdf_path || !apiUrl) return;
    try {
      const fullUrl = `${apiUrl}/${selectedPo.pdf_path}`;
      await WebBrowser.openBrowserAsync(fullUrl);
    } catch (err) {
      console.error('Failed to open PDF browser:', err);
      Alert.alert('Error', 'Could not preview original PO PDF.');
    }
  };

  // Stats calculation
  const stats = pos.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, { draft_review: 0, approved: 0, rejected: 0, marked_review: 0 } as Record<string, number>);

  const filteredPos = pos.filter(po => {
    const matchesSearch = 
      po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusMeta = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'draft_review':
        return { bg: '#fefbeb', text: '#d97706', border: '#fde68a', label: 'Pending Review' };
      case 'approved':
        return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', label: 'Approved' };
      case 'rejected':
        return { bg: '#fef2f2', text: '#ef4444', border: '#fecaca', label: 'Rejected' };
      case 'marked_review':
        return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', label: 'Marked for Review' };
      case 'completed':
        return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', label: 'Completed' };
      default:
        return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', label: status };
    }
  };

  const getPoTotalValue = (items?: PoItem[]) => {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Purchase Orders</Text>
          <Text style={styles.headerSubtitle}>
            {lastFetchTime ? `Checked: ${lastFetchTime}` : 'Import & Review Panel'}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <RefreshCw size={18} color="#64748b" />
          )}
        </TouchableOpacity>
      </View>

      {/* KPI Stats / Filters */}
      <View style={styles.kpiContainer}>
        <TouchableOpacity 
          style={[styles.kpiCard, statusFilter === 'all' && styles.kpiCardActive, { borderColor: '#cbd5e1' }]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={styles.kpiVal}>{pos.length}</Text>
          <Text style={styles.kpiLabel}>All POs</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.kpiCard, statusFilter === 'draft_review' && styles.kpiCardActive, { borderColor: '#f59e0b' }]}
          onPress={() => setStatusFilter('draft_review')}
        >
          <Text style={[styles.kpiVal, { color: '#f59e0b' }]}>{stats.draft_review}</Text>
          <Text style={styles.kpiLabel}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.kpiCard, statusFilter === 'approved' && styles.kpiCardActive, { borderColor: '#10b981' }]}
          onPress={() => setStatusFilter('approved')}
        >
          <Text style={[styles.kpiVal, { color: '#10b981' }]}>{stats.approved}</Text>
          <Text style={styles.kpiLabel}>Accepted</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.kpiCard, statusFilter === 'marked_review' && styles.kpiCardActive, { borderColor: '#2563eb' }]}
          onPress={() => setStatusFilter('marked_review')}
        >
          <Text style={[styles.kpiVal, { color: '#2563eb' }]}>{stats.marked_review}</Text>
          <Text style={styles.kpiLabel}>For Review</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.kpiCard, statusFilter === 'rejected' && styles.kpiCardActive, { borderColor: '#ef4444' }]}
          onPress={() => setStatusFilter('rejected')}
        >
          <Text style={[styles.kpiVal, { color: '#ef4444' }]}>{stats.rejected}</Text>
          <Text style={styles.kpiLabel}>Rejected</Text>
        </TouchableOpacity>
      </View>

      {/* Revision Warning Banner */}
      {revisions.length > 0 && (
        <TouchableOpacity style={styles.revisionBanner} onPress={() => {
          const rev = revisions[0];
          const stats = rev.existing_stats ?? {};
          Alert.alert('Revision Details', `PO: ${rev.po_number}\nStatus: ${stats.status || 'N/A'}\nCreated: ${stats.created_at || 'N/A'}\nCustomer: ${stats.customer_name || 'N/A'}\nJobs: ${stats.jobs_count ?? '0'}\nDelivery: ${stats.delivery_status || 'N/A'}\nInvoice: ${stats.invoice_status || 'N/A'}`);
        }}>
          <Text style={styles.revisionBannerText}>Pending PO Revisions: {revisions.length}</Text>
          <ChevronRight size={16} color="#64748b" />
        </TouchableOpacity>
      )}

      {/* Search Field */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={16} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by PO Number or Customer Name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      {/* Scroll List */}
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {loading && pos.length === 0 ? (
          <View style={styles.centerSpinner}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.spinnerText}>Loading inbox POs...</Text>
          </View>
        ) : filteredPos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FileText size={40} color="#cbd5e1" />
            <Text style={styles.emptyText}>No Purchase Orders found in this category.</Text>
          </View>
        ) : (
          <View style={isTablet ? styles.tabletGrid : styles.mobileList}>
            {filteredPos.map(po => {
              const statusMeta = getStatusMeta(po.status);
              
              return (
                <TouchableOpacity
                  key={po.id}
                  style={[styles.poCard, isTablet && styles.poCardTablet]}
                  onPress={() => handleOpenReview(po)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.poNumber}>PO: {po.po_number}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border }]}>
                      <Text style={[styles.statusBadgeText, { color: statusMeta.text }]}>{statusMeta.label}</Text>
                    </View>
                  </View>

                  <Text style={styles.customerName}>{po.customer_name}</Text>

                  <View style={styles.cardMetaRow}>
                    <View style={styles.metaCol}>
                      <Calendar size={12} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.metaText}>{po.po_date || 'Pending Date'}</Text>
                    </View>
                    <View style={styles.metaCol}>
                      <FileText size={12} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.metaText}>{po.items_count !== undefined ? po.items_count : 1} Line Items</Text>
                    </View>
                  </View>

                  {(po.status === 'approved' || po.status === 'completed') && po.total_qty !== undefined && po.total_qty > 0 && (
                    <View style={styles.progressContainer}>
                      {/* Work progress */}
                      <View style={styles.progressRow}>
                        <Text style={styles.progressLabel}>Work Progress</Text>
                        <Text style={styles.progressText}>
                          {Math.round(po.completed_qty || 0)} / {po.total_qty} ({Math.round(((po.completed_qty || 0) / po.total_qty) * 100)}%)
                        </Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${Math.min(100, ((po.completed_qty || 0) / po.total_qty) * 100)}%`, backgroundColor: '#10b981' }]} />
                      </View>

                      {/* Delivery progress */}
                      <View style={[styles.progressRow, { marginTop: 4 }]}>
                        <Text style={styles.progressLabel}>Delivery Progress</Text>
                        <Text style={styles.progressText}>
                          {Math.round(po.delivered_qty || 0)} / {po.total_qty} ({Math.round(((po.delivered_qty || 0) / po.total_qty) * 100)}%)
                        </Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${Math.min(100, ((po.delivered_qty || 0) / po.total_qty) * 100)}%`, backgroundColor: '#2563eb' }]} />
                      </View>
                    </View>
                  )}

                  <View style={styles.divider} />

                  <View style={styles.cardFooter}>
                    {po.pdf_path ? (
                      <View style={styles.pdfBadge}>
                        <FileText size={10} color="#ef4444" style={{ marginRight: 3 }} />
                        <Text style={styles.pdfBadgeText}>Original PDF</Text>
                      </View>
                    ) : (
                      <View />
                    )}
                    <View style={styles.manageRow}>
                      <Text style={styles.manageText}>Review</Text>
                      <ChevronRight size={14} color="#2563eb" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* PO DETAIL MODAL FOR REVIEW & ACTION */}
      {selectedPo && (
        <Modal
          visible={true}
          animationType="slide"
          onRequestClose={handleCloseReview}
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
                  <Text style={styles.modalTitle}>Purchase Order Review</Text>
                  <View style={styles.modalBadgeRow}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusMeta(selectedPo.status).bg, borderColor: getStatusMeta(selectedPo.status).border }]}>
                      <Text style={[styles.statusBadgeText, { color: getStatusMeta(selectedPo.status).text }]}>
                        {getStatusMeta(selectedPo.status).label}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={styles.modalCloseButton} onPress={handleCloseReview}>
                  <X size={20} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollBody} keyboardShouldPersistTaps="handled">
                {/* 1. Customer metadata info */}
                <View style={styles.modalSectionCard}>
                  <Text style={styles.modalCardHeader}>Customer & Order details</Text>
                  <View style={styles.customerGrid}>
                    <View style={styles.metaRow}>
                      <User size={14} color="#64748b" style={{ marginRight: 8 }} />
                      <Text style={styles.metaValLabel}>Customer: <Text style={styles.metaVal}>{selectedPo.customer_name}</Text></Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Mail size={14} color="#64748b" style={{ marginRight: 8 }} />
                      <Text style={styles.metaValLabel}>Email: <Text style={styles.metaVal}>{selectedPo.customer_email || 'N/A'}</Text></Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Info size={14} color="#64748b" style={{ marginRight: 8 }} />
                      <Text style={styles.metaValLabel}>GSTIN: <Text style={styles.metaVal}>{selectedPo.customer_gstin || 'N/A'}</Text></Text>
                    </View>
                    <View style={styles.metaRow}>
                      <MapPin size={14} color="#64748b" style={{ marginRight: 8 }} />
                      <Text style={styles.metaValLabel}>Address: <Text style={styles.metaVal}>{selectedPo.customer_address || 'N/A'}</Text></Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Calendar size={14} color="#64748b" style={{ marginRight: 8 }} />
                      <Text style={styles.metaValLabel}>PO Date: <Text style={styles.metaVal}>{selectedPo.po_date || 'N/A'}</Text></Text>
                    </View>
                  </View>
                </View>

                {/* Summary Banner for Approved / Completed PO */}
                {(selectedPo.status === 'approved' || selectedPo.status === 'completed') && (
                  <View style={styles.summaryBanner}>
                    <View style={styles.summaryGrid}>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Ordered</Text>
                        <Text style={styles.summaryVal}>
                          {selectedPo.items?.reduce((sum, i) => sum + Number(i.quantity || 0), 0) || 0}
                        </Text>
                      </View>
                      <View style={[styles.summaryItem, { borderLeftWidth: 1, borderColor: '#e2e8f0' }]}>
                        <Text style={styles.summaryLabel}>Received</Text>
                        <Text style={[styles.summaryVal, { color: '#2563eb' }]}>
                          {selectedPo.items?.reduce((sum, i) => sum + Number(i.received_qty || 0), 0) || 0}
                        </Text>
                      </View>
                      <View style={[styles.summaryItem, { borderLeftWidth: 1, borderColor: '#e2e8f0' }]}>
                        <Text style={styles.summaryLabel}>Completed</Text>
                        <Text style={[styles.summaryVal, { color: '#10b981' }]}>
                          {selectedPo.items?.reduce((sum, i) => sum + Number(i.completed_qty || 0), 0) || 0}
                        </Text>
                      </View>
                      <View style={[styles.summaryItem, { borderLeftWidth: 1, borderColor: '#e2e8f0' }]}>
                        <Text style={styles.summaryLabel}>Shipped</Text>
                        <Text style={[styles.summaryVal, { color: '#f59e0b' }]}>
                          {selectedPo.items?.reduce((sum, i) => sum + Number(i.delivered_qty || 0), 0) || 0}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* 2. PDF Preview Attachment Card */}
                {selectedPo.pdf_path && (
                  <TouchableOpacity style={styles.modalPdfCard} onPress={handlePreviewPdf}>
                    <View style={styles.pdfCardLeft}>
                      <FileText size={24} color="#ef4444" style={{ marginRight: 12 }} />
                      <View>
                        <Text style={styles.pdfCardTitle}>PO PDF Attachment</Text>
                        <Text style={styles.pdfCardDesc}>Tap to preview original PO PDF</Text>
                      </View>
                    </View>
                    <ExternalLink size={16} color="#ef4444" />
                  </TouchableOpacity>
                )}

                {/* 3. Items list */}
                <View style={styles.modalSectionCard}>
                  <Text style={styles.modalCardHeader}>PO Line Items</Text>
                  
                  {selectedPo.items && selectedPo.items.map((item, idx) => (
                    <View key={item.id} style={styles.itemRowContainer}>
                      <View style={styles.itemRowTop}>
                        <Text style={styles.itemCodeText}>{item.item_code || `Item Line #${idx + 1}`}</Text>
                        <Text style={styles.itemAmountText}>₹{item.total_amount}</Text>
                      </View>
                      <Text style={styles.itemDescText}>{item.description}</Text>
                      <View style={styles.itemMetaLine}>
                        <Text style={styles.itemMetaText}>Qty: {item.quantity} {item.unit}  |  Rate: ₹{item.rate}</Text>
                        {(item.cgst > 0 || item.sgst > 0 || item.igst > 0) && (
                          <Text style={styles.itemTaxText}>
                            Tax: {[
                              item.cgst > 0 && `CGST ${item.cgst}%`,
                              item.sgst > 0 && `SGST ${item.sgst}%`,
                              item.igst > 0 && `IGST ${item.igst}%`
                            ].filter(Boolean).join(' + ')}
                          </Text>
                        )}
                      </View>

                      {(selectedPo.status === 'approved' || selectedPo.status === 'completed') && (
                        <View style={styles.itemProgressContainer}>
                          <View style={styles.itemProgressRow}>
                            <Text style={styles.itemProgressLabel}>
                              Work Completed: {Math.round(item.completed_qty || 0)} / {item.quantity} Done
                            </Text>
                            <View style={styles.itemProgressBarBg}>
                              <View style={[styles.itemProgressBarFill, { width: `${Math.min(100, ((item.completed_qty || 0) / item.quantity) * 100)}%`, backgroundColor: '#10b981' }]} />
                            </View>
                          </View>
                          <View style={[styles.itemProgressRow, { marginTop: 4 }]}>
                            <Text style={styles.itemProgressLabel}>
                              Shipped to Customer: {Math.round(item.delivered_qty || 0)} / {item.quantity} Delivered
                            </Text>
                            <View style={styles.itemProgressBarBg}>
                              <View style={[styles.itemProgressBarFill, { width: `${Math.min(100, ((item.delivered_qty || 0) / item.quantity) * 100)}%`, backgroundColor: '#2563eb' }]} />
                            </View>
                          </View>
                        </View>
                      )}

                      {idx < (selectedPo.items?.length || 0) - 1 && <View style={styles.itemDivider} />}
                    </View>
                  ))}

                  <View style={styles.poTotalRow}>
                    <Text style={styles.poTotalLabel}>Calculated PO Total:</Text>
                    <Text style={styles.poTotalVal}>₹{getPoTotalValue(selectedPo.items).toFixed(2)}</Text>
                  </View>
                </View>

                {/* 4. PO Actions controls */}
                <View style={styles.modalSectionCard}>
                  <Text style={styles.modalCardHeader}>Verify & Take Actions</Text>
                  
                  {actionLoading ? (
                    <ActivityIndicator size="large" color="#2563eb" />
                  ) : (
                    <View style={styles.actionsPanelGrid}>
                      <View style={styles.buttonsActionGroup}>
                        {selectedPo.status === 'draft_review' && (
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                            onPress={() => handleUpdateStatus('approved')}
                          >
                            <Check size={16} color="#ffffff" style={{ marginRight: 6 }} />
                            <Text style={styles.actionBtnText}>Accept PO</Text>
                          </TouchableOpacity>
                        )}
                        {selectedPo.status !== 'rejected' && (
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
                            onPress={() => handleUpdateStatus('rejected')}
                          >
                            <X size={16} color="#ffffff" style={{ marginRight: 6 }} />
                            <Text style={styles.actionBtnText}>Reject PO</Text>
                          </TouchableOpacity>
                        )}
                        {selectedPo.status !== 'marked_review' && (
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#2563eb' }]}
                            onPress={() => handleUpdateStatus('marked_review')}
                          >
                            <AlertTriangle size={16} color="#ffffff" style={{ marginRight: 6 }} />
                            <Text style={styles.actionBtnText}>Mark For Review</Text>
                          </TouchableOpacity>
                        )}
                        {selectedPo.status === 'marked_review' && (
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                            onPress={() => handleUpdateStatus('approved')}
                          >
                            <Check size={16} color="#ffffff" style={{ marginRight: 6 }} />
                            <Text style={styles.actionBtnText}>Approve PO</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Convert PO to Job Cards */}
                      {selectedPo.status === 'approved' && (
                        <TouchableOpacity
                          style={styles.convertBtn}
                          onPress={handleConvertToJobs}
                        >
                          <Briefcase size={16} color="#ffffff" style={{ marginRight: 8 }} />
                          <Text style={styles.convertBtnText}>Convert PO Items to Job Cards</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      )}

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
  revisionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fffbeb',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 24,
    marginTop: 8,
    borderRadius: 6,
  },
  revisionBannerText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '600',
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  kpiCardActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1.5,
    borderWidth: 1.5,
  },
  kpiVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  kpiLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
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
  poCard: {
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
  poCardTablet: {
    width: '48.5%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  poNumber: {
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
  customerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  cardMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  metaCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    color: '#64748b',
  },
  divider: {
    height: 1,
    backgroundColor: '#cbd5e1',
    marginVertical: 10,
    opacity: 0.5,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pdfBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pdfBadgeText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#ef4444',
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manageText: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '700',
    marginRight: 2,
  },

  // Modal styling
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
  customerGrid: {
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaValLabel: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  metaVal: {
    fontWeight: '600',
    color: '#1e293b',
  },
  modalPdfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 14,
  },
  pdfCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pdfCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991b1b',
  },
  pdfCardDesc: {
    fontSize: 10,
    color: '#ef4444',
    marginTop: 1,
  },
  itemRowContainer: {
    paddingVertical: 8,
  },
  itemRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemCodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  itemAmountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemDescText: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 15,
  },
  itemMetaLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  itemMetaText: {
    fontSize: 10.5,
    color: '#64748b',
  },
  itemTaxText: {
    fontSize: 10,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#cbd5e1',
    marginTop: 12,
    opacity: 0.4,
  },
  poTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#cbd5e1',
  },
  poTotalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  poTotalVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  actionsPanelGrid: {
    gap: 12,
  },
  buttonsActionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    minWidth: 100,
    height: 40,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  convertBtn: {
    backgroundColor: '#2563eb',
    height: 44,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  convertBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  progressContainer: {
    marginTop: 8,
    gap: 6,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '600',
  },
  progressText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
  progressBarBg: {
    height: 6,
    width: '100%',
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  summaryBanner: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 8.5,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  itemProgressContainer: {
    marginTop: 8,
    gap: 4,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemProgressLabel: {
    fontSize: 9.5,
    color: '#475569',
    fontWeight: '600',
  },
  itemProgressBarBg: {
    height: 4,
    width: 60,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  itemProgressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});
