import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface IOSBackButtonProps {
  title?: string;
  onPress?: () => void;
  color?: string;
}

export default function IOSBackButton({ 
  title = 'Back', 
  onPress, 
  color = '#fff' 
}: IOSBackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  // Only show on iOS or when explicitly requested
  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <TouchableOpacity 
      style={styles.backButton} 
      onPress={handlePress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons 
        name="chevron-back" 
        size={24} 
        color={color} 
        style={styles.backIcon}
      />
      <Text style={[styles.backText, { color }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginLeft: -4,
  },
  backIcon: {
    marginRight: 2,
  },
  backText: {
    fontSize: 17,
    fontWeight: '400',
  },
});