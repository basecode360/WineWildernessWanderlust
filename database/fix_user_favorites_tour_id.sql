-- Fix user_favorites table to use TEXT for tour_id instead of UUID
-- This addresses the error: invalid input syntax for type uuid: "acadia_lobster_tour"

-- First, drop the existing table if it exists (since we need to change the column type)
DROP TABLE IF EXISTS user_favorites;

-- Recreate the table with TEXT tour_id to match your actual tour ID format
CREATE TABLE user_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tour_id TEXT NOT NULL,  -- Changed from UUID to TEXT to support string IDs like "acadia_lobster_tour"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate favorites
-- A user can only favorite the same tour once
CREATE UNIQUE INDEX user_favorites_user_tour_unique 
ON user_favorites(user_id, tour_id);

-- Create index for faster queries by user_id
CREATE INDEX user_favorites_user_id_idx 
ON user_favorites(user_id);

-- Create index for faster queries by tour_id
CREATE INDEX user_favorites_tour_id_idx 
ON user_favorites(tour_id);

-- Create index for ordering by created_at
CREATE INDEX user_favorites_created_at_idx 
ON user_favorites(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own favorites
CREATE POLICY "Users can view their own favorites" 
ON user_favorites FOR SELECT 
USING (auth.uid() = user_id);

-- Users can only insert their own favorites
CREATE POLICY "Users can insert their own favorites" 
ON user_favorites FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own favorites
CREATE POLICY "Users can delete their own favorites" 
ON user_favorites FOR DELETE 
USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_favorites_updated_at
    BEFORE UPDATE ON user_favorites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();