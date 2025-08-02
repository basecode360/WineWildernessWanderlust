// components/payment/PaymentSheet.tsx - Stripe payment sheet component
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PaymentService } from '../../services/PaymentService';

interface PaymentSheetProps {
  visible: boolean;
  onClose: () => void;
  tourId: string;
  tourTitle: string;
  price: number;
  onSuccess: () => void;
}

export default function PaymentSheet({
  visible,
  onClose,
  tourId,
  tourTitle,
  price,
  onSuccess,
}: PaymentSheetProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const paymentService = PaymentService.getInstance();

  const handlePayment = async () => {
    try {
      setIsProcessing(true);

      // Step 1: Create payment intent
      console.log(
        'Creating payment intent for tour:',
        tourId,
        'Amount:',
        price
      );
      const paymentResponse = await paymentService.createPaymentIntent(
        tourId,
        price
      );

      if (!paymentResponse.success || !paymentResponse.paymentIntent) {
        throw new Error(
          paymentResponse.error || 'Failed to create payment intent'
        );
      }

      const { client_secret } = paymentResponse.paymentIntent;

      if (!client_secret) {
        throw new Error('Invalid payment intent received');
      }

      // Step 2: Initialize payment sheet
      console.log('Initializing payment sheet...');
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Wine Wilderness Wanderlust',
        paymentIntentClientSecret: client_secret,
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: {
          name: 'Tour Explorer',
        },
        appearance: {
          primaryButton: {
            colors: {
              background: '#5CC4C4',
            },
          },
        },
      });

      if (initError) {
        console.error('Error initializing payment sheet:', initError);
        throw new Error(initError.message || 'Failed to initialize payment');
      }

      // Step 3: Present payment sheet
      console.log('Presenting payment sheet...');
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code === 'Canceled') {
          console.log('Payment canceled by user');
          return; // User canceled, don't show error
        }
        throw new Error(paymentError.message || 'Payment failed');
      }

      // Step 4: Confirm payment on our backend
      console.log('Payment successful, confirming...');
      const confirmResult = await paymentService.confirmPayment(
        paymentResponse.paymentIntent.id,
        tourId
      );

      if (!confirmResult.success) {
        throw new Error(confirmResult.error || 'Failed to confirm payment');
      }

      console.log('Payment and confirmation successful!');
      onSuccess();
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(
        'Payment Error',
        error.message || 'Something went wrong. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complete Purchase</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Tour Info */}
          <View style={styles.tourInfo}>
            <Text style={styles.tourTitle}>{tourTitle}</Text>
            <Text style={styles.tourDescription}>
              Get lifetime access to this premium audio tour experience.
            </Text>
          </View>

          {/* Price Breakdown */}
          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tour Price</Text>
              <Text style={styles.priceValue}>${price.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${price.toFixed(2)}</Text>
            </View>
          </View>

          {/* Features */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>What's included:</Text>
            <View style={styles.feature}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>
                Lifetime access to audio tour
              </Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>
                GPS-triggered audio at each stop
              </Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>
                Offline download capability
              </Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Professional narration</Text>
            </View>
          </View>

          {/* Security Info */}
          <View style={styles.securityInfo}>
            <Ionicons name="shield-checkmark" size={16} color="#666" />
            <Text style={styles.securityText}>
              Secure payment powered by Stripe
            </Text>
          </View>
        </View>

        {/* Payment Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
            onPress={handlePayment}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="card" size={20} color="#fff" />
                <Text style={styles.payButtonText}>
                  Pay ${price.toFixed(2)}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  tourInfo: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  tourTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  tourDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  priceSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  priceLabel: {
    fontSize: 16,
    color: '#666',
  },
  priceValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e1e5e9',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5CC4C4',
  },
  featuresSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  payButton: {
    backgroundColor: '#5CC4C4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
