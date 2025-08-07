// components/SplashScreen.tsx - Enhanced with visual integration
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinished?: () => void;
}

export default function SplashScreen({ onFinished }: SplashScreenProps) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const circleScale = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animationSequence = () => {
      // Background fade in
      Animated.timing(backgroundOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Circle background animation
      Animated.spring(circleScale, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Glow effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0.8,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Logo animation
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(logoScale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start();
      }, 200);

      // Title animation (delayed)
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(titleTranslateY, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();
      }, 600);

      // Subtitle animation (more delayed)
      setTimeout(() => {
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      }, 1000);

      // Finish after total animation time
      setTimeout(() => {
        if (onFinished) {
          onFinished();
        }
      }, 3000);
    };

    animationSequence();
  }, []);

  return (
    <View style={styles.container}>
      {/* Animated Background */}
      <Animated.View
        style={[
          styles.background,
          {
            opacity: backgroundOpacity,
          },
        ]}
      />

      {/* Animated gradient overlay */}
      <Animated.View
        style={[
          styles.gradientOverlay,
          {
            opacity: backgroundOpacity,
          },
        ]}
      />

      {/* Content Container */}
      <View style={styles.content}>
        {/* Logo Container with Enhanced Visuals */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: circleScale }],
            },
          ]}
        >
          {/* Outer glow ring */}
          <Animated.View
            style={[
              styles.glowRing,
              {
                opacity: glowOpacity,
                transform: [{ scale: circleScale }],
              },
            ]}
          />

          {/* Main circle background */}
          <View style={styles.logoCircle}>
            {/* Inner gradient circle */}
            <View style={styles.innerCircle} />

            {/* Animated Logo */}
            <Animated.View
              style={[
                styles.logoImageContainer,
                {
                  opacity: logoOpacity,
                  transform: [{ scale: logoScale }],
                },
              ]}
            >
              <Image
                source={require('../assets/images/wander-guide-logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
                onError={(error) => {
                  console.log('Image loading error:', error.nativeEvent.error);
                }}
                onLoad={() => {
                  console.log('Image loaded successfully');
                }}
              />
            </Animated.View>
          </View>

          {/* Floating particles around logo */}
          <View style={styles.particles}>
            <View style={[styles.particle, styles.particle1]} />
            <View style={[styles.particle, styles.particle2]} />
            <View style={[styles.particle, styles.particle3]} />
            <View style={[styles.particle, styles.particle4]} />
            <View style={[styles.particle, styles.particle5]} />
            <View style={[styles.particle, styles.particle6]} />
          </View>
        </Animated.View>

        {/* Animated Title */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          <Text style={styles.mainTitle}>Wander Guide</Text>
          <Text style={styles.subtitle}>Wine Wilderness</Text>
        </Animated.View>

        {/* Animated Tagline */}
        <Animated.View
          style={[
            styles.taglineContainer,
            {
              opacity: subtitleOpacity,
            },
          ]}
        >
          <Text style={styles.tagline}>Discover • Explore • Experience</Text>
          <View style={styles.loadingIndicator}>
            <View style={styles.loadingDot} />
            <View style={[styles.loadingDot, styles.loadingDot2]} />
            <View style={[styles.loadingDot, styles.loadingDot3]} />
          </View>
        </Animated.View>
      </View>

      {/* Bottom Branding */}
      <Animated.View
        style={[
          styles.bottomBranding,
          {
            opacity: subtitleOpacity,
          },
        ]}
      >
        <Text style={styles.brandingText}>Immersive Audio Tours</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2C3E50',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1ABCD8',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    // You can add a subtle gradient here if needed
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 20, // Rounded square to match logo shape
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  innerCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 0,
    backgroundColor: 'rgba(26, 188, 216, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(26, 188, 216, 0.3)',
  },
  logoImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 110,
    height: 110,
    // Logo now fills the rounded square background nicely
  },
  particles: {
    position: 'absolute',
    width: 200,
    height: 200,
  },
  particle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 50,
  },
  particle1: {
    width: 6,
    height: 6,
    top: 30,
    right: 40,
  },
  particle2: {
    width: 4,
    height: 4,
    top: 60,
    right: 20,
  },
  particle3: {
    width: 8,
    height: 8,
    bottom: 50,
    left: 30,
  },
  particle4: {
    width: 5,
    height: 5,
    bottom: 80,
    left: 60,
  },
  particle5: {
    width: 3,
    height: 3,
    top: 80,
    left: 20,
  },
  particle6: {
    width: 7,
    height: 7,
    bottom: 30,
    right: 60,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: 4,
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  taglineContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 3,
  },
  loadingDot2: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  loadingDot3: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  bottomBranding: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  brandingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
