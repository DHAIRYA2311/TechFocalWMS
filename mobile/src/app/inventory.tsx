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
import * as Lucide from 'lucide-react-native';

const ArrowLeft = Lucide.ArrowLeft as any;
const Search = Lucide.Search as any;
const Package = Lucide.Package as any;
const AlertTriangle = Lucide.AlertTriangle as any;
const Plus = Lucide.Plus as any;
const ChevronDown = Lucide.ChevronDown as any;
const X = Lucide.X as any;
const Check = Lucide.Check as any;
const Info = Lucide.Info as any;
const MapPin = Lucide.MapPin as any;

const { width } = Dimensions.get('window');
const isTablet = width > 600;

interface InventoryItem {
  id: string; // SKU
  name: string;
  category: string;
  stock: number;
  unit: string;
  reorder: number;
  location: string;
}

const CATEGORIES: Record<string, { label: string; color: string }> = {
  raw_materials: { label: 'Raw Materials', color: '#2563eb' },
  tools: { label: 'Tools & Tooling', color: '#10b981' },
  consumables: { label: 'Consumables', color: '#f59e0b' },
  hardware: { label: 'Hardware Components', color: '#ec4899' }
};

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'INV-001', name: 'Mild Steel Plate (10mm)', category: 'raw_materials', stock: 45, unit: 'sheets', reorder: 20, location: 'Rack A-2' },
  { id: 'INV-002', name: 'Stainless Steel Round Bar (Ø50mm)', category: 'raw_materials', stock: 12, unit: 'meters', reorder: 15, location: 'Rack B-1' },
  { id: 'INV-003', name: 'CNC Cutting Inserts (APMT 1604)', category: 'tools', stock: 120, unit: 'pcs', reorder: 50, location: 'Cabinet 1' },
  { id: 'INV-004', name: 'Soluble Cutting Oil (Cooldex)', category: 'consumables', stock: 3, unit: 'barrels', reorder: 5, location: 'Storage Bay' },
  { id: 'INV-005', name: 'Aluminum Plate (5mm)', category: 'raw_materials', stock: 30, unit: 'sheets', reorder: 10, location: 'Rack A-4' },
  { id: 'INV-006', name: 'M12 Hex Cap Bolts (Grade 8.8)', category: 'hardware', stock: 850, unit: 'pcs', reorder: 200, location: 'Drawer 3-B' },
  { id: 'INV-007', name: 'TIG Welding Filler Wire (SS308L)', category: 'consumables', stock: 8, unit: 'kg', reorder: 10, location: 'Welding Section' }
];

export default function InventoryScreen() {
  const { token, apiUrl } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Core State
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedAdjustItem, setSelectedAdjustItem] = useState<InventoryItem | null>(null);

  // Form States - Add Item
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('raw_materials');
  const [formStock, setFormStock] = useState('');
  const [formUnit, setFormUnit] = useState('pcs');
  const [formReorder, setFormReorder] = useState('');
  const [formLocation, setFormLocation] = useState('');

  // Form States - Adjust Stock
  const [adjustStockVal, setAdjustStockVal] = useState('');

  const canManage = userRole && ['admin', 'partner', 'manager', 'supervisor'].includes(userRole);

  // Load User Role Profile
  const fetchUserProfile = async () => {
    if (!token || !apiUrl) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${apiUrl}/api/me`, { headers });
      if (res.data?.user) {
        setUserRole(res.data.user.role);
      }
    } catch (err) {
      console.warn('Failed to load user profile in inventory:', err);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Filtered List Memo
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchQuery, selectedCategory]);

  // KPI calculations
  const stats = useMemo(() => {
    const totalSKUs = inventory.length;
    const lowStockSKUs = inventory.filter(item => item.stock <= item.reorder).length;
    return { totalSKUs, lowStockSKUs };
  }, [inventory]);

  const getStockStatus = (item: InventoryItem) => {
    if (item.stock <= item.reorder / 2) {
      return { label: 'CRITICAL STOCK', color: '#ef4444', bgColor: '#fef2f2', borderColor: '#fca5a5' };
    }
    if (item.stock <= item.reorder) {
      return { label: 'LOW STOCK', color: '#f59e0b', bgColor: '#fefbeb', borderColor: '#fde68a' };
    }
    return { label: 'IN STOCK', color: '#10b981', bgColor: '#f0fdf4', borderColor: '#a7f3d0' };
  };

  const handleOpenAddModal = () => {
    if (!canManage) {
      Alert.alert('Access Denied', 'Only admin, partner, manager, or supervisor can add new inventory items.');
      return;
    }
    setFormSku('INV-' + String(inventory.length + 1).padStart(3, '0'));
    setFormName('');
    setFormCategory('raw_materials');
    setFormStock('');
    setFormUnit('pcs');
    setFormReorder('');
    setFormLocation('');
    setShowAddModal(true);
  };

  const handleAddItem = () => {
    if (!formSku.trim() || !formName.trim() || !formStock.trim() || !formReorder.trim() || !formLocation.trim()) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    const stockVal = parseFloat(formStock);
    const reorderVal = parseFloat(formReorder);

    if (isNaN(stockVal) || stockVal < 0) {
      Alert.alert('Validation Error', 'Please enter a valid stock level.');
      return;
    }
    if (isNaN(reorderVal) || reorderVal < 0) {
      Alert.alert('Validation Error', 'Please enter a valid reorder level.');
      return;
    }

    // Check duplicate SKU
    if (inventory.some(item => item.id.toLowerCase() === formSku.trim().toLowerCase())) {
      Alert.alert('Validation Error', `An item with SKU ${formSku.trim()} already exists.`);
      return;
    }

    const newItem: InventoryItem = {
      id: formSku.trim().toUpperCase(),
      name: formName.trim(),
      category: formCategory,
      stock: stockVal,
      unit: formUnit.trim().toLowerCase(),
      reorder: reorderVal,
      location: formLocation.trim()
    };

    setInventory(prev => [newItem, ...prev]);
    setShowAddModal(false);
    Alert.alert('Success', `Part ${newItem.id} registered successfully.`);
  };

  const handleOpenAdjustStock = (item: InventoryItem) => {
    if (!canManage) {
      Alert.alert('Access Denied', 'Only admin, partner, manager, or supervisor can adjust stock levels.');
      return;
    }
    setSelectedAdjustItem(item);
    setAdjustStockVal(String(item.stock));
    setShowAdjustModal(true);
  };

  const handleSaveStockAdjustment = () => {
    if (!selectedAdjustItem) return;

    const newVal = parseFloat(adjustStockVal);
    if (isNaN(newVal) || newVal < 0) {
      Alert.alert('Validation Error', 'Please enter a valid stock quantity.');
      return;
    }

    setInventory(prev => {
      return prev.map(item => {
        if (item.id === selectedAdjustItem.id) {
          return { ...item, stock: newVal };
        }
        return item;
      });
    });

    setShowAdjustModal(false);
    setSelectedAdjustItem(null);
    Alert.alert('Success', 'Stock level updated successfully.');
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
          <Text style={styles.headerTitle}>Inventory Ledger</Text>
          <Text style={styles.headerSubtitle}>Storage Room SKUs</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* KPI metrics */}
      <View style={styles.kpiContainer}>
        <View style={[styles.kpiCard, { borderColor: '#3b82f6' }]}>
          <Text style={[styles.kpiVal, { color: '#3b82f6' }]}>{stats.totalSKUs}</Text>
          <Text style={styles.kpiLabel}>Total SKUs</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: stats.lowStockSKUs > 0 ? '#ef4444' : '#cbd5e1' }]}>
          <Text style={[styles.kpiVal, stats.lowStockSKUs > 0 && { color: '#ef4444' }]}>{stats.lowStockSKUs}</Text>
          <Text style={styles.kpiLabel}>Low Stock SKUs</Text>
        </View>
      </View>

      {/* Create Button Banner */}
      {canManage && (
        <View style={styles.actionBanner}>
          <TouchableOpacity style={styles.addItemBtn} onPress={handleOpenAddModal}>
            <Plus size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.addItemBtnText}>Register New SKU</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={16} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by part description or SKU..."
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
      </View>

      {/* Category Scrolling Pills */}
      <View style={styles.pillsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContainer}>
          <TouchableOpacity 
            style={[styles.pill, selectedCategory === 'all' && styles.pillActive]} 
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={[styles.pillText, selectedCategory === 'all' && styles.pillTextActive]}>All SKUs</Text>
          </TouchableOpacity>
          {Object.keys(CATEGORIES).map(key => (
            <TouchableOpacity
              key={key}
              style={[styles.pill, selectedCategory === key && styles.pillActive]}
              onPress={() => setSelectedCategory(key)}
            >
              <Text style={[styles.pillText, selectedCategory === key && styles.pillTextActive]}>
                {CATEGORIES[key].label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Scrollable list */}
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {filteredInventory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Info size={40} color="#cbd5e1" />
            <Text style={styles.emptyText}>No inventory SKUs found matching search criteria.</Text>
          </View>
        ) : (
          <View style={isTablet ? styles.tabletGrid : styles.mobileList}>
            {filteredInventory.map(item => {
              const status = getStockStatus(item);
              const catLabel = CATEGORIES[item.category]?.label || item.category;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemCard, isTablet && styles.itemCardTablet]}
                  onPress={() => handleOpenAdjustStock(item)}
                  activeOpacity={canManage ? 0.8 : 1}
                >
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemSku}>{item.id}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: status.bgColor, borderColor: status.borderColor }]}>
                      <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>

                  <Text style={styles.itemName}>{item.name}</Text>
                  
                  <View style={styles.metaRow}>
                    <View style={styles.metaBadge}>
                      <Text style={styles.metaBadgeText}>{catLabel}</Text>
                    </View>
                    <View style={styles.locationCol}>
                      <MapPin size={12} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.locationText}>{item.location}</Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.stockRow}>
                    <View>
                      <Text style={styles.stockLabel}>Stock Level</Text>
                      <Text style={[styles.stockValue, { color: status.color }]}>
                        {item.stock} <Text style={styles.stockUnit}>{item.unit}</Text>
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.reorderLabel}>Reorder Point</Text>
                      <Text style={styles.reorderValue}>{item.reorder} {item.unit}</Text>
                    </View>
                  </View>

                  {canManage && (
                    <TouchableOpacity style={styles.adjustTriggerBtn} onPress={() => handleOpenAdjustStock(item)}>
                      <Text style={styles.adjustTriggerText}>Adjust stock count</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* QUICK STOCK ADJUSTER DIALOG */}
      {showAdjustModal && selectedAdjustItem && (
        <Modal
          visible={true}
          animationType="fade"
          onRequestClose={() => {
            setShowAdjustModal(false);
            setSelectedAdjustItem(null);
          }}
          transparent={true}
        >
          <View style={styles.dialogOverlay}>
            <View style={styles.dialogContent}>
              <View style={styles.dialogHeader}>
                <Text style={styles.dialogTitle}>Adjust Stock: {selectedAdjustItem.id}</Text>
                <TouchableOpacity 
                  style={styles.dialogCloseBtn} 
                  onPress={() => {
                    setShowAdjustModal(false);
                    setSelectedAdjustItem(null);
                  }}
                >
                  <X size={18} color="#475569" />
                </TouchableOpacity>
              </View>

              <View style={styles.dialogBody}>
                <Text style={styles.dialogItemName}>{selectedAdjustItem.name}</Text>
                
                <Text style={styles.dialogLabel}>Current Stock Quantity</Text>
                <View style={styles.quantityEditorRow}>
                  <TouchableOpacity 
                    style={styles.adjustMathBtn}
                    onPress={() => {
                      const curr = parseFloat(adjustStockVal) || 0;
                      setAdjustStockVal(String(Math.max(0, curr - 1)));
                    }}
                  >
                    <Text style={styles.adjustMathText}>-</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.adjustInput}
                    value={adjustStockVal}
                    onChangeText={setAdjustStockVal}
                    keyboardType="numeric"
                    textAlign="center"
                  />
                  <TouchableOpacity 
                    style={styles.adjustMathBtn}
                    onPress={() => {
                      const curr = parseFloat(adjustStockVal) || 0;
                      setAdjustStockVal(String(curr + 1));
                    }}
                  >
                    <Text style={styles.adjustMathText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.dialogUnitLabel}>Unit: {selectedAdjustItem.unit}</Text>

                <TouchableOpacity style={styles.dialogSaveBtn} onPress={handleSaveStockAdjustment}>
                  <Check size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.dialogSaveBtnText}>Confirm Count</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* REGISTER NEW SKU MODAL */}
      {showAddModal && (
        <Modal
          visible={true}
          animationType="slide"
          onRequestClose={() => setShowAddModal(false)}
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: '85%' }]}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderInfo}>
                  <Text style={styles.modalTitle}>Register New SKU</Text>
                  <Text style={styles.modalSubtitle}>Create new part record in mock inventory</Text>
                </View>
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowAddModal(false)}>
                  <X size={20} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollBody} keyboardShouldPersistTaps="handled">
                <View style={styles.modalSectionCard}>
                  <Text style={styles.fieldLabel}>Part SKU ID (Auto-Generated) *</Text>
                  <TextInput
                    style={styles.inputField}
                    value={formSku}
                    onChangeText={setFormSku}
                    placeholderTextColor="#94a3b8"
                  />

                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Part Description / Name *</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. Copper Plate (2mm)"
                    value={formName}
                    onChangeText={setFormName}
                    placeholderTextColor="#94a3b8"
                  />

                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Stock Category *</Text>
                  <View style={styles.categoryGrid}>
                    {Object.keys(CATEGORIES).map(key => (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.categorySelectBtn,
                          formCategory === key && { borderColor: CATEGORIES[key].color, backgroundColor: CATEGORIES[key].color + '10' }
                        ]}
                        onPress={() => setFormCategory(key)}
                      >
                        <View style={[styles.colorDot, { backgroundColor: CATEGORIES[key].color }]} />
                        <Text style={[
                          styles.categorySelectText,
                          formCategory === key && { color: CATEGORIES[key].color, fontWeight: '700' }
                        ]}>
                          {CATEGORIES[key].label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>Initial Stock *</Text>
                      <TextInput
                        style={styles.inputField}
                        placeholder="e.g. 50"
                        value={formStock}
                        onChangeText={setFormStock}
                        keyboardType="numeric"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>Unit (UOM) *</Text>
                      <TextInput
                        style={styles.inputField}
                        placeholder="e.g. sheets, pcs"
                        value={formUnit}
                        onChangeText={setFormUnit}
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>

                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Reorder Threshold *</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. 15"
                    value={formReorder}
                    onChangeText={setFormReorder}
                    keyboardType="numeric"
                    placeholderTextColor="#94a3b8"
                  />

                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Storage Location / Rack *</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. Rack A-3"
                    value={formLocation}
                    onChangeText={setFormLocation}
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <TouchableOpacity style={styles.formSubmitBtn} onPress={handleAddItem}>
                  <Check size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.formSubmitBtnText}>Create Inventory Record</Text>
                </TouchableOpacity>
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
    borderRadius: 10,
    paddingVertical: 14,
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
  actionBanner: {
    paddingHorizontal: 24,
    marginTop: 8,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb', // blue button for inventory
    borderRadius: 10,
    height: 40,
  },
  addItemBtnText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
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
  pillsWrapper: {
    paddingHorizontal: 24,
    marginBottom: 12,
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
    paddingBottom: 40,
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
  itemCard: {
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
    borderLeftColor: '#cbd5e1',
  },
  itemCardTablet: {
    width: '48.5%',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemSku: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 8,
    fontWeight: '700',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metaBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metaBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  locationCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#cbd5e1',
    opacity: 0.3,
    marginVertical: 4,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  stockLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 2,
  },
  stockValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  stockUnit: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  reorderLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 2,
  },
  reorderValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  adjustTriggerBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginTop: 4,
  },
  adjustTriggerText: {
    fontSize: 11,
    color: '#475569',
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
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

  // Dialog styles
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  dialogTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  dialogCloseBtn: {
    padding: 4,
  },
  dialogBody: {
    padding: 20,
    alignItems: 'center',
  },
  dialogItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
  },
  dialogLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  quantityEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  adjustMathBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustMathText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
  },
  adjustInput: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    width: 100,
    height: 44,
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  dialogUnitLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 20,
  },
  dialogSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    height: 42,
    width: '100%',
  },
  dialogSaveBtnText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
  }
});
