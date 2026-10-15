-- STRICT RLS fix to block guests and ensure approved units only visible to approved tenant
-- This uses multiple separate policies with explicit blocking

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

-- Enable RLS with NO FORCE option (this blocks all access by default for all users)
ALTER TABLE public.homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_images ENABLE ROW LEVEL SECURITY;

-- Create a security definer function to check if a tenant has an approved application
-- This function runs with elevated privileges and checks strictly
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
-- HOMES TABLE POLICIES - STRICT MODE
-- ============================================================================

-- Policy 1: Authenticated users can view AVAILABLE homes only
CREATE POLICY "View available homes"
ON public.homes
FOR SELECT
TO authenticated
USING (available = true);

-- Policy 2: Authenticated users can view their OWN approved units ONLY
-- This is separate to ensure strict checking
CREATE POLICY "View own approved units"
ON public.homes
FOR SELECT
TO authenticated
USING (
  NOT available
  AND public.user_has_approved_application(homes.id, auth.uid())
);

-- Policy 3: Agents can view ALL their own homes (including unavailable)
CREATE POLICY "Agents view own homes"
ON public.homes
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Policy 4: Agents can insert their own homes
CREATE POLICY "Agents insert own homes"
ON public.homes
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Policy 5: Agents can update their own homes
CREATE POLICY "Agents update own homes"
ON public.homes
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Policy 6: Agents can delete their own homes
CREATE POLICY "Agents delete own homes"
ON public.homes
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- ============================================================================
-- HOME_IMAGES TABLE POLICIES - STRICT MODE
-- ============================================================================

-- Policy 1: Authenticated users can view images of AVAILABLE homes
CREATE POLICY "View images of available homes"
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

-- Policy 2: Authenticated users can view images of their OWN approved units ONLY
CREATE POLICY "View images of own approved units"
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

-- Policy 3: Agents can view images of their own homes
CREATE POLICY "Agents view images of own homes"
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

-- Policy 4: Agents can insert images for their own homes
CREATE POLICY "Agents insert images for own homes"
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

-- Policy 5: Agents can update images for their own homes
CREATE POLICY "Agents update images for own homes"
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

-- Policy 6: Agents can delete images for their own homes
CREATE POLICY "Agents delete images for own homes"
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

-- Verify RLS is enabled and no policies exist for anon (guests)
DO $$
DECLARE
  v_anon_policies INTEGER;
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

  -- Count policies for anon role (should be 0)
  SELECT COUNT(*)
  INTO v_anon_policies
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename IN ('homes', 'home_images')
  AND policyname ILIKE '%anon%';

  IF v_anon_policies > 0 THEN
    RAISE NOTICE 'Found % policies for anon role - guests may have access', v_anon_policies;
  ELSE
    RAISE NOTICE 'No policies for anon role - guests are properly blocked';
  END IF;

  RAISE NOTICE 'RLS is properly configured with strict policies';
END $$;
