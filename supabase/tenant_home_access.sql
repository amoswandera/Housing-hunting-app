-- IMPORTANT: Do NOT add any RLS policy on homes that references applications.
-- Such a policy causes infinite recursion in Supabase.
-- 
-- Instead, use this SECURITY DEFINER function which bypasses RLS and returns
-- home details for any list of home IDs — used by fetchMyApplications so
-- tenants always see their booked home details even when the home is taken.
--
-- Run this in Supabase SQL Editor:

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
