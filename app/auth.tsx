// app/auth.tsx - Fixed Authentication Screen with proper navigation
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

type AuthMode = 'signin' | 'signup' | 'forgot';

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, resetPassword, user } = useAuth();

  // Handle navigation when user signs in successfully
  useEffect(() => {
    console.log(
      '🔍 Auth screen - User state changed:',
      user?.email || 'No user'
    );

    if (user) {
      console.log('✅ User is authenticated, navigating to tabs...');

      // Use setTimeout to ensure the navigation happens after state updates
      setTimeout(() => {
        try {
          router.replace('/(tabs)');
          console.log('🚀 Navigation to tabs triggered');
        } catch (error) {
          console.error('❌ Navigation error:', error);
          // Fallback navigation
          router.push('/');
        }
      }, 100);
    }
  }, [user]);

  const handleSubmit = async () => {
    if (loading) return;

    if (!email || !email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        if (!password) {
          Alert.alert('Error', 'Please enter your password');
          setLoading(false);
          return;
        }

        console.log('🔐 Starting sign in process...');
        const { error } = await signIn(email, password);

        if (error) {
          console.error('❌ Sign in error:', error.message);
          Alert.alert('Sign In Error', error.message);
        } else {
          console.log('✅ Sign in successful, waiting for navigation...');
          // Navigation will be handled by useEffect when user state updates
        }
      } else if (mode === 'signup') {
        if (!password || password.length < 6) {
          Alert.alert('Error', 'Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          Alert.alert('Error', 'Passwords do not match');
          setLoading(false);
          return;
        }

        console.log('📝 Starting sign up process...');
        const { error } = await signUp(email, password, fullName);

        if (error) {
          console.error('❌ Sign up error:', error.message);
          Alert.alert('Sign Up Error', error.message);
        } else {
          console.log('✅ Sign up successful');
          Alert.alert('Success', 'Check your email to confirm your account!', [
            {
              text: 'OK',
              onPress: () => setMode('signin'),
            },
          ]);
        }
      } else if (mode === 'forgot') {
        console.log('🔄 Starting password reset...');
        const { error } = await resetPassword(email);

        if (error) {
          console.error('❌ Password reset error:', error.message);
          Alert.alert('Error', error.message);
        } else {
          console.log('✅ Password reset email sent');
          Alert.alert(
            'Success',
            'Check your email for password reset instructions',
            [
              {
                text: 'OK',
                onPress: () => setMode('signin'),
              },
            ]
          );
        }
      }
    } catch (error) {
      console.error('❌ Unexpected error in auth:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }

    setLoading(false);
  };

  const getTitle = () => {
    switch (mode) {
      case 'signin':
        return 'Welcome Back';
      case 'signup':
        return 'Create Account';
      case 'forgot':
        return 'Reset Password';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'signin':
        return 'Sign in to access your tours';
      case 'signup':
        return 'Join thousands of tour enthusiasts';
      case 'forgot':
        return 'Enter your email to reset your password';
    }
  };

  const getButtonText = () => {
    switch (mode) {
      case 'signin':
        return 'Sign In';
      case 'signup':
        return 'Create Account';
      case 'forgot':
        return 'Send Reset Email';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="map" size={48} color="#5CC4C4" />
            </View>
            <Text style={styles.title}>{getTitle()}</Text>
            <Text style={styles.subtitle}>{getSubtitle()}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {mode === 'signup' && (
              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  placeholderTextColor="#999"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#666"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#999"
              />
            </View>

            {mode !== 'forgot' && (
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            )}

            {mode === 'signup' && (
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  placeholderTextColor="#999"
                />
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Loading...' : getButtonText()}
              </Text>
            </TouchableOpacity>

            {/* Footer Links */}
            <View style={styles.footer}>
              {mode === 'signin' && (
                <>
                  <TouchableOpacity onPress={() => setMode('forgot')}>
                    <Text style={styles.linkText}>Forgot your password?</Text>
                  </TouchableOpacity>

                  <View style={styles.signupPrompt}>
                    <Text style={styles.footerText}>
                      Don't have an account?{' '}
                    </Text>
                    <TouchableOpacity onPress={() => setMode('signup')}>
                      <Text style={styles.linkText}>Sign up</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {mode === 'signup' && (
                <View style={styles.signupPrompt}>
                  <Text style={styles.footerText}>
                    Already have an account?{' '}
                  </Text>
                  <TouchableOpacity onPress={() => setMode('signin')}>
                    <Text style={styles.linkText}>Sign in</Text>
                  </TouchableOpacity>
                </View>
              )}

              {mode === 'forgot' && (
                <TouchableOpacity onPress={() => setMode('signin')}>
                  <Text style={styles.linkText}>Back to sign in</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#5CC4C4',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#a0a0a0',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  signupPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  linkText: {
    fontSize: 14,
    color: '#5CC4C4',
    fontWeight: '600',
  },
});
