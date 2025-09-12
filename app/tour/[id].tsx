// app/tour/[id].tsx - Enhanced Tour Detail Screen with offline support
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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
} from "react-native";
import {widthPercentageToDP as wp, heightPercentageToDP as hp} from 'react-native-responsive-screen';
import PaymentSheet from "../../components/payment/PaymentSheet";
import { useFavorites } from "../../contexts/FavoritesContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { useOffline } from "../../contexts/OfflineContext";
import { usePurchases } from "../../contexts/PurchaseContext";
import { getImageUrl, getTourById } from "../../services/tourServices";
import { Tour, TourStop } from "../../types/tour";
import { ERROR_MESSAGES } from "../../utils/constants";

export default function TourDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth(); 
  const { sendTourDownloadedNotification } = useNotifications();
  
  // Tour state
  const [tour, setTour] = useState<Tour | null>(null);
  const [isLoadingTour, setIsLoadingTour] = useState(true);
  const [tourError, setTourError] = useState<string | null>(null);
  const [isLoadingOffline, setIsLoadingOffline] = useState(false); // NEW: Track offline loading

  // Image URLs state
  const [tourImageUrl, setTourImageUrl] = useState<string | null>(null);
  const [stopImageUrls, setStopImageUrls] = useState<Map<string, string>>(new Map());

  const [showPaymentSheet, setShowPaymentSheet] = useState(false);

  const { hasPurchased, addPurchase } = usePurchases();
  const { isFavorite, toggleFavorite } = useFavorites();
  const {
    isTourOffline,
    downloadTour,
    removeTour,
    downloadProgress,
    isDownloading,
    formatStorageSize,
    cancelDownload,
    isOnline, // NEW: Use network status
    getOfflineTour, // NEW: Get offline tour data
    getOfflineImagePath, // NEW: Get offline image paths
  } = useOffline();

  // Load tour data on component mount
  useEffect(() => {
    if (id) {
      loadTour(id as string);
    }
  }, [id]);

  // Load image URLs when tour changes
  useEffect(() => {
    if (tour) {
      loadImageUrls();
    }
  }, [tour]);

  // NEW: Enhanced function to load tour from offline or online
  const loadTour = async (tourId: string) => {
    try {
      setIsLoadingTour(true);
      setTourError(null);
      // Loading tour details

      let tourData: Tour | null = null;

      // First, try to load from offline cache if available
      if (isTourOffline(tourId)) {
        // Tour is available offline, loading from cache
        setIsLoadingOffline(true);
        
        try {
          const offlineContent = getOfflineTour(tourId);
          if (offlineContent) {
            tourData = offlineContent.tourData;
            // Tour loaded from offline cache
          }
        } catch (offlineError) {
          console.warn('⚠️ Failed to load from offline cache:', offlineError);
        } finally {
          setIsLoadingOffline(false);
        }
      }

      // If not found offline or if online, try to fetch from Supabase
      if (!tourData && isOnline) {
        // Fetching tour from Supabase
        try {
          tourData = await getTourById(tourId);
          if (tourData) {
            // Tour loaded from Supabase
          }
        } catch (onlineError) {
          console.warn('⚠️ Failed to load from Supabase:', onlineError);
          
          // If online fetch fails but we have offline data, still use offline
          if (isTourOffline(tourId)) {
            const offlineContent = getOfflineTour(tourId);
            if (offlineContent) {
              tourData = offlineContent.tourData;
              // Fallback to offline data
            }
          }
        }
      }

      // Set tour data
      if (tourData) {
        setTour(tourData);
      } else {
        // Tour not found
        if (!isOnline) {
          setTourError("This tour is not available offline. Please connect to the internet to view it.");
        } else {
          setTourError("Tour not found");
        }
      }

    } catch (error) {
      console.error("❌ Failed to load tour:", error);
      setTourError(
        error instanceof Error ? error.message : ERROR_MESSAGES.API_ERROR
      );
    } finally {
      setIsLoadingTour(false);
      setIsLoadingOffline(false);
    }
  };

  // NEW: Enhanced function to load image URLs (offline-first)
  const loadImageUrls = async () => {
    if (!tour) return;

    try {
      const isOfflineTour = isTourOffline(tour.id);
      
      // Load main tour image
      let mainImageUrl: string | null = null;
      
      if (isOfflineTour && user) {
        // Try offline first
        mainImageUrl = await getOfflineImagePath(tour.id, 'main', user.id);
        // Offline main image path set
      }
      
      if (!mainImageUrl && isOnline) {
        // Fallback to online
        mainImageUrl = await getImageUrl(tour.image, tour.id, 'main');
        // Online main image URL set
      }
      
      if (mainImageUrl) {
        setTourImageUrl(mainImageUrl);
      }

      // Load stop images
      const stopImageMap = new Map<string, string>();
      
      for (const stop of tour.stops) {
        if (stop.image) {
          const imageKey = `${stop.id}_image`;
          let stopImageUrl: string | null = null;
          
          if (isOfflineTour && user) {
            // Try offline first
            stopImageUrl = await getOfflineImagePath(tour.id, imageKey, user.id);
          }
          
          if (!stopImageUrl && isOnline) {
            // Fallback to online
            stopImageUrl = await getImageUrl(stop.image, tour.id, imageKey);
          }
          
          if (stopImageUrl) {
            stopImageMap.set(stop.id, stopImageUrl);
          }
        }
      }
      
      setStopImageUrls(stopImageMap);
      
    } catch (error) {
      console.warn('⚠️ Error loading image URLs:', error);
    }
  };

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

    // Check if online for purchase
    if (!isOnline) {
      Alert.alert(
        "Internet Required",
        "You need an internet connection to purchase tours. Please connect to WiFi or mobile data and try again."
      );
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
      "Purchase Successful! 🎉",
      `You now have access to "${tour?.title}". Would you like to start the tour now?`,
      [
        { text: "Later", style: "cancel" },
        {
          text: "Start Tour",
          onPress: () => router.push(`/tour/player/${tour?.id}`),
        },
      ]
    );
  };

  const handlePurchaseError = (error: string) => {
    Alert.alert(
      "Purchase Failed",
      error || "Something went wrong. Please try again.",
      [{ text: "OK" }]
    );
  };

  const handleDownload = async () => {
    if (!isPurchased) {
      Alert.alert(
        "Purchase Required",
        "Please purchase the tour first to download it for offline use."
      );
      return;
    }

    // Check if online for download
    if (!isOnline) {
      Alert.alert(
        "Internet Required",
        "You need an internet connection to download tours for offline use."
      );
      return;
    }

    if (isOffline) {
      // Tour is already downloaded, offer to remove it
      Alert.alert(
        "Remove Offline Content",
        "This tour is already available offline. Would you like to remove it to free up space?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                await removeTour(id as string);
                Alert.alert("Success", "Tour removed from offline storage.");
              } catch (error) {
                Alert.alert("Error", "Failed to remove tour from offline storage.");
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
        "Cancel Download",
        "Download is in progress. Would you like to cancel it?",
        [
          { text: "No", style: "cancel" },
          {
            text: "Cancel Download",
            style: "destructive",
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
        // Send push notification for download completion
        if (tour) {
          await sendTourDownloadedNotification(tour.title);
        }
        
        Alert.alert("Download Complete", "Tour is now available offline!");
        // Reload image URLs to get offline versions
        await loadImageUrls();
      } else {
        Alert.alert(
          "Download Failed",
          "There was an error downloading the tour. Please try again."
        );
      }
    } catch (error) {
      Alert.alert(
        "Download Failed",
        "There was an error downloading the tour. Please try again."
      );
    }
  };

  // Loading state
  if (isLoadingTour) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5CC4C4" />
        <Text style={styles.loadingText}>
          {isLoadingOffline ? "Loading offline content..." : "Loading tour details..."}
        </Text>
        {/* NEW: Show network status */}
        {!isOnline && (
          <Text style={styles.offlineIndicator}>
            📱 Offline Mode
          </Text>
        )}
      </View>
    );
  }

  // Error state
  if (tourError || !tour) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={64} color="#F44336" />
        <Text style={styles.errorTitle}>Unable to Load Tour</Text>
        <Text style={styles.errorText}>{tourError || "Tour not found"}</Text>
        
        {/* NEW: Show different options based on network status */}
        {!isOnline && (
          <Text style={styles.offlineHint}>
            📱 You're offline. This tour might be available when you connect to the internet.
          </Text>
        )}
        
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => id && loadTour(id as string)}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
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
          {item.type.replace("_", " ").toUpperCase()}
        </Text>
        {item.address && <Text style={styles.stopAddress}>{item.address}</Text>}
        {item.tips && <Text style={styles.stopTips}>💡 {item.tips}</Text>}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* NEW: Offline indicator banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="wifi-outline" size={16} color="#fff" />
          <Text style={styles.offlineBannerText}>
            Offline Mode - {isOffline ? "Using downloaded content" : "Limited functionality"}
          </Text>
        </View>
      )}

      {/* Tour Header Image */}
      <View style={styles.imageContainer}>
        {tourImageUrl ? (
          <Image
            source={{ uri: tourImageUrl }}
            style={styles.tourImage}
            resizeMode="cover"
            onError={(e) => {
              // Tour detail image error
              // Failed tour image source
            }}
            onLoad={() => {
              // Tour detail image loaded
            }}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={64} color="#ccc" />
            <Text style={styles.imagePlaceholderText}>Image not available</Text>
          </View>
        )}

        {isPurchased && (
          <View style={styles.purchasedBadge}>
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.purchasedText}>Purchased</Text>
          </View>
        )}

        {/* NEW: Offline indicator on image */}
        {isOffline && (
          <View style={styles.offlineImageBadge}>
            <Ionicons name="cloud-done" size={20} color="#fff" />
            <Text style={styles.offlineImageBadgeText}>Offline</Text>
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

          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.purchaseButton,
                isPurchased && styles.purchaseButtonPurchased,
                !isOnline && !isPurchased && styles.purchaseButtonDisabled, // NEW: Disable when offline
              ]}
              onPress={handlePurchase}
              disabled={!isOnline && !isPurchased} // NEW: Disable purchase when offline
            >
              <Text style={[
                styles.purchaseButtonText,
                !isOnline && !isPurchased && styles.purchaseButtonTextDisabled
              ]}>
                {isPurchased ? "Start Tour" : !isOnline ? "Internet Required" : "Purchase Tour"}
              </Text>
              <Ionicons
                name={isPurchased ? "play" : !isOnline ? "wifi-outline" : "card-outline"}
                size={20}
                color={!isOnline && !isPurchased ? "#999" : "#fff"}
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.favoriteButton,
                isFavorite(id as string) && styles.favoriteButtonActive
              ]}
              onPress={async () => {
                if (!user) {
                  Alert.alert('Sign In Required', 'Please sign in to add favorites.');
                  return;
                }
                
                if (!id) {
                  Alert.alert('Error', 'Invalid tour ID.');
                  return;
                }
                
                try {
                  await toggleFavorite(id as string);
                } catch (error) {
                  console.error('Favorites error:', error);
                  const message = error instanceof Error ? error.message : 'Failed to update favorites. Please try again.';
                  Alert.alert('Error', message);
                }
              }}
            >
              <Ionicons
                name={isFavorite(id as string) ? "heart" : "heart-outline"}
                size={24}
                color={isFavorite(id as string) ? "#fff" : "#5CC4C4"}
              />
            </TouchableOpacity>
          </View>
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
                    Downloading...{" "}
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
                style={[
                  styles.downloadButton,
                  !isOnline && styles.downloadButtonDisabled // NEW: Disable when offline
                ]}
                onPress={handleDownload}
                disabled={!isOnline} // NEW: Disable download when offline
              >
                <Ionicons
                  name="cloud-download-outline"
                  size={20}
                  color={isOnline ? "#5CC4C4" : "#999"}
                />
                <Text style={[
                  styles.downloadButtonText,
                  !isOnline && styles.downloadButtonTextDisabled
                ]}>
                  {isOnline ? "Download for Offline" : "Internet Required"}
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

// Styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#5CC4C4",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 12,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  backButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  imageContainer: {
    height: hp('30%'),
    position: "relative",
  },
  tourImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: "#5CC4C4",
    justifyContent: "center",
    alignItems: "center",
  },
  imageEmoji: {
    fontSize: 64,
  },
  purchasedBadge: {
    position: "absolute",
    top: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  purchasedText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 4,
  },
  content: {
    paddingHorizontal: wp('4%'),
    paddingTop: hp('2%'),
    paddingBottom: hp('1%'),
  },
  title: {
    fontSize: wp('7%'),
    fontWeight: "bold",
    color: "#333",
    marginBottom: hp('1.5%'),
    lineHeight: wp('8.5%'),
  },
  description: {
    fontSize: wp('4%'),
    color: "#666",
    lineHeight: wp('6%'),
    marginBottom: hp('2%'),
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: wp('3%'),
    padding: wp('3%'),
    marginBottom: hp('2%'),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexWrap: 'wrap',
    gap: wp('2%'),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: wp('25%'),
  },
  metaText: {
    marginLeft: wp('1.5%'),
    fontSize: wp('3.5%'),
    color: "#333",
    fontWeight: "500",
  },
  priceContainer: {
    flexDirection: "column",
    gap: hp('1.5%'),
    marginBottom: hp('2%'),
  },
  priceSection: {
    flex: 1,
  },
  priceText: {
    fontSize: wp('8%'),
    fontWeight: "bold",
    color: "#5CC4C4",
  },
  priceSubtext: {
    fontSize: wp('3.5%'),
    color: "#666",
    marginTop: hp('0.3%'),
  },
  purchaseButton: {
    backgroundColor: "#5CC4C4",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: hp('2%'),
    paddingHorizontal: wp('6%'),
    borderRadius: wp('3%'),
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    flex: 1,
    justifyContent: 'center',
    minHeight: hp('7%'),
  },
  purchaseButtonPurchased: {
    backgroundColor: "#4CAF50",
  },
  purchaseButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: wp('4%'),
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: wp('3%'),
    marginTop: hp('1%'),
  },
  favoriteButton: {
    width: hp('7%'),
    height: hp('7%'),
    borderRadius: wp('3%'),
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#5CC4C4',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  favoriteButtonActive: {
    backgroundColor: '#5CC4C4',
    borderColor: '#5CC4C4',
  },
  featuresContainer: {
    backgroundColor: "#fff",
    borderRadius: wp('3%'),
    padding: wp('4%'),
    marginBottom: hp('1.5%'),
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  featuresTitle: {
    fontSize: wp('4%'),
    fontWeight: "bold",
    color: "#333",
    marginBottom: hp('1.5%'),
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp('1%'),
  },
  featureText: {
    fontSize: wp('3.5%'),
    color: "#666",
    marginLeft: wp('2%'),
    flex: 1,
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#5CC4C4",
    paddingVertical: hp('1.8%'),
    paddingHorizontal: wp('5%'),
    borderRadius: wp('3%'),
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minHeight: hp('6%'),
  },
  downloadButtonText: {
    color: "#5CC4C4",
    fontWeight: "600",
    marginLeft: wp('2%'),
    fontSize: wp('3.8%'),
  },
  downloadSection: {
    marginBottom: hp('1.5%'),
  },
  downloadProgressContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  downloadProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  downloadProgressTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  cancelDownloadButton: {
    padding: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#f0f0f0",
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#5CC4C4",
    borderRadius: 2,
  },
  downloadProgressText: {
    fontSize: 12,
    color: "#666",
  },
  downloadedContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  downloadedIndicator: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E8",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginRight: 12,
  },
  downloadedText: {
    color: "#4CAF50",
    fontWeight: "600",
    marginLeft: 8,
  },
  removeOfflineButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  removeOfflineText: {
    color: "#ff4444",
    fontSize: 14,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: wp('5.5%'),
    fontWeight: "bold",
    color: "#333",
    marginBottom: hp('2%'),
  },
  stopsSection: {
    marginTop: hp('2%'),
    paddingBottom: hp('2.5%'),
  },
  stopItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: wp('4%'),
    borderRadius: wp('3%'),
    alignItems: "flex-start",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  stopNumber: {
    width: wp('8%'),
    height: wp('8%'),
    borderRadius: wp('4%'),
    backgroundColor: "#5CC4C4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: wp('3%'),
  },
  stopNumberText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: wp('3.5%'),
  },
  stopContent: {
    flex: 1,
  },
  stopTitle: {
    fontSize: wp('4%'),
    fontWeight: "bold",
    color: "#333",
    marginBottom: hp('0.5%'),
  },
  stopType: {
    fontSize: wp('3%'),
    color: "#5CC4C4",
    fontWeight: "600",
    marginBottom: hp('0.5%'),
  },
  stopAddress: {
    fontSize: wp('3.5%'),
    color: "#666",
    marginBottom: hp('0.5%'),
  },
  stopTips: {
    fontSize: wp('3.5%'),
    color: "#666",
    fontStyle: "italic",
  },
  stopIcon: {
    marginLeft: 8,
  },
  stopEmoji: {
    fontSize: 24,
  },
  stopSeparator: {
    height: hp('1%'),
  },
  offlineBanner: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  offlineIndicator: {
    color: '#FF9800',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  offlineHint: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 8,
    paddingHorizontal: 20,
  },
  offlineImageBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineImageBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  imagePlaceholderText: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
  purchaseButtonDisabled: {
    backgroundColor: '#ccc',
  },
  purchaseButtonTextDisabled: {
    color: '#999',
  },
  downloadButtonDisabled: {
    opacity: 0.5,
  },
  downloadButtonTextDisabled: {
    color: '#999',
  },
});