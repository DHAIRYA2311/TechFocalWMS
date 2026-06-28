import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Dimensions, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withSequence,
  Easing, 
  FadeIn,
  FadeOut
} from 'react-native-reanimated';
import * as Lucide from 'lucide-react-native';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';

const Gear = Lucide.Settings as any;
const { width, height } = Dimensions.get('window');

interface LaunchScreenProps {
  onComplete: (success: boolean) => void;
}

export default function LaunchScreen({ onComplete }: LaunchScreenProps) {
  const { isPaired, token, apiUrl, unpairDevice } = useAuth();
  
  // Animation shared values
  const logoScale = useSharedValue(0.85);
  const logoOpacity = useSharedValue(0);
  const gearRotation = useSharedValue(0);
  const glowOpacity = useSharedValue(0.2);
  const progressBarWidth = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  const [loadingText, setLoadingText] = useState('Loading workspace...');

  useEffect(() => {
    // 1. Start continuous animations
    logoScale.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.back(1.2)) });
    logoOpacity.value = withTiming(1, { duration: 1000 });
    textOpacity.value = withTiming(1, { duration: 800 });
    
    gearRotation.value = withRepeat(
      withTiming(360, { duration: 5000, easing: Easing.linear }),
      -1, // Infinite loop
      false
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.15, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Smooth progress bar animation over 7.5 seconds
    progressBarWidth.value = withTiming(1.0, { duration: 7500, easing: Easing.linear });

    // 2. Perform actual background validation checks
    async function executeChecksAndNavigate() {
      const startTime = Date.now();
      let navigateSuccess = false;

      try {
        if (isPaired && token && apiUrl) {
          // Verify server ping and auth
          try {
            await axios.get(`${apiUrl}/api/me`, { 
              headers: { Authorization: `Bearer ${token}` },
              timeout: 4000
            });
            navigateSuccess = true;
          } catch (err: any) {
            if (err.response?.status === 401) {
              // Token revoked
              await unpairDevice();
              navigateSuccess = false;
            } else {
              // Server offline but device is paired, enter in offline mode
              navigateSuccess = true;
            }
          }
        } else {
          // Not paired
          navigateSuccess = false;
        }
      } catch (err) {
        console.error('Bypassed error during startup validation:', err);
      }

      // Change texts slowly during the 7.5 seconds
      await delay(2500);
      setLoadingText('Connecting to workshop terminal...');
      
      await delay(2500);
      setLoadingText('Synchronizing workspace settings...');

      // Calculate remaining time to complete the 7.5-second experience
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 7500 - elapsedTime);

      await delay(remainingTime);
      onComplete(navigateSuccess);
    }

    executeChecksAndNavigate();
  }, []);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Animated styles
  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value
  }));

  const gearAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${gearRotation.value}deg` }]
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressBarWidth.value * 100}%`
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value
  }));

  return (
    <Animated.View 
      entering={FadeIn.duration(400)} 
      exiting={FadeOut.duration(500)} 
      style={styles.container}
    >
      {/* Radial Blue/Green glow background */}
      <Animated.View style={[styles.glowBackground, glowAnimatedStyle]} />

      <View style={styles.content}>
        {/* Animated Brand Logo */}
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <View style={styles.logoImageWrapper}>
            {/* Pulsing Outer Rings */}
            <View style={styles.pulseRingOuter} />
            <View style={styles.pulseRingInner} />
            
            {/* Rotating Gear behind the logo */}
            <Animated.View style={[styles.backgroundGear, gearAnimatedStyle]}>
              <Gear size={105} color="rgba(32, 138, 239, 0.07)" strokeWidth={1.2} />
            </Animated.View>

            {/* Corporate Logo Image */}
            <Image 
              style={styles.companyLogo} 
              source={require('@/assets/images/company-logo.png')} 
              contentFit="contain"
            />
          </View>
        </Animated.View>

        {/* Minimal Progress Bar & Single Text Line */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, progressAnimatedStyle]} />
          </View>
          
          <Animated.Text style={[styles.loadingTextLabel, textAnimatedStyle]}>
            {loadingText}
          </Animated.Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0b0f19',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999
  },
  glowBackground: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: (width * 1.5) / 2,
    backgroundColor: '#208AEF',
    opacity: 0.15,
    top: height * 0.1,
    left: -width * 0.25,
    transform: [{ scale: 0.6 }],
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoImageWrapper: {
    width: 280,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  companyLogo: {
    width: '100%',
    height: '100%',
    zIndex: 10,
  },
  backgroundGear: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  pulseRingOuter: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: 'rgba(32, 138, 239, 0.12)',
  },
  pulseRingInner: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.08)',
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  progressContainer: {
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 2,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  loadingTextLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
