import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import FavoritesService, { FavoriteItem } from '../services/FavoritesService';
import { useAuth } from './AuthContext';

interface FavoritesContextType {
  favorites: FavoriteItem[];
  favoriteIds: string[];
  loading: boolean;
  error: string | null;
  addToFavorites: (tourId: string) => Promise<void>;
  removeFromFavorites: (tourId: string) => Promise<void>;
  isFavorite: (tourId: string) => boolean;
  toggleFavorite: (tourId: string) => Promise<void>;
  refreshFavorites: () => Promise<void>;
  favoriteCount: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

interface FavoritesProviderProps {
  children: ReactNode;
}

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const favoritesService = FavoritesService.getInstance();

  // Compute derived state
  const favoriteIds = favorites.map(fav => fav.tour_id);
  const favoriteCount = favorites.length;

  useEffect(() => {
    if (user) {
      loadFavorites();
    } else {
      setFavorites([]);
      setError(null);
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      console.log('🌟 Loading favorites for user:', user.id);
      
      const userFavorites = await favoritesService.getUserFavorites(user.id);
      setFavorites(userFavorites);
    } catch (error) {
      console.error('❌ Error loading favorites:', error);
      const message = error instanceof Error ? error.message : 'Failed to load favorites';
      
      if (message.includes('table not found') || message.includes('user_favorites')) {
        setError('Favorites feature is being set up. Please try again in a moment.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const addToFavorites = async (tourId: string) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      setError(null);
      
      // Optimistically add to local state
      const tempFavorite: FavoriteItem = {
        id: 'temp-' + Date.now(),
        user_id: user.id,
        tour_id: tourId,
        tour_title: 'Loading...',
        created_at: new Date().toISOString(),
      };
      
      setFavorites(prev => [tempFavorite, ...prev]);
      
      await favoritesService.addToFavorites(user.id, tourId);
      
      // Refresh to get actual data
      await loadFavorites();
      
      console.log('✅ Added to favorites:', tourId);
    } catch (error) {
      console.error('❌ Error adding to favorites:', error);
      setError(error instanceof Error ? error.message : 'Failed to add to favorites');
      
      // Revert optimistic update
      setFavorites(prev => prev.filter(fav => fav.tour_id !== tourId));
      throw error;
    }
  };

  const removeFromFavorites = async (tourId: string) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    // Store previous state for rollback
    const previousFavorites = favorites;
    
    try {
      setError(null);
      
      // Optimistically remove from local state
      setFavorites(prev => prev.filter(fav => fav.tour_id !== tourId));
      
      await favoritesService.removeFromFavorites(user.id, tourId);
      
      console.log('✅ Removed from favorites:', tourId);
    } catch (error) {
      console.error('❌ Error removing from favorites:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove from favorites');
      
      // Revert optimistic update
      setFavorites(previousFavorites);
      throw error;
    }
  };

  const isFavorite = (tourId: string): boolean => {
    return favoriteIds.includes(tourId);
  };

  const toggleFavorite = async (tourId: string) => {
    if (!user) {
      throw new Error('Please sign in to manage favorites');
    }
    
    if (!tourId || typeof tourId !== 'string') {
      throw new Error('Invalid tour ID');
    }
    
    try {
      if (isFavorite(tourId)) {
        await removeFromFavorites(tourId);
      } else {
        await addToFavorites(tourId);
      }
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
      throw error;
    }
  };

  const refreshFavorites = async () => {
    await loadFavorites();
  };

  const value: FavoritesContextType = {
    favorites,
    favoriteIds,
    loading,
    error,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    toggleFavorite,
    refreshFavorites,
    favoriteCount,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextType {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}