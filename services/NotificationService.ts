import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface NotificationSettings {
  tourCompletion: boolean;
  locationBased: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  tourCompletion: true,
  locationBased: true,
  pushNotifications: true,
  inAppNotifications: true,
};

const STORAGE_KEY = 'notification_settings';

class NotificationService {
  private static instance: NotificationService;
  private settings: NotificationSettings = DEFAULT_SETTINGS;
  private pushToken: string | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Initialize notification service
  async initialize(): Promise<void> {
    // Initializing NotificationService
    
    try {
      // Load saved settings
      await this.loadSettings();
      
      // Request permissions
      await this.requestPermissions();
      
      // Register for push notifications if enabled
      if (this.settings.pushNotifications) {
        await this.registerForPushNotifications();
      }

      // NotificationService initialized successfully
    } catch (error) {
      console.error('❌ Failed to initialize NotificationService:', error);
    }
  }

  // Request notification permissions
  async requestPermissions(): Promise<boolean> {
    try {
      // Requesting notification permissions
      
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status !== 'granted') {
        console.warn('❌ Notification permissions not granted');
        this.settings.pushNotifications = false;
        await this.saveSettings();
        return false;
      }

      // Notification permissions granted
      return true;
    } catch (error) {
      console.error('❌ Error requesting notification permissions:', error);
      return false;
    }
  }

  // Register for push notifications
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Wine Tours',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#5CC4C4',
        });
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      // Push notification token registered
      
      this.pushToken = token;
      return token;
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
      return null;
    }
  }

  // Get current notification settings
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  // Update notification settings
  async updateSettings(newSettings: Partial<NotificationSettings>): Promise<void> {
    // Updating notification settings
    
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
    
    // Re-register if push notifications were enabled
    if (newSettings.pushNotifications && !this.pushToken) {
      await this.registerForPushNotifications();
    }
  }

  // Load settings from storage
  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        // Loaded notification settings
      }
    } catch (error) {
      console.error('❌ Error loading notification settings:', error);
      this.settings = DEFAULT_SETTINGS;
    }
  }

  // Save settings to storage
  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      // Saved notification settings
    } catch (error) {
      console.error('❌ Error saving notification settings:', error);
    }
  }

  // Send tour completion notification
  async sendTourCompletionNotification(tourTitle: string, completedStops: number, totalStops: number): Promise<void> {
    if (!this.settings.tourCompletion) {
      // Tour completion notifications disabled
      return;
    }

    const isFullyCompleted = completedStops === totalStops;
    
    try {
      if (this.settings.pushNotifications) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: isFullyCompleted ? '🎉 Tour Completed!' : '🎵 Stop Completed!',
            body: isFullyCompleted 
              ? `Congratulations! You've completed "${tourTitle}" tour with all ${totalStops} stops!`
              : `Great job! You've completed ${completedStops}/${totalStops} stops in "${tourTitle}".`,
            data: {
              type: 'tour_completion',
              tourTitle,
              completedStops,
              totalStops,
              isFullyCompleted,
            },
          },
          trigger: null, // Send immediately
        });

        // Sent tour completion push notification
      }
    } catch (error) {
      console.error('❌ Error sending tour completion notification:', error);
    }
  }

  // Send location-based notification
  async sendLocationNotification(message: string, stopTitle: string, tourTitle: string): Promise<void> {
    if (!this.settings.locationBased) {
      // Location-based notifications disabled
      return;
    }

    try {
      if (this.settings.pushNotifications) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📍 You\'re at a tour stop!',
            body: message,
            data: {
              type: 'location_based',
              stopTitle,
              tourTitle,
            },
          },
          trigger: null, // Send immediately
        });

        // Sent location-based push notification
      }
    } catch (error) {
      console.error('❌ Error sending location notification:', error);
    }
  }

  // Send location permission reminder
  async sendLocationPermissionReminder(): Promise<void> {
    if (!this.settings.pushNotifications || !this.settings.locationBased) {
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📍 Location Access Needed',
          body: 'Enable "Always Allow" location access to automatically play audio when you reach tour stops.',
          data: {
            type: 'location_permission',
          },
        },
        trigger: null,
      });

      // Sent location permission reminder
    } catch (error) {
      console.error('❌ Error sending location permission reminder:', error);
    }
  }

  // Send tour downloaded notification
  async sendTourDownloadedNotification(tourTitle: string): Promise<void> {
    if (!this.settings.pushNotifications) {
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⬇️ Tour Downloaded',
          body: `"${tourTitle}" is now available offline. Enjoy your tour anytime!`,
          data: {
            type: 'tour_downloaded',
            tourTitle,
          },
        },
        trigger: null,
      });

      // Sent tour downloaded notification
    } catch (error) {
      console.error('❌ Error sending tour downloaded notification:', error);
    }
  }

  // Send daily tour reminder (if user has incomplete tours)
  async scheduleDailyTourReminder(incompleteTours: string[]): Promise<void> {
    if (!this.settings.pushNotifications || incompleteTours.length === 0) {
      return;
    }

    try {
      // Cancel existing reminders
      await this.cancelScheduledNotifications('daily_reminder');

      // Schedule new reminder
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🍷 Continue Your Wine Adventure',
          body: `You have ${incompleteTours.length} tour${incompleteTours.length > 1 ? 's' : ''} waiting to be completed. Ready for another sip of adventure?`,
          data: {
            type: 'daily_reminder',
            incompleteTours,
          },
        },
        trigger: {
          hour: 18, // 6 PM
          minute: 0,
          repeats: true,
        },
      });

      // Scheduled daily tour reminder
    } catch (error) {
      console.error('❌ Error scheduling daily reminder:', error);
    }
  }

  // Cancel notifications by type
  async cancelScheduledNotifications(type: string): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const toCancel = scheduled.filter(notif => notif.content.data?.type === type);
      
      for (const notif of toCancel) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }

      if (toCancel.length > 0) {
        // Cancelled notifications of type
      }
    } catch (error) {
      console.error('❌ Error cancelling notifications:', error);
    }
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      // Cancelled all scheduled notifications
    } catch (error) {
      console.error('❌ Error cancelling all notifications:', error);
    }
  }

  // Get push token for server-side notifications (if needed)
  getPushToken(): string | null {
    return this.pushToken;
  }

  // Check if notifications are supported
  isSupported(): boolean {
    return Platform.OS !== 'web';
  }
}

export default NotificationService;