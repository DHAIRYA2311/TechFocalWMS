import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';

const QUEUE_KEY = 'offline_sync_queue';

export interface SyncRequest {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: any;
  data: any; // JSON or serialized form array
  isFormData?: boolean;
  timestamp: number;
}

export const getQueue = async (): Promise<SyncRequest[]> => {
  try {
    const queueStr = await SecureStore.getItemAsync(QUEUE_KEY);
    return queueStr ? JSON.parse(queueStr) : [];
  } catch (e) {
    console.error('Failed to get sync queue', e);
    return [];
  }
};

export const saveQueue = async (queue: SyncRequest[]) => {
  try {
    await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save sync queue', e);
  }
};

export const addToQueue = async (req: Omit<SyncRequest, 'id' | 'timestamp'>) => {
  const queue = await getQueue();
  const newReq: SyncRequest = {
    ...req,
    id: Date.now().toString() + Math.random().toString(36).substring(7),
    timestamp: Date.now(),
  };
  queue.push(newReq);
  await saveQueue(queue);
  console.log(`[SyncQueue] Added request to queue: ${req.url}`);
};

export const processQueue = async () => {
  const queue = await getQueue();
  if (queue.length === 0) return;

  console.log(`[SyncQueue] Processing ${queue.length} pending requests...`);
  
  const token = await SecureStore.getItemAsync('auth_token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  let remainingQueue = [...queue];

  for (const req of queue) {
    try {
      let payload = req.data;
      
      // Reconstruct FormData for file uploads
      if (req.isFormData && Array.isArray(req.data)) {
        const formData = new FormData();
        for (const item of req.data) {
          if (item.type === 'file') {
             formData.append(item.name, {
               uri: item.uri,
               type: item.mimeType || 'image/jpeg',
               name: item.fileName || 'upload.jpg'
             } as any);
          } else {
             formData.append(item.name, item.value);
          }
        }
        payload = formData;
      }

      await axios({
        method: req.method,
        url: req.url,
        data: payload,
        headers: {
           ...headers,
           ...(req.headers || {}),
           ...(req.isFormData ? { 'Content-Type': 'multipart/form-data' } : {})
        }
      });
      
      console.log(`[SyncQueue] Successfully synced ${req.url}`);
      remainingQueue = remainingQueue.filter(q => q.id !== req.id);
      await saveQueue(remainingQueue);
    } catch (err: any) {
      console.error(`[SyncQueue] Failed to sync ${req.url}`, err?.response?.data || err.message);
      
      // Discard permanently if validation/auth error (4xx)
      if (err.response && err.response.status >= 400 && err.response.status < 500) {
        console.warn(`[SyncQueue] Discarding invalid request (4xx error): ${req.url}`);
        remainingQueue = remainingQueue.filter(q => q.id !== req.id);
        await saveQueue(remainingQueue);
      } else {
        // Network error (5xx or offline) -> Stop processing queue and retry later
        console.log(`[SyncQueue] Stopping queue processing due to network error.`);
        break; 
      }
    }
  }
};
