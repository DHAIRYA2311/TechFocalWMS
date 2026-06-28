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
const DollarSign = Lucide.DollarSign as any;
const Calendar = Lucide.Calendar as any;
const User = Lucide.User as any;
const Info = Lucide.Info as any;
const RefreshCw = Lucide.RefreshCw as any;
const X = Lucide.X as any;
const Check = Lucide.Check as any;
const Trash2 = Lucide.Trash2 as any;
const Plus = Lucide.Plus as any;
const ChevronDown = Lucide.ChevronDown as any;
const ChevronUp = Lucide.ChevronUp as any;
const AlertTriangle = Lucide.AlertTriangle as any;
const FileText = Lucide.FileText as any;

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const CATEGORIES: Record<string, { label: string; color: string }> = {
  raw_materials: { label: 'Raw Materials', color: '#863bff' },
  machinery: { label: 'Machinery & Equipment', color: '#ec4899' },
  consumables: { label: 'Consumables', color: '#f59e0b' },
  tools: { label: 'Tools & Hardware', color: '#10b981' },
  utility: { label: 'Utility Bills', color: '#3b82f6' },
  transport: { label: 'Transport & Courier', color: '#6366f1' },
  refreshments: { label: 'Staff Tea & Refreshments', color: '#14b8a6' },
  office: { label: 'Office Supplies', color: '#64748b' },
  other: { label: 'Other Miscellaneous', color: '#a855f7' }
};

const PAYMENT_MODES: Record<string, string> = {
  cash: 'Cash',
  upi_bank: 'UPI / Bank',
  cheque: 'Cheque',
  card: 'Card'
};

interface Expense {
  id: number;
  expense_date: string;
  category: string;
  amount: number | string;
  payment_mode: 'cash' | 'upi_bank' | 'cheque' | 'card';
  description: string | null;
  reference_number: string | null;
  receipt_path: string | null;
  logged_by: number;
  logged_by_relation?: {
    id: number;
    name: string;
  } | null;
  logged_by_user?: {
    id: number;
    name: string;
  } | null;
}

interface ExpenseStats {
  total_overall: number;
  total_this_month: number;
  category_breakdown: Record<string, number | string>;
  payment_mode_breakdown: Record<string, number | string>;
}

export default function ExpensesScreen() {
  const { token, apiUrl } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Core Data States
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats>({
    total_overall: 0,
    total_this_month: 0,
    category_breakdown: {},
    payment_mode_breakdown: {}
  });
  const [userRole, setUserRole] = useState<string | null>(null);

  // Loaders
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('all');
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Form Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCategory, setFormCategory] = useState('raw_materials');
  const [formAmount, setFormAmount] = useState('');
  const [formPaymentMode, setFormPaymentMode] = useState('cash');
  const [formReferenceNumber, setFormReferenceNumber] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Permission Check
  const canManage = userRole && ['admin', 'partner', 'manager'].includes(userRole);

  const fetchExpenses = async () => {
    if (!token || !apiUrl) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedPaymentMode !== 'all') params.payment_mode = selectedPaymentMode;

      const [expensesRes, meRes] = await Promise.all([
        axios.get(`${apiUrl}/api/expenses`, { headers, params }),
        axios.get(`${apiUrl}/api/me`, { headers }).catch(() => null)
      ]);

      setExpenses(expensesRes.data.expenses || []);
      setStats(expensesRes.data.stats || {
        total_overall: 0,
        total_this_month: 0,
        category_breakdown: {},
        payment_mode_breakdown: {}
      });

      if (meRes?.data?.user) {
        setUserRole(meRes.data.user.role);
      }
    } catch (err: any) {
      console.error('Failed to fetch expenses:', err);
      Alert.alert('Error', 'Failed to retrieve expenses ledger from workshop server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [searchQuery, selectedCategory, selectedPaymentMode]);

  // Real-Time Websocket Integration
  useRealTime('expenses', () => {
    fetchExpenses();
  });

  const handleOpenAddModal = () => {
    if (!canManage) {
      Alert.alert(
        'Access Denied',
        'You do not have permission to log new expenses. Only admins, partners, or managers can log expenses.'
      );
      return;
    }
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormCategory('raw_materials');
    setFormAmount('');
    setFormPaymentMode('cash');
    setFormReferenceNumber('');
    setFormDescription('');
    setShowAddModal(true);
  };

  const handleLogExpense = async () => {
    if (!token || !apiUrl) return;

    if (!formDate.trim()) {
      Alert.alert('Validation Error', 'Please specify a transaction date.');
      return;
    }
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount greater than ₹0.');
      return;
    }

    setSubmitting(true);
    try {
      const headers = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const payload = {
        expense_date: formDate,
        category: formCategory,
        amount: amt,
        payment_mode: formPaymentMode,
        reference_number: formReferenceNumber || null,
        description: formDescription || null,
      };

      await axios.post(`${apiUrl}/api/expenses`, payload, { headers });
      
      Alert.alert('Success', 'Expense logged successfully.');
      setShowAddModal(false);
      fetchExpenses();
    } catch (err: any) {
      console.error('Failed to log expense:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit expense log. Please verify details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = (id: number) => {
    if (!canManage) {
      Alert.alert('Access Denied', 'Only admins, partners, or managers can delete expense logs.');
      return;
    }

    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this expense record? This action will permanently remove it from the ledger.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!token || !apiUrl) return;
            try {
              const headers = { Authorization: `Bearer ${token}` };
              await axios.delete(`${apiUrl}/api/expenses/${id}`, { headers });
              Alert.alert('Success', 'Expense record deleted.');
              fetchExpenses();
            } catch (err: any) {
              console.error('Failed to delete expense:', err);
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete expense record.');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
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
          <Text style={styles.headerTitle}>Expense Ledger</Text>
          <Text style={styles.headerSubtitle}>Workshop Claim Logs</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchExpenses} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <RefreshCw size={18} color="#64748b" />
          )}
        </TouchableOpacity>
      </View>

      {/* Main KPI Stats Block */}
      <View style={styles.kpiContainer}>
        <View style={[styles.kpiCard, { borderColor: '#ef4444' }]}>
          <Text style={[styles.kpiVal, { color: '#ef4444' }]}>
            ₹{stats.total_overall.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.kpiLabel}>Total Expenditure</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: '#f59e0b' }]}>
          <Text style={[styles.kpiVal, { color: '#f59e0b' }]}>
            ₹{stats.total_this_month.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.kpiLabel}>Spent This Month</Text>
        </View>
      </View>

      {/* Expandable Breakdown Accordion */}
      <View style={styles.accordionContainer}>
        <TouchableOpacity 
          style={styles.accordionHeader} 
          onPress={() => setShowBreakdown(!showBreakdown)}
        >
          <Text style={styles.accordionTitle}>Category Breakdown</Text>
          {showBreakdown ? (
            <ChevronUp size={16} color="#475569" />
          ) : (
            <ChevronDown size={16} color="#475569" />
          )}
        </TouchableOpacity>

        {showBreakdown && (
          <View style={styles.accordionContent}>
            {Object.keys(CATEGORIES).map(catKey => {
              const amountRaw = stats.category_breakdown[catKey] || 0;
              const amount = typeof amountRaw === 'string' ? parseFloat(amountRaw) : amountRaw;
              const percentage = stats.total_overall > 0 ? (amount / stats.total_overall) * 100 : 0;
              const catMeta = CATEGORIES[catKey];

              return (
                <View key={catKey} style={styles.breakdownRow}>
                  <View style={styles.breakdownLabelRow}>
                    <Text style={styles.breakdownLabel}>{catMeta.label}</Text>
                    <Text style={styles.breakdownVal}>₹{amount.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { backgroundColor: catMeta.color, width: `${Math.min(100, Math.max(0, percentage))}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.breakdownPercent}>{percentage.toFixed(1)}% of total</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Create Button Banner */}
      {canManage && (
        <View style={styles.actionBanner}>
          <TouchableOpacity style={styles.addExpenseBtn} onPress={handleOpenAddModal}>
            <Plus size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.addExpenseBtnText}>Log New Expense</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search & Filters */}
      <View style={styles.filtersWrapper}>
        <View style={styles.searchBar}>
          <Search size={16} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by description, bill no..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories horizontal list */}
        <Text style={styles.filterTitle}>Category Filter</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll} contentContainerStyle={styles.pillsContainer}>
          <TouchableOpacity 
            style={[styles.pill, selectedCategory === 'all' && styles.pillActive]} 
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={[styles.pillText, selectedCategory === 'all' && styles.pillTextActive]}>All Categories</Text>
          </TouchableOpacity>
          {Object.keys(CATEGORIES).map(key => (
            <TouchableOpacity
              key={key}
              style={[
                styles.pill, 
                selectedCategory === key && [styles.pillActive, { borderColor: CATEGORIES[key].color, backgroundColor: CATEGORIES[key].color + '10' }]
              ]} 
              onPress={() => setSelectedCategory(key)}
            >
              <Text 
                style={[
                  styles.pillText, 
                  selectedCategory === key && { color: CATEGORIES[key].color, fontWeight: '700' }
                ]}
              >
                {CATEGORIES[key].label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Payment Modes horizontal list */}
        <Text style={styles.filterTitle}>Payment Mode Filter</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll} contentContainerStyle={styles.pillsContainer}>
          <TouchableOpacity 
            style={[styles.pill, selectedPaymentMode === 'all' && styles.pillActive]} 
            onPress={() => setSelectedPaymentMode('all')}
          >
            <Text style={[styles.pillText, selectedPaymentMode === 'all' && styles.pillTextActive]}>All Payments</Text>
          </TouchableOpacity>
          {Object.keys(PAYMENT_MODES).map(key => (
            <TouchableOpacity
              key={key}
              style={[styles.pill, selectedPaymentMode === key && styles.pillActive]} 
              onPress={() => setSelectedPaymentMode(key)}
            >
              <Text style={[styles.pillText, selectedPaymentMode === key && styles.pillTextActive]}>
                {PAYMENT_MODES[key]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Expenses List */}
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {loading && expenses.length === 0 ? (
          <View style={styles.centerSpinner}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.spinnerText}>Loading workshop ledger records...</Text>
          </View>
        ) : expenses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Info size={40} color="#cbd5e1" />
            <Text style={styles.emptyText}>No matching expense claims found.</Text>
          </View>
        ) : (
          <View style={isTablet ? styles.tabletGrid : styles.mobileList}>
            {expenses.map(expense => {
              const catMeta = CATEGORIES[expense.category] || { label: expense.category, color: '#64748b' };
              const loggedByName = expense.logged_by_relation?.name || expense.logged_by_user?.name || 'Workshop Staff';
              const amt = typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount;

              return (
                <View 
                  key={expense.id} 
                  style={[
                    styles.expenseCard, 
                    isTablet && styles.expenseCardTablet, 
                    { borderLeftColor: catMeta.color }
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.catBadge, { backgroundColor: catMeta.color + '15' }]}>
                      <Text style={[styles.catBadgeText, { color: catMeta.color }]}>{catMeta.label}</Text>
                    </View>
                    <Text style={styles.cardAmount}>₹{amt.toLocaleString('en-IN')}</Text>
                  </View>

                  {expense.description ? (
                    <Text style={styles.cardDesc}>{expense.description}</Text>
                  ) : (
                    <Text style={styles.cardDescPlaceholder}>No description provided.</Text>
                  )}

                  <View style={styles.cardMeta}>
                    <View style={styles.metaCol}>
                      <Calendar size={12} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.metaText}>{formatDate(expense.expense_date)}</Text>
                    </View>
                    <View style={styles.metaCol}>
                      <DollarSign size={12} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.metaText}>{PAYMENT_MODES[expense.payment_mode] || expense.payment_mode}</Text>
                    </View>
                  </View>

                  {expense.reference_number && (
                    <View style={styles.referenceRow}>
                      <FileText size={11} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.referenceText}>Ref / Bill: {expense.reference_number}</Text>
                    </View>
                  )}

                  <View style={styles.divider} />

                  <View style={styles.cardFooter}>
                    <View style={styles.loggedByRow}>
                      <User size={12} color="#94a3b8" style={{ marginRight: 4 }} />
                      <Text style={styles.loggedByText}>Logged by: {loggedByName}</Text>
                    </View>
                    {canManage && (
                      <TouchableOpacity 
                        style={styles.deleteBtn} 
                        onPress={() => handleDeleteExpense(expense.id)}
                      >
                        <Trash2 size={14} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Log Expense Form Modal */}
      {showAddModal && (
        <Modal
          visible={showAddModal}
          animationType="slide"
          onRequestClose={() => setShowAddModal(false)}
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Log Workshop Claim</Text>
                  <Text style={styles.modalSubtitle}>Supervisor Expense Entry</Text>
                </View>
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowAddModal(false)}>
                  <X size={20} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollBody} keyboardShouldPersistTaps="handled">
                <View style={styles.modalSectionCard}>
                  {/* Amount */}
                  <Text style={styles.fieldLabel}>Amount (₹) <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="Enter amount (e.g. 2500)..."
                    value={formAmount}
                    onChangeText={setFormAmount}
                    keyboardType="numeric"
                    placeholderTextColor="#94a3b8"
                  />

                  {/* Date */}
                  <Text style={styles.fieldLabel}>Expense Date (YYYY-MM-DD) <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="YYYY-MM-DD"
                    value={formDate}
                    onChangeText={setFormDate}
                    placeholderTextColor="#94a3b8"
                  />

                  {/* Category Selector Grid */}
                  <Text style={styles.fieldLabel}>Category <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <View style={styles.categoryGrid}>
                    {Object.keys(CATEGORIES).map(key => {
                      const isSelected = formCategory === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          style={[
                            styles.categorySelectBtn,
                            isSelected && { borderColor: CATEGORIES[key].color, backgroundColor: CATEGORIES[key].color + '10' }
                          ]}
                          onPress={() => setFormCategory(key)}
                        >
                          <View style={[styles.colorDot, { backgroundColor: CATEGORIES[key].color }]} />
                          <Text style={[styles.categorySelectText, isSelected && { color: CATEGORIES[key].color, fontWeight: '700' }]}>
                            {CATEGORIES[key].label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Payment Mode */}
                  <Text style={styles.fieldLabel}>Payment Mode <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <View style={styles.paymentSelectRow}>
                    {Object.keys(PAYMENT_MODES).map(key => {
                      const isSelected = formPaymentMode === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          style={[
                            styles.paymentSelectBtn,
                            isSelected && styles.paymentSelectBtnActive
                          ]}
                          onPress={() => setFormPaymentMode(key)}
                        >
                          <Text style={[styles.paymentSelectText, isSelected && styles.paymentSelectTextActive]}>
                            {PAYMENT_MODES[key]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Reference / Invoice Number */}
                  <Text style={styles.fieldLabel}>Reference / Bill Number (Optional)</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="Enter bill or transaction reference number..."
                    value={formReferenceNumber}
                    onChangeText={setFormReferenceNumber}
                    placeholderTextColor="#94a3b8"
                  />

                  {/* Description */}
                  <Text style={styles.fieldLabel}>Description / Notes (Optional)</Text>
                  <TextInput
                    style={styles.remarksInput}
                    placeholder="Log detail on items, vendors, purpose..."
                    value={formDescription}
                    onChangeText={formDescription => setFormDescription(formDescription)}
                    multiline={true}
                    numberOfLines={3}
                    textAlignVertical="top"
                    placeholderTextColor="#94a3b8"
                  />

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={styles.formSubmitBtn}
                    onPress={handleLogExpense}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Check size={16} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.formSubmitBtnText}>Submit Expense Log</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
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
    gap: 12,
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 3,
    elevation: 1,
  },
  kpiVal: {
    fontSize: 20,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
  },
  accordionContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  accordionContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  breakdownRow: {
    gap: 4,
  },
  breakdownLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  breakdownVal: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  breakdownPercent: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'right',
  },
  actionBanner: {
    paddingHorizontal: 24,
    marginTop: 12,
  },
  addExpenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 10,
    height: 40,
  },
  addExpenseBtnText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
  },
  filtersWrapper: {
    paddingHorizontal: 24,
    marginTop: 16,
    gap: 8,
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
  filterTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginTop: 6,
  },
  pillsScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  pillsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  pillActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  pillText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
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
  expenseCard: {
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
    borderLeftWidth: 5,
  },
  expenseCardTablet: {
    width: '48.5%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  catBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardDesc: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 10,
  },
  cardDescPlaceholder: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 6,
  },
  metaCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  referenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  referenceText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loggedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loggedByText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
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
  },
  modalSectionCard: {
    gap: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categorySelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    gap: 6,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categorySelectText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  paymentSelectRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentSelectBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  paymentSelectBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  paymentSelectText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  paymentSelectTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  remarksInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
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
  }
});
