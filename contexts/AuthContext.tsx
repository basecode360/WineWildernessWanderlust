// contexts/AuthContext.tsx - Complete Auth Context
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User, AuthSession, AuthContextType } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 AuthProvider initializing...');

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('📡 Getting initial session...');
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Error getting initial session:', error);
        } else {
          console.log(
            '✅ Initial session retrieved:',
            session?.user?.email || 'No user'
          );
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('❌ Error in getInitialSession:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        '🔄 Auth state change:',
        event,
        session?.user?.email || 'No user'
      );

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      console.log('🧹 Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting sign in for:', email);
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('❌ Sign in error:', error.message);
      } else {
        console.log('✅ Sign in successful:', data.user?.email);
      }

      return { error };
    } catch (error) {
      console.error('❌ Sign in catch error:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      console.log('📝 Attempting sign up for:', email);
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName?.trim(),
          },
        },
      });

      if (error) {
        console.error('❌ Sign up error:', error.message);
      } else {
        console.log('✅ Sign up successful:', data.user?.email);
      }

      return { error };
    } catch (error) {
      console.error('❌ Sign up catch error:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('👋 Attempting sign out...');
      setLoading(true);

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Sign out error:', error);
        throw error;
      } else {
        console.log('✅ Sign out successful');
      }
    } catch (error) {
      console.error('❌ Sign out catch error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('🔄 Attempting password reset for:', email);

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: 'your-app://reset-password', // Update this to your app's deep link
        }
      );

      if (error) {
        console.error('❌ Password reset error:', error.message);
      } else {
        console.log('✅ Password reset email sent');
      }

      return { error };
    } catch (error) {
      console.error('❌ Password reset catch error:', error);
      return { error };
    }
  };

  const updateProfile = async (updates: {
    full_name?: string;
    avatar_url?: string;
  }) => {
    try {
      console.log('📝 Attempting profile update...');

      const { error } = await supabase.auth.updateUser({
        data: updates,
      });

      if (error) {
        console.error('❌ Profile update error:', error.message);
      } else {
        console.log('✅ Profile updated successfully');
      }

      return { error };
    } catch (error) {
      console.error('❌ Profile update catch error:', error);
      return { error };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
