// app/offline-downloads.tsx - Offline Downloads Management Screen
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { useOffline } from '../contexts/OfflineContext';
import { OfflineContent } from '../services/OfflineService';
import { getImageAsset } from '../utils/imageAssets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function OfflineDownloadsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const insets = useSafeAreaInsets();

  const {
    offlineTours,
    isLoadingOffline,
    totalStorageUsed,
    removeTour,
    refreshOfflineContent,
    clearAllOfflineContent,
    formatStorageSize,
  } = useOffline();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshOfflineContent();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemoveTour = (tourId: string, tourTitle: string) => {
    Alert.alert(
      'Remove Offline Content',
      `Are you sure you want to remove "${tourTitle}" from offline storage? You can download it again later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeTour(tourId);
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
  };

  const handleClearAll = () => {
    if (offlineTours.length === 0) {
      Alert.alert('No Content', 'There are no offline tours to remove.');
      return;
    }

    Alert.alert(
      'Clear All Offline Content',
      `This will remove all ${
        offlineTours.length
      } offline tours and free up ${formatStorageSize(
        totalStorageUsed
      )} of storage. You can download them again later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllOfflineContent();
              Alert.alert('Success', 'All offline content has been removed.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear offline content.');
            }
          },
        },
      ]
    );
  };

  const handleTourPress = (tourId: string) => {
    router.push(`/tour/${tourId}`);
  };

  const handlePlayTour = (tourId: string) => {
    router.push(`/tour/player/${tourId}`);
  };

  const formatDownloadDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderOfflineTour = ({ item }: { item: OfflineContent }) => (
    <TouchableOpacity
      style={styles.tourCard}
      onPress={() => handleTourPress(item.tourId)}
      activeOpacity={0.8}
    >
      <View style={styles.tourImageContainer}>
        {item.tourData.image ? (
          <Image
            source={getImageAsset(item.tourData.image)}
            style={styles.tourImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={32} color="#999" />
          </View>
        )}
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
              {item.tourData.stops.length} stops
            </Text>
          </View>
        </View>

        <View style={styles.downloadInfo}>
          <Text style={styles.downloadDate}>
            Downloaded {formatDownloadDate(item.downloadedAt)}
          </Text>
          <Text style={styles.fileSize}>{formatStorageSize(item.size)}</Text>
        </View>
      </View>

      <View style={styles.tourActions}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => handlePlayTour(item.tourId)}
        >
          <Ionicons name="play" size={20} color="#4CAF50" />
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

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cloud-offline-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Offline Tours</Text>
      <Text style={styles.emptyDescription}>
        Download tours to enjoy them offline without an internet connection.
      </Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => router.push('/(tabs)')}
      >
        <Text style={styles.browseButtonText}>Browse Tours</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Offline Downloads</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Storage Summary */}
        <View style={styles.storageContainer}>
          <View style={styles.storageInfo}>
            <View style={styles.storageItem}>
              <Ionicons name="download" size={24} color="#5CC4C4" />
              <View style={styles.storageText}>
                <Text style={styles.storageNumber}>{offlineTours.length}</Text>
                <Text style={styles.storageLabel}>Tours</Text>
              </View>
            </View>

            <View style={styles.storageItem}>
              <Ionicons name="phone-portrait" size={24} color="#5CC4C4" />
              <View style={styles.storageText}>
                <Text style={styles.storageNumber}>
                  {formatStorageSize(totalStorageUsed)}
                </Text>
                <Text style={styles.storageLabel}>Used</Text>
              </View>
            </View>
          </View>

          {offlineTours.length > 0 && (
            <TouchableOpacity
              style={styles.clearAllButton}
              onPress={handleClearAll}
            >
              <Ionicons name="trash-outline" size={16} color="#ff4444" />
              <Text style={styles.clearAllText}>Clear All</Text>
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
  headerRight: {
    width: 40, // Balance the back button
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
    marginRight: 32,
  },
  storageText: {
    marginLeft: 12,
  },
  storageNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  storageLabel: {
    fontSize: 12,
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
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 4,
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
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  downloadInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  downloadDate: {
    fontSize: 11,
    color: '#999',
  },
  fileSize: {
    fontSize: 11,
    color: '#5CC4C4',
    fontWeight: '600',
  },
  tourActions: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  playButton: {
    padding: 8,
    marginBottom: 8,
  },
  removeButton: {
    padding: 8,
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
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#5CC4C4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  browseButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
