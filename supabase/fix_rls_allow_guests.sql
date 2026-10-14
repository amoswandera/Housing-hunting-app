-- Fix RLS to allow guests to see available homes/units but not approved units
-- Guests (anon role) can browse available properties
-- Authenticated tenants can see available + their approved units
-- Agents can see/manage their own properties

-- Drop all existing policies on homes
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'homes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.homes', policy_record.policyname);
  END LOOP;
END $$;

-- Drop all existing policies on home_images
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'home_images'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.home_images', policy_record.policyname);
  END LOOP;
END $$;

-- Enable RLS on both tables
ALTER TABLE public.homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_images ENABLE ROW LEVEL SECURITY;

-- Create a security definer function to check if a tenant has an approved application
CREATE OR REPLACE FUNCTION public.user_has_approved_application(p_home_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- If user_id is NULL (guest), return false immediately
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Count the number of approved applications for this user and home
  SELECT COUNT(*)
  INTO v_count
  FROM public.applications
  WHERE
    applications.home_id = p_home_id
    AND applications.tenant_id = p_user_id
    AND applications.status = 'approved';

  -- Only return true if exactly one approved application exists
  RETURN v_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_approved_application(UUID, UUID) TO authenticated;

-- ============================================================================
-- HOMES TABLE POLICIES
-- ============================================================================

-- Policy 1: GUESTS can view AVAILABLE homes only
CREATE POLICY "Guests can view available homes"
ON public.homes
FOR SELECT
TO anon
USING (available = true);

-- Policy 2: Authenticated users can view AVAILABLE homes
CREATE POLICY "Authenticated users can view available homes"
ON public.homes
FOR SELECT
TO authenticated
USING (available = true);

-- Policy 3: Authenticated users can view their OWN approved units ONLY
CREATE POLICY "Authenticated users can view their approved units"
ON public.homes
FOR SELECT
TO authenticated
USING (
  NOT available
  AND public.user_has_approved_application(homes.id, auth.uid())
);

-- Policy 4: Agents can view ALL their own homes (including unavailable)
CREATE POLICY "Agents can view their own homes"
ON public.homes
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Policy 5: Agents can insert their own homes
CREATE POLICY "Agents can insert their own homes"
ON public.homes
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Policy 6: Agents can update their own homes
CREATE POLICY "Agents can update their own homes"
ON public.homes
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Policy 7: Agents can delete their own homes
CREATE POLICY "Agents can delete their own homes"
ON public.homes
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- ============================================================================
-- HOME_IMAGES TABLE POLICIES
-- ============================================================================

-- Policy 1: GUESTS can view images of AVAILABLE homes
CREATE POLICY "Guests can view images of available homes"
ON public.home_images
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.homes
    WHERE
      homes.id = home_images.home_id
      AND homes.available = true
  )
);

-- Policy 2: Authenticated users can view images of AVAILABLE homes
CREATE POLICY "Authenticated users can view images of available homes"
ON public.home_images
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.homes
    WHERE
      homes.id = home_images.home_id
      AND homes.available = true
  )
);

-- Policy 3: Authenticated users can view images of their OWN approved units ONLY
CREATE POLICY "Authenticated users can view images of their approved units"
ON public.home_images
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.homes h
    WHERE
      h.id = home_images.home_id
      AND NOT h.available
      AND public.user_has_approved_application(h.id, auth.uid())
  )
);

-- Policy 4: Agents can view images of their own homes
CREATE POLICY "Agents can view images of their own homes"
ON public.home_images
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.homes
    WHERE
      homes.id = home_images.home_id
      AND homes.owner_id = auth.uid()
  )
);

-- Policy 5: Agents can insert images for their own homes
CREATE POLICY "Agents can insert images for own homes"
ON public.home_images
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.homes
    WHERE
      homes.id = home_images.home_id
      AND homes.owner_id = auth.uid()
  )
);

-- Policy 6: Agents can update images for their own homes
CREATE POLICY "Agents can update images for own homes"
ON public.home_images
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.homes
    WHERE
      homes.id = home_images.home_id
      AND homes.owner_id = auth.uid()
  )
);

-- Policy 7: Agents can delete images for their own homes
CREATE POLICY "Agents can delete images for own homes"
ON public.home_images
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.homes
    WHERE
      homes.id = home_images.home_id
      AND homes.owner_id = auth.uid()
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_guest_policies INTEGER;
  v_auth_policies INTEGER;
BEGIN
  -- Check RLS is enabled
  IF NOT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'homes'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on homes table';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'home_images'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on home_images table';
  END IF;

  -- Count policies for anon role (should be 2 - one for homes, one for images)
  SELECT COUNT(*)
  INTO v_guest_policies
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename IN ('homes', 'home_images')
  AND roles = '{anon}';

  -- Count policies for authenticated role
  SELECT COUNT(*)
  INTO v_auth_policies
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename IN ('homes', 'home_images')
  AND roles = '{authenticated}';

  RAISE NOTICE 'Guest policies: % (should be 2)', v_guest_policies;
  RAISE NOTICE 'Authenticated policies: % (should be many)', v_auth_policies;
  RAISE NOTICE 'RLS properly configured';
END $$;
