// app/_layout.tsx - Updated Root Layout with OfflineProvider and Stripe
import { StripeProvider } from '@stripe/stripe-react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { AuthProvider } from '../contexts/AuthContext';
import { OfflineProvider } from '../contexts/OfflineContext';
import { ProgressProvider } from '../contexts/ProgressContext';
import { PurchaseProvider } from '../contexts/PurchaseContext';
import IOSBackButton from '../components/IOSBackButton';

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
                headerLeft: Platform.OS === 'ios' 
                  ? () => <IOSBackButton />
                  : undefined,
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

              {/* Not Found - Show header with back button */}
              <Stack.Screen
                name="+not-found"
                options={{
                  title: 'Page Not Found',
                  headerLeft: Platform.OS === 'ios' 
                    ? () => <IOSBackButton title="Home" />
                    : undefined,
                }}
              />

              {/* Tour Details - Shown from tabs */}
              <Stack.Screen
                name="tour/[id]"
                options={{
                  title: 'Tour Details',
                  presentation: 'card',
                  headerLeft: Platform.OS === 'ios' 
                    ? () => <IOSBackButton title="Tours" />
                    : undefined,
                }}
              />

              {/* Tour Player - Full screen modal */}
              <Stack.Screen
                name="tour/player/[id]"
                options={{
                  title: 'Audio Tour',
                  presentation: 'fullScreenModal',
                  headerLeft: Platform.OS === 'ios' 
                    ? () => <IOSBackButton title="Tour" />
                    : undefined,
                }}
              />

              {/* Offline Downloads Management - Modal presentation */}
              <Stack.Screen
                name="offline-downloads"
                options={{
                  headerShown: true,
                  presentation: 'modal',
                  title: 'Offline Downloads',
                  headerLeft: Platform.OS === 'ios' 
                    ? () => <IOSBackButton title="Profile" />
                    : undefined,
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
