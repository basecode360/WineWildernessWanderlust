// app/_layout.tsx - Updated Root Layout with OfflineProvider and Stripe
import { StripeProvider } from '@stripe/stripe-react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import { OfflineProvider } from '../contexts/OfflineContext';
import { ProgressProvider } from '../contexts/ProgressContext';
import { PurchaseProvider } from '../contexts/PurchaseContext';

const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  'pk_test_your_publishable_key';

export default function RootLayout() {
  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantId="acct_1R2dXDJRVJxx6tCf"
      urlScheme="wine-wilderness-wanderlust"
    >
      <AuthProvider>
        <PurchaseProvider>
          <OfflineProvider>
             <ProgressProvider> 
            <StatusBar style="light" backgroundColor="#5CC4C4" />
            <Stack
              screenOptions={{
                headerStyle: {
                  backgroundColor: '#5CC4C4',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            >
              {/* Main entry point - handles auth redirection */}
              <Stack.Screen
                name="index"
                options={{
                  headerShown: false,
                }}
              />

              {/* Auth Screen - No header */}
              <Stack.Screen
                name="auth"
                options={{
                  headerShown: false,
                  presentation: 'modal',
                }}
              />

              {/* Protected Tabs - No header (handled by tabs) */}
              <Stack.Screen
                name="(tabs)"
                options={{
                  headerShown: false,
                }}
              />

              {/* Tour Details - Shown from tabs */}
              <Stack.Screen
                name="tour/[id]"
                options={{
                  title: 'Tour Details',
                  presentation: 'card',
                }}
              />

              {/* Tour Player - Full screen modal */}
              <Stack.Screen
                name="tour/player/[id]"
                options={{
                  title: 'Audio Tour',
                  presentation: 'fullScreenModal',
                }}
              />

              {/* Offline Downloads Management - Modal presentation */}
              <Stack.Screen
                name="offline-downloads"
                options={{
                  headerShown: false,
                  presentation: 'modal',
                }}
              />
            </Stack>
             </ProgressProvider> 
          </OfflineProvider>
        </PurchaseProvider>
      </AuthProvider>
    </StripeProvider>
  );
}
