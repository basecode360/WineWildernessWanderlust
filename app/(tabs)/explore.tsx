import React from 'react';
import { FlatList, View, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { tours } from '@/constants/tours';
import TourCard from '@/components/TourCard';

export default function ExploreScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <FlatList
        data={tours}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TourCard
            tour={item}
            onPress={() => router.push(`/tour/${item.id}`)}
          />
        )}
        contentContainerStyle={[
          styles.list,
          tours.length < 3 && styles.centeredList, // Center if few items
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  list: {
    padding: 16,
  },
  centeredList: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
