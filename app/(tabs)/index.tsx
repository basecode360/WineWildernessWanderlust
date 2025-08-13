// app/(tabs)/index.tsx - Offline-first Tours Screen
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useOffline } from '../../contexts/OfflineContext';
import { useProgress } from '../../contexts/ProgressContext';
import { usePurchases } from '../../contexts/PurchaseContext';
import { getAllTours, getImageSource } from '../../services/tourServices';
import { Tour } from '../../types/tour';
import { ERROR_MESSAGES } from '../../utils/constants';

const { width: screenWidth } = Dimensions.get('window');

export default function ToursScreen() {
  // State for both online and offline tours
  const [tours, setTours] = useState<Tour[]>([]);
  const [isLoadingTours, setIsLoadingTours] = useState(true);
  const [toursError, setToursError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState<'online' | 'offline' | 'mixed'>('online');

  const { user } = useAuth();
  const { totalVisitedPlaces } = useProgress();
  const { hasPurchased, isLoadingPurchases } = usePurchases();
  const { 
    offlineTours, 
    isLoadingOffline, 
    totalStorageUsed, 
    formatStorageSize, 
    isOnline,
    isTourOffline,
    getOfflineTour
  } = useOffline();

  // Load tours on component mount
  useEffect(() => {
    loadTours();
  }, []);

  // Watch for offline tours changes
  useEffect(() => {
    if (offlineTours.length > 0 && tours.length === 0) {
      console.log('📱 No online tours but found offline tours, using offline data');
      setTours(offlineTours.map(content => ({
        ...content.tourData,
        isDownloaded: true
      })));
      setDataSource('offline');
      setIsLoadingTours(false);
    }
  }, [offlineTours, tours.length]);

  // Enhanced load tours function with offline-first approach
  const loadTours = async () => {
    try {
      setIsLoadingTours(true);
      setToursError(null);
      console.log('📱 Loading tours with offline-first approach...');

      // First, always show offline tours if we have them (immediate response)
      if (offlineTours.length > 0 && !refreshing) {
        console.log(`📱 Showing ${offlineTours.length} offline tours immediately`);
        setTours(offlineTours.map(content => ({
          ...content.tourData,
          isDownloaded: true
        })));
        setDataSource('offline');
        setIsLoadingTours(false);
      }

      // Then try to fetch online tours (if connected)
      if (isOnline) {
        console.log('🌐 Network available, fetching latest tours from Supabase...');
        
        try {
          const onlineToursData = await getAllTours();
          console.log(`🌐 Loaded ${onlineToursData.length} tours from Supabase`);
          
          // Merge online and offline tours
          const mergedTours = mergeToursData(onlineToursData, offlineTours);
          setTours(mergedTours);
          setDataSource(offlineTours.length > 0 ? 'mixed' : 'online');
          
        } catch (onlineError) {
          console.warn('⚠️ Failed to load online tours, keeping offline data:', onlineError);
          
          // If we have offline tours, keep using them
          if (offlineTours.length > 0) {
            console.log('📱 Using offline tours as fallback');
            setTours(offlineTours.map(content => ({
              ...content.tourData,
              isDownloaded: true
            })));
            setDataSource('offline');
          } else {
            // No offline tours and online failed
            throw onlineError;
          }
        }
      } else {
        console.log('🔌 No network connection');
        
        // If offline and we have cached tours, use them
        if (offlineTours.length > 0) {
          console.log('📱 Using offline tours (no network)');
          setTours(offlineTours.map(content => ({
            ...content.tourData,
            isDownloaded: true
          })));
          setDataSource('offline');
        } else {
          // No network and no offline tours
          throw new Error('No internet connection and no offline tours available');
        }
      }

    } catch (error) {
      console.error('❌ Failed to load tours:', error);
      
      // If we have any offline tours, use them as last resort
      if (offlineTours.length > 0) {
        console.log('📱 Using offline tours as error fallback');
        setTours(offlineTours.map(content => ({
          ...content.tourData,
          isDownloaded: true
        })));
        setDataSource('offline');
        setToursError(null); // Clear error since we have fallback data
      } else {
        setToursError(error instanceof Error ? error.message : ERROR_MESSAGES.API_ERROR);
        
        // Show alert only if this isn't a silent refresh
        if (!refreshing) {
          Alert.alert(
            'Unable to Load Tours',
            isOnline 
              ? 'Unable to load tours. Please check your internet connection and try again.'
              : 'No internet connection and no offline tours available. Please connect to the internet to download tours.',
            [
              { text: 'Retry', onPress: loadTours },
              { text: 'Cancel' }
            ]
          );
        }
      }
    } finally {
      setIsLoadingTours(false);
    }
  };

  // Helper function to merge online and offline tour data
  const mergeToursData = (onlineTours: Tour[], offlineTours: OfflineContent[]): Tour[] => {
    const mergedTours: Tour[] = [];
    const offlineIds = new Set(offlineTours.map(ot => ot.tourId));
    
    // Add online tours, marking downloaded ones
    onlineTours.forEach(tour => {
      mergedTours.push({
        ...tour,
        isDownloaded: offlineIds.has(tour.id)
      });
    });
    
    // Add any offline tours that aren't in the online list
    offlineTours.forEach(offlineContent => {
      if (!mergedTours.find(t => t.id === offlineContent.tourId)) {
        mergedTours.push({
          ...offlineContent.tourData,
          isDownloaded: true
        });
      }
    });
    
    return mergedTours;
  };

  // Pull to refresh function
  const onRefresh = async () => {
    setRefreshing(true);
    await loadTours();
    setRefreshing(false);
  };

  const handleTourPress = (tourId: string) => {
    router.push(`/tour/${tourId}`);
  };

  const handlePlayTour = (tourId: string) => {
    router.push(`/tour/player/${tourId}`);
  };

  const getCompletedToursCount = () => {
    return tours.filter((tour) => hasPurchased(tour.id)).length;
  };

  // Safe rendering helpers
  const renderUserName = () => {
    const name = user?.user_metadata?.full_name || 'Explorer';
    return typeof name === 'string' ? name : 'Explorer';
  };

  const renderTourTitle = (title: string | undefined) => {
    return typeof title === 'string' ? title : 'Untitled Tour';
  };

  const renderTourDescription = (description: string | undefined) => {
    return typeof description === 'string' ? description : 'No description available';
  };

  const renderTourDuration = (duration: string | undefined) => {
    return typeof duration === 'string' ? duration : 'N/A';
  };

  const renderTourDistance = (distance: string | undefined) => {
    return typeof distance === 'string' ? distance : 'N/A';
  };

  const renderTourPrice = (price: number | string | undefined) => {
    if (typeof price === 'number') return `$${price}`;
    if (typeof price === 'string') return price.startsWith('$') ? price : `$${price}`;
    return '$0';
  };

  const renderStopsCount = (stops: any[] | undefined) => {
    const count = Array.isArray(stops) ? stops.length : 0;
    return `${count} stops`;
  };

  // Render data source indicator
  const renderDataSourceIndicator = () => {
    if (dataSource === 'offline') {
      return (
        <View style={styles.dataSourceIndicator}>
          <Ionicons name="cloud-offline" size={16} color="#FF9800" />
          <Text style={styles.dataSourceText}>Offline Mode</Text>
        </View>
      );
    } else if (dataSource === 'mixed') {
     /*setTimeout(() => {
       return (
        <View style={styles.dataSourceIndicator}>
          <Ionicons name="cloud-done" size={16} color="#4CAF50" />
          <Text style={styles.dataSourceText}>Online + Offline</Text>
        </View>
      );
     }, 2000);*/
    }
    return null;
  };

  // Loading state
  if (isLoadingPurchases || (isLoadingTours && !refreshing && tours.length === 0)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5CC4C4" />
          <Text style={styles.loadingText}>
            {isLoadingTours ? 'Loading tours...' : 'Loading your tours...'}
          </Text>
          {!isOnline && (
            <Text style={styles.offlineHint}>
              📱 Checking for offline tours...
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Error state (only show if no tours available at all)
  if (toursError && !refreshing && tours.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons 
            name={isOnline ? "warning-outline" : "cloud-offline-outline"} 
            size={64} 
            color="#F44336" 
          />
          <Text style={styles.errorTitle}>
            {isOnline ? 'Unable to Load Tours' : 'No Offline Tours'}
          </Text>
          <Text style={styles.errorText}>
            {isOnline 
              ? toursError 
              : 'No internet connection and no tours downloaded for offline use.'
            }
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTours}>
            <Text style={styles.retryButtonText}>
              {isOnline ? 'Try Again' : 'Check Again'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state (no tours found but no error)
  if (tours.length === 0 && !isLoadingTours) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.emptyContainer}>
            <Ionicons name="map-outline" size={64} color="#666" />
            <Text style={styles.emptyTitle}>No Tours Available</Text>
            <Text style={styles.emptyText}>
              {isOnline 
                ? 'Check back later for new tours!' 
                : 'Connect to the internet to browse and download tours.'
              }
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadTours}>
              <Text style={styles.retryButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Network Status Indicator */}
        {renderDataSourceIndicator()}

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome back, {renderUserName()}! 👋
          </Text>
          <Text style={styles.welcomeSubtext}>
            {isOnline 
              ? 'Discover amazing audio tours and local experiences'
              : 'Enjoy your downloaded tours offline'
            }
          </Text>
        </View>

        {/* Tours Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {dataSource === 'offline' ? 'Downloaded Tours' : 'Featured Tours'}
            </Text>
            {tours.length > 0 && (
              <Text style={styles.tourCount}>
                {tours.length} tour{tours.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>

          {tours.map((tour) => {
            if (!tour || !tour.id) {
              console.warn('❌ Invalid tour data:', tour);
              return null;
            }

            const isPurchased = hasPurchased(tour.id);
            const isDownloaded = isTourOffline(tour.id);

            return (
              <TouchableOpacity
                key={tour.id}
                style={styles.tourCard}
                onPress={() => handleTourPress(tour.id)}
                activeOpacity={0.8}
              >
                {/* Tour Image */}
                <View style={styles.imageContainer}>
                  <Image
                    source={getImageSource(tour.image)}
                    style={styles.tourImage}
                    resizeMode="cover"
                    onError={(e) => {
                      console.log('❌ Image load error for tour:', tour.id, e.nativeEvent.error);
                    }}
                    onLoad={() => {
                      console.log('✅ Image loaded for tour:', tour.id);
                    }}
                  />
                  <View style={styles.imageOverlay}>
                    {/* Download Status */}
                    {isDownloaded && (
                      <View style={styles.downloadedTag}>
                        <Ionicons name="download" size={16} color="#fff" />
                        <Text style={styles.downloadedText}>Offline</Text>
                      </View>
                    )}
                    
                    {/* Purchase Status / Price */}
                    {isPurchased ? (
                      <View style={[styles.purchasedTag, isDownloaded && { marginTop: 8 }]}>
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
                        <Text style={styles.purchasedText}>Owned</Text>
                      </View>
                    ) : (
                      <View style={[styles.priceTag, isDownloaded && { marginTop: 8 }]}>
                        <Text style={styles.priceText}>{renderTourPrice(tour.price)}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Tour Info */}
                <View style={styles.tourInfo}>
                  <Text style={styles.tourTitle}>{renderTourTitle(tour.title)}</Text>
                  <Text style={styles.tourDescription} numberOfLines={2}>
                    {renderTourDescription(tour.description)}
                  </Text>

                  {/* Tour Stats */}
                  <View style={styles.tourStats}>
                    <View style={styles.statItem}>
                      <Ionicons name="time-outline" size={16} color="#666" />
                      <Text style={styles.statText}>{renderTourDuration(tour.duration)}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="location-outline" size={16} color="#666" />
                      <Text style={styles.statText}>{renderTourDistance(tour.distance)}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="headset-outline" size={16} color="#666" />
                      <Text style={styles.statText}>
                        {renderStopsCount(tour.stops)}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    {isPurchased ? (
                      <TouchableOpacity
                        style={[
                          styles.playButton,
                          !isOnline && !isDownloaded && styles.disabledButton
                        ]}
                        onPress={() => handlePlayTour(tour.id)}
                        disabled={!isOnline && !isDownloaded}
                      >
                        <Ionicons name="play" size={20} color="#fff" />
                        <Text style={styles.playButtonText}>
                          {!isOnline && !isDownloaded ? 'Offline' : 'Play Tour'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.purchaseButton,
                          !isOnline && styles.disabledButton
                        ]}
                        onPress={() => handleTourPress(tour.id)}
                        disabled={!isOnline}
                      >
                        <Ionicons
                          name="card-outline"
                          size={20}
                          color={isOnline ? "#5CC4C4" : "#999"}
                        />
                        <Text style={[
                          styles.purchaseButtonText,
                          !isOnline && styles.disabledText
                        ]}>
                          {isOnline ? 'Purchase' : 'Need Internet'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.detailsButton}
                      onPress={() => handleTourPress(tour.id)}
                    >
                      <Text style={styles.detailsButtonText}>View Details</Text>
                      <Ionicons name="chevron-forward" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Activity</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="headset" size={32} color="#5CC4C4" />
              <Text style={styles.statNumber}>{getCompletedToursCount()}</Text>
              <Text style={styles.statLabel}>Tours Owned</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="download" size={24} color="#5CC4C4" />
              <Text style={styles.statNumber}>{offlineTours.length}</Text>
              <Text style={styles.statLabel}>Downloaded</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="location" size={32} color="#5CC4C4" />
              <Text style={styles.statNumber}>{totalVisitedPlaces || 0}</Text>
              <Text style={styles.statLabel}>Places Visited</Text>
            </View>
          </View>

          {/* Storage Usage (if any offline content) 
          {offlineTours.length > 0 && (
            <View style={styles.storageInfo}>
              <Text style={styles.storageText}>
                💾 Offline storage: {formatStorageSize(totalStorageUsed)}
              </Text>
            </View>
          )}*/}
        </View>

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Enhanced styles with new offline features
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  offlineHint: {
    marginTop: 8,
    fontSize: 14,
    color: '#FF9800',
    textAlign: 'center',
  },
  // Data source indicator
  dataSourceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 20,
  },
  dataSourceText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#5CC4C4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  welcomeSection: {
    padding: 20,
    backgroundColor: '#5CC4C4',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  tourCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tourCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  tourImage: {
    width: '100%',
    height: 200,
  },
  imageOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  downloadedTag: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  priceTag: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priceText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  purchasedTag: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  purchasedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  tourInfo: {
    padding: 16,
  },
  tourTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  tourDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  tourStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  purchaseButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#5CC4C4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  purchaseButtonText: {
    color: '#5CC4C4',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
    borderColor: '#E0E0E0',
  },
  disabledText: {
    color: '#999',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailsButtonText: {
    color: '#666',
    fontSize: 14,
    marginRight: 4,
  },
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  storageInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  storageText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  bottomPadding: {
    height: 20,
  },
});