import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import PurchaseHistoryService, { PurchaseHistoryItem } from '../services/PurchaseHistoryService';

export default function PurchaseHistoryScreen() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<PurchaseHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchaseHistoryService = PurchaseHistoryService.getInstance();

  useEffect(() => {
    loadPurchaseHistory();
  }, [user, loadPurchaseHistory]);

  const loadPurchaseHistory = useCallback(async () => {
    if (!user) {
      setError('Please sign in to view purchase history');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const history = await purchaseHistoryService.getUserPurchaseHistory(user.id);
      setPurchases(history);
    } catch (error) {
      console.error('Error loading purchase history:', error);
      setError('Failed to load purchase history');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPurchaseHistory();
    setRefreshing(false);
  };

  const handleViewTour = (tourId: string) => {
    router.push(`/tour/${tourId}`);
  };

  const handleRetryPayment = (purchase: PurchaseHistoryItem) => {
    Alert.alert(
      'Retry Payment',
      `Would you like to retry the payment for "${purchase.tour_title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retry',
          onPress: () => {
            // Navigate to tour page where user can purchase again
            router.push(`/tour/${purchase.tour_id}`);
          },
        },
      ]
    );
  };

  const renderPurchaseItem = ({ item }: { item: PurchaseHistoryItem }) => {
    const statusColor = purchaseHistoryService.getStatusColor(item.status);
    const statusText = purchaseHistoryService.getStatusText(item.status);
    const formattedAmount = purchaseHistoryService.formatAmount(item.amount, item.currency);
    const formattedDate = purchaseHistoryService.formatDate(item.created_at);

    return (
      <View style={styles.purchaseItem}>
        <View style={styles.purchaseHeader}>
          <View style={styles.purchaseInfo}>
            <Text style={styles.tourTitle} numberOfLines={1}>
              {item.tour_title}
            </Text>
            <Text style={styles.purchaseDate}>{formattedDate}</Text>
          </View>
          <View style={styles.purchaseAmount}>
            <Text style={styles.amountText}>{formattedAmount}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{statusText}</Text>
            </View>
          </View>
        </View>

        <View style={styles.purchaseActions}>
          {item.status === 'completed' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleViewTour(item.tour_id)}
            >
              <Ionicons name="eye-outline" size={16} color="#5CC4C4" />
              <Text style={styles.actionButtonText}>View Tour</Text>
            </TouchableOpacity>
          )}

          {(item.status === 'failed' || item.status === 'cancelled') && (
            <TouchableOpacity
              style={[styles.actionButton, styles.retryButton]}
              onPress={() => handleRetryPayment(item)}
            >
              <Ionicons name="refresh-outline" size={16} color="#FF9800" />
              <Text style={[styles.actionButtonText, { color: '#FF9800' }]}>
                Try Again
              </Text>
            </TouchableOpacity>
          )}

          {item.payment_intent_id && (
            <View style={styles.paymentId}>
              <Text style={styles.paymentIdText}>
                ID: {item.payment_intent_id.slice(-8)}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>No Purchase History</Text>
      <Text style={styles.emptyDescription}>
        You haven&apos;t purchased any tours yet. Browse our available tours to get started!
      </Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => router.push('/(tabs)')}
      >
        <Ionicons name="map-outline" size={20} color="#fff" />
        <Text style={styles.browseButtonText}>Browse Tours</Text>
      </TouchableOpacity>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Ionicons name="alert-circle-outline" size={80} color="#ff6b6b" />
      <Text style={styles.errorTitle}>Unable to Load History</Text>
      <Text style={styles.errorDescription}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadPurchaseHistory}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const calculateTotalSpent = (): string => {
    const total = purchases
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    return purchaseHistoryService.formatAmount(total);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#5CC4C4" />
          <Text style={styles.loadingText}>Loading purchase history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {error ? (
        renderErrorState()
      ) : (
        <>
          {/* Summary Header */}
          {purchases.length > 0 && (
            <View style={styles.summaryHeader}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{purchases.length}</Text>
                <Text style={styles.summaryLabel}>Total Purchases</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>
                  {purchases.filter(p => p.status === 'completed').length}
                </Text>
                <Text style={styles.summaryLabel}>Completed</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{calculateTotalSpent()}</Text>
                <Text style={styles.summaryLabel}>Total Spent</Text>
              </View>
            </View>
          )}

          <FlatList
            data={purchases}
            renderItem={renderPurchaseItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#5CC4C4']}
                tintColor="#5CC4C4"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  summaryHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5CC4C4',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    flexGrow: 1,
  },
  purchaseItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  purchaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  purchaseInfo: {
    flex: 1,
    marginRight: 16,
  },
  tourTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  purchaseDate: {
    fontSize: 14,
    color: '#666',
  },
  purchaseAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  purchaseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f8f8',
  },
  retryButton: {
    backgroundColor: '#fff3e0',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#5CC4C4',
    fontWeight: '500',
    marginLeft: 4,
  },
  paymentId: {
    flex: 1,
    alignItems: 'flex-end',
  },
  paymentIdText: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#5CC4C4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButtonText: {
    color: '#5CC4C4',
    fontSize: 16,
    fontWeight: '600',
  },
});