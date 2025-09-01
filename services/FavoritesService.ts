import { supabase } from '../lib/supabase';

// Database Table: user_favorites
// Columns:
// - id (uuid, primary key)
// - user_id (uuid, foreign key to auth.users)
// - tour_id (text, supports string IDs like "acadia_lobster_tour")
// - created_at (timestamp with time zone)

export interface FavoriteItem {
  id: string;
  user_id: string;
  tour_id: string;
  tour_title: string;
  tour_image?: string | null;
  created_at: string;
}

class FavoritesService {
  private static instance: FavoritesService;

  static getInstance(): FavoritesService {
    if (!FavoritesService.instance) {
      FavoritesService.instance = new FavoritesService();
    }
    return FavoritesService.instance;
  }

  async getUserFavorites(userId: string): Promise<FavoriteItem[]> {
    try {
      console.log('🌟 Fetching favorites for user:', userId);
      
      // First get the favorites data
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('user_favorites')
        .select(`
          id,
          user_id,
          tour_id,
          created_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (favoritesError) {
        console.error('❌ Error fetching favorites:', favoritesError);
        if (favoritesError.code === '42P01') {
          throw new Error('Favorites table not found. Please create the user_favorites table in your database.');
        }
        throw new Error(`Failed to fetch favorites: ${favoritesError.message}`);
      }

      if (!favoritesData || favoritesData.length === 0) {
        console.log('🌟 No favorites found for user');
        return [];
      }

      // Get unique tour IDs
      const tourIds = [...new Set(favoritesData.map(item => item.tour_id))];
      
      // Fetch tour details separately
      const { data: tourData, error: tourError } = await supabase
        .from('tours')
        .select('id, title, image')
        .in('id', tourIds);

      if (tourError) {
        console.warn('⚠️ Error fetching tour details:', tourError);
        // Continue without tour details
      }

      // Create a map of tour details
      const tourDetailsMap: Record<string, { title: string; image?: string | null }> = {};
      if (tourData) {
        tourData.forEach(tour => {
          tourDetailsMap[tour.id] = {
            title: tour.title,
            image: tour.image,
          };
        });
      }

      // Transform the data to include tour details
      const transformedData: FavoriteItem[] = favoritesData.map(item => ({
        id: item.id,
        user_id: item.user_id,
        tour_id: item.tour_id,
        tour_title: tourDetailsMap[item.tour_id]?.title || 'Unknown Tour',
        tour_image: tourDetailsMap[item.tour_id]?.image || null,
        created_at: item.created_at,
      }));

      console.log('✅ Fetched favorites:', transformedData.length, 'favorites');
      return transformedData;
    } catch (error) {
      console.error('❌ Error in getUserFavorites:', error);
      throw error;
    }
  }

  async addToFavorites(userId: string, tourId: string): Promise<void> {
    try {
      console.log('🌟 Adding to favorites:', { userId, tourId });

      const { error } = await supabase
        .from('user_favorites')
        .insert({
          user_id: userId,
          tour_id: tourId,
        });

      if (error) {
        console.error('❌ Error adding to favorites:', error);
        if (error.code === '23505') {
          throw new Error('This tour is already in your favorites.');
        }
        if (error.code === '42P01') {
          throw new Error('Favorites feature is not set up. Please contact support.');
        }
        throw new Error(`Failed to add to favorites: ${error.message}`);
      }

      console.log('✅ Successfully added to favorites');
    } catch (error) {
      console.error('❌ Error in addToFavorites:', error);
      throw error;
    }
  }

  async removeFromFavorites(userId: string, tourId: string): Promise<void> {
    try {
      console.log('🌟 Removing from favorites:', { userId, tourId });

      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('tour_id', tourId);

      if (error) {
        console.error('❌ Error removing from favorites:', error);
        if (error.code === '42P01') {
          throw new Error('Favorites feature is not set up. Please contact support.');
        }
        throw new Error(`Failed to remove from favorites: ${error.message}`);
      }

      console.log('✅ Successfully removed from favorites');
    } catch (error) {
      console.error('❌ Error in removeFromFavorites:', error);
      throw error;
    }
  }

  async isFavorite(userId: string, tourId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('tour_id', tourId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return false; // No data found
        }
        console.error('❌ Error checking favorite status:', error);
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('❌ Error in isFavorite:', error);
      return false; // Default to false on error
    }
  }

  async getFavoriteCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('user_favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error getting favorite count:', error);
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('❌ Error in getFavoriteCount:', error);
      return 0;
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

export default FavoritesService;