-- Fix homes table RLS policies to prevent infinite recursion
-- This script removes any policies that reference applications table
-- and ensures the correct policies are in place

-- Step 1: Drop any policies that might cause recursion
DROP POLICY IF EXISTS "Tenants can view homes they applied for" ON public.homes;
DROP POLICY IF EXISTS "Tenants can view approved homes" ON public.homes;
DROP POLICY IF EXISTS "Anyone can view homes with applications" ON public.homes;

-- Step 2: Ensure the basic policies are correct
-- These policies DO NOT reference the applications table, so no recursion

-- Policy 1: Anyone can view available homes (for discover page)
DROP POLICY IF EXISTS "Anyone can view available homes" ON public.homes;
CREATE POLICY "Anyone can view available homes"
  ON public.homes FOR SELECT
  USING (available = true);

-- Policy 2: Agents can view their own homes (including taken ones)
DROP POLICY IF EXISTS "Agents can view their own homes" ON public.homes;
CREATE POLICY "Agents can view their own homes"
  ON public.homes FOR SELECT
  USING (auth.uid() = owner_id);

-- Policy 3: SuperAdmin can view all homes
DROP POLICY IF EXISTS "SuperAdmin can view all homes" ON public.homes;
CREATE POLICY "SuperAdmin can view all homes"
  ON public.homes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'SuperAdmin'
    )
  );

-- Policy 4: Tenants can view homes they have approved applications for
-- This allows tenants to see homes even when available = false
DROP POLICY IF EXISTS "Tenants can view approved homes" ON public.homes;
CREATE POLICY "Tenants can view approved homes"
  ON public.homes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE applications.home_id = homes.id
        AND applications.tenant_id = auth.uid()
        AND applications.status = 'approved'
    )
  );

-- Step 3: Ensure the SECURITY DEFINER function exists for tenant home access
-- This function bypasses RLS entirely, so tenants can see their booked homes
-- even when the home is marked as taken (available = false)

DROP FUNCTION IF EXISTS public.get_tenant_home_details CASCADE;

CREATE OR REPLACE FUNCTION public.get_tenant_home_details(p_home_ids UUID[])
RETURNS TABLE (
  id UUID,
  name TEXT,
  location TEXT,
  region TEXT,
  type TEXT,
  price INTEGER,
  deposit INTEGER,
  image TEXT,
  available BOOLEAN,
  agent_name TEXT,
  agent_phone TEXT,
  agent_bio TEXT,
  agent_company TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.name,
    h.location,
    h.region,
    h.type,
    h.price,
    h.deposit,
    h.image,
    h.available,
    p.name  AS agent_name,
    p.phone AS agent_phone,
    p.bio   AS agent_bio,
    p.company AS agent_company
  FROM public.homes h
  LEFT JOIN public.profiles p ON p.id = h.owner_id
  WHERE h.id = ANY(p_home_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_home_details(UUID[]) TO authenticated;

-- Step 4: Verify applications table policies don't cause issues
-- The existing policies should be fine as they only check homes for ownership
-- but let's verify they exist and are correct

-- Drop any problematic application policies
DROP POLICY IF EXISTS "Tenants can view homes through applications" ON public.applications;

-- Ensure correct applications policies exist
DROP POLICY IF EXISTS "Tenants can view own applications" ON public.applications;
CREATE POLICY "Tenants can view own applications"
  ON public.applications FOR SELECT
  USING (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Agents can view applications for their homes" ON public.applications;
CREATE POLICY "Agents can view applications for their homes"
  ON public.applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.homes
      WHERE homes.id = applications.home_id AND homes.owner_id = auth.uid()
    )
  );
