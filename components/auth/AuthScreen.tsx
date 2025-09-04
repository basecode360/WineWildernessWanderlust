import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {widthPercentageToDP as wp, heightPercentageToDP as hp} from 'react-native-responsive-screen';
import { useAuth } from '../../contexts/AuthContext';
import TermsAndConditionsModal from './TermsAndConditionsModal';

type AuthMode = 'signin' | 'signup' | 'forgot';

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const { signIn, signUp, resetPassword } = useAuth();

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

        const { error } = await signIn(email, password);
        if (error) {
          Alert.alert('Sign In Error', error.message);
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

        if (!acceptedTerms) {
          Alert.alert('Error', 'Please accept the Terms and Conditions to continue');
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, fullName, acceptedTerms);
        if (error) {
          Alert.alert('Sign Up Error', error.message);
        } else {
          Alert.alert('Success', 'Check your email to confirm your account!');
          setMode('signin');
        }
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) {
          Alert.alert('Error', error.message);
        } else {
          Alert.alert(
            'Success',
            'Check your email for password reset instructions'
          );
          setMode('signin');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }

    setLoading(false);
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setConfirmPassword('');
    setAcceptedTerms(false);
    setShowTermsModal(false);
  };

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>{getTitle()}</Text>
          <Text style={styles.subtitle}>
            {mode === 'signin' && 'Sign in to access your tours'}
            {mode === 'signup' && 'Join thousands of tour enthusiasts'}
            {mode === 'forgot' && 'Enter your email to reset your password'}
          </Text>
        </View>

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
            <>
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
                />
              </View>

              <View style={styles.termsContainer}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setAcceptedTerms(!acceptedTerms)}
                >
                  <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                    {acceptedTerms && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>
                <View style={styles.termsTextContainer}>
                  <Text style={styles.termsText}>I agree to the </Text>
                  <TouchableOpacity onPress={() => setShowTermsModal(true)}>
                    <Text style={styles.termsLink}>Terms and Conditions</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
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

          <View style={styles.footer}>
            {mode === 'signin' && (
              <>
                <TouchableOpacity onPress={() => handleModeChange('forgot')}>
                  <Text style={styles.linkText}>Forgot your password?</Text>
                </TouchableOpacity>

                <View style={styles.signupPrompt}>
                  <Text style={styles.footerText}>Don&apos;t have an account? </Text>
                  <TouchableOpacity onPress={() => handleModeChange('signup')}>
                    <Text style={styles.linkText}>Sign up</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {mode === 'signup' && (
              <View style={styles.signupPrompt}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => handleModeChange('signin')}>
                  <Text style={styles.linkText}>Sign in</Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === 'forgot' && (
              <TouchableOpacity onPress={() => handleModeChange('signin')}>
                <Text style={styles.linkText}>Back to sign in</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      <TermsAndConditionsModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => setAcceptedTerms(true)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: wp('5%'),
  },
  header: {
    alignItems: 'center',
    marginBottom: hp('5%'),
  },
  title: {
    fontSize: wp('7%'),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: hp('1%'),
  },
  subtitle: {
    fontSize: wp('4%'),
    color: '#666',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: wp('4%'),
    padding: wp('6%'),
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
    borderRadius: wp('3%'),
    marginBottom: hp('2%'),
    paddingHorizontal: wp('4%'),
    backgroundColor: '#f8f9fa',
  },
  inputIcon: {
    marginRight: wp('3%'),
  },
  input: {
    flex: 1,
    height: hp('6%'),
    fontSize: wp('4%'),
    color: '#333',
  },
  eyeIcon: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#5CC4C4',
    borderRadius: wp('3%'),
    height: hp('6%'),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp('1%'),
  },
  submitButtonDisabled: {
    backgroundColor: '#a0a0a0',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: wp('4%'),
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: hp('3%'),
  },
  signupPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp('2%'),
  },
  footerText: {
    fontSize: wp('3.5%'),
    color: '#666',
  },
  linkText: {
    fontSize: wp('3.5%'),
    color: '#5CC4C4',
    fontWeight: '600',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: hp('2%'),
    paddingHorizontal: wp('1%'),
  },
  checkboxContainer: {
    marginRight: wp('3%'),
    marginTop: wp('0.5%'),
  },
  checkbox: {
    width: wp('5%'),
    height: wp('5%'),
    borderWidth: 2,
    borderColor: '#e1e5e9',
    borderRadius: wp('1%'),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#5CC4C4',
    borderColor: '#5CC4C4',
  },
  termsTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
    alignItems: 'center',
  },
  termsText: {
    fontSize: wp('3.5%'),
    color: '#666',
  },
  termsLink: {
    fontSize: wp('3.5%'),
    color: '#5CC4C4',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
