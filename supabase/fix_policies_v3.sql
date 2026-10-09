-- FIX V3: Use SECURITY DEFINER function to fetch homes by ID
-- This allows the frontend to merge approved homes into the discover view
-- without creating circular RLS dependencies

-- Step 1: Drop ALL policies on homes table
DROP POLICY IF EXISTS "Anyone can view available homes" ON public.homes;
DROP POLICY IF EXISTS "Agents can view their own homes" ON public.homes;
DROP POLICY IF EXISTS "SuperAdmin can view all homes" ON public.homes;
DROP POLICY IF EXISTS "Tenants can view approved homes" ON public.homes;
DROP POLICY IF EXISTS "Tenants can view homes they applied for" ON public.homes;
DROP POLICY IF EXISTS "Anyone can view homes with applications" ON public.homes;

-- Step 2: Create simple, non-recursive policies
-- These DO NOT reference the applications table at all

-- Policy 1: Anyone can view available homes (for discover page)
CREATE POLICY "Anyone can view available homes"
  ON public.homes FOR SELECT
  USING (available = true);

-- Policy 2: Agents can view their own homes (including taken ones)
CREATE POLICY "Agents can view their own homes"
  ON public.homes FOR SELECT
  USING (auth.uid() = owner_id);

-- Policy 3: SuperAdmin can view all homes
CREATE POLICY "SuperAdmin can view all homes"
  ON public.homes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'SuperAdmin'
    )
  );

-- Step 3: Create SECURITY DEFINER function to fetch homes by ID
-- This bypasses RLS, so the frontend can fetch approved homes separately
-- and merge them into the discover view

DROP FUNCTION IF EXISTS public.get_homes_by_ids CASCADE;

CREATE OR REPLACE FUNCTION public.get_homes_by_ids(p_home_ids UUID[])
RETURNS TABLE (
  id UUID,
  name TEXT,
  location TEXT,
  region TEXT,
  type TEXT,
  parking BOOLEAN,
  price INTEGER,
  deposit INTEGER,
  image TEXT,
  tag TEXT,
  details TEXT,
  available BOOLEAN,
  owner_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
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
    h.parking,
    h.price,
    h.deposit,
    h.image,
    h.tag,
    h.details,
    h.available,
    h.owner_id,
    h.created_at,
    h.updated_at
  FROM public.homes h
  WHERE h.id = ANY(p_home_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_homes_by_ids(UUID[]) TO authenticated;

-- Step 4: Ensure the SECURITY DEFINER function for tenant home details exists
-- This is used in fetchMyApplications to show home details in bookings view

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

-- Step 5: Verify applications table policies are correct

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
