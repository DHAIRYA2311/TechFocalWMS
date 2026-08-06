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
  Platform
} from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useRealTime } from '@/hooks/useRealTime';
import * as Lucide from 'lucide-react-native';
import { offlineGet } from '@/utils/offlineApi';
import * as WebBrowser from 'expo-web-browser';
import TechFocalLoader from '@/components/tech-focal-loader';
import { Calendar } from 'react-native-calendars';

const ArrowLeft = Lucide.ArrowLeft as any;
const Search = Lucide.Search as any;
const Receipt = Lucide.Receipt as any;
const CalendarIcon = Lucide.Calendar as any;
const User = Lucide.User as any;
const RefreshCw = Lucide.RefreshCw as any;
const X = Lucide.X as any;
const DownloadCloud = Lucide.DownloadCloud as any;
const FileText = Lucide.FileText as any;

interface InvoiceItem {
  id: number;
  quantity: number;
  rate: number;
  cgst_rate: number | string | null;
  sgst_rate: number | string | null;
  igst_rate: number | string | null;
  cgst_amount: number | string | null;
  sgst_amount: number | string | null;
  igst_amount: number | string | null;
  total_amount: number | string;
  po_item?: { description: string; unit: string; hsn_sac: string | null };
  job_card?: { job_card_number: string };
}

interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  subtotal: number | string;
  cgst_total: number | string | null;
  sgst_total: number | string | null;
  igst_total: number | string | null;
  grand_total: number | string;
  status: 'draft' | 'unpaid' | 'paid' | 'cancelled';
  purchase_order?: { po_number: string; customer_name: string };
  purchase_orders?: any[];
  delivery_challan?: { challan_number: string };
  items?: InvoiceItem[];
}

export default function InvoicesScreen() {
  const { token, apiUrl } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [paymentAccountDetail, setPaymentAccountDetail] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useRealTime('invoices', () => {
    fetchInvoices();
  });

  const fetchInvoices = async () => {
    if (!token || !apiUrl) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await offlineGet(`${apiUrl}/api/invoices`, { headers });
      setInvoices(response.data);
    } catch (err) {
      console.warn('Failed to load invoices:', err);
      Alert.alert('Error', 'Failed to load invoices from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [token, apiUrl]);

  const loadInvoiceDetails = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    if (!token || !apiUrl) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await offlineGet(`${apiUrl}/api/invoices/${invoice.id}`, { headers });
      setSelectedInvoice(response.data);
    } catch (err) {
      console.warn('Failed to load invoice details:', err);
    }
  };

  const handleDownloadPdf = async (id: number, invNum: string) => {
    if (!apiUrl || !token) return;
    setDownloadingId(id);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await offlineGet(`${apiUrl}/api/invoices/${id}/pdf`, { headers });
      if (response.data?.url) {
        await WebBrowser.openBrowserAsync(response.data.url);
      }
    } catch (err) {
      console.warn('PDF error:', err);
      Alert.alert('Error', 'Failed to generate PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRecordPayment = async () => {
    if (!token || !apiUrl || !selectedInvoice) return;
    setRecordingPayment(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const today = new Date().toISOString().split('T')[0];
      const payload = {
        payment_method: paymentMethod,
        transaction_reference: paymentRef,
        payment_remarks: [paymentAccountDetail, paymentRemarks].filter(Boolean).join(' | '),
        payment_date: paymentDate
      };
      const response = await axios.post(`${apiUrl}/api/invoices/${selectedInvoice.id}/record-payment`, payload, { headers });
      
      Alert.alert('Success', 'Payment recorded successfully!');
      setPaymentModalVisible(false);
      setSelectedInvoice(response.data.invoice);
      fetchInvoices();
    } catch (err: any) {
      console.warn('Payment failed:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setRecordingPayment(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const q = searchQuery.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.purchase_order?.customer_name || '').toLowerCase().includes(q) ||
      (inv.purchase_order?.po_number && inv.purchase_order.po_number.toLowerCase().includes(q))
    );
  });

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(Number(amount));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return { bg: '#d1fae5', text: '#059669' };
      case 'finalized': return { bg: '#dbeafe', text: '#2563eb' };
      case 'cancelled': return { bg: '#fee2e2', text: '#dc2626' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#1e293b" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Commercial Invoices</Text>
            <Text style={styles.headerSubtitle}>{invoices.length} total generated</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchInvoices}>
          {loading ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <RefreshCw size={20} color="#2563eb" />
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={18} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by invoice #, client, or PO..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {loading && invoices.length === 0 ? (
          <View style={styles.centerBox}>
            <TechFocalLoader />
          </View>
        ) : filteredInvoices.length === 0 ? (
          <View style={styles.centerBox}>
            <Receipt size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No invoices found matching "{searchQuery}"</Text>
          </View>
        ) : (
          filteredInvoices.map(inv => {
            const statusStyle = getStatusColor(inv.status);
            return (
              <TouchableOpacity 
                key={inv.id} 
                style={styles.card}
                onPress={() => loadInvoiceDetails(inv)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.invNumber}>{inv.invoice_number}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {inv.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.cardBody}>
                  <View style={styles.clientRow}>
                    <User size={14} color="#64748b" />
                    <Text style={styles.clientName} numberOfLines={1}>
                      {inv.purchase_order?.customer_name || 'Unknown Client'}
                    </Text>
                  </View>
                  <View style={styles.dateRow}>
                    <CalendarIcon size={14} color="#64748b" />
                    <Text style={styles.dateText}>{inv.invoice_date}</Text>
                  </View>
                  
                  <View style={styles.refsContainer}>
                    {inv.purchase_orders && inv.purchase_orders.length > 0 ? (
                      <Text style={styles.refBadge}>POs: {inv.purchase_orders.map((po: any) => po.po_number).join(', ')}</Text>
                    ) : inv.purchase_order?.po_number ? (
                      <Text style={styles.refBadge}>PO: {inv.purchase_order.po_number}</Text>
                    ) : null}
                    {inv.delivery_challan?.challan_number && (
                      <Text style={styles.refBadge}>DC: {inv.delivery_challan.challan_number}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.totalLabel}>Grand Total</Text>
                    <Text style={styles.totalAmount}>{formatCurrency(inv.grand_total)}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.downloadIconBtn}
                    onPress={() => handleDownloadPdf(inv.id, inv.invoice_number)}
                    disabled={downloadingId === inv.id}
                  >
                    {downloadingId === inv.id ? (
                      <ActivityIndicator size="small" color="#10b981" />
                    ) : (
                      <DownloadCloud size={20} color="#10b981" />
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Invoice Details Modal */}
      <Modal visible={!!selectedInvoice} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { marginTop: insets.top + 20 }]}>
            {selectedInvoice && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>{selectedInvoice.invoice_number}</Text>
                    <Text style={styles.modalSubtitle}>{selectedInvoice.purchase_order?.customer_name || 'Unknown Client'}</Text>
                  </View>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedInvoice(null)}>
                    <X size={24} color="#64748b" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView contentContainerStyle={styles.modalScroll}>
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Details</Text>
                    <View style={styles.infoGrid}>
                      <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Date</Text>
                        <Text style={styles.infoVal}>{selectedInvoice.invoice_date}</Text>
                      </View>
                      <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Status</Text>
                        <Text style={[styles.infoVal, { color: getStatusColor(selectedInvoice.status).text, fontWeight: '700' }]}>
                          {selectedInvoice.status.toUpperCase()}
                        </Text>
                      </View>
                      {selectedInvoice.purchase_orders && selectedInvoice.purchase_orders.length > 0 ? (
                        <View style={styles.infoCol}>
                          <Text style={styles.infoLabel}>Purchase Order(s)</Text>
                          <Text style={styles.infoVal}>
                            {selectedInvoice.purchase_orders.map((po: any) => po.po_number).join(', ')}
                          </Text>
                        </View>
                      ) : selectedInvoice.purchase_order?.po_number ? (
                        <View style={styles.infoCol}>
                          <Text style={styles.infoLabel}>Purchase Order</Text>
                          <Text style={styles.infoVal}>{selectedInvoice.purchase_order.po_number}</Text>
                        </View>
                      ) : null}
                      {selectedInvoice.delivery_challan?.challan_number && (
                        <View style={styles.infoCol}>
                          <Text style={styles.infoLabel}>Delivery Challan</Text>
                          <Text style={styles.infoVal}>{selectedInvoice.delivery_challan.challan_number}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Line Items</Text>
                    {selectedInvoice.items ? selectedInvoice.items.map(item => {
                      const taxPercent = parseFloat(item.cgst_rate as string || '0') + parseFloat(item.sgst_rate as string || '0') + parseFloat(item.igst_rate as string || '0');
                      const taxAmt = parseFloat(item.cgst_amount as string || '0') + parseFloat(item.sgst_amount as string || '0') + parseFloat(item.igst_amount as string || '0');
                      
                      return (
                        <View key={item.id} style={styles.itemRow}>
                          <View style={styles.itemMeta}>
                            <Text style={styles.itemName}>{item.po_item?.description || 'Item Description'}</Text>
                            <Text style={styles.itemSub}>{parseFloat(item.quantity as any).toFixed(2)} {item.po_item?.unit || 'NOS'} @ {formatCurrency(item.rate)}</Text>
                            <Text style={styles.itemTax}>Tax: {taxPercent}% ({formatCurrency(taxAmt)})</Text>
                          </View>
                          <Text style={styles.itemTotal}>{formatCurrency(item.total_amount)}</Text>
                        </View>
                      );
                    }) : (
                      <ActivityIndicator size="small" color="#64748b" style={{ padding: 20 }} />
                    )}
                  </View>

                  <View style={styles.summaryBox}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Subtotal</Text>
                      <Text style={styles.summaryVal}>{formatCurrency(selectedInvoice.subtotal)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Total Tax</Text>
                      <Text style={styles.summaryVal}>{formatCurrency(parseFloat(selectedInvoice.cgst_total as string || '0') + parseFloat(selectedInvoice.sgst_total as string || '0') + parseFloat(selectedInvoice.igst_total as string || '0'))}</Text>
                    </View>
                    <View style={[styles.summaryRow, styles.grandTotalRow]}>
                      <Text style={styles.grandTotalLabel}>Grand Total</Text>
                      <Text style={styles.grandTotalVal}>{formatCurrency(selectedInvoice.grand_total)}</Text>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  {selectedInvoice.status === 'unpaid' && (
                    <TouchableOpacity 
                      style={[styles.downloadFullBtn, { backgroundColor: '#3b82f6', marginBottom: 12 }]}
                      onPress={() => setPaymentModalVisible(true)}
                    >
                      <Lucide.CheckCircle size={20} color="#ffffff" />
                      <Text style={styles.downloadFullBtnText}>Record Payment</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={styles.downloadFullBtn}
                    onPress={() => handleDownloadPdf(selectedInvoice.id, selectedInvoice.invoice_number)}
                    disabled={downloadingId === selectedInvoice.id}
                  >
                    {downloadingId === selectedInvoice.id ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <FileText size={20} color="#ffffff" />
                        <Text style={styles.downloadFullBtnText}>Download PDF</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={paymentModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { marginTop: '20%', maxHeight: 600, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginHorizontal: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setPaymentModalVisible(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 24 }}>
              <Text style={styles.infoLabel}>Payment Date</Text>
              <TouchableOpacity 
                style={[styles.searchBox, { height: 44, marginBottom: 16, marginTop: 4, justifyContent: 'center' }]} 
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: '#1e293b' }}>{paymentDate}</Text>
              </TouchableOpacity>
              
              {showDatePicker && (
                <Modal transparent animationType="fade" visible={showDatePicker}>
                  <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20, zIndex: 9999 }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 10, overflow: 'hidden' }}>
                      <Calendar
                        current={paymentDate}
                        onDayPress={(day: any) => {
                          setPaymentDate(day.dateString);
                          setShowDatePicker(false);
                        }}
                        theme={{
                          todayTextColor: '#3b82f6',
                          arrowColor: '#3b82f6'
                        }}
                      />
                      <TouchableOpacity 
                        style={{ padding: 15, alignItems: 'center', borderTopWidth: 1, borderColor: '#e2e8f0' }} 
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={{ color: '#ef4444', fontWeight: '600' }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              )}

              <Text style={styles.infoLabel}>Payment Method</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, marginTop: 4, flexGrow: 0, height: 44 }}>
                {['cash', 'bank_transfer', 'upi', 'cheque', 'card'].map(method => (
                  <TouchableOpacity
                    key={method}
                    style={{
                      paddingHorizontal: 16,
                      height: 40,
                      justifyContent: 'center',
                      borderRadius: 8,
                      backgroundColor: paymentMethod === method ? '#3b82f6' : '#f1f5f9',
                      marginRight: 8
                    }}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text style={{ color: paymentMethod === method ? '#fff' : '#64748b', fontWeight: '500', textTransform: 'capitalize' }}>
                      {method.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.infoLabel}>Transaction Reference</Text>
              <TextInput 
                style={[styles.searchBox, { height: 44, marginBottom: 16, marginTop: 4 }]} 
                placeholder={paymentMethod === 'upi' ? 'UPI Ref ID' : paymentMethod === 'cheque' ? 'Cheque No.' : 'UTR / Ref No.'}
                value={paymentRef} 
                onChangeText={setPaymentRef}
              />
              
              {(paymentMethod === 'bank_transfer' || paymentMethod === 'upi' || paymentMethod === 'cheque') && (
                <>
                  <Text style={styles.infoLabel}>
                    {paymentMethod === 'upi' ? 'UPI ID / VPA' : paymentMethod === 'cheque' ? 'Bank & Branch' : 'Bank Account / IFSC'}
                  </Text>
                  <TextInput 
                    style={[styles.searchBox, { height: 44, marginBottom: 16, marginTop: 4 }]} 
                    placeholder={paymentMethod === 'upi' ? 'e.g. name@okaxis' : paymentMethod === 'cheque' ? 'e.g. SBI, Andheri Branch' : 'e.g. SBI SBIN0001234'}
                    value={paymentAccountDetail} 
                    onChangeText={setPaymentAccountDetail}
                  />
                </>
              )}

              <Text style={styles.infoLabel}>Remarks</Text>
              <TextInput 
                style={[styles.searchBox, { height: 44, marginBottom: 16, marginTop: 4 }]} 
                placeholder="Optional"
                value={paymentRemarks} 
                onChangeText={setPaymentRemarks}
              />
              <TouchableOpacity 
                style={[styles.downloadFullBtn, { marginTop: 8 }]} 
                onPress={handleRecordPayment}
                disabled={recordingPayment}
              >
                {recordingPayment ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.downloadFullBtnText}>Submit Payment</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center'
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  headerSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  refreshBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center'
  },
  searchContainer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    borderRadius: 12, paddingHorizontal: 16, height: 48,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 15, color: '#1e293b' },
  listContainer: { padding: 20, paddingBottom: 40 },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
  emptyText: { marginTop: 16, fontSize: 15, color: '#64748b', textAlign: 'center' },
  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  invNumber: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardBody: { marginBottom: 16 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  clientName: { fontSize: 14, color: '#334155', fontWeight: '500', flex: 1 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  dateText: { fontSize: 13, color: '#64748b' },
  refsContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  refBadge: { fontSize: 11, color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  totalLabel: { fontSize: 11, color: '#64748b', marginBottom: 2 },
  totalAmount: { fontSize: 18, fontWeight: '700', color: '#10b981' },
  downloadIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)' },
  modalContent: { flex: 1, backgroundColor: '#f8fafc', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  modalSubtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  modalScroll: { padding: 24, paddingBottom: 40 },
  modalSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#ffffff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 16 },
  infoCol: { minWidth: '40%' },
  infoLabel: { fontSize: 11, color: '#64748b', marginBottom: 4 },
  infoVal: { fontSize: 14, color: '#334155', fontWeight: '500' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  itemMeta: { flex: 1, paddingRight: 16 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  itemSub: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  itemTax: { fontSize: 11, color: '#94a3b8' },
  itemTotal: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  summaryBox: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 24 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 14, color: '#64748b' },
  summaryVal: { fontSize: 15, fontWeight: '600', color: '#334155' },
  grandTotalRow: { marginTop: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0', marginBottom: 0 },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  grandTotalVal: { fontSize: 20, fontWeight: '800', color: '#10b981' },
  modalFooter: { backgroundColor: '#ffffff', padding: 24, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  downloadFullBtn: { backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 10 },
  downloadFullBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' }
});

