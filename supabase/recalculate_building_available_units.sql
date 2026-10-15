-- Recalculate available_units for all buildings based on actual available units
-- This fixes the issue where buildings with all units taken still show as having available units

-- Update all buildings to have the correct count of available units
UPDATE buildings b
SET available_units = (
  SELECT COUNT(*)
  FROM homes h
  WHERE h.building_id = b.id
  AND h.available = true
);

-- Verify the update
SELECT 
  b.id,
  b.name,
  b.total_units,
  b.available_units,
  (SELECT COUNT(*) FROM homes h WHERE h.building_id = b.id) as actual_total_units,
  (SELECT COUNT(*) FROM homes h WHERE h.building_id = b.id AND h.available = true) as actual_available_units
FROM buildings b
ORDER BY b.name;
