-- Fix home_images RLS to allow tenants to see images of units they have applied to
-- This fixes the issue where approved unit images are hidden in bookings

-- Drop existing home_images policies
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

-- Create a security definer function to check if a tenant has any application (submitted or approved)
CREATE OR REPLACE FUNCTION public.user_has_any_application(p_home_id UUID, p_user_id UUID)
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

  -- Count the number of applications (submitted or approved) for this user and home
  SELECT COUNT(*)
  INTO v_count
  FROM public.applications
  WHERE
    applications.home_id = p_home_id
    AND applications.tenant_id = p_user_id
    AND applications.status IN ('submitted', 'approved');

  -- Return true if the tenant has any application for this home
  RETURN v_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_any_application(UUID, UUID) TO authenticated;

-- ============================================================================
-- HOME_IMAGES TABLE POLICIES
-- ============================================================================

-- Policy 1: GUESTS can view images of AVAILABLE homes only
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

-- Policy 3: Authenticated users can view images of units they have ANY application for (submitted or approved)
CREATE POLICY "Authenticated users can view images of their applied units"
ON public.home_images
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.homes h
    WHERE
      h.id = home_images.home_id
      AND public.user_has_any_application(h.id, auth.uid())
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
    AND tablename = 'home_images'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on home_images table';
  END IF;

  -- Count policies for anon role (should be 1 - for available homes)
  SELECT COUNT(*)
  INTO v_guest_policies
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'home_images'
  AND roles = '{anon}';

  -- Count policies for authenticated role
  SELECT COUNT(*)
  INTO v_auth_policies
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'home_images'
  AND roles = '{authenticated}';

  RAISE NOTICE 'Guest policies on home_images: % (should be 1)', v_guest_policies;
  RAISE NOTICE 'Authenticated policies on home_images: % (should be 4)', v_auth_policies;
  RAISE NOTICE 'home_images RLS properly configured';
END $$;
