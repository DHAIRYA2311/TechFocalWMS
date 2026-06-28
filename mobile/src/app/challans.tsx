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
import * as ImagePicker from 'expo-image-picker';

const ArrowLeft = Lucide.ArrowLeft as any;
const Search = Lucide.Search as any;
const ClipboardList = Lucide.ClipboardList as any;
const FileText = Lucide.FileText as any;
const Calendar = Lucide.Calendar as any;
const User = Lucide.User as any;
const Info = Lucide.Info as any;
const RefreshCw = Lucide.RefreshCw as any;
const X = Lucide.X as any;
const Check = Lucide.Check as any;
const ChevronRight = Lucide.ChevronRight as any;
const Mail = Lucide.Mail as any;
const MapPin = Lucide.MapPin as any;
const Plus = Lucide.Plus as any;
const ChevronDown = Lucide.ChevronDown as any;
const Camera = Lucide.Camera as any;
const Image = Lucide.Image as any;
const Trash2 = Lucide.Trash2 as any;

const { width } = Dimensions.get('window');
const isTablet = width > 600;

interface PoItem {
  id: number;
  item_code: string | null;
  description: string;
  unit: string;
}

interface PurchaseOrder {
  id: number;
  po_number: string;
  customer_name: string;
  customer_address?: string | null;
  customer_gstin?: string | null;
  customer_email?: string | null;
  po_date?: string | null;
}

interface IncomingChallanItem {
  id: number;
  po_item_id: number;
  quantity_received: number;
  po_item?: PoItem;
}

interface IncomingChallan {
  id: number;
  challan_number: string;
  challan_date: string;
  purchase_order_id: number;
  pdf_path: string | null;
  remarks: string | null;
  items_count?: number;
  purchase_order?: PurchaseOrder;
  items?: IncomingChallanItem[];
}

interface DeliveryChallanItem {
  id: number;
  quantity_delivered: number;
  po_item?: PoItem;
}

interface DeliveryChallan {
  id: number;
  challan_number: string;
  challan_date: string;
  purchase_order_id: number;
  remarks: string | null;
  items_count?: number;
  purchase_order?: PurchaseOrder;
  items?: DeliveryChallanItem[];
}

export default function ChallansScreen() {
  const { token, apiUrl } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Core Data States
  const [incomingChallans, setIncomingChallans] = useState<IncomingChallan[]>([]);
  const [deliveryChallans, setDeliveryChallans] = useState<DeliveryChallan[]>([]);

  // Active Tab: 'incoming' | 'delivery'
  const [activeTab, setActiveTab] = useState<'incoming' | 'delivery'>('incoming');

  // Loaders
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Selected details modal states
  const [selectedIncoming, setSelectedIncoming] = useState<IncomingChallan | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryChallan | null>(null);

  // Form Modal States
  const [showAddIncomingModal, setShowAddIncomingModal] = useState(false);
  const [approvedPOs, setApprovedPOs] = useState<PurchaseOrder[]>([]);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [showPoSelectorModal, setShowPoSelectorModal] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState<number | null>(null);
  const [selectedPoDetails, setSelectedPoDetails] = useState<any | null>(null);
  const [loadingPoDetails, setLoadingPoDetails] = useState(false);

  // Form Field States
  const [formChallanNumber, setFormChallanNumber] = useState('');
  const [formChallanDate, setFormChallanDate] = useState(new Date().toISOString().split('T')[0]);
  const [formRemarks, setFormRemarks] = useState('');
  const [formItemsQty, setFormItemsQty] = useState<Record<number, string>>({});
  const [userRole, setUserRole] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Photo proof states
  const [attachedImageUri, setAttachedImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formPdfPath, setFormPdfPath] = useState<string | null>(null);

  const canManage = userRole && ['admin', 'partner', 'manager', 'supervisor'].includes(userRole);

  // Fetch all challans
  const fetchData = async () => {
    if (!token || !apiUrl) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [incomingRes, deliveryRes, meRes] = await Promise.all([
        axios.get(`${apiUrl}/api/incoming-challans`, { headers }),
        axios.get(`${apiUrl}/api/delivery-challans`, { headers }),
        axios.get(`${apiUrl}/api/me`, { headers }).catch(() => null)
      ]);

      setIncomingChallans(incomingRes.data);
      setDeliveryChallans(deliveryRes.data);
      if (meRes?.data?.user) {
        setUserRole(meRes.data.user.role);
      }
    } catch (err: any) {
      console.error('Failed to fetch challans:', err);
      Alert.alert('Error', 'Failed to retrieve delivery/incoming challans from shop floor.');
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedPOs = async () => {
    if (!token || !apiUrl) return;
    setLoadingPOs(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${apiUrl}/api/purchase-orders?status=approved`, { headers });
      setApprovedPOs(response.data || []);
    } catch (err) {
      console.error('Failed to fetch approved POs:', err);
      Alert.alert('Error', 'Failed to load approved purchase orders list.');
    } finally {
      setLoadingPOs(false);
    }
  };

  const handleOpenAddModal = () => {
    if (!canManage) {
      Alert.alert('Access Denied', 'Only admin, partner, manager, or supervisor can log material receipts.');
      return;
    }
    setFormChallanNumber('');
    setFormChallanDate(new Date().toISOString().split('T')[0]);
    setFormRemarks('');
    setFormItemsQty({});
    setSelectedPoId(null);
    setSelectedPoDetails(null);
    setApprovedPOs([]);
    setAttachedImageUri(null);
    setFormPdfPath(null);
    setShowAddIncomingModal(true);
    fetchApprovedPOs();
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permissions are required to take photo proof.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      uploadImage(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery permissions are required to select photo proof.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    if (!token || !apiUrl) return;
    setUploadingImage(true);
    setAttachedImageUri(uri);
    
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type: type,
      } as any);

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      };

      const response = await axios.post(`${apiUrl}/api/incoming-challans/parse`, formData, { headers });
      
      if (response.data && response.data.pdf_path) {
        setFormPdfPath(response.data.pdf_path);
        Alert.alert('Uploaded', 'Photo proof successfully uploaded and linked.');
      }
    } catch (err: any) {
      console.error('Photo upload failed:', err);
      Alert.alert('Error', 'Failed to upload photo proof to workshop server.');
      setAttachedImageUri(null);
      setFormPdfPath(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const removePhoto = () => {
    setAttachedImageUri(null);
    setFormPdfPath(null);
  };

  const handleSelectPo = async (poId: number) => {
    setSelectedPoId(poId);
    setShowPoSelectorModal(false);
    if (!token || !apiUrl) return;
    setLoadingPoDetails(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${apiUrl}/api/purchase-orders/${poId}`, { headers });
      const poDetails = response.data;
      setSelectedPoDetails(poDetails);
      
      const initialQtys: Record<number, string> = {};
      poDetails.items?.forEach((item: any) => {
        const remaining = Math.max(0, parseFloat(item.quantity) - parseFloat(item.received_qty || 0));
        initialQtys[item.id] = remaining > 0 ? remaining.toString() : '';
      });
      setFormItemsQty(initialQtys);
    } catch (err) {
      console.error('Failed to fetch PO details:', err);
      Alert.alert('Error', 'Failed to load purchase order details.');
      setSelectedPoId(null);
    } finally {
      setLoadingPoDetails(false);
    }
  };

  const handleSaveIncomingChallan = async () => {
    if (!token || !apiUrl) return;

    if (!selectedPoId) {
      Alert.alert('Validation Error', 'Please select a Purchase Order.');
      return;
    }
    if (!formChallanNumber.trim()) {
      Alert.alert('Validation Error', 'Please specify the Challan / Receipt Number.');
      return;
    }
    if (!formChallanDate.trim()) {
      Alert.alert('Validation Error', 'Please specify the Receipt Date.');
      return;
    }

    const itemsPayload: any[] = [];
    let validationError = '';

    if (!selectedPoDetails || !selectedPoDetails.items) {
      Alert.alert('Validation Error', 'Purchase order details are not fully loaded.');
      return;
    }

    for (const item of selectedPoDetails.items) {
      const enteredStr = formItemsQty[item.id] || '';
      if (enteredStr.trim() !== '') {
        const enteredQty = parseFloat(enteredStr);
        if (isNaN(enteredQty) || enteredQty <= 0) {
          validationError = `Invalid quantity entered for item ${item.item_code || item.description}. It must be greater than zero.`;
          break;
        }

        const remaining = parseFloat(item.quantity) - parseFloat(item.received_qty || 0);
        if (enteredQty > remaining) {
          validationError = `Quantity for ${item.item_code || item.description} exceeds remaining allowed (${remaining} ${item.unit || 'PC'}).`;
          break;
        }

        itemsPayload.push({
          po_item_id: item.id,
          quantity_received: enteredQty
        });
      }
    }

    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    if (itemsPayload.length === 0) {
      Alert.alert('Validation Error', 'Please log a quantity (> 0) for at least one item.');
      return;
    }

    setSubmitting(true);
    try {
      const headers = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json' 
      };

      const payload = {
        challan_number: formChallanNumber,
        challan_date: formChallanDate,
        purchase_order_id: selectedPoId,
        pdf_path: formPdfPath,
        remarks: formRemarks || null,
        items: itemsPayload
      };

      await axios.post(`${apiUrl}/api/incoming-challans`, payload, { headers });
      Alert.alert('Success', 'Incoming Challan logged successfully. Job cards created.');
      setShowAddIncomingModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Failed to save incoming challan:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit material receipt.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refreshIncomingDetails = async (id: number) => {
    if (!token || !apiUrl) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${apiUrl}/api/incoming-challans/${id}`, { headers });
      setSelectedIncoming(response.data);
    } catch (err) {
      console.warn('Failed to refresh incoming details:', err);
    }
  };

  const refreshDeliveryDetails = async (id: number) => {
    if (!token || !apiUrl) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${apiUrl}/api/delivery-challans/${id}`, { headers });
      setSelectedDelivery(response.data);
    } catch (err) {
      console.warn('Failed to refresh delivery details:', err);
    }
  };

  // Real-Time Websocket Integration
  useRealTime('challans', (event) => {
    fetchData();
    if (selectedIncoming) {
      refreshIncomingDetails(selectedIncoming.id);
    }
    if (selectedDelivery) {
      refreshDeliveryDetails(selectedDelivery.id);
    }
  });

  // Open Details Modal handlers
  const handleOpenIncoming = async (challan: IncomingChallan) => {
    setSelectedIncoming(challan);
    if (!token || !apiUrl) return;
    setLoadingDetails(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${apiUrl}/api/incoming-challans/${challan.id}`, { headers });
      setSelectedIncoming(res.data);
    } catch (err) {
      console.error('Failed to load incoming details:', err);
      Alert.alert('Error', 'Failed to retrieve detailed item checklist.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenDelivery = async (challan: DeliveryChallan) => {
    setSelectedDelivery(challan);
    if (!token || !apiUrl) return;
    setLoadingDetails(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${apiUrl}/api/delivery-challans/${challan.id}`, { headers });
      setSelectedDelivery(res.data);
    } catch (err) {
      console.error('Failed to load delivery details:', err);
      Alert.alert('Error', 'Failed to retrieve detailed item checklist.');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Memoized Search Filter lists
  const filteredIncoming = useMemo(() => {
    return incomingChallans.filter(ch => {
      const query = searchQuery.toLowerCase();
      return (
        ch.challan_number.toLowerCase().includes(query) ||
        (ch.purchase_order?.customer_name || '').toLowerCase().includes(query) ||
        (ch.purchase_order?.po_number || '').toLowerCase().includes(query)
      );
    });
  }, [incomingChallans, searchQuery]);

  const filteredDelivery = useMemo(() => {
    return deliveryChallans.filter(ch => {
      const query = searchQuery.toLowerCase();
      return (
        ch.challan_number.toLowerCase().includes(query) ||
        (ch.purchase_order?.customer_name || '').toLowerCase().includes(query) ||
        (ch.purchase_order?.po_number || '').toLowerCase().includes(query)
      );
    });
  }, [deliveryChallans, searchQuery]);

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
          <Text style={styles.headerTitle}>Challans Log</Text>
          <Text style={styles.headerSubtitle}>Incoming & Delivery Notes</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchData} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <RefreshCw size={18} color="#64748b" />
          )}
        </TouchableOpacity>
      </View>

      {/* Tab select bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'incoming' && styles.tabItemActive]}
          onPress={() => {
            setActiveTab('incoming');
            setSearchQuery('');
          }}
        >
          <ClipboardList size={16} color={activeTab === 'incoming' ? '#2563eb' : '#64748b'} style={{ marginRight: 8 }} />
          <Text style={[styles.tabText, activeTab === 'incoming' && styles.tabTextActive]}>Incoming Receipts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'delivery' && styles.tabItemActive]}
          onPress={() => {
            setActiveTab('delivery');
            setSearchQuery('');
          }}
        >
          <FileText size={16} color={activeTab === 'delivery' ? '#2563eb' : '#64748b'} style={{ marginRight: 8 }} />
          <Text style={[styles.tabText, activeTab === 'delivery' && styles.tabTextActive]}>Delivery Dispatches</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Stats summary */}
      <View style={styles.kpiContainer}>
        <View style={[styles.kpiCard, { borderColor: '#8b5cf6' }]}>
          <Text style={[styles.kpiVal, { color: '#8b5cf6' }]}>
            {activeTab === 'incoming' ? filteredIncoming.length : filteredDelivery.length}
          </Text>
          <Text style={styles.kpiLabel}>Showing List</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: '#cbd5e1' }]}>
          <Text style={styles.kpiVal}>{incomingChallans.length}</Text>
          <Text style={styles.kpiLabel}>Total Incoming</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: '#cbd5e1' }]}>
          <Text style={styles.kpiVal}>{deliveryChallans.length}</Text>
          <Text style={styles.kpiLabel}>Total Outgoing</Text>
        </View>
      </View>

      {/* Create Button Banner */}
      {activeTab === 'incoming' && canManage && (
        <View style={styles.actionBanner}>
          <TouchableOpacity style={styles.addChallanBtn} onPress={handleOpenAddModal}>
            <Plus size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.addChallanBtnText}>Log Material Receipt</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={16} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'incoming' ? "Search by Receipt No, PO, Customer..." : "Search by Delivery Note #, PO, Customer..."}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      {/* Scrollable list */}
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {loading && (activeTab === 'incoming' ? incomingChallans.length === 0 : deliveryChallans.length === 0) ? (
          <View style={styles.centerSpinner}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.spinnerText}>Fetching company challan records...</Text>
          </View>
        ) : activeTab === 'incoming' ? (
          filteredIncoming.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Info size={40} color="#cbd5e1" />
              <Text style={styles.emptyText}>No material receipt logs found matching search criteria.</Text>
            </View>
          ) : (
            <View style={isTablet ? styles.tabletGrid : styles.mobileList}>
              {filteredIncoming.map(ch => (
                <TouchableOpacity
                  key={ch.id}
                  style={[styles.challanCard, isTablet && styles.challanCardTablet]}
                  onPress={() => handleOpenIncoming(ch)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.challanNo}>{ch.challan_number}</Text>
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>INCOMING</Text>
                    </View>
                  </View>

                  <Text style={styles.customerName}>{ch.purchase_order?.customer_name || 'N/A'}</Text>
                  
                  <View style={styles.cardMetaRow}>
                    <View style={styles.metaCol}>
                      <Calendar size={12} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.metaText}>{ch.challan_date}</Text>
                    </View>
                    <View style={styles.metaCol}>
                      <FileText size={12} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.metaText}>PO Ref: #{ch.purchase_order?.po_number || 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { marginVertical: 8 }]} />

                  <View style={styles.cardFooter}>
                    <Text style={styles.itemsCountText}>{ch.items_count} line items received</Text>
                    <View style={styles.manageRow}>
                      <Text style={styles.manageText}>View items</Text>
                      <ChevronRight size={14} color="#8b5cf6" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )
        ) : (
          filteredDelivery.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Info size={40} color="#cbd5e1" />
              <Text style={styles.emptyText}>No delivery dispatch notes found matching search criteria.</Text>
            </View>
          ) : (
            <View style={isTablet ? styles.tabletGrid : styles.mobileList}>
              {filteredDelivery.map(ch => (
                <TouchableOpacity
                  key={ch.id}
                  style={[styles.challanCard, isTablet && styles.challanCardTablet, styles.deliveryCardBorder]}
                  onPress={() => handleOpenDelivery(ch)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.challanNo}>{ch.challan_number}</Text>
                    <View style={[styles.badgeContainer, styles.deliveryBadge]}>
                      <Text style={[styles.badgeText, styles.deliveryBadgeText]}>DELIVERY</Text>
                    </View>
                  </View>

                  <Text style={styles.customerName}>{ch.purchase_order?.customer_name || 'N/A'}</Text>
                  
                  <View style={styles.cardMetaRow}>
                    <View style={styles.metaCol}>
                      <Calendar size={12} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.metaText}>{ch.challan_date}</Text>
                    </View>
                    <View style={styles.metaCol}>
                      <FileText size={12} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.metaText}>PO Ref: #{ch.purchase_order?.po_number || 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { marginVertical: 8 }]} />

                  <View style={styles.cardFooter}>
                    <Text style={styles.itemsCountText}>{ch.items_count} line items delivered</Text>
                    <View style={styles.manageRow}>
                      <Text style={styles.manageText}>View invoice specs</Text>
                      <ChevronRight size={14} color="#2563eb" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )
        )}
      </ScrollView>

      {/* DETAILED VIEW MODAL FOR INCOMING RECIEPT */}
      {selectedIncoming && (
        <Modal
          visible={true}
          animationType="slide"
          onRequestClose={() => setSelectedIncoming(null)}
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderInfo}>
                  <Text style={styles.modalTitle}>Receipt: {selectedIncoming.challan_number}</Text>
                  <Text style={styles.modalSubtitle}>Material Logged on {selectedIncoming.challan_date}</Text>
                </View>
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSelectedIncoming(null)}>
                  <X size={20} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollBody}>
                {/* Information profile */}
                <View style={styles.modalSectionCard}>
                  <Text style={styles.modalCardHeader}>Material Context</Text>
                  <View style={styles.metaDisplayGrid}>
                    <View style={styles.metaDisplayCol}>
                      <Text style={styles.metaDisplayLabel}>Customer</Text>
                      <Text style={styles.metaDisplayVal}>{selectedIncoming.purchase_order?.customer_name || 'N/A'}</Text>
                    </View>
                    <View style={styles.metaDisplayCol}>
                      <Text style={styles.metaDisplayLabel}>Purchase Order</Text>
                      <Text style={styles.metaDisplayVal}>PO #{selectedIncoming.purchase_order?.po_number || 'N/A'}</Text>
                    </View>
                    <View style={styles.metaDisplayCol}>
                      <Text style={styles.metaDisplayLabel}>Challan Number</Text>
                      <Text style={styles.metaDisplayVal}>{selectedIncoming.challan_number}</Text>
                    </View>
                    <View style={styles.metaDisplayCol}>
                      <Text style={styles.metaDisplayLabel}>Receipt Date</Text>
                      <Text style={styles.metaDisplayVal}>{selectedIncoming.challan_date}</Text>
                    </View>
                  </View>

                  {selectedIncoming.remarks && (
                    <>
                      <View style={[styles.divider, { marginVertical: 12 }]} />
                      <Text style={styles.metaDisplayLabel}>Remarks / Warehouse notes</Text>
                      <Text style={styles.modalDescriptionText}>{selectedIncoming.remarks}</Text>
                    </>
                  )}
                </View>

                {/* Items received checklist table */}
                <View style={styles.modalSectionCard}>
                  <Text style={styles.modalCardHeader}>Arrived Batch Components</Text>
                  
                  {loadingDetails ? (
                    <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 20 }} />
                  ) : !selectedIncoming.items || selectedIncoming.items.length === 0 ? (
                    <View style={styles.emptySubContainer}>
                      <Info size={24} color="#cbd5e1" style={{ marginBottom: 6 }} />
                      <Text style={styles.emptySubText}>No items checklist logged in this receipt.</Text>
                    </View>
                  ) : (
                    selectedIncoming.items.map((item, idx) => (
                      <View key={item.id} style={styles.checklistRow}>
                        <View style={styles.checklistRowHeader}>
                          <Text style={styles.serialNumber}>{idx + 1}. </Text>
                          <Text style={styles.itemCodeText}>{item.po_item?.item_code || `Item Line #${idx + 1}`}</Text>
                          <View style={styles.quantityBadge}>
                            <Text style={styles.quantityBadgeText}>
                              Qty: {item.quantity_received} {item.po_item?.unit || 'PC'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.itemDescText}>{item.po_item?.description || 'No description'}</Text>
                        {idx < (selectedIncoming.items?.length || 0) - 1 && <View style={[styles.divider, { marginTop: 12 }]} />}
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* DETAILED VIEW MODAL FOR DELIVERY CHALLAN */}
      {selectedDelivery && (
        <Modal
          visible={true}
          animationType="slide"
          onRequestClose={() => setSelectedDelivery(null)}
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderInfo}>
                  <Text style={styles.modalTitle}>Receipt: {selectedDelivery.challan_number}</Text>
                  <Text style={styles.modalSubtitle}>Generated Note on {selectedDelivery.challan_date}</Text>
                </View>
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSelectedDelivery(null)}>
                  <X size={20} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollBody}>
                {/* Information Profile */}
                <View style={styles.modalSectionCard}>
                  <Text style={styles.modalCardHeader}>Customer & Order references</Text>
                  <View style={styles.metaDisplayGrid}>
                    <View style={styles.metaDisplayCol}>
                      <Text style={styles.metaDisplayLabel}>Customer Ship-To</Text>
                      <Text style={styles.metaDisplayVal}>{selectedDelivery.purchase_order?.customer_name || 'N/A'}</Text>
                    </View>
                    <View style={styles.metaDisplayCol}>
                      <Text style={styles.metaDisplayLabel}>PO Number</Text>
                      <Text style={styles.metaDisplayVal}>#{selectedDelivery.purchase_order?.po_number || 'N/A'}</Text>
                    </View>
                    <View style={styles.metaDisplayCol}>
                      <Text style={styles.metaDisplayLabel}>Challan Number</Text>
                      <Text style={styles.metaDisplayVal}>{selectedDelivery.challan_number}</Text>
                    </View>
                    <View style={styles.metaDisplayCol}>
                      <Text style={styles.metaDisplayLabel}>Dispatch Date</Text>
                      <Text style={styles.metaDisplayVal}>{selectedDelivery.challan_date}</Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { marginVertical: 12 }]} />

                  {/* Consignee Billing GST details */}
                  <View style={styles.buyerDetailsRow}>
                    <User size={13} color="#64748b" style={{ marginRight: 6 }} />
                    <Text style={styles.buyerLabel}>GSTIN Ref: <Text style={styles.buyerVal}>{selectedDelivery.purchase_order?.customer_gstin || 'N/A'}</Text></Text>
                  </View>
                  {selectedDelivery.purchase_order?.customer_address && (
                    <View style={[styles.buyerDetailsRow, { marginTop: 4 }]}>
                      <MapPin size={13} color="#64748b" style={{ marginRight: 6 }} />
                      <Text style={styles.buyerLabel} numberOfLines={2}>Address: <Text style={styles.buyerVal}>{selectedDelivery.purchase_order.customer_address}</Text></Text>
                    </View>
                  )}
                  {selectedDelivery.remarks && (
                    <>
                      <View style={[styles.divider, { marginVertical: 12 }]} />
                      <Text style={styles.metaDisplayLabel}>Dispatch / Transport notes</Text>
                      <Text style={styles.modalDescriptionText}>{selectedDelivery.remarks}</Text>
                    </>
                  )}
                </View>

                {/* Items delivered table */}
                <View style={styles.modalSectionCard}>
                  <Text style={styles.modalCardHeader}>Items Shipped checklist</Text>
                  
                  {loadingDetails ? (
                    <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 20 }} />
                  ) : !selectedDelivery.items || selectedDelivery.items.length === 0 ? (
                    <View style={styles.emptySubContainer}>
                      <Info size={24} color="#cbd5e1" style={{ marginBottom: 6 }} />
                      <Text style={styles.emptySubText}>No items checklist logged in this delivery.</Text>
                    </View>
                  ) : (
                    selectedDelivery.items.map((item, idx) => (
                      <View key={item.id} style={styles.checklistRow}>
                        <View style={styles.checklistRowHeader}>
                          <Text style={styles.serialNumber}>{idx + 1}. </Text>
                          <Text style={styles.itemCodeText}>{item.po_item?.item_code || `Item Line #${idx + 1}`}</Text>
                          <View style={[styles.quantityBadge, styles.deliveryQtyBadge]}>
                            <Text style={[styles.quantityBadgeText, styles.deliveryQtyBadgeText]}>
                              Qty: {item.quantity_delivered} {item.po_item?.unit || 'PC'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.itemDescText}>{item.po_item?.description || 'No description'}</Text>
                        {idx < (selectedDelivery.items?.length || 0) - 1 && <View style={[styles.divider, { marginTop: 12 }]} />}
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* ADD INCOMING CHALLAN MODAL */}
      <Modal
        visible={showAddIncomingModal}
        animationType="slide"
        onRequestClose={() => setShowAddIncomingModal(false)}
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderInfo}>
                <Text style={styles.modalTitle}>Log Material Receipt</Text>
                <Text style={styles.modalSubtitle}>Register incoming PO items & generate shop Job Cards</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowAddIncomingModal(false)}>
                <X size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollBody} keyboardShouldPersistTaps="handled">
              <View style={styles.modalSectionCard}>
                <Text style={styles.modalCardHeader}>1. Reference Purchase Order</Text>
                <TouchableOpacity 
                  style={styles.selectTrigger} 
                  onPress={() => setShowPoSelectorModal(true)}
                >
                  <Text style={[styles.selectTriggerText, !selectedPoId && { color: '#94a3b8' }]}>
                    {selectedPoId 
                      ? (selectedPoDetails ? `PO #${selectedPoDetails.po_number} - ${selectedPoDetails.customer_name}` : `PO selected (ID: ${selectedPoId})`)
                      : "Tap to Select Purchase Order..."
                    }
                  </Text>
                  <ChevronDown size={18} color="#64748b" />
                </TouchableOpacity>

                {loadingPoDetails && (
                  <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#8b5cf6" />
                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Loading PO items & receipts history...</Text>
                  </View>
                )}

                {selectedPoDetails && (
                  <View style={styles.poSummaryCard}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Customer:</Text>
                      <Text style={styles.summaryVal}>{selectedPoDetails.customer_name}</Text>
                    </View>
                    {selectedPoDetails.customer_gstin && (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>GSTIN:</Text>
                        <Text style={styles.summaryVal}>{selectedPoDetails.customer_gstin}</Text>
                      </View>
                    )}
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>PO Date:</Text>
                      <Text style={styles.summaryVal}>{selectedPoDetails.po_date || 'N/A'}</Text>
                    </View>
                  </View>
                )}
              </View>

              {selectedPoDetails && (
                <>
                  <View style={styles.modalSectionCard}>
                    <Text style={styles.modalCardHeader}>2. Challan metadata</Text>
                    
                    <Text style={styles.fieldLabel}>Challan / Receipt Number *</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="e.g. CHALLAN-9844"
                      value={formChallanNumber}
                      onChangeText={setFormChallanNumber}
                      placeholderTextColor="#94a3b8"
                    />

                    <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Receipt Date *</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="YYYY-MM-DD"
                      value={formChallanDate}
                      onChangeText={setFormChallanDate}
                      placeholderTextColor="#94a3b8"
                    />

                    <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Remarks / Warehouse Notes</Text>
                    <TextInput
                      style={styles.remarksInput}
                      placeholder="e.g. Received in good condition, loaded into bin A"
                      value={formRemarks}
                      onChangeText={setFormRemarks}
                      placeholderTextColor="#94a3b8"
                      multiline={true}
                      numberOfLines={2}
                    />
                  </View>

                  <View style={styles.modalSectionCard}>
                    <Text style={styles.modalCardHeader}>3. Challan Photo Proof (Optional)</Text>
                    
                    {uploadingImage ? (
                      <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#8b5cf6" />
                        <Text style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Uploading photo proof to server...</Text>
                      </View>
                    ) : attachedImageUri ? (
                      <View style={styles.photoPreviewCard}>
                        <Text style={styles.photoAttachedLabel}>Photo Attached Successfully</Text>
                        <Text style={styles.photoAttachedFilename} numberOfLines={1}>
                          {attachedImageUri.split('/').pop()}
                        </Text>
                        <TouchableOpacity style={styles.removePhotoBtn} onPress={removePhoto}>
                          <Trash2 size={14} color="#ef4444" style={{ marginRight: 4 }} />
                          <Text style={styles.removePhotoText}>Remove Photo</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.photoButtonsRow}>
                        <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                          <Camera size={16} color="#64748b" style={{ marginRight: 6 }} />
                          <Text style={styles.photoButtonText}>Take Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                          <Image size={16} color="#64748b" style={{ marginRight: 6 }} />
                          <Text style={styles.photoButtonText}>Upload Image</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <View style={styles.modalSectionCard}>
                    <Text style={styles.modalCardHeader}>4. Line Items Checklist</Text>
                    <Text style={styles.sectionHelperText}>Specify the arrived quantities for each item in this batch:</Text>
                    
                    {selectedPoDetails.items?.map((item: any, idx: number) => {
                      const totalOrdered = parseFloat(item.quantity);
                      const received = parseFloat(item.received_qty || 0);
                      const remaining = Math.max(0, totalOrdered - received);
                      const isFullyReceived = remaining <= 0;

                      return (
                        <View key={item.id} style={styles.itemChecklistCard}>
                          <View style={styles.itemChecklistHeader}>
                            <Text style={styles.itemChecklistIndex}>{idx + 1}.</Text>
                            <Text style={styles.itemChecklistItemCode}>{item.item_code || 'No Code'}</Text>
                            {isFullyReceived ? (
                              <View style={styles.fullyReceivedBadge}>
                                <Text style={styles.fullyReceivedBadgeText}>Fully Received</Text>
                              </View>
                            ) : (
                              <Text style={styles.remainingQtyLabel}>
                                {remaining} / {totalOrdered} {item.unit || 'Pcs'} left
                              </Text>
                            )}
                          </View>
                          <Text style={styles.itemChecklistDesc}>{item.description}</Text>

                          {!isFullyReceived && (
                            <View style={styles.qtyInputRow}>
                              <Text style={styles.qtyInputLabel}>Quantity Received:</Text>
                              <TextInput
                                style={styles.qtyInputField}
                                placeholder={`Max ${remaining}`}
                                keyboardType="numeric"
                                value={formItemsQty[item.id] || ''}
                                onChangeText={(val) => {
                                  setFormItemsQty(prev => ({
                                    ...prev,
                                    [item.id]: val
                                  }));
                                }}
                                placeholderTextColor="#94a3b8"
                              />
                              <Text style={styles.qtyInputUnit}>{item.unit || 'Pcs'}</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  <TouchableOpacity 
                    style={[styles.formSubmitBtn, submitting && { opacity: 0.7 }]} 
                    onPress={handleSaveIncomingChallan}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Check size={18} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.formSubmitBtnText}>Register Material Receipt</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PO SELECTOR MODAL (DRAWER STYLE) */}
      <Modal
        visible={showPoSelectorModal}
        animationType="fade"
        onRequestClose={() => setShowPoSelectorModal(false)}
        transparent={true}
      >
        <View style={styles.selectorOverlay}>
          <View style={styles.selectorContent}>
            <View style={styles.selectorHeader}>
              <Text style={styles.selectorTitle}>Select Purchase Order</Text>
              <TouchableOpacity style={styles.selectorClose} onPress={() => setShowPoSelectorModal(false)}>
                <X size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            {loadingPOs ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={{ marginTop: 12, color: '#64748b' }}>Retrieving approved purchase orders...</Text>
              </View>
            ) : approvedPOs.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center', paddingHorizontal: 20 }}>
                <Info size={32} color="#cbd5e1" style={{ marginBottom: 8 }} />
                <Text style={{ color: '#64748b', textAlign: 'center' }}>No approved Purchase Orders found on the system.</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.selectorScroll}>
                {approvedPOs.map((po) => (
                  <TouchableOpacity
                    key={po.id}
                    style={styles.selectorOption}
                    onPress={() => handleSelectPo(po.id)}
                  >
                    <View style={styles.optionHeader}>
                      <Text style={styles.optionPoNumber}>PO #{po.po_number}</Text>
                      <Text style={styles.optionPoDate}>{po.po_date}</Text>
                    </View>
                    <Text style={styles.optionCustomer} numberOfLines={1}>{po.customer_name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#2563eb',
    fontWeight: '700',
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
  challanCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 5,
    borderLeftColor: '#8b5cf6', // purple left border for incoming
  },
  challanCardTablet: {
    width: '48.5%',
  },
  deliveryCardBorder: {
    borderLeftColor: '#2563eb', // blue left border for delivery
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  challanNo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  badgeContainer: {
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#7c3aed',
  },
  deliveryBadge: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  deliveryBadgeText: {
    color: '#2563eb',
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
    opacity: 0.4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  itemsCountText: {
    fontSize: 11,
    color: '#64748b',
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manageText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8b5cf6',
    marginRight: 2,
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
    height: '80%',
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
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
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
    fontSize: 12,
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
  buyerDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyerLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  buyerVal: {
    fontWeight: '600',
    color: '#1e293b',
  },

  // checklist row
  checklistRow: {
    paddingVertical: 10,
  },
  checklistRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  serialNumber: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
  itemCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  quantityBadge: {
    marginLeft: 'auto',
    backgroundColor: '#f3e8ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  quantityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b21a8',
  },
  deliveryQtyBadge: {
    backgroundColor: '#dbeafe',
    borderColor: '#bfdbfe',
  },
  deliveryQtyBadgeText: {
    color: '#1e40af',
  },
  itemDescText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 12,
    lineHeight: 16,
  },
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
  actionBanner: {
    paddingHorizontal: 24,
    marginTop: 8,
  },
  addChallanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6', // purple button for incoming challan
    borderRadius: 10,
    height: 40,
  },
  addChallanBtnText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  selectTriggerText: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
  },
  poSummaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginTop: 8,
    gap: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  summaryVal: {
    fontSize: 11,
    color: '#0f172a',
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  inputField: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: '#0f172a',
  },
  remarksInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
  },
  sectionHelperText: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 12,
  },
  itemChecklistCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  itemChecklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  itemChecklistIndex: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
  itemChecklistItemCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  fullyReceivedBadge: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  fullyReceivedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803d',
  },
  remainingQtyLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  itemChecklistDesc: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 8,
  },
  qtyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    gap: 8,
  },
  qtyInputLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  qtyInputField: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 0,
    height: 38,
    width: 95,
    fontSize: 13,
    color: '#0f172a',
    textAlign: 'center',
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 10,
  },
  photoButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  photoPreviewCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  photoAttachedLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
    textTransform: 'uppercase',
  },
  photoAttachedFilename: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
  },
  removePhotoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
  },
  qtyInputUnit: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  formSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 8,
    height: 46,
    marginTop: 8,
  },
  formSubmitBtnText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },
  selectorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  selectorContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '70%',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  selectorClose: {
    padding: 4,
  },
  selectorScroll: {
    padding: 8,
  },
  selectorOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  optionPoNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  optionPoDate: {
    fontSize: 10,
    color: '#64748b',
  },
  optionCustomer: {
    fontSize: 11,
    color: '#475569',
  }
});
