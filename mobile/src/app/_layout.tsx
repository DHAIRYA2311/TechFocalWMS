import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme, View, ActivityIndicator, Platform, AppState, AppStateStatus, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import PairingScreen from '@/components/PairingScreen';
import LaunchScreen from '@/components/LaunchScreen';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import TechFocalLoader from '@/components/tech-focal-loader';
import { processQueue } from '@/utils/syncQueue';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],
  // uncomment the line below to enable Spotlight (https://spotlightjs.com)      
  // spotlight: __DEV__,
});

// Global interceptor to sanitize 500-level errors in mobile app
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status >= 500) {
      const safeError = new Error('An unexpected server error occurred. Our team has been notified.');
      (safeError as any).response = { 
        ...error.response, 
        data: { message: safeError.message } 
      };
      Sentry.captureException(error);
      Alert.alert('System Error', safeError.message);
      return Promise.reject(safeError);
    }
    return Promise.reject(error);
  }
);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  } as any),
});

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return null;
    }
    
    try {
      const projectId = 
        Constants?.expoConfig?.extra?.eas?.projectId ?? 
        Constants?.easConfig?.projectId;
      
      const isExpoGo = Constants?.executionEnvironment === 'storeClient';
      
      if (isExpoGo) {
        console.log('[Notifications] Running in Expo Go: Remote push notifications are not supported in Expo Go SDK 53+. Using in-app polling fallback instead.');
        return null;
      }

      if (!projectId) {
        console.log('[Notifications] Missing EAS projectId: Skip push token registration.');
        return null;
      }
        
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      return token;
    } catch (e) {
      console.warn('Expo push token extraction failed:', e);
      return null;
    }
  } else {
    console.warn('Must use physical device for Push Notifications');
    return null;
  }
}

function LayoutContent() {
  const { isPaired, loading, token, apiUrl } = useAuth();
  const [checksCompleted, setChecksCompleted] = useState(false);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        processQueue(); // Queue processes itself and will quietly fail if still offline
      }
    };
    
    // Also poll every 15 seconds just in case network comes back while app is open
    const interval = setInterval(() => {
        processQueue();
    }, 15000);

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!isPaired || !token || !apiUrl) return;

    async function setupPushNotifications() {
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          const deviceId = Device.osBuildId || Device.osInternalBuildId || `local-${Platform.OS}`;
          await axios.post(`${apiUrl}/api/devices/register-push`, {
            device_id: deviceId,
            push_token: pushToken
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('Push token registered successfully:', pushToken);
        }
      } catch (err) {
        console.warn('Failed to register push token on backend:', err);
      }
    }

    // Clear any previously scheduled daily reminders so they stop firing
    Notifications.cancelAllScheduledNotificationsAsync().catch(err => {
      console.warn('Failed to cancel previous scheduled notifications:', err);
    });

    setupPushNotifications();

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification clicked by user:', response);
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [isPaired, token, apiUrl]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0b0f19', justifyContent: 'center', alignItems: 'center' }}>
        <TechFocalLoader color="#3b82f6" size={32} />
      </View>
    );
  }

  if (!checksCompleted) {
    return (
      <LaunchScreen 
        onComplete={(success) => {
          setChecksCompleted(true);
        }} 
      />
    );
  }
  if (!isPaired) {
    return <PairingScreen />;
  }

  return <AppTabs />;
}

export default Sentry.wrap(function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <LayoutContent />
      </ThemeProvider>
    </AuthProvider>
  );
});
