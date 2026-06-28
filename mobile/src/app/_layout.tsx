import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme, View, ActivityIndicator, Platform } from 'react-native';
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
  const [targetSuccess, setTargetSuccess] = useState(false);

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

    async function scheduleDailyReminder() {
      try {
        // Clear previous schedules to prevent duplicate alerts
        await Notifications.cancelAllScheduledNotificationsAsync();
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "TechFocal WMS Daily Check-in 📋",
            body: "It's 10:00 PM. Please review open Job Cards and submit any pending updates.",
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 22,
            minute: 0,
            channelId: 'default',
          },
        });
        console.log('Daily 10:00 PM notification scheduled successfully.');
      } catch (err) {
        console.warn('Failed to schedule daily notification:', err);
      }
    }

    setupPushNotifications();
    scheduleDailyReminder();

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
      <View style={{ flex: 1, backgroundColor: '#0b0f19' }} />
    );
  }

  if (!checksCompleted) {
    return (
      <LaunchScreen 
        onComplete={(success) => {
          setTargetSuccess(success);
          setChecksCompleted(true);
        }} 
      />
    );
  }

  if (!targetSuccess) {
    return <PairingScreen />;
  }

  return <AppTabs />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <LayoutContent />
      </ThemeProvider>
    </AuthProvider>
  );
}
