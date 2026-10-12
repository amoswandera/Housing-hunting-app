-- Comprehensive fix for homes visibility
-- This ensures tenants and guests can see available homes

-- Step 1: Drop ALL existing policies on homes table
DROP POLICY IF EXISTS "Anyone can view available homes" ON public.homes;
DROP POLICY IF EXISTS "Agents can view their own homes" ON public.homes;
DROP POLICY IF EXISTS "SuperAdmin can view all homes" ON public.homes;
DROP POLICY IF EXISTS "Tenants can view approved homes" ON public.homes;
DROP POLICY IF EXISTS "Tenants can view homes they applied for" ON public.homes;
DROP POLICY IF EXISTS "Anyone can view homes with applications" ON public.homes;

-- Step 2: Create simple, clear policies

-- Policy 1: Available homes are visible to EVERYONE (including unauthenticated guests)
CREATE POLICY "Anyone can view available homes"
  ON public.homes FOR SELECT
  USING (available = true);

-- Policy 2: Agents can view ALL their own homes (including unavailable ones)
CREATE POLICY "Agents can view their own homes"
  ON public.homes FOR SELECT
  USING (auth.uid() = owner_id);

-- Policy 3: SuperAdmin can view ALL homes
CREATE POLICY "SuperAdmin can view all homes"
  ON public.homes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'SuperAdmin'
    )
  );

-- Step 3: Verify policies are created correctly
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'homes'
ORDER BY policyname;
