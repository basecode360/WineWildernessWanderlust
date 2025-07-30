import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

type Tour = {
  id: string;
  title: string;
  description: string;
  price: number;
  image?: string;
};

type Props = {
  tour: Tour;
  onPress: () => void;
};

export default function TourCard({ tour, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image
        source={
          tour.image
            ? { uri: tour.image }
            : require('@/assets/images/adaptive-icon.png')
        }
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.content}>
        <Text style={styles.title}>{tour.title}</Text>
        <Text style={styles.description}>{tour.description}</Text>
        <Text style={styles.price}>${tour.price.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    backgroundColor: '#fdfdfd',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: 160,
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    color: '#666',
    marginBottom: 6,
  },
  price: {
    fontWeight: 'bold',
    color: '#5CC4C4',
  },
});
