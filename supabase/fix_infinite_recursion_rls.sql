-- Fix infinite recursion in RLS policy by using a security definer function
-- This avoids the circular reference that was causing the 500 error
-- Also ensures approved units are only visible to the approved tenant

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Tenants can view available homes and their approved units" ON public.homes;
DROP POLICY IF EXISTS "Tenants can view home images for available homes and their approved units" ON public.home_images;

-- Create a security definer function to check if a tenant has an approved application
-- This function runs with elevated privileges and won't cause recursion
CREATE OR REPLACE FUNCTION public.user_has_approved_application(p_home_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- Create the improved RLS policy for homes using the function
-- Only authenticated tenants can see homes
CREATE POLICY "Tenants can view available homes and their approved units"
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

-- Add a policy to block guests (unauthenticated users) from seeing any homes
-- This overrides the default which might allow public access
ALTER TABLE public.homes ENABLE ROW LEVEL SECURITY;

-- Create the improved RLS policy for home_images using the function
CREATE POLICY "Tenants can view home images for available homes and their approved units"
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
);

-- Block guests from seeing home images
ALTER TABLE public.home_images ENABLE ROW LEVEL SECURITY;
