-- FIX V2: Simplified version without LATERAL join
-- This uses a subquery instead which is more compatible

-- Recreate the get_tenant_home_details function with a simpler approach
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
    COALESCE(
      h.image,
      (SELECT image_url FROM public.home_images WHERE home_id = h.id AND is_primary = true LIMIT 1)
    ) AS image,
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
