/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import 'react-native-reanimated';
import * as Sentry from '@sentry/react-native';

// ─── CRITICAL: Must be called at the root layout level for OAuth to work ───────
// When the OAuth provider redirects back to the app (via Linking / WebBrowser),
// the redirect lands on the root route ('/'), NOT on the login screen.
// If maybeCompleteAuthSession() is only called in login.tsx the redirect is
// silently dropped and Clerk keeps logging '__clerk_client_jwt not found'.
WebBrowser.maybeCompleteAuthSession();

Sentry.init({
  dsn: 'https://f1d5e7bca31be61b0e3b6f7fe492d3fd@o4511768507711488.ingest.us.sentry.io/4511768633999360',
  // Adjust tracing rates as needed for production performance
  tracesSampleRate: 1.0,
});

import { ActivityIndicator, View, Text } from 'react-native';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '../lib/tokenCache';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from '../services/i18n';
import '../global.css';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)/login',
};

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

function RootLayoutNav() {
  const { isLoaded, isSignedIn } = useAuth();

  // Show loading spinner while Clerk initialises
  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
        }}
      >
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text
          style={{
            marginTop: 16,
            color: '#94a3b8',
            fontWeight: 'bold',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}
        >
          Securing Terminal...
        </Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* All screens must be declared unconditionally — expo-router does not
          allow conditional/fragment children inside <Stack>.
          Auth-gating is handled inside (tabs)/_layout.tsx which redirects to
          /(auth)/login when the user is not signed in. */}
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(auth)/register" />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

function RootLayout() {
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

export default Sentry.wrap(RootLayout);
