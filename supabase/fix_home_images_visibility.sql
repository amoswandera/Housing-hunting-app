-- Ensure home_images table allows read access for authenticated users
-- This ensures tenants can see images for homes they've applied to

-- Check if table exists and has RLS enabled
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'home_images') THEN
    RAISE NOTICE 'home_images table does not exist, skipping';
  ELSE
    -- Enable RLS if not already enabled
    ALTER TABLE public.home_images ENABLE ROW LEVEL SECURITY;

    -- Drop any existing select policy
    DROP POLICY IF EXISTS "home_images_select_policy" ON public.home_images;

    -- Create policy allowing all authenticated users to read images
    CREATE POLICY "home_images_select_policy"
      ON public.home_images
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- Recreate the get_tenant_home_details function to ensure it works correctly
-- Also join with home_images to get the primary image if the single image field is empty
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
    COALESCE(h.image, img.image_url) AS image,
    h.available,
    p.name  AS agent_name,
    p.phone AS agent_phone,
    p.bio   AS agent_bio,
    p.company AS agent_company
  FROM public.homes h
  LEFT JOIN public.profiles p ON p.id = h.owner_id
  LEFT JOIN LATERAL (
    SELECT image_url
    FROM public.home_images
    WHERE home_images.home_id = h.id AND home_images.is_primary = true
    LIMIT 1
  ) img ON true
  WHERE h.id = ANY(p_home_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_home_details(UUID[]) TO authenticated;
