// app/(tabs)/index.tsx - Fixed with proper progress tracking and offline support
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {widthPercentageToDP as wp, heightPercentageToDP as hp} from 'react-native-responsive-screen';
import { useAuth } from "../../contexts/AuthContext";
import { useOffline } from "../../contexts/OfflineContext";
import { useProgress } from "../../contexts/ProgressContext";
import { usePurchases } from "../../contexts/PurchaseContext";
import {
  getAllTours,
  getImageUrl
} from "../../services/tourServices";
import { Tour } from "../../types/tour";
import { ERROR_MESSAGES } from "../../utils/constants";


export default function ToursScreen() {
  // State for both online and offline tours
  const [tours, setTours] = useState<Tour[]>([]);
  const [isLoadingTours, setIsLoadingTours] = useState(true);
  const [toursError, setToursError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState<"online" | "offline" | "mixed">("online");
  const [imageUris, setImageUris] = useState<Record<string, string>>({});

  const { user } = useAuth();

  // Use proper progress hook methods
  const { 
    getTotalCompletedCount,
    isLoading: progressLoading,
    refreshProgress 
  } = useProgress();
  
  const { hasPurchased, isLoadingPurchases } = usePurchases();
  
  const {
    offlineTours,
    isLoadingOffline,
    totalStorageUsed,
    formatStorageSize,
    isOnline,
    isTourOffline,
    getOfflineTour,
    getOfflineImagePath,
  } = useOffline();

  // Load offline images with proper user ID handling
  useEffect(() => {

    const loadAllTourImages = async () => {
      if (tours.length === 0 || !user) return;

      console.log(`Loading images for ${tours.length} tours`);
      const uris: Record<string, string> = {};

      for (const tour of tours) {
        if (!tour.id) continue;

        try {
          // Check if tour is offline first
          const isOffline = isTourOffline(tour.id);

          if (isOffline) {
            // For offline tours, get the offline image path
            console.log(`Getting offline image for tour: ${tour.id}`);
            const offlineImagePath = await getOfflineImagePath(tour.id, 'main');

            if (offlineImagePath) {
              uris[tour.id] = offlineImagePath;
              console.log(`Offline image loaded for tour ${tour.id}: ${offlineImagePath}`);
            } else {
              console.warn(`No offline image found for tour ${tour.id}`);
              // Fallback to online image if offline image not found
              if (isOnline && tour.image) {
                const onlineUri = await getImageUrl(tour.image, tour.id, 'main');
                if (onlineUri) {
                  uris[tour.id] = onlineUri;
                  console.log(`Fallback to online image for tour ${tour.id}`);
                }
              }
            }
          } else {
            // For online tours, get the online image
            if (tour.image) {
              console.log(`Getting online image for tour: ${tour.id}`);
              const onlineUri = await getImageUrl(tour.image, tour.id, 'main');
              if (onlineUri) {
                uris[tour.id] = onlineUri;
                console.log(`Online image loaded for tour ${tour.id}`);
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to load image for tour ${tour.id}:`, error);
        }
      }

      setImageUris(uris);
      console.log(`Loaded ${Object.keys(uris).length}/${tours.length} tour images`);
    };

    loadAllTourImages();
  }, [tours, isTourOffline, getOfflineImagePath, isOnline, user]);

  // Load tours on component mount
  useEffect(() => {
    loadTours();
  }, []);

  // Watch for offline tours changes with proper dependency
  useEffect(() => {
    if (offlineTours.length > 0 && tours.length === 0 && !isLoadingTours) {
      console.log("No online tours but found offline tours, using offline data");
      setDataSource("offline");
      setTours(
        offlineTours.map((content) => ({
          ...content.tourData,
          isDownloaded: true,
        }))
      );
      setIsLoadingTours(false);
    }
  }, [offlineTours, tours.length, isLoadingTours]);

  // Enhanced load tours function with offline-first approach
  const loadTours = async () => {
    try {
      setIsLoadingTours(true);
      setToursError(null);
      console.log("Loading tours with offline-first approach...");

      // First, always show offline tours if we have them (immediate response)
      if (offlineTours.length > 0 && !refreshing) {
        console.log(`Showing ${offlineTours.length} offline tours immediately`);
        setTours(
          offlineTours.map((content) => ({
            ...content.tourData,
            isDownloaded: true,
          }))
        );
          setIsLoadingTours(false);
      }

      // Then try to fetch online tours (if connected)
      if (isOnline) {
        console.log("Network available, fetching latest tours from Supabase...");

        try {
          const onlineToursData = await getAllTours();
          console.log(`Loaded ${onlineToursData.length} tours from Supabase`);

          // Merge online and offline tours
          const mergedTours = mergeToursData(onlineToursData, offlineTours);
          setTours(mergedTours);
          setDataSource(offlineTours.length > 0 ? "mixed" : "online");
        } catch (onlineError) {
          console.warn("Failed to load online tours, keeping offline data:", onlineError);

          // If we have offline tours, keep using them
          if (offlineTours.length > 0) {
            console.log("Using offline tours as fallback");
            setTours(
              offlineTours.map((content) => ({
                ...content.tourData,
                isDownloaded: true,
              }))
            );
                } else {
            // No offline tours and online failed
            throw onlineError;
          }
        }
      } else {
        console.log("No network connection");

        // If offline and we have cached tours, use them
        if (offlineTours.length > 0) {
          console.log("Using offline tours (no network)");
          setTours(
            offlineTours.map((content) => ({
              ...content.tourData,
              isDownloaded: true,
            }))
          );
            } else {
          // No network and no offline tours
          throw new Error("No internet connection and no offline tours available");
        }
      }
    } catch (error) {
      console.error("Failed to load tours:", error);

      // If we have any offline tours, use them as last resort
      if (offlineTours.length > 0) {
        console.log("Using offline tours as error fallback");
        setTours(
          offlineTours.map((content) => ({
            ...content.tourData,
            isDownloaded: true,
          }))
        );
          setToursError(null); // Clear error since we have fallback data
      } else {
        setToursError(
          error instanceof Error ? error.message : ERROR_MESSAGES.API_ERROR
        );

        // Show alert only if this isn't a silent refresh
        if (!refreshing) {
          Alert.alert(
            "Unable to Load Tours",
            isOnline
              ? "Unable to load tours. Please check your internet connection and try again."
              : "No internet connection and no offline tours available. Please connect to the internet to download tours.",
            [{ text: "Retry", onPress: loadTours }, { text: "Cancel" }]
          );
        }
      }
    } finally {
      setIsLoadingTours(false);
    }
  };

  // Helper function to merge online and offline tour data
  const mergeToursData = (
    onlineTours: Tour[],
    offlineTours: any[] // OfflineContent[]
  ): Tour[] => {
    const mergedTours: Tour[] = [];
    const offlineIds = new Set(offlineTours.map((ot) => ot.tourId));

    // Add online tours, marking downloaded ones
    onlineTours.forEach((tour) => {
      mergedTours.push({
        ...tour,
        isDownloaded: offlineIds.has(tour.id),
      });
    });

    // Add any offline tours that aren't in the online list
    offlineTours.forEach((offlineContent) => {
      if (!mergedTours.find((t) => t.id === offlineContent.tourId)) {
        mergedTours.push({
          ...offlineContent.tourData,
          isDownloaded: true,
        });
      }
    });

    return mergedTours;
  };

  // Pull to refresh function with progress refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh tours
      await loadTours();
      // Also refresh progress data if user is logged in
      if (user) {
        await refreshProgress();
        // Explicitly refresh the completed stops count
        const count = await getTotalCompletedCount(user.id);
        setTotalCompletedStops(count);
      }
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTourPress = (tourId: string) => {
    router.push(`/tour/${tourId}`);
  };

  const handlePlayTour = (tourId: string) => {
    router.push(`/tour/player/${tourId}`);
  };

  // Get completed tours count - count purchased tours (owned tours)
  const getCompletedToursCount = () => {
    return tours.filter((tour) => hasPurchased(tour.id)).length;
  };

  // FIXED: Get total completed stops using proper progress hook
  const [totalCompletedStops, setTotalCompletedStops] = useState(0);

useEffect(() => {
  const loadCompletedStops = async () => {
    if (user && !progressLoading) {
      try {
        console.log('=== DEBUG: Loading completed stops ===');
        console.log('Current user object:', user);
        console.log('User ID being passed:', user.id);
        console.log('User email:', user.email);
        
        // Check if user.id exists and is valid
        if (!user.id) {
          console.error('ERROR: user.id is null or undefined!');
          setTotalCompletedStops(0);
          return;
        }
        
        const count = await getTotalCompletedCount(user.id);
        console.log('Returned count from getTotalCompletedCount:', count);
        console.log('=== END DEBUG ===');
        
        setTotalCompletedStops(count);
      } catch (error) {
        console.error('Error loading completed stops count:', error);
        setTotalCompletedStops(0);
      }
    } else if (!user) {
      console.log('No user logged in, resetting count to 0');
      setTotalCompletedStops(0);
    } else {
      console.log('Progress still loading, waiting...');
    }
  };

  loadCompletedStops();
}, [user, progressLoading, getTotalCompletedCount]);

  // Safe rendering helpers
  const renderUserName = () => {
    const name = user?.user_metadata?.full_name || "Explorer";
    return typeof name === "string" ? name : "Explorer";
  };

  const renderTourTitle = (title: string | undefined) => {
    return typeof title === "string" ? title : "Untitled Tour";
  };

  const renderTourDescription = (description: string | undefined) => {
    return typeof description === "string"
      ? description
      : "No description available";
  };

  const renderTourDuration = (duration: string | undefined) => {
    return typeof duration === "string" ? duration : "N/A";
  };

  const renderTourDistance = (distance: string | undefined) => {
    return typeof distance === "string" ? distance : "N/A";
  };

  const renderTourPrice = (price: number | string | undefined) => {
    if (typeof price === "number") return `$${price}`;
    if (typeof price === "string")
      return price.startsWith("$") ? price : `$${price}`;
    return "$0";
  };

  const renderStopsCount = (tour: Tour) => {
    const count = tour.stopsCount || (Array.isArray(tour.stops) ? tour.stops.length : 0);
    return `${count} stops`;
  };


  // Loading state - don't show loading if we have offline tours
  if (
    isLoadingPurchases ||
    (isLoadingTours && !refreshing && tours.length === 0)
  ) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5CC4C4" />
          <Text style={styles.loadingText}>
            {isLoadingTours ? "Loading tours..." : "Loading your tours..."}
          </Text>
          {!isOnline && (
            <Text style={styles.offlineHint}>
              Checking for offline tours...
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
            {isOnline ? "Unable to Load Tours" : "No Offline Tours"}
          </Text>
          <Text style={styles.errorText}>
            {isOnline
              ? toursError
              : "No internet connection and no tours downloaded for offline use."}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTours}>
            <Text style={styles.retryButtonText}>
              {isOnline ? "Try Again" : "Check Again"}
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
                ? "Check back later for new tours!"
                : "Connect to the internet to browse and download tours."}
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

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome back, {renderUserName()}!
          </Text>
          <Text style={styles.welcomeSubtext}>
            {isOnline
              ? "Discover amazing audio tours and local experiences"
              : "Enjoy your downloaded tours offline"}
          </Text>
        </View>

        {/* Tours Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {tours.length <= 1 ? "Featured Tour" : "Available Tours"}
            </Text>
            {tours.length > 0 && (
              <Text style={styles.tourCount}>
                {tours.length} tour{tours.length !== 1 ? "s" : ""}
              </Text>
            )}
          </View>

          {tours.map((tour) => {
            if (!tour || !tour.id) {
              console.warn("Invalid tour data:", tour);
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
                    source={{ uri: imageUris[tour.id] || tour.image }}
                    style={styles.tourImage}
                    resizeMode="cover"
                    onError={(e) => {
                      console.log(
                        "Image load error for tour:",
                        tour.id,
                        e.nativeEvent.error
                      );
                    }}
                    onLoad={() => {
                      console.log("Image loaded for tour:", tour.id);
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
                      <View
                        style={[
                          styles.purchasedTag,
                          isDownloaded && { marginTop: 8 },
                        ]}
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="#fff"
                        />
                        <Text style={styles.purchasedText}>Owned</Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.priceTag,
                          isDownloaded && { marginTop: 8 },
                        ]}
                      >
                        <Text style={styles.priceText}>
                          {renderTourPrice(tour.price)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Tour Info */}
                <View style={styles.tourInfo}>
                  <Text style={styles.tourTitle}>
                    {renderTourTitle(tour.title)}
                  </Text>
                  <Text style={styles.tourDescription} numberOfLines={2}>
                    {renderTourDescription(tour.description)}
                  </Text>

                  {/* Tour Stats */}
                  <View style={styles.tourStats}>
                    <View style={styles.statItem}>
                      <Ionicons name="time-outline" size={16} color="#666" />
                      <Text style={styles.statText}>
                        {renderTourDuration(tour.duration)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color="#666"
                      />
                      <Text style={styles.statText}>
                        {renderTourDistance(tour.distance)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="headset-outline" size={16} color="#666" />
                      <Text style={styles.statText}>
                        {renderStopsCount(tour)} 
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    {isPurchased ? (
                      <TouchableOpacity
                        style={[
                          styles.playButton,
                          !isOnline && !isDownloaded && styles.disabledButton,
                        ]}
                        onPress={() => handlePlayTour(tour.id)}
                        disabled={!isOnline && !isDownloaded}
                      >
                        <Ionicons name="play" size={20} color="#fff" />
                        <Text style={styles.playButtonText}>
                          {!isOnline && !isDownloaded ? "Offline" : "Play Tour"}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.purchaseButton,
                          !isOnline && styles.disabledButton,
                        ]}
                        onPress={() => handleTourPress(tour.id)}
                        disabled={!isOnline}
                      >
                        <Ionicons
                          name="card-outline"
                          size={20}
                          color={isOnline ? "#5CC4C4" : "#999"}
                        />
                        <Text
                          style={[
                            styles.purchaseButtonText,
                            !isOnline && styles.disabledText,
                          ]}
                        >
                          {isOnline ? "Purchase" : "Need Internet"}
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
              <Text style={styles.statNumber}>{totalCompletedStops}</Text>
              <Text style={styles.statLabel}>Stops Completed</Text>
            </View>
          </View>

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
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: wp('5%'),
  },
  loadingText: {
    marginTop: hp('2%'),
    fontSize: wp('4%'),
    color: "#666",
    textAlign: "center",
  },
  offlineHint: {
    marginTop: hp('1%'),
    fontSize: wp('3.5%'),
    color: "#FF9800",
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: wp('5%'),
  },
  errorTitle: {
    fontSize: wp('5%'),
    fontWeight: "bold",
    color: "#333",
    marginTop: hp('2%'),
    marginBottom: hp('1%'),
  },
  errorText: {
    fontSize: wp('3.5%'),
    color: "#666",
    textAlign: "center",
    marginBottom: hp('3%'),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: wp('5%'),
    minHeight: hp('50%'),
  },
  emptyTitle: {
    fontSize: wp('5%'),
    fontWeight: "bold",
    color: "#333",
    marginTop: hp('2%'),
    marginBottom: hp('1%'),
  },
  emptyText: {
    fontSize: wp('3.5%'),
    color: "#666",
    textAlign: "center",
    marginBottom: hp('3%'),
  },
  retryButton: {
    backgroundColor: "#5CC4C4",
    paddingHorizontal: wp('6%'),
    paddingVertical: hp('1.5%'),
    borderRadius: wp('6%'),
  },
  retryButtonText: {
    color: "#fff",
    fontSize: wp('4%'),
    fontWeight: "600",
  },
  welcomeSection: {
    padding: wp('5%'),
    backgroundColor: "#5CC4C4",
    marginBottom: hp('2.5%'),
  },
  welcomeText: {
    fontSize: wp('5%'),
    fontWeight: "bold",
    color: "#fff",
    marginBottom: hp('0.5%'),
  },
  welcomeSubtext: {
    fontSize: wp('3.5%'),
    color: "rgba(255, 255, 255, 0.9)",
  },
  section: {
    paddingHorizontal: wp('5%'),
    marginBottom: hp('3%'),
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp('2%'),
  },
  sectionTitle: {
    fontSize: wp('5.5%'),
    fontWeight: "bold",
    color: "#333",
  },
  tourCount: {
    fontSize: wp('3.5%'),
    color: "#666",
    fontWeight: "500",
  },
  tourCard: {
    backgroundColor: "#fff",
    borderRadius: wp('4%'),
    marginBottom: hp('2.5%'),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  imageContainer: {
    position: "relative",
  },
  tourImage: {
    width: "100%",
    height: hp('25%'),
  },
  imageOverlay: {
    position: "absolute",
    top: hp('1.5%'),
    right: wp('3%'),
  },
  downloadedTag: {
    backgroundColor: "rgba(76, 175, 80, 0.9)",
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.7%'),
    borderRadius: wp('5%'),
    flexDirection: "row",
    alignItems: "center",
  },
  downloadedText: {
    color: "#fff",
    fontSize: wp('3%'),
    fontWeight: "bold",
    marginLeft: wp('1%'),
  },
  priceTag: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.7%'),
    borderRadius: wp('5%'),
  },
  priceText: {
    color: "#fff",
    fontSize: wp('4%'),
    fontWeight: "bold",
  },
  purchasedTag: {
    backgroundColor: "rgba(76, 175, 80, 0.9)",
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.7%'),
    borderRadius: wp('5%'),
    flexDirection: "row",
    alignItems: "center",
  },
  purchasedText: {
    color: "#fff",
    fontSize: wp('3.5%'),
    fontWeight: "bold",
    marginLeft: wp('1%'),
  },
  tourInfo: {
    padding: wp('4%'),
  },
  tourTitle: {
    fontSize: wp('4.5%'),
    fontWeight: "bold",
    color: "#333",
    marginBottom: hp('0.7%'),
  },
  tourDescription: {
    fontSize: wp('3.5%'),
    color: "#666",
    lineHeight: wp('5%'),
    marginBottom: hp('1.5%'),
  },
  tourStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: hp('2%'),
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statText: {
    fontSize: wp('3%'),
    color: "#666",
    marginLeft: wp('1%'),
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  playButton: {
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('1.2%'),
    borderRadius: wp('6%'),
    flex: 1,
    marginRight: wp('3%'),
    justifyContent: "center",
  },
  playButtonText: {
    color: "#fff",
    fontSize: wp('3.5%'),
    fontWeight: "600",
    marginLeft: wp('2%'),
  },
  purchaseButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#5CC4C4",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('1.2%'),
    borderRadius: wp('6%'),
    flex: 1,
    marginRight: wp('3%'),
    justifyContent: "center",
  },
  purchaseButtonText: {
    color: "#5CC4C4",
    fontSize: wp('3.5%'),
    fontWeight: "600",
    marginLeft: wp('2%'),
  },
  disabledButton: {
    backgroundColor: "#E0E0E0",
    borderColor: "#E0E0E0",
  },
  disabledText: {
    color: "#999",
  },
  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: hp('1.2%'),
  },
  detailsButtonText: {
    color: "#666",
    fontSize: wp('3.5%'),
    marginRight: wp('1%'),
  },
  statsSection: {
    paddingHorizontal: wp('5%'),
    marginBottom: hp('3%'),
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: wp('3%'),
    padding: wp('4%'),
    alignItems: "center",
    flex: 1,
    marginHorizontal: wp('1%'),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: wp('6%'),
    fontWeight: "bold",
    color: "#333",
    marginTop: hp('1%'),
    marginBottom: hp('0.5%'),
  },
  statLabel: {
    fontSize: wp('3%'),
    color: "#666",
    textAlign: "center",
  },
  bottomPadding: {
    height: hp('2.5%'),
  },
});