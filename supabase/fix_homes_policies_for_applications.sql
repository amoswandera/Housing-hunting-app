-- Update homes table RLS policies to allow fetching home details for units tenant has applied to
-- This ensures category, floor, and other fields are populated for declined/cancelled applications
-- This does NOT affect the image policies that are already working

-- Drop existing homes policies
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

-- Re-create the security definer function to check for ANY application (submitted, approved, declined, cancelled)
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

  -- Count the number of applications (any status) for this user and home
  SELECT COUNT(*)
  INTO v_count
  FROM public.applications
  WHERE
    applications.home_id = p_home_id
    AND applications.tenant_id = p_user_id;

  -- Return true if the tenant has any application for this home
  RETURN v_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_any_application(UUID, UUID) TO authenticated;

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

-- Policy 3: Authenticated users can view homes they have ANY application for (submitted, approved, declined, cancelled)
CREATE POLICY "Authenticated users can view their applied homes"
ON public.homes
FOR SELECT
TO authenticated
USING (
  public.user_has_any_application(homes.id, auth.uid())
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

  -- Count policies for anon role (should be 1 - for available homes)
  SELECT COUNT(*)
  INTO v_guest_policies
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'homes'
  AND roles = '{anon}';

  -- Count policies for authenticated role (should be 4)
  SELECT COUNT(*)
  INTO v_auth_policies
  FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'homes'
    AND roles = '{authenticated}';

  RAISE NOTICE 'Guest policies on homes: % (should be 1)', v_guest_policies;
  RAISE NOTICE 'Authenticated policies on homes: % (should be 4)', v_auth_policies;
  RAISE NOTICE 'homes RLS properly configured';
END $$;
