import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNotifications } from '../contexts/NotificationContext';
import type { NotificationSettings } from '../services/NotificationService';

export default function NotificationSettingsScreen() {
  const { settings, updateSettings, cancelAllNotifications } = useNotifications();
  const [localSettings, setLocalSettings] = useState<NotificationSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);

  const handleSettingChange = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);

    try {
      setIsSaving(true);
      await updateSettings({ [key]: value });
      console.log(`✅ Updated ${key} to ${value}`);
    } catch (error) {
      console.error(`❌ Failed to update ${key}:`, error);
      // Revert the local change
      setLocalSettings(localSettings);
      Alert.alert('Error', 'Failed to update notification settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAllNotifications = () => {
    Alert.alert(
      'Clear All Notifications',
      'This will cancel all scheduled notifications. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAllNotifications();
              Alert.alert('Success', 'All scheduled notifications have been cleared.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear notifications. Please try again.');
            }
          },
        },
      ]
    );
  };

  const SettingItem = ({ 
    icon, 
    title, 
    description, 
    value, 
    onValueChange, 
    disabled = false 
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
  }) => (
    <View style={[styles.settingItem, disabled && styles.settingItemDisabled]}>
      <View style={styles.settingIconContainer}>
        <Ionicons name={icon} size={24} color={disabled ? '#ccc' : '#5CC4C4'} />
      </View>
      
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, disabled && styles.settingTitleDisabled]}>
          {title}
        </Text>
        <Text style={[styles.settingDescription, disabled && styles.settingDescriptionDisabled]}>
          {description}
        </Text>
      </View>
      
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled || isSaving}
        trackColor={{ false: '#f0f0f0', true: '#5CC4C4' }}
        thumbColor={value ? '#fff' : '#fff'}
        ios_backgroundColor="#f0f0f0"
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="notifications" size={48} color="#5CC4C4" />
          <Text style={styles.headerTitle}>Notification Settings</Text>
          <Text style={styles.headerSubtitle}>
            Customize how and when you receive notifications about your tours
          </Text>
        </View>

        {/* Push Notifications Master Switch */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          <SettingItem
            icon="notifications-outline"
            title="Enable Push Notifications"
            description="Allow the app to send you notifications even when it's closed"
            value={localSettings.pushNotifications}
            onValueChange={(value) => handleSettingChange('pushNotifications', value)}
          />
        </View>

        {/* Tour-related Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tour Notifications</Text>
          
          <SettingItem
            icon="checkmark-circle-outline"
            title="Tour Completion"
            description="Get notified when you complete a tour stop or entire tour"
            value={localSettings.tourCompletion}
            onValueChange={(value) => handleSettingChange('tourCompletion', value)}
            disabled={!localSettings.pushNotifications}
          />
          
          <SettingItem
            icon="location-outline"
            title="Location-based Alerts"
            description="Receive notifications when you're near a tour stop"
            value={localSettings.locationBased}
            onValueChange={(value) => handleSettingChange('locationBased', value)}
            disabled={!localSettings.pushNotifications}
          />
        </View>

        {/* In-App Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>In-App Experience</Text>
          
          <SettingItem
            icon="chatbox-outline"
            title="In-App Notifications"
            description="Show toast messages and alerts while using the app"
            value={localSettings.inAppNotifications}
            onValueChange={(value) => handleSettingChange('inAppNotifications', value)}
          />
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#5CC4C4" />
            <Text style={styles.infoText}>
              Location-based notifications help you discover tour stops automatically. 
              Make sure location access is set to &quot;Always Allow&quot; for the best experience.
            </Text>
          </View>
          
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
            <Text style={styles.infoText}>
              Your location data is only used to trigger audio at tour stops and is never shared or stored on our servers.
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearAllNotifications}
          >
            <Ionicons name="trash-outline" size={20} color="#ff4444" />
            <Text style={styles.clearButtonText}>Clear All Notifications</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Changes are saved automatically. You can modify these settings anytime.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  settingIconContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  settingTitleDisabled: {
    color: '#999',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  settingDescriptionDisabled: {
    color: '#aaa',
  },
  infoSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 12,
  },
  actionsSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  clearButtonText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});