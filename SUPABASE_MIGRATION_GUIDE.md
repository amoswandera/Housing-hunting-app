# Supabase Migration Guide

This guide will help you migrate your Habitat app from Render (Express + SQLite) to Supabase (PostgreSQL + Auth + Storage).

## Prerequisites

1. Create a free Supabase account at https://supabase.com
2. Create a new project in Supabase dashboard

## Step 1: Set Up Supabase Database

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `supabase/schema.sql`
5. Click **Run** to execute the schema
6. Repeat with `supabase/storage.sql` to set up storage buckets

## Step 2: Configure Environment Variables

1. In your Supabase project dashboard, go to **Settings > API**
2. Copy your **Project URL** and **anon public key**
3. Update your `.env.local` file:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 3: Configure Supabase Auth

1. In Supabase dashboard, go to **Authentication > Providers**
2. Enable **Email** provider (it should be enabled by default)
3. For phone authentication (optional, requires additional setup):
   - Enable **Phone** provider
   - Configure SMS provider (Twilio, MessageBird, etc.)
   - For now, email authentication is recommended

## Step 4: Create Initial Admin Account

Since we're migrating from a custom auth system to Supabase Auth, you'll need to create your admin account:

1. In Supabase dashboard, go to **Authentication > Users**
2. Click **Add User**
3. Create a SuperAdmin account with email and password
4. Go to **Table Editor** > **profiles**
5. Find your new user and update the `role` to `SuperAdmin`
6. Update other profile fields (name, company, bio, etc.)

## Step 5: Test Locally

1. Install dependencies (already done):
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:5173 in your browser

4. Test the following:
   - User registration (email-based)
   - User login
   - Browse homes
   - Submit applications (as tenant)
   - Agent dashboard (create an agent account via SuperAdmin first)
   - Create/manage homes
   - Review applications

## Step 6: Deploy to Vercel

### 6.1 Prepare for Deployment

1. Create a new repository on GitHub (if not already done)
2. Push your code to GitHub

### 6.2 Configure Vercel Environment Variables

1. Go to https://vercel.com and sign up/login
2. Import your GitHub repository
3. In Vercel project settings, add these environment variables:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

### 6.3 Deploy

1. Click **Deploy** in Vercel
2. Wait for the build to complete
3. Your app will be live at `https://your-project.vercel.app`

## Step 7: Update Capacitor App (APK)

After deploying to Vercel, update your mobile app:

1. Update your Capacitor config if needed (current config is fine)
2. Build the web assets:
   ```bash
   npm run build
   ```

3. Sync to Android:
   ```bash
   npx cap sync android
   ```

4. Build the APK:
   ```bash
   cd android
   gradlew.bat assembleDebug
   ```

5. The APK will be at `android/app/build/outputs/apk/debug/app-debug.apk`

## Key Differences from Express Backend

### Authentication
- **Before**: Custom token-based auth with in-memory sessions
- **After**: Supabase Auth with secure JWT tokens
- **Note**: Phone auth requires additional SMS provider setup. Email auth works out of the box.

### Database
- **Before**: SQLite (local file-based)
- **After**: PostgreSQL (cloud-based, scalable)
- **Benefits**: Better performance, real-time subscriptions, Row Level Security

### File Storage
- **Before**: Local file system on Render
- **After**: Supabase Storage (cloud-based CDN)
- **Benefits**: Automatic CDN, public URLs, better performance

### API
- **Before**: Express REST API endpoints
- **After**: Direct Supabase client calls from React
- **Benefits**: Fewer moving parts, less infrastructure to manage

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` exists and contains valid Supabase credentials
- Restart your dev server after updating env variables

### "Phone authentication requires OTP setup"
- For now, use email authentication instead
- Phone auth requires SMS provider configuration in Supabase

### Storage upload errors
- Check that storage buckets are created (run `storage.sql`)
- Verify RLS policies allow uploads

### RLS policy errors
- Make sure you ran the schema.sql which includes RLS policies
- Check that your user has the correct role in the profiles table

## Next Steps

1. **Set up M-Pesa integration** (if needed):
   - Configure Safaricom Daraja credentials
   - Implement actual STK push in Supabase Edge Functions

2. **Enable phone authentication** (optional):
   - Set up SMS provider in Supabase
   - Update `supabaseApi.js` to handle phone OTP

3. **Add real-time features**:
   - Use Supabase Realtime for live updates on applications
   - Subscribe to application status changes

4. **Set up Row Level Security for production**:
   - Review and tighten RLS policies
   - Add additional policies as needed

## Removing the Express Backend (Optional)

Once you've verified everything works with Supabase:

1. Delete the `server/` directory
2. Remove `better-sqlite3`, `express`, `cors`, `multer` from package.json
3. Remove the `server` script from package.json
4. Delete the `data/` directory (SQLite database)
5. Remove Render deployment

## Support

- Supabase docs: https://supabase.com/docs
- Vercel docs: https://vercel.com/docs
- For issues specific to this migration, check the Supabase dashboard logs
