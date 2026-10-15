-- Comprehensive RLS fix to block guests and ensure approved units only visible to approved tenant
-- This explicitly blocks ALL access for anonymous users

-- Drop ALL existing policies on homes and home_images
DROP POLICY IF EXISTS ON public.homes FOR ALL;
DROP POLICY IF EXISTS ON public.home_images FOR ALL;

-- Enable RLS on both tables (this blocks all access by default)
ALTER TABLE public.homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_images ENABLE ROW LEVEL SECURITY;

-- Create a security definer function to check if a tenant has an approved application
CREATE OR REPLACE FUNCTION public.user_has_approved_application(p_home_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user_id is NULL (guest), return false immediately
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.applications
    WHERE
      applications.home_id = p_home_id
      AND applications.tenant_id = p_user_id
      AND applications.status = 'approved'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_approved_application(UUID, UUID) TO authenticated;

-- ============================================================================
-- HOMES TABLE POLICIES
-- ============================================================================

-- Policy for authenticated users to view available homes
CREATE POLICY "Authenticated users can view available homes"
ON public.homes
FOR SELECT
TO authenticated
USING (available = true);

-- Policy for authenticated users to view their approved units
CREATE POLICY "Authenticated users can view their approved units"
ON public.homes
FOR SELECT
TO authenticated
USING (public.user_has_approved_application(homes.id, auth.uid()));

-- Policy for agents to view their own homes (including unavailable ones)
CREATE POLICY "Agents can view their own homes"
ON public.homes
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Policy for agents to insert their own homes
CREATE POLICY "Agents can insert their own homes"
ON public.homes
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Policy for agents to update their own homes
CREATE POLICY "Agents can update their own homes"
ON public.homes
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Policy for agents to delete their own homes
CREATE POLICY "Agents can delete their own homes"
ON public.homes
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- ============================================================================
-- HOME_IMAGES TABLE POLICIES
-- ============================================================================

-- Policy for authenticated users to view images of available homes
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

-- Policy for authenticated users to view images of their approved units
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
      AND public.user_has_approved_application(h.id, auth.uid())
  )
);

-- Policy for agents to view images of their own homes
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

-- Policy for agents to insert images for their own homes
CREATE POLICY "Agents can insert images for their own homes"
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

-- Policy for agents to update images for their own homes
CREATE POLICY "Agents can update images for their own homes"
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

-- Policy for agents to delete images for their own homes
CREATE POLICY "Agents can delete images for their own homes"
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

-- Verify RLS is enabled
DO $$
BEGIN
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

  RAISE NOTICE 'RLS is properly enabled on both tables';
END $$;
