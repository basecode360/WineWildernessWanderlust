import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import NotificationService, { NotificationSettings } from '../services/NotificationService';

interface NotificationContextType {
  settings: NotificationSettings;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  sendTourCompletionNotification: (tourTitle: string, completedStops: number, totalStops: number) => Promise<void>;
  sendLocationNotification: (message: string, stopTitle: string, tourTitle: string) => Promise<void>;
  sendLocationPermissionReminder: () => Promise<void>;
  sendTourDownloadedNotification: (tourTitle: string) => Promise<void>;
  scheduleDailyTourReminder: (incompleteTours: string[]) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  isInitialized: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    tourCompletion: true,
    locationBased: true,
    pushNotifications: true,
    inAppNotifications: true,
  });
  const [isInitialized, setIsInitialized] = useState(false);
  
  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    initializeNotifications();
    setupNotificationListeners();
    
    return () => {
      // Cleanup listeners
    };
  }, []);

  const initializeNotifications = async () => {
    console.log('🔔 Initializing notification context...');
    
    try {
      await notificationService.initialize();
      const currentSettings = notificationService.getSettings();
      setSettings(currentSettings);
      setIsInitialized(true);
      
      console.log('✅ Notification context initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notification context:', error);
      setIsInitialized(true); // Set to true even on error so app doesn't hang
    }
  };

  const setupNotificationListeners = () => {
    // Listen for notification responses (when user taps notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('👆 User tapped notification:', data);
      
      // Handle different notification types
      handleNotificationResponse(data);
    });

    // Listen for notifications received while app is in foreground
    const receivedListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notification received in foreground:', notification);
      // You can handle foreground notifications here if needed
    });

    return () => {
      responseListener.remove();
      receivedListener.remove();
    };
  };

  const handleNotificationResponse = (data: any) => {
    // Handle navigation based on notification type
    switch (data?.type) {
      case 'tour_completion':
        // Could navigate to tour completion screen or stats
        console.log('🎉 Tour completion notification tapped');
        break;
      
      case 'location_based':
        // Could navigate to the specific tour/stop
        console.log('📍 Location notification tapped');
        break;
      
      case 'tour_downloaded':
        // Could navigate to offline downloads or the tour
        console.log('⬇️ Tour downloaded notification tapped');
        break;
      
      case 'daily_reminder':
        // Could navigate to tours list
        console.log('📅 Daily reminder tapped');
        break;
      
      case 'location_permission':
        // Could open settings or show permission dialog
        console.log('📍 Location permission reminder tapped');
        break;
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      await notificationService.updateSettings(newSettings);
      const updatedSettings = notificationService.getSettings();
      setSettings(updatedSettings);
      
      console.log('⚙️ Notification settings updated:', updatedSettings);
    } catch (error) {
      console.error('❌ Failed to update notification settings:', error);
      throw error;
    }
  };

  const sendTourCompletionNotification = async (
    tourTitle: string, 
    completedStops: number, 
    totalStops: number
  ) => {
    if (!isInitialized) {
      console.warn('⚠️ NotificationService not initialized yet');
      return;
    }
    
    await notificationService.sendTourCompletionNotification(tourTitle, completedStops, totalStops);
  };

  const sendLocationNotification = async (
    message: string, 
    stopTitle: string, 
    tourTitle: string
  ) => {
    if (!isInitialized) {
      console.warn('⚠️ NotificationService not initialized yet');
      return;
    }
    
    await notificationService.sendLocationNotification(message, stopTitle, tourTitle);
  };

  const sendLocationPermissionReminder = async () => {
    if (!isInitialized) {
      console.warn('⚠️ NotificationService not initialized yet');
      return;
    }
    
    await notificationService.sendLocationPermissionReminder();
  };

  const sendTourDownloadedNotification = async (tourTitle: string) => {
    if (!isInitialized) {
      console.warn('⚠️ NotificationService not initialized yet');
      return;
    }
    
    await notificationService.sendTourDownloadedNotification(tourTitle);
  };

  const scheduleDailyTourReminder = async (incompleteTours: string[]) => {
    if (!isInitialized) {
      console.warn('⚠️ NotificationService not initialized yet');
      return;
    }
    
    await notificationService.scheduleDailyTourReminder(incompleteTours);
  };

  const cancelAllNotifications = async () => {
    if (!isInitialized) {
      console.warn('⚠️ NotificationService not initialized yet');
      return;
    }
    
    await notificationService.cancelAllNotifications();
  };

  const value: NotificationContextType = {
    settings,
    updateSettings,
    sendTourCompletionNotification,
    sendLocationNotification,
    sendLocationPermissionReminder,
    sendTourDownloadedNotification,
    scheduleDailyTourReminder,
    cancelAllNotifications,
    isInitialized,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}