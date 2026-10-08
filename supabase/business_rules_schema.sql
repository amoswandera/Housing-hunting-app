-- Business rules schema additions
-- Run this in the Supabase SQL editor

-- 1. Add payment_deadline to applications table
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMP WITH TIME ZONE;

-- 2. Allow SuperAdmin to view ALL homes (including unavailable)
CREATE POLICY "SuperAdmin can view all homes"
  ON public.homes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'SuperAdmin'
    )
  );

-- 3. Allow SuperAdmin to update any home (for re-listing, transfer, etc.)
CREATE POLICY "SuperAdmin can update any home"
  ON public.homes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'SuperAdmin'
    )
  );

-- 4. Allow approved tenant to view their approved home even if unavailable
-- (handled in application layer via fetchMyApplications join, no RLS change needed)

-- 5. Index on payment_deadline for efficient expiry queries
CREATE INDEX IF NOT EXISTS idx_applications_payment_deadline
  ON public.applications(payment_deadline)
  WHERE payment_deadline IS NOT NULL;
