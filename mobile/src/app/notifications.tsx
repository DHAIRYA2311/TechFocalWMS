import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Bell, AlertCircle, CheckCircle, Info, Settings, ShieldAlert, Package, Calendar } from 'lucide-react-native';
import { offlineGet } from '@/utils/offlineApi';
import { useAuth } from '@/hooks/useAuth';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { token, apiUrl } = useAuth();
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const response = await offlineGet(`${apiUrl}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data.data || response.data);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token, apiUrl]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (id: number) => {
    try {
      await axios.post(`${apiUrl}/api/notifications/${id}/mark-read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications((prev: any) => prev.map((n: any) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post(`${apiUrl}/api/notifications/mark-all-read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications((prev: any) => prev.map((n: any) => ({ ...n, read_at: new Date().toISOString() })));
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const getIcon = (type: string) => {
    if (type.startsWith('attendance')) return <Calendar size={24} color="#3b82f6" />;
    if (type.startsWith('purchase_order')) return <Package size={24} color="#8b5cf6" />;
    if (type.startsWith('workshop_alert') || type === 'machine_breakdown') return <ShieldAlert size={24} color="#ef4444" />;
    if (type.startsWith('machine')) return <Settings size={24} color="#f59e0b" />;
    if (type.startsWith('invoice')) return <CheckCircle size={24} color="#10b981" />;
    return <Info size={24} color="#6b7280" />;
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.notificationCard, !item.read_at && styles.unreadCard]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={styles.iconContainer}>
        {getIcon(item.type)}
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, !item.read_at && styles.unreadText]}>{item.title}</Text>
          <Text style={styles.time}>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</Text>
        </View>
        <Text style={styles.message}>{item.message}</Text>
      </View>
      {!item.read_at && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Notifications',
          headerRight: () => (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )
        }} 
      />

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Bell size={48} color="#4b5563" />
              <Text style={styles.emptyText}>No notifications yet.</Text>
            </View>
          }
          contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0f19' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'flex-start',
  },
  unreadCard: {
    backgroundColor: '#1e293b',
    borderColor: '#3b82f6',
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  unreadText: {
    color: '#fff',
    fontWeight: '700',
  },
  time: {
    color: '#6b7280',
    fontSize: 12,
    marginLeft: 8,
  },
  message: {
    color: '#9ca3af',
    fontSize: 14,
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginLeft: 8,
    marginTop: 6,
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 6,
    marginRight: 8,
  },
  markAllText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    marginTop: 16,
    fontSize: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  }
});

