-- Fix buildings visibility for tenants
-- Tenants need to view building data when browsing homes that are part of buildings

-- Step 1: Add policy for tenants to view buildings
DROP POLICY IF EXISTS "Tenants can view buildings" ON public.buildings;

CREATE POLICY "Tenants can view buildings"
  ON public.buildings FOR SELECT
  USING (
    auth.role() = 'authenticated'
  );

-- Step 2: Verify all building policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'buildings'
ORDER BY policyname;
