import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Switch,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import * as Lucide from 'lucide-react-native';

const ArrowLeft = Lucide.ArrowLeft as any;
const LogOut = Lucide.LogOut as any;
const Trash2 = Lucide.Trash2 as any;
const Bell = Lucide.Bell as any;
const ShieldAlert = Lucide.ShieldAlert as any;

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { unpairDevice, profile } = useAuth();
  
  const [clearingCache, setClearingCache] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);

  useEffect(() => {
    // Load saved preferences
    SecureStore.getItemAsync('push_enabled').then(val => {
      if (val !== null) setPushEnabled(val === 'true');
    });
    SecureStore.getItemAsync('email_enabled').then(val => {
      if (val !== null) setEmailEnabled(val === 'true');
    });
  }, []);

  const togglePush = async (val: boolean) => {
    setPushEnabled(val);
    await SecureStore.setItemAsync('push_enabled', val ? 'true' : 'false');
  };

  const toggleEmail = async (val: boolean) => {
    setEmailEnabled(val);
    await SecureStore.setItemAsync('email_enabled', val ? 'true' : 'false');
  };

  const handleUnpair = () => {
    Alert.alert(
      'Unpair Device',
      'Are you sure you want to log out and unpair this device? You will need to scan a new QR code to log in again.',
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

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Document Cache',
      'This will delete all temporarily downloaded blueprints and PDFs from this device to free up space. They will be re-downloaded when you open them again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            setClearingCache(true);
            try {
              // Delete cache directory contents
              const cacheDir = FileSystem.cacheDirectory;
              if (cacheDir) {
                const dirContent = await FileSystem.readDirectoryAsync(cacheDir);
                for (const item of dirContent) {
                  await FileSystem.deleteAsync(cacheDir + item, { idempotent: true });
                }
              }
              Alert.alert('Success', 'Document cache has been cleared successfully.');
            } catch (err) {
              console.warn('Failed to clear cache:', err);
              Alert.alert('Error', 'Failed to clear some cached files.');
            } finally {
              setClearingCache(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Info (Read Only) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{profile?.name ? profile.name.substring(0, 1).toUpperCase() : 'U'}</Text>
              </View>
              <View>
                <Text style={styles.profileName}>{profile?.name || 'Authorized User'}</Text>
                <Text style={styles.profileRole}>Role: {profile?.role ? profile.role.toUpperCase() : 'WORKER'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
          <View style={styles.card}>
            <View style={[styles.row, styles.borderBottom]}>
              <View style={styles.rowLeft}>
                <Bell size={20} color="#64748b" style={styles.rowIcon} />
                <Text style={styles.rowText}>Push Notifications</Text>
              </View>
              <Switch 
                value={pushEnabled} 
                onValueChange={togglePush}
                trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
              />
            </View>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <ShieldAlert size={20} color="#64748b" style={styles.rowIcon} />
                <Text style={styles.rowText}>Critical Security Alerts</Text>
              </View>
              <Switch 
                value={true} 
                disabled={true} 
                trackColor={{ false: '#cbd5e1', true: '#94a3b8' }}
              />
            </View>
          </View>
        </View>

        {/* Storage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>STORAGE & DATA</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={handleClearCache} disabled={clearingCache}>
              <View style={styles.rowLeft}>
                {clearingCache ? (
                  <ActivityIndicator size="small" color="#64748b" style={styles.rowIcon} />
                ) : (
                  <Trash2 size={20} color="#64748b" style={styles.rowIcon} />
                )}
                <View>
                  <Text style={styles.rowText}>Clear Document Cache</Text>
                  <Text style={styles.rowSubtext}>Frees up device storage by removing downloaded blueprints.</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, { marginTop: 20 }]}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleUnpair}>
            <LogOut size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Unpair Device (Log Out)</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>TechFocal WMS App v1.0.0</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 16,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  rowSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4338ca',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  profileRole: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
    marginLeft: 8,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 16,
  }
});
