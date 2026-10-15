-- Fix homes visibility for tenants and guests
-- Ensure available homes are visible to everyone

-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can view available homes" ON public.homes;

-- Create policy that works for both authenticated and unauthenticated users
CREATE POLICY "Anyone can view available homes"
  ON public.homes FOR SELECT
  USING (available = true);

-- Ensure RLS is enabled
ALTER TABLE public.homes ENABLE ROW LEVEL SECURITY;

-- Verify the policy exists
SELECT * FROM pg_policies WHERE tablename = 'homes' AND policyname = 'Anyone can view available homes';
