// app/offline-downloads.tsx - Fixed Offline Downloads Management with proper image handling
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOffline } from '../contexts/OfflineContext';
import { getImageUrl } from '../services/tourServices'; // Import the function

// Enhanced OfflineContent interface
interface OfflineContent {
  tourId: string;
  tourData: {
    id: string;
    title: string;
    description: string;
    duration: string;
    distance: string;
    price: number;
    image?: string;
    stops: any[];
  };
  downloadedAt: string;
  size: number;
}

export default function OfflineDownloadsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [tourImages, setTourImages] = useState<Record<string, string | null>>({});

  const insets = useSafeAreaInsets();

  const {
    offlineTours,
    isLoadingOffline,
    totalStorageUsed,
    removeTour,
    refreshOfflineContent,
    clearAllOfflineContent,
    formatStorageSize,
    isOnline
  } = useOffline();

  // DEBUG LOGS for offline mode
  console.log('📱 STRICT OFFLINE Downloads Screen:');
  console.log('📊 offlineTours:', offlineTours.length);
  console.log('📊 totalStorageUsed:', totalStorageUsed);
  console.log('📊 isOnline:', isOnline);
  console.log('📊 Storage formatted:', formatStorageSize(totalStorageUsed));

  // Load tour images when offline tours change
  useEffect(() => {
    loadTourImages();
  }, [offlineTours]);

  // Load images for all offline tours
  const loadTourImages = async () => {
    const imagePromises = offlineTours.map(async (tour) => {
      try {
        // Use the getImageUrl function from tourServices with offline fallback
        const imageUrl = await getImageUrl(
          tour.tourData.image || null,
          tour.tourId,
          'main' // Use 'main' as the image key for the main tour image
        );
        return { tourId: tour.tourId, imageUrl };
      } catch (error) {
        console.warn(`Failed to load image for tour ${tour.tourId}:`, error);
        return { tourId: tour.tourId, imageUrl: null };
      }
    });

    const imageResults = await Promise.all(imagePromises);
    const imageMap: Record<string, string | null> = {};
    
    imageResults.forEach(({ tourId, imageUrl }) => {
      imageMap[tourId] = imageUrl;
    });

    setTourImages(imageMap);
  };

  // Check storage usage and show warnings
  useEffect(() => {
    checkStorageUsage();
  }, [totalStorageUsed]);

  const checkStorageUsage = () => {
    const usageInMB = totalStorageUsed / (1024 * 1024);
    
    if (usageInMB > 500) { // Over 500MB
      setStorageWarning('High storage usage detected');
    } else if (usageInMB > 200) { // Over 200MB
      setStorageWarning('Consider managing storage');
    } else {
      setStorageWarning(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshOfflineContent();
      // Reload images after refreshing content
      await loadTourImages();
    } catch (error) {
      Alert.alert('Refresh Error', 'Failed to refresh offline content');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemoveTour = (tourId: string, tourTitle: string) => {
    Alert.alert(
      'Remove Downloaded Tour',
      `Remove "${tourTitle}" from your device? You'll need an internet connection to download it again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeTour(tourId);
              // Remove the image from local state
              setTourImages(prev => {
                const updated = { ...prev };
                delete updated[tourId];
                return updated;
              });
              Alert.alert('Removed', 'Tour removed from your device.');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove tour. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (offlineTours.length === 0) {
      Alert.alert('No Content', 'No downloaded tours to remove.');
      return;
    }

    Alert.alert(
      'Remove All Downloads',
      `This will remove all ${offlineTours.length} downloaded tours and free up ${formatStorageSize(totalStorageUsed)} of storage. You'll need internet to download them again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllOfflineContent();
              // Clear all images from local state
              setTourImages({});
              Alert.alert('Success', 'All downloaded content has been removed.');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove content. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleTourPress = (tourId: string) => {
    // In strict offline mode, only downloaded tours are accessible
    router.push(`/tour/${tourId}`);
  };

  const handlePlayTour = (tourId: string) => {
    // Direct play from offline storage
    router.push(`/tour/player/${tourId}`);
  };

const formatDownloadDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();

  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    if (diffMinutes < 1) return 'Downloaded just now';
    return `Downloaded ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  }

  if (diffHours < 24) {
    return `Downloaded ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }

  if (diffDays === 1) return 'Downloaded yesterday';
  if (diffDays < 7) return `Downloaded ${diffDays} days ago`;
  if (diffDays < 30) return `Downloaded ${Math.ceil(diffDays / 7)} weeks ago`;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};



  // Enhanced offline image resolver using tourServices
  const getOfflineImageSource = (tour: OfflineContent) => {
    const imageUrl = tourImages[tour.tourId];
    
    if (!imageUrl) return null;
    
    // Return the proper image source object for React Native Image component
    if (imageUrl.startsWith('file://')) {
      return { uri: imageUrl };
    } else if (imageUrl.startsWith('http')) {
      return { uri: imageUrl };
    }
    
    return null;
  };

  const renderOfflineTour = ({ item }: { item: OfflineContent }) => {
    const imageSource = getOfflineImageSource(item);

    return (
      <TouchableOpacity
        style={styles.tourCard}
        onPress={() => handleTourPress(item.tourId)}
        activeOpacity={0.8}
      >
        <View style={styles.tourImageContainer}>
          {imageSource ? (
            <Image
              source={imageSource}
              style={styles.tourImage}
              resizeMode="cover"
              onError={(error) => {
                console.warn('Failed to load offline tour image:', error.nativeEvent.error);
              }}
              onLoad={() => {
                console.log(`✅ Successfully loaded image for tour ${item.tourId}`);
              }}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="download" size={32} color="#5CC4C4" />
              <Text style={styles.placeholderText}>Downloaded</Text>
            </View>
          )}
          
          {/* Offline Status Badge */}
          <View style={styles.offlineBadge}>
            <Ionicons name="cloud-done" size={16} color="#fff" />
          </View>
        </View>

        <View style={styles.tourInfo}>
          <Text style={styles.tourTitle} numberOfLines={1}>
            {item.tourData.title}
          </Text>
          <Text style={styles.tourDescription} numberOfLines={2}>
            {item.tourData.description}
          </Text>

          <View style={styles.tourMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={styles.metaText}>{item.tourData.duration}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.metaText}>
                {item.tourData.stops?.length || 0} stops
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="phone-portrait-outline" size={14} color="#666" />
              <Text style={styles.metaText}>Offline</Text>
            </View>
          </View>

          <View style={styles.downloadInfo}>
            <Text style={styles.downloadDate}>
              {formatDownloadDate(item.downloadedAt)}
            </Text>
            <Text style={styles.fileSize}>{formatStorageSize(item.size)}</Text>
          </View>
        </View>

        <View style={styles.tourActions}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => handlePlayTour(item.tourId)}
          >
            <Ionicons name="play-circle" size={28} color="#5CC4C4" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveTour(item.tourId, item.tourData.title)}
          >
            <Ionicons name="trash-outline" size={20} color="#ff4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="download-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>No Downloaded Tours</Text>
      <Text style={styles.emptyDescription}>
        Download tours when connected to the internet to enjoy them offline anytime.
      </Text>
      <Text style={styles.emptyHint}>
        💡 Downloaded tours appear here and work without internet
      </Text>
      
      {/* Only show browse button if online */}
      {isOnline && (
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => router.push('/(tabs)')}
        >
          <Ionicons name="cloud-download-outline" size={20} color="#fff" />
          <Text style={styles.browseButtonText}>Browse & Download</Text>
        </TouchableOpacity>
      )}
      
      {!isOnline && (
        <View style={styles.offlineNotice}>
          <Ionicons name="wifi-off" size={16} color="#FF9800" />
          <Text style={styles.offlineNoticeText}>
            Connect to internet to download tours
          </Text>
        </View>
      )}
    </View>
  );

  const renderStorageWarning = () => {
    if (!storageWarning) return null;

    return (
      <View style={styles.warningContainer}>
        <Ionicons name="warning-outline" size={16} color="#FF9800" />
        <Text style={styles.warningText}>{storageWarning}</Text>
        <TouchableOpacity onPress={handleClearAll}>
          <Text style={styles.warningAction}>Manage</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView style={styles.container}>

        {/* Storage Warning */}
        {renderStorageWarning()}

        {/* Storage Summary */}
        <View style={styles.storageContainer}>
          <View style={styles.storageInfo}>
            <View style={styles.storageItem}>
              <Ionicons name="download" size={24} color="#5CC4C4" />
              <View style={styles.storageText}>
                <Text style={styles.storageNumber}>{offlineTours.length}</Text>
                <Text style={styles.storageLabel}>Downloaded</Text>
              </View>
            </View>

            <View style={styles.storageItem}>
              <Ionicons name="phone-portrait" size={24} color="#5CC4C4" />
              <View style={styles.storageText}>
                <Text style={styles.storageNumber}>
                  {formatStorageSize(totalStorageUsed)}
                </Text>
                <Text style={styles.storageLabel}>Storage Used</Text>
              </View>
            </View>

            {offlineTours.length === 0 && (
              <View style={styles.storageItem}>
                <Ionicons name="cloud-done" size={24} color="#5CC4C4" />
                <View style={styles.storageText}>
                  <Text style={styles.storageNumber}>Offline</Text>
                  <Text style={styles.storageLabel}>Ready</Text>
                </View>
              </View>
            )}
          </View>

          {offlineTours.length > 0 && (
            <TouchableOpacity
              style={styles.clearAllButton}
              onPress={handleClearAll}
            >
              <Ionicons name="trash-outline" size={16} color="#ff4444" />
              <Text style={styles.clearAllText}>Remove All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tours List */}
        <FlatList
          data={offlineTours}
          renderItem={renderOfflineTour}
          keyExtractor={(item) => item.tourId}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#5CC4C4']}
              tintColor="#5CC4C4"
            />
          }
          ListEmptyComponent={!isLoadingOffline ? renderEmptyState : null}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  connectionStatus: {
    padding: 8,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  warningText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#E65100',
  },
  warningAction: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
  },
  storageContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storageInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  storageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  storageText: {
    marginLeft: 8,
  },
  storageNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  storageLabel: {
    fontSize: 11,
    color: '#666',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  clearAllText: {
    color: '#ff4444',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  tourCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tourImageContainer: {
    position: 'relative',
  },
  tourImage: {
    width: 100,
    height: 100,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 10,
    color: '#5CC4C4',
    fontWeight: '600',
    marginTop: 4,
  },
  offlineBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#5CC4C4',
    borderRadius: 10,
    padding: 3,
  },
  tourInfo: {
    flex: 1,
    padding: 12,
  },
  tourTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tourDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  tourMeta: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  metaText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 3,
  },
  downloadInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap:20
  },
  downloadDate: {
    fontSize: 11,
    color: '#5CC4C4',
    fontWeight: '500',
  },
  fileSize: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  tourActions: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  playButton: {
    padding: 6,
    marginBottom: 8,
  },
  removeButton: {
    padding: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#5CC4C4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  browseButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  offlineNoticeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#E65100',
    fontWeight: '500',
  },
});