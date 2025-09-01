// components/TourCard.tsx - Reusable tour card component
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {widthPercentageToDP as wp, heightPercentageToDP as hp} from 'react-native-responsive-screen';
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
    borderRadius: wp('4%'),
    marginBottom: hp('2%'),
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    height: hp('23%'),
    position: 'relative',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#5CC4C4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageEmoji: {
    fontSize: wp('12%'),
  },
  badges: {
    position: 'absolute',
    top: hp('1.5%'),
    right: wp('3%'),
    flexDirection: 'column',
    gap: hp('0.7%'),
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: wp('2%'),
    paddingVertical: hp('0.5%'),
    borderRadius: wp('3%'),
  },
  downloadedBadge: {
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
  },
  badgeText: {
    color: '#fff',
    fontSize: wp('3%'),
    fontWeight: '600',
    marginLeft: wp('1%'),
  },
  content: {
    padding: wp('4%'),
  },
  title: {
    fontSize: wp('4.5%'),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: hp('1%'),
  },
  description: {
    fontSize: wp('3.5%'),
    color: '#666',
    lineHeight: wp('5%'),
    marginBottom: hp('1.5%'),
  },
  meta: {
    flexDirection: 'row',
    marginBottom: hp('2%'),
    gap: wp('4%'),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: wp('3%'),
    color: '#666',
    marginLeft: wp('1%'),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: wp('6%'),
    fontWeight: 'bold',
    color: '#5CC4C4',
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#5CC4C4',
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('4%'),
    borderRadius: wp('5%'),
  },
  purchaseButtonText: {
    color: '#5CC4C4',
    fontWeight: '600',
    marginLeft: wp('1.5%'),
    fontSize: wp('3.5%'),
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('4%'),
    borderRadius: wp('5%'),
  },
  playButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: wp('1.5%'),
    fontSize: wp('3.5%'),
  },
});
