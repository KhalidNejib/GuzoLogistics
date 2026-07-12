import React, { useState, useEffect, useRef } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  Animated, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface SOSButtonProps {
  onPress: (description: string) => Promise<boolean>;
}

export function SOSButton({ onPress }: SOSButtonProps) {
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handlePress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    Alert.alert(
      "CONFIRM EMERGENCY",
      "This will broadcast your location and trigger an SOS alert to Mission Control. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "SEND SOS", 
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            const success = await onPress("SOS Triggered from Dashboard");
            if (success) {
              setActive(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("SOS DISPATCHED", "Mission Control has been notified. Stay calm, help is on the way.");
            }
            setLoading(false);
          }
        }
      ]
    );
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      <TouchableOpacity 
        style={[styles.button, active && styles.activeButton]} 
        onPress={handlePress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <MaterialCommunityIcons name={active ? "shield-alert" : "alert-octagon"} size={24} color="white" />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    top: 330, // Repositioned below the map controls on the right side to keep map view clear
    zIndex: 100,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  activeButton: {
    backgroundColor: '#000',
    borderColor: '#ef4444',
  },
  text: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
  }
});
