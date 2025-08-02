// app/index.tsx - Fixed main entry point with better navigation logic
import React, { useEffect } from 'react';
import { Redirect, router } from 'expo-router';
import { ActivityIndicator, View, Text } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function IndexScreen() {
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log('🏠 Index screen mounted');
    console.log('👤 User:', user?.email || 'No user');
    console.log('⏳ Loading:', loading);
  }, [user, loading]);

  useEffect(() => {
    // Handle navigation when auth state changes
    if (!loading) {
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
  }, [user, loading]);

  // Show loading while checking auth state
  if (loading) {
    console.log('⏳ Showing loading screen...');
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f8f9fa',
        }}
      >
        <ActivityIndicator size="large" color="#5CC4C4" />
        <Text
          style={{
            marginTop: 16,
            fontSize: 16,
            color: '#666',
          }}
        >
          Loading...
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
