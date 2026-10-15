-- Comprehensive fix for RLS policies to ensure:
-- 1. No infinite recursion
-- 2. Approved units only visible to the approved tenant
-- 3. Guests cannot see any homes

-- First, drop ALL existing policies on homes and home_images to start fresh
DROP POLICY IF EXISTS "Tenants can view available homes and their approved units" ON public.homes;
DROP POLICY IF EXISTS "Tenants can view home images for available homes and their approved units" ON public.home_images;
DROP POLICY IF EXISTS "Tenants can view available homes" ON public.homes;
DROP POLICY IF EXISTS "Agents can view their own homes" ON public.homes;
DROP POLICY IF EXISTS "Agents can insert their own homes" ON public.homes;
DROP POLICY IF EXISTS "Agents can update their own homes" ON public.homes;
DROP POLICY IF EXISTS "Agents can delete their own homes" ON public.homes;
DROP POLICY IF EXISTS "Tenants can view home images for available homes" ON public.home_images;
DROP POLICY IF EXISTS "Public can view homes" ON public.homes;
DROP POLICY IF EXISTS "Public can view home images" ON public.home_images;

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

-- Enable RLS on both tables
ALTER TABLE public.homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_images ENABLE ROW LEVEL SECURITY;

-- Create policy for homes: Only authenticated users can see available homes or their approved units
CREATE POLICY "Authenticated users can view available homes and their approved units"
ON public.homes
FOR SELECT
TO authenticated
USING (
  -- Available homes/units are visible to all authenticated tenants
  available = true
  OR
  -- Units the tenant has an approved application for are also visible
  public.user_has_approved_application(homes.id, auth.uid())
);

-- Policy for agents to manage their own homes
CREATE POLICY "Agents can view their own homes"
ON public.homes
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Agents can insert their own homes"
ON public.homes
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Agents can update their own homes"
ON public.homes
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Agents can delete their own homes"
ON public.homes
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Create policy for home_images: Only authenticated users can see images
CREATE POLICY "Authenticated users can view home images for available homes and their approved units"
ON public.home_images
FOR SELECT
TO authenticated
USING (
  -- Images for available homes
  EXISTS (
    SELECT 1
    FROM public.homes
    WHERE
      homes.id = home_images.home_id
      AND homes.available = true
  )
  OR
  -- Images for homes the tenant has approved application for
  EXISTS (
    SELECT 1
    FROM public.homes h
    WHERE
      h.id = home_images.home_id
      AND public.user_has_approved_application(h.id, auth.uid())
  )
  OR
  -- Images for homes owned by the current user (agent)
  EXISTS (
    SELECT 1
    FROM public.homes h
    WHERE
      h.id = home_images.home_id
      AND h.owner_id = auth.uid()
  )
);

-- Policy for agents to manage images of their own homes
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
