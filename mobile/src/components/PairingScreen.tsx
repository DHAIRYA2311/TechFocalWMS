import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions
} from 'react-native';
import { Image } from 'expo-image';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ExpoDevice from 'expo-device';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';
import * as Lucide from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, Layout, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

const Gear = Lucide.Settings as any;
const Smartphone = Lucide.Smartphone as any;
const QrCode = Lucide.QrCode as any;
const Key = Lucide.Key as any;
const RefreshCw = Lucide.RefreshCw as any;
const AlertTriangle = Lucide.AlertTriangle as any;
const ShieldCheck = Lucide.ShieldCheck as any;
const ArrowLeft = Lucide.ArrowLeft as any;
const ChevronRight = Lucide.ChevronRight as any;
const CheckCircle2 = Lucide.CheckCircle2 as any;
const Info = Lucide.Info as any;

const { width } = Dimensions.get('window');

export default function PairingScreen() {
  const { pairDevice } = useAuth();
  
  const gearRotation = useSharedValue(0);
  useEffect(() => {
    gearRotation.value = withRepeat(
      withTiming(360, { duration: 4000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);
  const gearAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${gearRotation.value}deg` }]
  }));

  const [method, setMethod] = useState<'qr' | 'pin' | null>(null);
  const [pin, setPin] = useState('');
  const [apiUrl, setApiUrl] = useState('http://192.168.1.10:8000'); // Default template IP
  const [loading, setLoading] = useState(false);
  const [pairingSuccess, setPairingSuccess] = useState(false);

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (method === 'qr' && !permission?.granted) {
      requestPermission();
    }
  }, [method, permission]);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);

    try {
      const parsed = JSON.parse(data);
      if (!parsed.api_url || !parsed.token || parsed.pairing_method !== 'qr') {
        throw new Error('Invalid QR Code structure.');
      }

      setLoading(true);
      await executePairing(parsed.api_url, 'qr', parsed.token);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Could not connect to backend server. Verify the URL is correct and device is on the same network.';
      Alert.alert(
        'Pairing Failed',
        errorMsg,
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
      setLoading(false);
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 6) {
      Alert.alert('Invalid PIN', 'Please enter a 6-digit PIN code.');
      return;
    }
    if (!apiUrl.trim()) {
      Alert.alert('Missing Server URL', 'Please enter your backend API server URL.');
      return;
    }

    setLoading(true);
    try {
      let formattedUrl = apiUrl.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `http://${formattedUrl}`;
      }
      if (formattedUrl.endsWith('/')) {
        formattedUrl = formattedUrl.slice(0, -1);
      }

      await executePairing(formattedUrl, 'pin', pin);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Could not connect to backend server. Verify the URL is correct and device is on the same network.';
      Alert.alert('Pairing Failed', errorMsg);
      setLoading(false);
    }
  };

  const executePairing = async (baseUrl: string, pairMethod: 'qr' | 'pin', token: string) => {
    const deviceName = `${ExpoDevice.brand} ${ExpoDevice.modelName || 'Tablet'}`;
    const deviceId = ExpoDevice.osBuildId || ExpoDevice.osInternalBuildId || `local-${Platform.OS}-${Math.random().toString(36).substr(2, 9)}`;

    const response = await axios.post(`${baseUrl}/api/devices/pair`, {
      pairing_method: pairMethod,
      token: token,
      device_name: deviceName,
      device_id: deviceId
    }, {
      timeout: 8000
    });

    if (response.data && response.data.token) {
      setPairingSuccess(true);
      setTimeout(async () => {
        await pairDevice(response.data.token, baseUrl);
      }, 1500);
    } else {
      throw new Error('No authentication token returned.');
    }
  };

  if (pairingSuccess) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.successCard}>
          <CheckCircle2 size={68} color="#22c55e" strokeWidth={1.5} />
          <Text style={styles.successTitle}>Pairing Successful!</Text>
          <Text style={styles.successText}>
            This device has been authorized successfully. Access token stored securely.
          </Text>
          <Text style={styles.successSubtext}>Initializing workshop dashboard...</Text>
          <ActivityIndicator size="small" color="#22c55e" style={{ marginTop: 24 }} />
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button (shown if in QR or PIN modes) */}
        {method !== null && (
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => {
              setMethod(null);
              setScanned(false);
            }}
          >
            <ArrowLeft size={20} color="#94a3b8" />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}

        {/* Brand Header */}
        <Animated.View layout={Layout.springify()} style={styles.header}>
          <View style={styles.logoImageWrapper}>
            {/* Pulsing Outer Rings/Glow behind the image */}
            <View style={styles.pulseRingOuter} />
            <View style={styles.pulseRingInner} />
            
            {/* Rotating Gear behind the image to add dynamic motion */}
            <Animated.View style={[styles.backgroundGear, gearAnimatedStyle]}>
              <Gear size={90} color="rgba(32, 138, 239, 0.08)" strokeWidth={1.2} />
            </Animated.View>

            {/* Crisp Corporate Logo Image */}
            <Image 
              style={styles.companyLogo} 
              source={require('@/assets/images/company-logo.png')} 
              contentFit="contain"
            />
          </View>
        </Animated.View>

        {loading ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.card}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#208AEF" />
              <Text style={styles.loadingText}>Verifying pairing authorization with server...</Text>
              <Text style={styles.loadingSubtext}>Please keep your device turned on and connected</Text>
            </View>
          </Animated.View>
        ) : method === null ? (
          /* LANDING STATE (DEVICE NOT PAIRED) */
          <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(200)} style={styles.card}>
            <View style={styles.landingWrapper}>
              <View style={styles.warningBadge}>
                <Smartphone size={24} color="#f59e0b" />
              </View>
              <Text style={styles.cardTitle}>Connect Your Device</Text>
              <Text style={styles.cardDescription}>
                This device is not yet connected to your TechFocal Workspace. Select an option below to authorize this terminal.
              </Text>

              {/* Action Buttons */}
              <TouchableOpacity 
                style={[styles.actionBtn, styles.primaryBtn]}
                onPress={() => setMethod('qr')}
              >
                <View style={styles.btnContent}>
                  <QrCode size={20} color="#ffffff" style={styles.btnIcon} />
                  <Text style={styles.primaryBtnText}>Scan QR Code</Text>
                </View>
                <ChevronRight size={18} color="#ffffff" opacity={0.8} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, styles.secondaryBtn]}
                onPress={() => setMethod('pin')}
              >
                <View style={styles.btnContent}>
                  <Key size={20} color="#cbd5e1" style={styles.btnIcon} />
                  <Text style={styles.secondaryBtnText}>Enter Pairing Code</Text>
                </View>
                <ChevronRight size={18} color="#cbd5e1" opacity={0.6} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : method === 'qr' ? (
          /* QR CODE SCANNING STATE */
          <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(200)} style={styles.card}>
            <View style={styles.scannerWrapper}>
              <Text style={styles.sectionTitle}>Point and Scan</Text>
              <Text style={styles.cardInstruction}>
                Point your camera at the QR code displayed on the Web Console under **Settings &gt; Mobile Device Pairing**.
              </Text>
              
              {!permission ? (
                <ActivityIndicator size="small" color="#208AEF" style={{ marginVertical: 40 }} />
              ) : !permission.granted ? (
                <View style={styles.permissionContainer}>
                  <AlertTriangle size={32} color="#f59e0b" />
                  <Text style={styles.permissionText}>Camera permission is required to scan the pairing QR code.</Text>
                  <TouchableOpacity style={styles.grantButton} onPress={requestPermission}>
                    <Text style={styles.grantButtonText}>Grant Permission</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.cameraFrame}>
                  <CameraView
                    style={StyleSheet.absoluteFill}
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                    barcodeScannerSettings={{
                      barcodeTypes: ['qr'],
                    }}
                  />
                  {/* Glowing Laser Target frame */}
                  <View style={styles.overlayFrame}>
                    <View style={styles.cornerTopLeft} />
                    <View style={styles.cornerTopRight} />
                    <View style={styles.cornerBottomLeft} />
                    <View style={styles.cornerBottomRight} />
                    <View style={styles.laserLine} />
                  </View>
                </View>
              )}

              {scanned && (
                <TouchableOpacity style={styles.retryButton} onPress={() => setScanned(false)}>
                  <RefreshCw size={14} color="#208AEF" />
                  <Text style={styles.retryButtonText}>Tap to Scan Again</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        ) : (
          /* PIN CODE ENTRY STATE */
          <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(200)} style={styles.card}>
            <View style={styles.pinWrapper}>
              <Text style={styles.sectionTitle}>Enter Configuration</Text>
              <Text style={styles.cardInstruction}>
                Input the 6-digit pairing PIN code and your server's backend API network URL.
              </Text>

              {/* Form Input URL */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>API Server URL</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. http://192.168.1.10:8000"
                  placeholderTextColor="#475569"
                  value={apiUrl}
                  onChangeText={setApiUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>

              {/* Form Input PIN */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>6-Digit Pairing PIN</Text>
                <TextInput
                  style={[styles.textInput, styles.pinInput]}
                  placeholder="000000"
                  placeholderTextColor="#475569"
                  maxLength={6}
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.infoCard}>
                <Info size={16} color="#38bdf8" style={{ marginRight: 8, marginTop: 1 }} />
                <Text style={styles.infoText}>
                  Verify your tablet and hosting server are connected to the same local network.
                </Text>
              </View>

              <TouchableOpacity style={styles.pairButton} onPress={handlePinSubmit}>
                <Text style={styles.pairButtonText}>Link Workshop Terminal</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  scrollContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
    position: 'relative'
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  backBtnText: {
    color: '#cbd5e1',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 13,
  },
  header: {
    alignItems: 'center',
    marginBottom: 35,
    marginTop: Platform.OS === 'ios' ? 80 : 40,
  },
  logoImageWrapper: {
    width: 220,
    height: 80,
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
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: 'rgba(32, 138, 239, 0.15)',
  },
  pulseRingInner: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.1)',
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  landingWrapper: {
    alignItems: 'center',
  },
  warningBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    textAlign: 'left',
    width: '100%',
  },
  cardDescription: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  cardInstruction: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 20,
  },
  actionBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginVertical: 6,
  },
  primaryBtn: {
    backgroundColor: '#208AEF',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.5)',
  },
  secondaryBtnText: {
    color: '#cbd5e1',
    fontWeight: '700',
    fontSize: 15,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnIcon: {
    marginRight: 12,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  scannerWrapper: {
    alignItems: 'center',
  },
  permissionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  permissionText: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 13,
    marginVertical: 16,
  },
  grantButton: {
    backgroundColor: '#208AEF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  grantButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  cameraFrame: {
    width: '100%',
    height: 240,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
  },
  overlayFrame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 40,
    borderColor: 'rgba(11, 15, 25, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#22c55e',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#22c55e',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#22c55e',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#22c55e',
  },
  laserLine: {
    width: '90%',
    height: 2,
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    position: 'absolute',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(32, 138, 239, 0.1)',
  },
  retryButtonText: {
    color: '#208AEF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 8,
  },
  pinWrapper: {
    width: '100%',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.0,
    marginBottom: 6,
  },
  textInput: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: '#ffffff',
    fontSize: 14,
  },
  pinInput: {
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '700',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    color: '#38bdf8',
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  pairButton: {
    width: '100%',
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pairButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  footerNote: {
    color: '#334155',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 40,
    paddingHorizontal: 20,
  },
  successCard: {
    width: '85%',
    maxWidth: 360,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  successText: {
    color: '#cbd5e1',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  successSubtext: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
  },
});
