# User Favorites Table Setup

This guide explains how to create the `user_favorites` table required for the favorites functionality in your Supabase database.

## ⚠️ Important Fix for UUID Error

If you already created the table and are getting UUID errors like:
```
invalid input syntax for type uuid: "acadia_lobster_tour"
```

This means your tour IDs are strings, not UUIDs. **Use the `fix_user_favorites_tour_id.sql` script instead** to recreate the table with the correct data type.

## Quick Setup

### For New Installations:
1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the "SQL Editor" section

2. **Run the SQL Script**
   - Copy the contents of `user_favorites_table.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the script

### If You Have UUID Errors:
1. **Run the Fix Script**
   - Copy the contents of `fix_user_favorites_tour_id.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the script

2. **Verify Fix**
   - Go to "Table Editor" in your Supabase dashboard
   - Check that `tour_id` column shows as `text` type (not `uuid`)

3. **Test the Favorites**
   - Try favoriting a tour in the app
   - Should work without UUID errors

## Table Structure

The `user_favorites` table contains the following columns:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `user_id` | UUID | Foreign key to auth.users(id) |
| `tour_id` | **TEXT** | ID of the favorited tour (supports string IDs like "acadia_lobster_tour") |
| `created_at` | TIMESTAMP | When the favorite was added |
| `updated_at` | TIMESTAMP | When the record was last updated |

## Security Features

- **Row Level Security (RLS)** is enabled
- **Policies** ensure users can only access their own favorites
- **Unique constraint** prevents duplicate favorites per user/tour
- **Indexes** for optimal query performance
- **Cascade deletion** when user account is deleted

## Relationships

- `user_id` references `auth.users(id)` with CASCADE deletion
- `tour_id` stores string identifiers that match your tour system

## Usage in App

Once the table is created with the correct data type, the favorites functionality will work automatically:

- ❤️ Users can favorite/unfavorite tours
- 📱 Favorites show up in the profile screen
- 🗂️ Dedicated favorites screen lists all saved tours
- 🔔 Proper error handling if table doesn't exist

## Troubleshooting

### UUID Error:
```
invalid input syntax for type uuid: "acadia_lobster_tour"
```
**Solution**: Use the `fix_user_favorites_tour_id.sql` script to recreate the table with TEXT tour_id.

### Permission Errors:
1. Make sure RLS policies are properly set
2. Check that the authenticated role has necessary permissions
3. Verify user authentication is working in your app

### Tour Title Not Showing:
The app will try to fetch tour titles from your `tours` table. Make sure your tours table exists with `id` and `title` columns.