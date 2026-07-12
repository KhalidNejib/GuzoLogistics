/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { ActivityIndicator, View, Text } from 'react-native';
import { useColorScheme } from '../components/useColorScheme';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '../lib/tokenCache';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from '../services/i18n';
import '../global.css';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

function RootLayoutNav() {
  const { isLoaded } = useAuth();
  const colorScheme = useColorScheme();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text 
          style={{ marginTop: 16, color: '#94a3b8', fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}
        >
          Securing Terminal...
        </Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* We define ALL screens here. Navigation logic is handled by Expo Router's filesystem */}
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(auth)/register" />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  try {
    if (!loaded) return null;

    if (!publishableKey) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>Error: Missing Clerk Publishable Key</Text>
        </View>
      );
    }

    return (
      <SafeAreaProvider>
        <LanguageProvider>
          <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
            <RootLayoutNav />
          </ClerkProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    );
  } catch (err: any) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ color: 'red', fontWeight: 'bold' }}>Critical Startup Error:</Text>
        <Text>{err?.message || 'Unknown Error'}</Text>
      </View>
    );
  }
}
