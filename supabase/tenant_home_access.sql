-- Allow a tenant to read any home they have an application for,
-- even if the home is marked as taken (available = false).
-- This fixes the "Home no longer listed" display in My Bookings.
CREATE POLICY "Tenants can view homes they applied for"
  ON public.homes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE applications.home_id = homes.id
        AND applications.tenant_id = auth.uid()
    )
  );
