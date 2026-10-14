-- Fix RLS policy to allow tenants to see their approved building units
-- This ensures that when a tenant's unit application is approved, they can still see the unit
-- in the building's unit list, while other tenants cannot see it

-- Drop existing tenant home policy if it exists
DROP POLICY IF EXISTS "Tenants can view available homes" ON public.homes;

-- Create new policy that allows tenants to see:
-- 1. Available homes/units
-- 2. Homes/units they have an approved application for
CREATE POLICY "Tenants can view available homes and their approved units"
ON public.homes
FOR SELECT
TO authenticated
USING (
  -- Available homes/units are visible to all tenants
  available = true
  OR
  -- Units the tenant has an approved application for are also visible
  EXISTS (
    SELECT 1
    FROM public.applications
    WHERE
      applications.home_id = homes.id
      AND applications.tenant_id = auth.uid()
      AND applications.status = 'approved'
  )
);

-- Also update the policy for home_images to allow viewing images of approved units
DROP POLICY IF EXISTS "Tenants can view home images for available homes" ON public.home_images;

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
    FROM public.applications
    WHERE
      applications.home_id = home_images.home_id
      AND applications.tenant_id = auth.uid()
      AND applications.status = 'approved'
  )
);
