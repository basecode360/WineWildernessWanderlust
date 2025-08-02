// app/tour/[id].tsx - Updated Tour Detail Screen with proper Stripe integration
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import PaymentSheet from '../../components/payment/PaymentSheet';
import { getTourById } from '../../data/tours';
import { PaymentService } from '../../services/PaymentService';
import { TourStop } from '../../types/tour';
import { getImageAsset } from '../../utils/imageAssets';

export default function TourDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tour = getTourById(id as string);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(true);

  const paymentService = PaymentService.getInstance();

  useEffect(() => {
    if (tour) {
      checkPurchaseStatus();
    }
  }, [tour]);

  const checkPurchaseStatus = async () => {
    try {
      setCheckingPurchase(true);
      console.log('Checking purchase status for tour:', id);

      const hasPurchased = await paymentService.hasPurchasedTour(id as string);
      console.log('Purchase status:', hasPurchased);

      setIsPurchased(hasPurchased);

      // Update local tour object for UI consistency
      if (tour) {
        tour.isPurchased = hasPurchased;
      }
    } catch (error) {
      console.error('Error checking purchase status:', error);
      // Don't set error state, just assume not purchased
      setIsPurchased(false);
    } finally {
      setCheckingPurchase(false);
    }
  };

  const handlePurchase = async () => {
    if (!tour) return;

    console.log(
      'Handle purchase called. isPurchased:',
      isPurchased,
      'tour.isPurchased:',
      tour.isPurchased
    );

    if (isPurchased || tour.isPurchased) {
      // Already purchased, start tour
      console.log('Tour already purchased, navigating to player');
      router.push(`/tour/player/${tour.id}`);
      return;
    }

    // Show Stripe payment sheet
    console.log(
      'Showing payment sheet for tour:',
      tour.title,
      'Price:',
      tour.price
    );
    setShowPaymentSheet(true);
  };

  const handlePurchaseSuccess = async () => {
    console.log('Purchase successful, updating UI');
    setShowPaymentSheet(false);
    setIsPurchased(true);

    // Update local tour object
    if (tour) {
      tour.isPurchased = true;
    }

    // Show success message with option to start tour
    Alert.alert(
      'Purchase Successful! 🎉',
      `You now have access to "${tour?.title}". Would you like to start the tour now?`,
      [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Start Tour',
          onPress: () => router.push(`/tour/player/${tour?.id}`),
        },
      ]
    );
  };

  const handlePurchaseError = (error: string) => {
    console.error('Purchase error:', error);
    Alert.alert(
      'Purchase Failed',
      error || 'Something went wrong. Please try again.',
      [{ text: 'OK' }]
    );
  };

  const handleDownload = async () => {
    if (!isPurchased && !tour?.isPurchased) {
      Alert.alert(
        'Purchase Required',
        'Please purchase the tour first to download it for offline use.'
      );
      return;
    }

    setIsDownloading(true);
    try {
      // TODO: Implement actual download logic using StorageService
      // This would download audio files and images for offline use
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulate download

      Alert.alert('Download Complete', 'Tour is now available offline!');

      // Update tour download status
      if (tour) {
        tour.isDownloaded = true;
      }
    } catch (error) {
      Alert.alert(
        'Download Failed',
        'There was an error downloading the tour. Please try again.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  if (!tour) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Tour not found</Text>
      </View>
    );
  }

  const renderStop = ({ item, index }: { item: TourStop; index: number }) => (
    <View style={styles.stopItem}>
      <View style={styles.stopNumber}>
        <Text style={styles.stopNumberText}>{index + 1}</Text>
      </View>
      <View style={styles.stopContent}>
        <Text style={styles.stopTitle}>{item.title}</Text>
        <Text style={styles.stopType}>
          {item.type.replace('_', ' ').toUpperCase()}
        </Text>
        {item.address && <Text style={styles.stopAddress}>{item.address}</Text>}
        {item.tips && <Text style={styles.stopTips}>💡 {item.tips}</Text>}
      </View>
      <View style={styles.stopIcon}>
        {item.type === 'lobster_stop' ? (
          <Text style={styles.stopEmoji}>🦞</Text>
        ) : item.type === 'bonus_stop' ? (
          <Text style={styles.stopEmoji}>🎁</Text>
        ) : (
          <Text style={styles.stopEmoji}>ℹ️</Text>
        )}
      </View>
    </View>
  );

  const showPurchased = isPurchased || tour.isPurchased;

  return (
    <ScrollView style={styles.container}>
      {/* Tour Header Image */}
      <View style={styles.imageContainer}>
        {tour.image ? (
          <Image
            source={getImageAsset(tour.image)}
            style={styles.tourImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imageEmoji}>🦞</Text>
          </View>
        )}

        {showPurchased && (
          <View style={styles.purchasedBadge}>
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.purchasedText}>Purchased</Text>
          </View>
        )}
      </View>

      {/* Tour Info */}
      <View style={styles.content}>
        <Text style={styles.title}>{tour.title}</Text>
        <Text style={styles.description}>{tour.description}</Text>

        {/* Tour Meta */}
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={20} color="#5CC4C4" />
            <Text style={styles.metaText}>{tour.duration}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="car-outline" size={20} color="#5CC4C4" />
            <Text style={styles.metaText}>{tour.distance}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={20} color="#5CC4C4" />
            <Text style={styles.metaText}>{tour.stops.length} stops</Text>
          </View>
        </View>

        {/* Price and Purchase */}
        <View style={styles.priceContainer}>
          <View style={styles.priceSection}>
            <Text style={styles.priceText}>${tour.price.toFixed(2)}</Text>
            {!showPurchased && (
              <Text style={styles.priceSubtext}>One-time purchase</Text>
            )}
          </View>

          {checkingPurchase ? (
            <View style={styles.loadingButton}>
              <ActivityIndicator color="#5CC4C4" />
              <Text style={styles.loadingText}>Checking...</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.purchaseButton,
                showPurchased && styles.purchaseButtonPurchased,
              ]}
              onPress={handlePurchase}
            >
              <Text style={styles.purchaseButtonText}>
                {showPurchased ? 'Start Tour' : 'Purchase Tour'}
              </Text>
              <Ionicons
                name={showPurchased ? 'play' : 'card-outline'}
                size={20}
                color="#fff"
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Features List (for unpurchased tours) */}
        {!showPurchased && (
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>What's Included:</Text>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.featureText}>
                Full audio tour with professional narration
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.featureText}>
                GPS-triggered audio at each location
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.featureText}>
                Offline download capability
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.featureText}>Lifetime access</Text>
            </View>
          </View>
        )}

        {/* Download Button (if purchased) */}
        {showPurchased && !tour.isDownloaded && (
          <TouchableOpacity
            style={[
              styles.downloadButton,
              isDownloading && styles.downloadButtonDisabled,
            ]}
            onPress={handleDownload}
            disabled={isDownloading}
          >
            <Ionicons
              name={
                isDownloading ? 'download-outline' : 'cloud-download-outline'
              }
              size={20}
              color="#5CC4C4"
            />
            <Text style={styles.downloadButtonText}>
              {isDownloading ? 'Downloading...' : 'Download for Offline'}
            </Text>
          </TouchableOpacity>
        )}

        {tour.isDownloaded && (
          <View style={styles.downloadedIndicator}>
            <Ionicons name="cloud-done-outline" size={20} color="#4CAF50" />
            <Text style={styles.downloadedText}>Available Offline</Text>
          </View>
        )}

        {/* Tour Stops */}
        <View style={styles.stopsSection}>
          <Text style={styles.sectionTitle}>
            Tour Stops ({tour.stops.length})
          </Text>
          <FlatList
            data={tour.stops}
            renderItem={renderStop}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.stopSeparator} />}
          />
        </View>
      </View>

      {/* Stripe Payment Sheet */}
      {showPaymentSheet && (
        <PaymentSheet
          visible={showPaymentSheet}
          onClose={() => setShowPaymentSheet(false)}
          tourId={tour.id}
          tourTitle={tour.title}
          price={tour.price}
          onSuccess={handlePurchaseSuccess}
          onError={handlePurchaseError}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
  },
  imageContainer: {
    height: 250,
    position: 'relative',
  },
  tourImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#5CC4C4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageEmoji: {
    fontSize: 64,
  },
  purchasedBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  purchasedText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  priceSection: {
    flex: 1,
  },
  priceText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#5CC4C4',
  },
  priceSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  loadingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  loadingText: {
    color: '#666',
    marginLeft: 8,
    fontWeight: '600',
  },
  purchaseButton: {
    backgroundColor: '#5CC4C4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  purchaseButtonPurchased: {
    backgroundColor: '#4CAF50',
  },
  purchaseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  featuresContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#5CC4C4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 16,
  },
  downloadButtonDisabled: {
    opacity: 0.6,
  },
  downloadButtonText: {
    color: '#5CC4C4',
    fontWeight: '600',
    marginLeft: 8,
  },
  downloadedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E8',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 16,
  },
  downloadedText: {
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  stopsSection: {
    marginTop: 20,
  },
  stopItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5CC4C4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stopNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stopContent: {
    flex: 1,
  },
  stopTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  stopType: {
    fontSize: 12,
    color: '#5CC4C4',
    fontWeight: '600',
    marginBottom: 4,
  },
  stopAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  stopTips: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  stopIcon: {
    marginLeft: 8,
  },
  stopEmoji: {
    fontSize: 24,
  },
  stopSeparator: {
    height: 12,
  },
});
