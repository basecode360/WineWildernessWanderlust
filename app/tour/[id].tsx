// app/tour/[id].tsx - Complete Tour Detail Screen with instant purchase status
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
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
import { usePurchases } from '../../contexts/PurchaseContext';
import { useOffline } from '../../contexts/OfflineContext';
import { getTourById } from '../../data/tours';
import { TourStop } from '../../types/tour';
import { getImageAsset } from '../../utils/imageAssets';

export default function TourDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tour = getTourById(id as string);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);

  const { hasPurchased, addPurchase } = usePurchases();
  const {
    isTourOffline,
    downloadTour,
    removeTour,
    downloadProgress,
    isDownloading,
    formatStorageSize,
    cancelDownload,
  } = useOffline();

  // Get purchase status instantly from cache
  const isPurchased = hasPurchased(id as string);
  const isOffline = isTourOffline(id as string);
  const downloadingProgress = downloadProgress.get(id as string);
  const downloading = isDownloading(id as string);

  const handlePurchase = async () => {
    if (!tour) return;


    if (isPurchased) {
      // Already purchased, start tour
      router.push(`/tour/player/${tour.id}`);
      return;
    }

    // Show Stripe payment sheet
    
    setShowPaymentSheet(true);
  };

  const handlePurchaseSuccess = async () => {
    setShowPaymentSheet(false);

    // Add to local cache immediately for instant UI update
    addPurchase(id as string);

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
    Alert.alert(
      'Purchase Failed',
      error || 'Something went wrong. Please try again.',
      [{ text: 'OK' }]
    );
  };

  const handleDownload = async () => {
    if (!isPurchased) {
      Alert.alert(
        'Purchase Required',
        'Please purchase the tour first to download it for offline use.'
      );
      return;
    }

    if (isOffline) {
      // Tour is already downloaded, offer to remove it
      Alert.alert(
        'Remove Offline Content',
        'This tour is already available offline. Would you like to remove it to free up space?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeTour(id as string);
                Alert.alert('Success', 'Tour removed from offline storage.');
              } catch (error) {
                Alert.alert(
                  'Error',
                  'Failed to remove tour from offline storage.'
                );
              }
            },
          },
        ]
      );
      return;
    }

    if (downloading) {
      // Download in progress, offer to cancel
      Alert.alert(
        'Cancel Download',
        'Download is in progress. Would you like to cancel it?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Cancel Download',
            style: 'destructive',
            onPress: async () => {
              await cancelDownload(id as string);
            },
          },
        ]
      );
      return;
    }

    // Start download
    try {
      const success = await downloadTour(id as string);
      if (success) {
        Alert.alert('Download Complete', 'Tour is now available offline!');
      } else {
        Alert.alert(
          'Download Failed',
          'There was an error downloading the tour. Please try again.'
        );
      }
    } catch (error) {
      Alert.alert(
        'Download Failed',
        'There was an error downloading the tour. Please try again.'
      );
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

        {isPurchased && (
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
            {!isPurchased && (
              <Text style={styles.priceSubtext}>One-time purchase</Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.purchaseButton,
              isPurchased && styles.purchaseButtonPurchased,
            ]}
            onPress={handlePurchase}
          >
            <Text style={styles.purchaseButtonText}>
              {isPurchased ? 'Start Tour' : 'Purchase Tour'}
            </Text>
            <Ionicons
              name={isPurchased ? 'play' : 'card-outline'}
              size={20}
              color="#fff"
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
        </View>

        {/* Features List (for unpurchased tours) */}
        {!isPurchased && (
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

        {/* Download Button/Status (if purchased) */}
        {isPurchased && (
          <View style={styles.downloadSection}>
            {downloading && downloadingProgress && (
              <View style={styles.downloadProgressContainer}>
                <View style={styles.downloadProgressHeader}>
                  <Text style={styles.downloadProgressTitle}>
                    Downloading...{' '}
                    {Math.round(downloadingProgress.progress * 100)}%
                  </Text>
                  <TouchableOpacity
                    style={styles.cancelDownloadButton}
                    onPress={handleDownload}
                  >
                    <Ionicons name="close" size={16} color="#ff4444" />
                  </TouchableOpacity>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${downloadingProgress.progress * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.downloadProgressText}>
                  {downloadingProgress.currentFile}
                </Text>
              </View>
            )}

            {!downloading && !isOffline && (
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={handleDownload}
              >
                <Ionicons
                  name="cloud-download-outline"
                  size={20}
                  color="#5CC4C4"
                />
                <Text style={styles.downloadButtonText}>
                  Download for Offline
                </Text>
              </TouchableOpacity>
            )}

            {!downloading && isOffline && (
              <View style={styles.downloadedContainer}>
                <View style={styles.downloadedIndicator}>
                  <Ionicons
                    name="cloud-done-outline"
                    size={20}
                    color="#4CAF50"
                  />
                  <Text style={styles.downloadedText}>Available Offline</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeOfflineButton}
                  onPress={handleDownload}
                >
                  <Ionicons name="trash-outline" size={16} color="#ff4444" />
                  <Text style={styles.removeOfflineText}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
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
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  downloadButtonText: {
    color: '#5CC4C4',
    fontWeight: '600',
    marginLeft: 8,
  },
  downloadSection: {
    marginBottom: 16,
  },
  downloadProgressContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  downloadProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  downloadProgressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cancelDownloadButton: {
    padding: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#5CC4C4',
    borderRadius: 2,
  },
  downloadProgressText: {
    fontSize: 12,
    color: '#666',
  },
  downloadedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  downloadedIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E8',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginRight: 12,
  },
  downloadedText: {
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 8,
  },
  removeOfflineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  removeOfflineText: {
    color: '#ff4444',
    fontSize: 14,
    marginLeft: 4,
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
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
