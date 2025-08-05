// app/+not-found.tsx - Custom 404 Not Found Screen
import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function NotFoundScreen() {
  const handleGoHome = () => {
    router.replace('/(tabs)');
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* 404 Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.numberContainer}>
            <Text style={styles.fourText}>4</Text>
            <View style={styles.zeroContainer}>
              <Ionicons name="wine" size={80} color="#5CC4C4" />
              <View style={styles.bubbles}>
                <View style={[styles.bubble, styles.bubble1]} />
                <View style={[styles.bubble, styles.bubble2]} />
                <View style={[styles.bubble, styles.bubble3]} />
              </View>
            </View>
            <Text style={styles.fourText}>4</Text>
          </View>
        </View>

        {/* Error Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.title}>Oops! Page Not Found</Text>
          <Text style={styles.description}>
            Looks like you've wandered off the beaten path! The page you're
            looking for doesn't exist or may have been moved.
          </Text>
        </View>

        {/* Suggestions */}
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Here's what you can do:</Text>

          <View style={styles.suggestionItem}>
            <Ionicons name="home-outline" size={20} color="#5CC4C4" />
            <Text style={styles.suggestionText}>
              Go back to the home screen
            </Text>
          </View>

          <View style={styles.suggestionItem}>
            <Ionicons name="search-outline" size={20} color="#5CC4C4" />
            <Text style={styles.suggestionText}>
              Browse our available tours
            </Text>
          </View>

          <View style={styles.suggestionItem}>
            <Ionicons name="refresh-outline" size={20} color="#5CC4C4" />
            <Text style={styles.suggestionText}>
              Check your internet connection
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleGoHome}>
            <Ionicons name="home" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Go to Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleGoBack}
          >
            <Ionicons name="arrow-back" size={20} color="#5CC4C4" />
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Links */}
        <View style={styles.quickLinksContainer}>
          <Text style={styles.quickLinksTitle}>Quick Links:</Text>
          <View style={styles.quickLinks}>
            <Link href="/(tabs)" asChild>
              <TouchableOpacity style={styles.quickLink}>
                <Text style={styles.quickLinkText}>Tours</Text>
              </TouchableOpacity>
            </Link>

            <Link href="/(tabs)/profile" asChild>
              <TouchableOpacity style={styles.quickLink}>
                <Text style={styles.quickLinkText}>Profile</Text>
              </TouchableOpacity>
            </Link>

            <Link href="/offline-downloads" asChild>
              <TouchableOpacity style={styles.quickLink}>
                <Text style={styles.quickLinkText}>Downloads</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </View>

      {/* Bottom Info */}
      <View style={styles.bottomInfo}>
        <Text style={styles.bottomText}>
          Wine Wilderness Wanderlust • Error 404
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 40,
    alignItems: 'center',
  },
  illustrationContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  numberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fourText: {
    fontSize: 120,
    fontWeight: 'bold',
    color: '#ddd',
    lineHeight: 120,
  },
  zeroContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginHorizontal: 10,
  },
  bubbles: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bubble: {
    position: 'absolute',
    backgroundColor: '#5CC4C4',
    borderRadius: 50,
    opacity: 0.3,
  },
  bubble1: {
    width: 6,
    height: 6,
    top: 10,
    right: 20,
  },
  bubble2: {
    width: 4,
    height: 4,
    top: 30,
    right: 35,
  },
  bubble3: {
    width: 8,
    height: 8,
    top: 50,
    right: 15,
  },
  messageContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: width - 80,
  },
  suggestionsContainer: {
    marginBottom: 32,
    width: '100%',
  },
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  suggestionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#5CC4C4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#5CC4C4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  secondaryButtonText: {
    color: '#5CC4C4',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  quickLinksContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  quickLinksTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  quickLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  quickLink: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 6,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quickLinkText: {
    color: '#5CC4C4',
    fontSize: 14,
    fontWeight: '500',
  },
  bottomInfo: {
    paddingBottom: 32,
    alignItems: 'center',
  },
  bottomText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
