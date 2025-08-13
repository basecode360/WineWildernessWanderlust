// app/(tabs)/index.tsx - Updated Tours Screen with dynamic Supabase data
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react'; // ADDED: useState, useEffect
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image, // ADDED: Alert
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useProgress } from '../../contexts/ProgressContext'; // Add this
import { useAuth } from '../../contexts/AuthContext';
import { useOffline } from '../../contexts/OfflineContext';
import { usePurchases } from '../../contexts/PurchaseContext';
// CHANGED: Import from services instead of data
import { getAllTours, getImageSource } from '../../services/tourServices';
// REMOVED: import { getImageAsset } from '../../utils/imageAssets';
import { Tour } from '../../types/tour'; // ADDED: Tour type
import { ERROR_MESSAGES } from '../../utils/constants'; // ADDED: Error messages

const { width: screenWidth } = Dimensions.get('window');

export default function ToursScreen() {
  // CHANGED: Dynamic state instead of static data
  const [tours, setTours] = useState<Tour[]>([]);
  const [isLoadingTours, setIsLoadingTours] = useState(true);
  const [toursError, setToursError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const { user } = useAuth();
  const { totalVisitedPlaces } = useProgress(); // Add this
  const { hasPurchased, isLoadingPurchases } = usePurchases();
  const { offlineTours, totalStorageUsed, formatStorageSize } = useOffline();

  // NEW: Load tours on component mount
  useEffect(() => {
    loadTours();
  }, []);

  // NEW: Function to load tours from Supabase
  const loadTours = async () => {
    try {
      setIsLoadingTours(true);
      setToursError(null);
      console.log('📱 Loading tours from Supabase...');
      
      const toursData = await getAllTours();
      setTours(toursData);
      console.log('✅ Tours loaded successfully:', toursData.length);
    } catch (error) {
      console.error('❌ Failed to load tours:', error);
      setToursError(error instanceof Error ? error.message : ERROR_MESSAGES.API_ERROR);
      
      // Show alert to user
      Alert.alert(
        'Error Loading Tours',
        'Unable to load tours. Please check your internet connection and try again.',
        [
          { text: 'Retry', onPress: loadTours },
          { text: 'Cancel' }
        ]
      );
    } finally {
      setIsLoadingTours(false);
    }
  };

  // NEW: Pull to refresh function
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

  // UPDATED: Loading state
  if (isLoadingPurchases || (isLoadingTours && !refreshing)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5CC4C4" />
          <Text style={styles.loadingText}>
            {isLoadingTours ? 'Loading tours...' : 'Loading your tours...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // NEW: Error state
  if (toursError && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={64} color="#F44336" />
          <Text style={styles.errorTitle}>Unable to Load Tours</Text>
          <Text style={styles.errorText}>{toursError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTours}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // NEW: Empty state
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
            <Text style={styles.emptyText}>Check back later for new tours!</Text>
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
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome back, {user?.user_metadata?.full_name || 'Explorer'}! 👋
          </Text>
          <Text style={styles.welcomeSubtext}>
            Discover amazing audio tours and local experiences
          </Text>
        </View>

        {/* Featured Tours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Tours</Text>

          {tours.map((tour) => {
            const isPurchased = hasPurchased(tour.id);

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
  source={getImageSource(tour.image)} // Use the smart image source function
  style={styles.tourImage}
  resizeMode="cover"
  onError={(e) => {
    console.log('❌ Image load error for tour:', tour.id, e.nativeEvent.error);
    console.log('❌ Failed image source:', tour.image);
  }}
  onLoad={() => {
    console.log('✅ Image loaded for tour:', tour.id);
  }}
/>
                  <View style={styles.imageOverlay}>
                    {isPurchased ? (
                      <View style={styles.purchasedTag}>
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="#fff"
                        />
                        <Text style={styles.purchasedText}>Owned</Text>
                      </View>
                    ) : (
                      <View style={styles.priceTag}>
                        <Text style={styles.priceText}>${tour.price}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Tour Info */}
                <View style={styles.tourInfo}>
                  <Text style={styles.tourTitle}>{tour.title}</Text>
                  <Text style={styles.tourDescription} numberOfLines={2}>
                    {tour.description}
                  </Text>

                  {/* Tour Stats */}
                  <View style={styles.tourStats}>
                    <View style={styles.statItem}>
                      <Ionicons name="time-outline" size={16} color="#666" />
                      <Text style={styles.statText}>{tour.duration}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color="#666"
                      />
                      <Text style={styles.statText}>{tour.distance}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="headset-outline" size={16} color="#666" />
                      <Text style={styles.statText}>
                        {tour.stops.length} stops
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    {isPurchased ? (
                      <TouchableOpacity
                        style={styles.playButton}
                        onPress={() => handlePlayTour(tour.id)}
                      >
                        <Ionicons name="play" size={20} color="#fff" />
                        <Text style={styles.playButtonText}>Play Tour</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.purchaseButton}
                        onPress={() => handleTourPress(tour.id)}
                      >
                        <Ionicons
                          name="card-outline"
                          size={20}
                          color="#5CC4C4"
                        />
                        <Text style={styles.purchaseButtonText}>Purchase</Text>
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
  <Text style={styles.statNumber}>{totalVisitedPlaces}</Text> {/* Changed from 0 */}
  <Text style={styles.statLabel}>Places Visited</Text>
</View>
          </View>
        </View>

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

// UPDATED: Styles with new error and empty states
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
  // NEW: Error state styles
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
  // NEW: Empty state styles
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
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
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
  bottomPadding: {
    height: 20,
  },
});