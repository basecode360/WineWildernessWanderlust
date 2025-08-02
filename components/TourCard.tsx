// components/TourCard.tsx - Reusable tour card component
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Tour } from '../types/tour';

interface TourCardProps {
  tour: Tour;
  onPress: () => void;
  onPurchase?: () => void;
}

export default function TourCard({ tour, onPress, onPurchase }: TourCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* Tour Image */}
      <View style={styles.imageContainer}>
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imageEmoji}>🦞</Text>
        </View>

        {/* Status Badges */}
        <View style={styles.badges}>
          {tour.isPurchased && (
            <View style={styles.badge}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.badgeText}>Purchased</Text>
            </View>
          )}
          {tour.isDownloaded && (
            <View style={[styles.badge, styles.downloadedBadge]}>
              <Ionicons name="cloud-done" size={16} color="#2196F3" />
              <Text style={styles.badgeText}>Offline</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tour Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {tour.title}
        </Text>
        <Text style={styles.description} numberOfLines={3}>
          {tour.description}
        </Text>

        {/* Tour Meta Information */}
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.metaText}>{tour.duration}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.metaText}>{tour.stops.length} stops</Text>
          </View>
        </View>

        {/* Price and Action */}
        <View style={styles.footer}>
          <Text style={styles.price}>${tour.price}</Text>

          {tour.isPurchased ? (
            <TouchableOpacity style={styles.playButton} onPress={onPress}>
              <Ionicons name="play" size={16} color="#fff" />
              <Text style={styles.playButtonText}>Start Tour</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.purchaseButton}
              onPress={onPurchase || onPress}
            >
              <Ionicons name="card-outline" size={16} color="#5CC4C4" />
              <Text style={styles.purchaseButtonText}>Buy Now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    height: 180,
    position: 'relative',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#5CC4C4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageEmoji: {
    fontSize: 48,
  },
  badges: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'column',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  downloadedBadge: {
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  meta: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5CC4C4',
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#5CC4C4',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  purchaseButtonText: {
    color: '#5CC4C4',
    fontWeight: '600',
    marginLeft: 6,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  playButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
});
