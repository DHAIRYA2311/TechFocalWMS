import * as FileSystem from 'expo-file-system';
const { documentDirectory, copyAsync } = FileSystem as any;
import { addToQueue } from './syncQueue';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const offlinePost = async (url: string, data: any, customHeaders: any = {}, isFormData: boolean = false) => {
    // Online - Send immediately
    const token = await SecureStore.getItemAsync('auth_token');
    const headers = { 
       ...(token ? { Authorization: `Bearer ${token}` } : {}),
       ...customHeaders,
       ...(isFormData ? { 'Content-Type': 'multipart/form-data' } : {})
    };
    
    let payload = data;
    if (isFormData && Array.isArray(data)) {
        payload = new FormData();
        for (const item of data) {
          if (item.type === 'file') {
             payload.append(item.name, {
               uri: item.uri,
               type: item.mimeType || 'image/jpeg',
               name: item.fileName || 'upload.jpg'
             } as any);
          } else {
             payload.append(item.name, item.value);
          }
        }
    }
    
  try {
    return await axios.post(url, payload, { headers });
  } catch (err: any) {
    // If it's a network error (no response from server), we queue it!
    if (!err.response) {
      console.log('[OfflineApi] Network error detected, queuing POST request...');
    
    let queueData = data;
    
    if (isFormData && Array.isArray(data)) {
      const permanentData = [];
      for (const item of data) {
         if (item.type === 'file') {
             const ext = item.fileName ? item.fileName.split('.').pop() : 'jpg';
             const newFilename = `offline_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
             const newUri = `${documentDirectory}${newFilename}`;
             
             try {
                await copyAsync({ from: item.uri, to: newUri });
                permanentData.push({ ...item, uri: newUri });
             } catch(e) {
                console.error("Failed to copy file for offline storage", e);
                permanentData.push(item);
             }
         } else {
             permanentData.push(item);
         }
      }
      queueData = permanentData;
    }

    await addToQueue({
      url,
      method: 'POST',
      data: queueData,
      headers: customHeaders,
      isFormData
    });
    
      return { data: { success: true, message: 'Saved offline. Will sync when internet is available.', offline: true }, status: 202 };
    }
    // If it's a real API error (like 400 Bad Request), throw it normally
    throw err;
  }
};
// Using SecureStore for caching to bypass Expo Go AsyncStorage native module errors
export const offlineGet = async (url: string, config: any = {}) => {
  const token = await SecureStore.getItemAsync('auth_token');
  // Sanitize the URL to create a valid SecureStore key
  const cacheKey = `cache_${url}`.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const finalConfig = {
    ...config,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(config.headers || {})
    }
  };

  try {
    const response = await axios.get(url, finalConfig);
    // Cache the successful response
    if (response.data) {
      await SecureStore.setItemAsync(cacheKey, JSON.stringify(response.data));
    }
    return response;
  } catch (err: any) {
    // If network error, try to load from cache
    if (!err.response) {
      const cached = await SecureStore.getItemAsync(cacheKey);
      if (cached) {
        console.log(`[OfflineApi] Returning cached data for GET ${url}`);
        return { data: JSON.parse(cached), offline: true };
      }
    }
    throw err;
  }
};
