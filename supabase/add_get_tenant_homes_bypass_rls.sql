-- Create SECURITY DEFINER functions to fetch home and building details bypassing RLS
-- This ensures tenants can always see home/building details for units they have applied to, regardless of availability

CREATE OR REPLACE FUNCTION public.get_tenant_homes_bypass_rls(p_home_ids UUID[])
RETURNS TABLE (
  id UUID,
  building_id UUID,
  unit_number TEXT,
  category TEXT,
  floor TEXT,
  type TEXT,
  details TEXT,
  price NUMERIC,
  region TEXT,
  location TEXT,
  name TEXT,
  available BOOLEAN,
  image TEXT,
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
    h.building_id,
    h.unit_number,
    h.category,
    h.floor,
    h.type,
    h.details,
    h.price,
    h.region,
    h.location,
    h.name,
    h.available,
    h.image,
    p.name AS agent_name,
    p.phone AS agent_phone,
    p.bio AS agent_bio,
    p.company AS agent_company
  FROM public.homes h
  LEFT JOIN public.profiles p ON h.owner_id = p.id
  WHERE h.id = ANY(p_home_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_homes_bypass_rls(UUID[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_buildings_bypass_rls(p_building_ids UUID[])
RETURNS TABLE (
  id UUID,
  name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name
  FROM public.buildings b
  WHERE b.id = ANY(p_building_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_buildings_bypass_rls(UUID[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_home_images_bypass_rls(p_home_ids UUID[])
RETURNS TABLE (
  home_id UUID,
  image_url TEXT,
  is_primary BOOLEAN,
  order_index INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hi.home_id,
    hi.image_url,
    hi.is_primary,
    hi.order_index
  FROM public.home_images hi
  WHERE hi.home_id = ANY(p_home_ids)
  ORDER BY hi.order_index ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_home_images_bypass_rls(UUID[]) TO authenticated;
