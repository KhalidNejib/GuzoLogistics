/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

interface OnboardingModalProps {
  visible: boolean;
  onComplete: (data: any) => Promise<void>;
  getToken: () => Promise<string | null>;
  initialData?: any;
}

const COLORS = {
  primary: '#4F46E5',
  slate: '#64748B',
  emerald: '#10B981',
};

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ visible, onComplete, getToken, initialData }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [vehicle, setVehicle] = useState({
    fleetKey: initialData?.fleetKey || '',
    type: initialData?.vehicleType || 'MOTORCYCLE',
    make: initialData?.vehicleMake || '',
    model: initialData?.vehicleModel || '',
    year: initialData?.vehicleYear?.toString() || '',
    color: initialData?.vehicleColor || '',
    plate: initialData?.licensePlate || '',
    vehiclePhotoUrl: initialData?.vehiclePhotoUrl || '',
    profilePhotoUrl: initialData?.profilePhotoUrl || '',
  });

  const [compliance, setCompliance] = useState({
    licenseNumber: initialData?.licenseNumber || '',
    licensePhotoUrl: initialData?.licensePhotoUrl || '',
    faydaIdPhotoUrl: initialData?.faydaIdPhotoUrl || '',
  });

  const [identity, setIdentity] = useState({
    fullName: initialData?.user?.fullName || '',
    phoneNumber: initialData?.user?.phoneNumber || '',
  });

  const [isUploading, setIsUploading] = useState(false);

  const pickImage = async (field: string, targetState: 'vehicle' | 'compliance') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setIsUploading(true);
        const token = await getToken();
        const uploadRes = await fetch(`${API_URL}/api/v1/merchant/finance/upload-proof`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify({ imageBase64: result.assets[0].base64 }),
        });

        const data = await uploadRes.json();
        if (uploadRes.ok) {
          if (targetState === 'vehicle') {
            setVehicle(prev => ({ ...prev, [field]: data.url }));
          } else {
            setCompliance(prev => ({ ...prev, [field]: data.url }));
          }
        } else {
          setError('Failed to upload image. Try again.');
        }
      }
    } catch (err) {
      setError('Error accessing gallery.');
    } finally {
      setIsUploading(false);
    }
  };

  const [emergency, setEmergency] = useState({
    name: initialData?.emergencyContact?.name || '',
    phone: initialData?.emergencyContact?.phone || '',
    relationship: initialData?.emergencyContact?.relationship || '',
  });

  const handleNext = () => {
    setError(null);

    // STEP 1 VALIDATION: Identity & Asset Intel
    if (step === 1) {
      const { fullName, phoneNumber } = identity;
      const { fleetKey, make, model, year, type, plate, profilePhotoUrl } = vehicle;
      
      if (!fullName.trim()) return setError('Your legal full name is required for pilot verification.');
      if (!phoneNumber.trim()) return setError('A valid phone number is required for dispatch.');
      if (!fleetKey.trim()) return setError('Please enter your Company Fleet Key.');
      if (!make.trim() || !model.trim()) return setError('Manufacturer and model are required.');
      if (!year.trim() || year.length < 4) return setError('Please enter a valid vehicle year.');
      if (type !== 'BICYCLE' && !plate.trim()) return setError('License plate is required for motorized assets.');
      if (!profilePhotoUrl) return setError('A clear Pilot Portrait (Selfie) is required for verification.');
    }

    // STEP 2 VALIDATION: Vehicle Proof
    if (step === 2) {
      if (!vehicle.vehiclePhotoUrl) return setError('A clear photo of your vehicle is required for the registry.');
    }

    // STEP 3 VALIDATION: Compliance
    if (step === 3) {
      if (vehicle.type !== 'BICYCLE' && !compliance.licenseNumber.trim()) {
        return setError('Driver license number is required for your vehicle type.');
      }
      if (vehicle.type !== 'BICYCLE' && !compliance.licensePhotoUrl) {
        return setError('A photo of your driver license is required for compliance.');
      }
      if (!compliance.faydaIdPhotoUrl) {
        return setError('Fayda / National ID photo is mandatory for pilot compliance.');
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep(step + 1);
  };

  const handleBack = () => {
    setError(null);
    Haptics.selectionAsync();
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!emergency.name.trim() || !emergency.phone.trim() || !emergency.relationship.trim()) {
      setError('Emergency contact details are mandatory for pilot safety.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onComplete({
        ...identity,
        ...vehicle,
        fleetKey: vehicle.fleetKey.trim().toUpperCase(),
        vehicleType: vehicle.type,
        vehicleMake: vehicle.make.trim(),
        vehicleModel: vehicle.model.trim(),
        vehicleYear: parseInt(vehicle.year) || undefined,
        vehicleColor: vehicle.color.trim(),
        licensePlate: vehicle.plate.trim().toUpperCase(),
        ...compliance,
        licenseNumber: compliance.licenseNumber.trim().toUpperCase(),
        emergencyContact: {
          name: emergency.name.trim(),
          phone: emergency.phone.trim(),
          relationship: emergency.relationship.trim(),
        },
      });
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please check your data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Pilot Identity</Text>
      <Text style={styles.stepSub}>Ensure your contact details are mission-ready.</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>LEGAL FULL NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Abebe Bikila"
          value={identity.fullName}
          onChangeText={(txt) => setIdentity({ ...identity, fullName: txt })}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>DIRECT PHONE NUMBER</Text>
        <TextInput
          style={styles.input}
          placeholder="+251 911..."
          keyboardType="phone-pad"
          value={identity.phoneNumber}
          onChangeText={(txt) => setIdentity({ ...identity, phoneNumber: txt })}
        />
        <Text style={styles.inputHelp}>Merchants will use this to call you for missions.</Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.stepTitle}>Operational Intelligence</Text>
      <Text style={styles.stepSub}>Connect to your fleet and describe your asset.</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>COMPANY FLEET KEY</Text>
        <TextInput
          style={[styles.input, { borderColor: COLORS.primary, borderWidth: 1.5 }]}
          placeholder="e.g. ETHIO-XXXXXX"
          autoCapitalize="characters"
          value={vehicle.fleetKey}
          onChangeText={(txt) => setVehicle({ ...vehicle, fleetKey: txt })}
        />
        <Text style={styles.inputHelp}>Obtain this key from your company administrator.</Text>
      </View>

      <View style={styles.typeSelector}>
        {(['MOTORCYCLE', 'BICYCLE', 'VAN'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeBtn, vehicle.type === t && styles.typeBtnActive]}
            onPress={() => setVehicle({ ...vehicle, type: t })}
          >
            <MaterialCommunityIcons
              name={t === 'MOTORCYCLE' ? 'scooter' : t === 'BICYCLE' ? 'bike' : 'truck-delivery'}
              size={24}
              color={vehicle.type === t ? 'white' : COLORS.slate}
            />
            <Text style={[styles.typeText, vehicle.type === t && styles.typeTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>MANUFACTURER & MODEL</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1.5 }]}
            placeholder="e.g. TVS / Yamaha"
            value={vehicle.make}
            onChangeText={(txt) => setVehicle({ ...vehicle, make: txt })}
          />
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 10 }]}
            placeholder="e.g. HLX 150"
            value={vehicle.model}
            onChangeText={(txt) => setVehicle({ ...vehicle, model: txt })}
          />
        </View>
      </View>

      {/* Conditionally hide plate for bicycles */}
      {vehicle.type !== 'BICYCLE' && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>LICENSE PLATE</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. AA 12345"
            autoCapitalize="characters"
            value={vehicle.plate}
            onChangeText={(txt) => setVehicle({ ...vehicle, plate: txt })}
          />
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>COLOR & YEAR</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1.5 }]}
            placeholder="e.g. Midnight Blue"
            value={vehicle.color}
            onChangeText={(txt) => setVehicle({ ...vehicle, color: txt })}
          />
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 10 }]}
            placeholder="2024"
            keyboardType="number-pad"
            maxLength={4}
            value={vehicle.year}
            onChangeText={(txt) => setVehicle({ ...vehicle, year: txt })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>PILOT PORTRAIT (SELFIE)</Text>
        <TouchableOpacity 
          style={[styles.smallUploadBox, vehicle.profilePhotoUrl && styles.uploadBoxActive]}
          onPress={() => pickImage('profilePhotoUrl', 'vehicle')}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : vehicle.profilePhotoUrl ? (
            <View style={styles.uploadDone}>
              <Ionicons name="person-circle" size={24} color={COLORS.emerald} />
              <Text style={styles.uploadText}>Portrait Captured</Text>
            </View>
          ) : (
            <View style={styles.uploadRow}>
              <Feather name="camera" size={20} color={COLORS.primary} />
              <Text style={styles.uploadRowText}>Tap to Take Selfie</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
        <Text style={styles.nextBtnText}>Next Step</Text>
        <Feather name="arrow-right" size={18} color="white" />
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Vehicle Verification</Text>
      <Text style={styles.stepSub}>Attach a clear photo of your vehicle for the registry.</Text>

      <TouchableOpacity 
        style={[styles.uploadBox, vehicle.vehiclePhotoUrl && styles.uploadBoxActive]}
        onPress={() => pickImage('vehiclePhotoUrl', 'vehicle')}
        disabled={isUploading}
      >
        {isUploading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : vehicle.vehiclePhotoUrl ? (
          <View style={styles.uploadDone}>
            <Ionicons name="checkmark-circle" size={32} color={COLORS.emerald} />
            <Text style={styles.uploadText}>Vehicle Photo Attached</Text>
          </View>
        ) : (
          <View style={styles.uploadPrompt}>
            <Feather name="camera" size={32} color={COLORS.slate} />
            <Text style={styles.uploadTitle}>Tap to take photo</Text>
            <Text style={styles.uploadSub}>License plate must be visible</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>Next Step</Text>
          <Feather name="arrow-right" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Compliance & ID</Text>
      <Text style={styles.stepSub}>Government documents required for all pilots.</Text>

      {vehicle.type !== 'BICYCLE' && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>DRIVERS LICENSE NUMBER</Text>
            <TextInput
              style={styles.input}
              placeholder="DL-XXXX-XXXX"
              autoCapitalize="characters"
              value={compliance.licenseNumber}
              onChangeText={(txt) => setCompliance({ ...compliance, licenseNumber: txt })}
            />
          </View>

          {/* ── Driver License Photo ──────────────────────────────── */}
          <Text style={[styles.inputLabel, { marginBottom: 8 }]}>DRIVER LICENSE PHOTO</Text>
          <TouchableOpacity
            style={[styles.uploadBox, compliance.licensePhotoUrl && styles.uploadBoxActive]}
            onPress={() => pickImage('licensePhotoUrl', 'compliance')}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : compliance.licensePhotoUrl ? (
              <View style={styles.uploadDone}>
                <Ionicons name="checkmark-circle" size={32} color={COLORS.emerald} />
                <Text style={styles.uploadText}>License Photo Uploaded ✓</Text>
              </View>
            ) : (
              <View style={styles.uploadPrompt}>
                <MaterialCommunityIcons name="card-account-details" size={32} color={COLORS.slate} />
                <Text style={styles.uploadTitle}>Upload Driver License</Text>
                <Text style={styles.uploadSub}>Front side — must be clearly visible</Text>
              </View>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* ── Fayda / National ID Photo ─────────────────────────────── */}
      <Text style={[styles.inputLabel, { marginBottom: 8 }]}>FAYDA / NATIONAL ID PHOTO</Text>
      <TouchableOpacity
        style={[styles.uploadBox, compliance.faydaIdPhotoUrl && styles.uploadBoxActive]}
        onPress={() => pickImage('faydaIdPhotoUrl', 'compliance')}
        disabled={isUploading}
      >
        {isUploading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : compliance.faydaIdPhotoUrl ? (
          <View style={styles.uploadDone}>
            <Ionicons name="checkmark-circle" size={32} color={COLORS.emerald} />
            <Text style={styles.uploadText}>Identity Proof Uploaded ✓</Text>
          </View>
        ) : (
          <View style={styles.uploadPrompt}>
            <MaterialCommunityIcons name="badge-account-horizontal" size={32} color={COLORS.slate} />
            <Text style={styles.uploadTitle}>Upload Fayda / National ID</Text>
            <Text style={styles.uploadSub}>Clear photo of the front side</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>Next Step</Text>
          <Feather name="arrow-right" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Emergency Node</Text>
      <Text style={styles.stepSub}>Safety first. Who should we contact if needed?</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>CONTACT NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={emergency.name}
          onChangeText={(txt) => setEmergency({ ...emergency, name: txt })}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>PHONE NUMBER</Text>
        <TextInput
          style={styles.input}
          placeholder="+251 ..."
          keyboardType="phone-pad"
          value={emergency.phone}
          onChangeText={(txt) => setEmergency({ ...emergency, phone: txt })}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>RELATIONSHIP</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Spouse / Parent / Brother"
          value={emergency.relationship}
          onChangeText={(txt) => setEmergency({ ...emergency, relationship: txt })}
        />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={14} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: COLORS.emerald }]} onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Text style={styles.nextBtnText}>Submit Mission Data</Text>
              <Feather name="check" size={18} color="white" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <BlurView intensity={90} style={StyleSheet.absoluteFill} tint="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center' }}
      >
        <View style={styles.centered}>
          <View style={styles.card}>
            <View style={styles.progressRow}>
              {[1, 2, 3, 4].map((s) => (
                <View key={s} style={[styles.dot, step >= s && styles.dotActive]} />
              ))}
            </View>

            {error && step < 4 && (
              <View style={[styles.errorContainer, { marginBottom: 20 }]}>
                <Feather name="alert-circle" size={14} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
              {step === 4 && renderStep4()}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: 'white',
    borderRadius: 32,
    width: '100%',
    maxHeight: height * 0.8,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 24,
  },
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: 24, alignSelf: 'center' },
  dot: { width: 24, height: 4, borderRadius: 2, backgroundColor: '#f1f5f9' },
  dotActive: { backgroundColor: COLORS.primary },

  stepContainer: { flex: 1 },
  stepTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  stepSub: { fontSize: 13, fontWeight: '600', color: COLORS.slate, marginTop: 4, marginBottom: 24 },

  typeSelector: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  typeBtn: {
    flex: 1,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  typeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeText: { fontSize: 9, fontWeight: '900', color: COLORS.slate, marginTop: 4, textTransform: 'uppercase' },
  typeTextActive: { color: 'white' },

  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 10, fontWeight: '900', color: COLORS.slate, letterSpacing: 1.5, marginBottom: 8 },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  inputHelp: { fontSize: 9, fontWeight: '700', color: COLORS.slate, marginTop: 4, letterSpacing: 0.2 },
  row: { flexDirection: 'row' },

  nextBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    height: 60,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  nextBtnText: { color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },

  btnRow: { flexDirection: 'row', gap: 12, marginTop: 16, width: '100%' },
  backBtn: {
    flex: 0.4,
    backgroundColor: '#f1f5f9',
    height: 60,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: COLORS.slate, fontWeight: '800', fontSize: 15 },

  docsAlert: {
    backgroundColor: '#eef2ff',
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  docsAlertText: { flex: 1, fontSize: 11, fontWeight: '700', color: '#4338ca', lineHeight: 16 },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 24,
    width: '100%',
  },
  uploadBox: {
    height: 180,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#f1f5f9',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  uploadBoxActive: {
    borderColor: COLORS.emerald,
    backgroundColor: '#f0fdf4',
    borderStyle: 'solid',
  },
  uploadPrompt: { alignItems: 'center', justifyContent: 'center' },
  uploadTitle: { fontSize: 14, fontWeight: '900', color: '#1e293b', marginTop: 12 },
  uploadSub: { fontSize: 11, fontWeight: '600', color: COLORS.slate, marginTop: 4 },
  uploadDone: { alignItems: 'center', justifyContent: 'center' },
  uploadText: { fontSize: 13, fontWeight: '900', color: COLORS.emerald, marginTop: 10 },
  smallUploadBox: {
    height: 70,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uploadRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  uploadRowText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
});
