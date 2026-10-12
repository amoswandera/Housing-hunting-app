-- Add building relationship to homes table
-- This allows homes to be standalone (building_id = NULL) or part of a building

-- Add new columns to homes table
ALTER TABLE public.homes
  ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_number TEXT,
  ADD COLUMN IF NOT EXISTS floor TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT; -- bedsitter, 1BR, 2BR, 3BR, 4BR

-- Add index for building_id
CREATE INDEX IF NOT EXISTS idx_homes_building_id ON public.homes(building_id);

-- Update homes table comment
COMMENT ON COLUMN public.homes.building_id IS 'If NULL, this is a standalone home. If set, this home is a unit in a building.';
COMMENT ON COLUMN public.homes.unit_number IS 'Unit number if part of a building (e.g., A-101)';
COMMENT ON COLUMN public.homes.floor IS 'Floor number if part of a building (e.g., 1st, 2nd)';
COMMENT ON COLUMN public.homes.category IS 'Unit category: bedsitter, 1BR, 2BR, 3BR, 4BR';
