-- Add max_units and locked fields to buildings table
-- max_units: Maximum number of units allowed in the building
-- locked: Whether the building is locked (no more units can be added until SuperAdmin unlocks)

ALTER TABLE public.buildings 
ADD COLUMN IF NOT EXISTS max_units INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false;

-- Add comment to explain the fields
COMMENT ON COLUMN public.buildings.max_units IS 'Maximum number of units allowed in the building. Set by agent when creating building.';
COMMENT ON COLUMN public.buildings.locked IS 'Whether the building is locked. When locked, no more units can be added until SuperAdmin unlocks it. Automatically locked when max_units is reached.';
