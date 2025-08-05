// app/index.tsx - Updated main entry point with splash screen
import React, { useEffect, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { ActivityIndicator, View, Text } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import SplashScreen from '../components/SplashScreen';

export default function IndexScreen() {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [splashFinished, setSplashFinished] = useState(false);

  useEffect(() => {
    console.log('🏠 Index screen mounted');
    console.log('👤 User:', user?.email || 'No user');
    console.log('⏳ Loading:', loading);
  }, [user, loading]);

  useEffect(() => {
    // Handle navigation when auth state changes and splash is finished
    if (!loading && splashFinished) {
      if (user) {
        console.log('✅ User authenticated, navigating to tabs...');
        // Use router.replace to prevent going back to index
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 100);
      } else {
        console.log('❌ No user, staying on index (will redirect to auth)');
      }
    }
  }, [user, loading, splashFinished]);

  const handleSplashFinished = () => {
    console.log('🎬 Splash screen finished');
    setSplashFinished(true);
    setShowSplash(false);
  };

  // Show splash screen first
  if (showSplash) {
    console.log('🎬 Showing splash screen...');
    return <SplashScreen onFinished={handleSplashFinished} />;
  }

  // Show loading while checking auth state after splash
  if (loading || !splashFinished) {
    console.log('⏳ Showing loading screen after splash...');
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#5CC4C4',
        }}
      >
        <ActivityIndicator size="large" color="#fff" />
        <Text
          style={{
            marginTop: 16,
            fontSize: 16,
            color: '#fff',
            fontWeight: '500',
          }}
        >
          Loading your tours...
        </Text>
      </View>
    );
  }

  // If not authenticated, redirect to auth screen
  if (!user) {
    console.log('🔐 Redirecting to auth screen');
    return <Redirect href="/auth" />;
  }

  // If authenticated, redirect to main tabs
  console.log('🎯 User is authenticated, should redirect to tabs');
  return <Redirect href="/(tabs)" />;
}
