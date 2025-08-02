// app/(tabs)/index.tsx - Protected tours list screen
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getAllTours } from '../../data/tours';
import { getImageAsset } from '../../utils/imageAssets';

const { width: screenWidth } = Dimensions.get('window');

export default function ToursScreen() {
  const tours = getAllTours();
  const { user } = useAuth();

  const handleTourPress = (tourId: string) => {
    router.push(`/tour/${tourId}`);
  };

  const handlePlayTour = (tourId: string) => {
    router.push(`/tour/player/${tourId}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
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

          {tours.map((tour) => (
            <TouchableOpacity
              key={tour.id}
              style={styles.tourCard}
              onPress={() => handleTourPress(tour.id)}
              activeOpacity={0.8}
            >
              {/* Tour Image */}
              <View style={styles.imageContainer}>
                <Image
                  source={getImageAsset(tour.image)}
                  style={styles.tourImage}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay}>
                  <View style={styles.priceTag}>
                    <Text style={styles.priceText}>${tour.price}</Text>
                  </View>
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
                    <Ionicons name="location-outline" size={16} color="#666" />
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
                  {tour.isPurchased ? (
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
                      <Ionicons name="card-outline" size={20} color="#5CC4C4" />
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
          ))}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Activity</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="headset" size={32} color="#5CC4C4" />
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Tours Completed</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="download" size={32} color="#5CC4C4" />
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Downloads</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="location" size={32} color="#5CC4C4" />
              <Text style={styles.statNumber}>0</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    backgroundColor: '#5CC4C4',
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
