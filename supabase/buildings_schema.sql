-- Phase 1: Building/Unit Structure
-- This adds support for multi-unit apartment buildings while maintaining backward compatibility

-- Create buildings table
CREATE TABLE IF NOT EXISTS public.buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  region TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'apartment', -- 'apartment' or 'standalone'
  total_units INTEGER NOT NULL DEFAULT 0,
  available_units INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  amenities TEXT[], -- array of amenities like ['gym', 'pool', 'parking']
  agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create building_images table (for exterior, common areas, amenities)
CREATE TABLE IF NOT EXISTS public.building_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type TEXT NOT NULL, -- 'exterior', 'lobby', 'parking', 'gym', 'pool', 'security', etc.
  is_primary BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create building_category_images table (default interior images per category)
CREATE TABLE IF NOT EXISTS public.building_category_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'bedsitter', '1BR', '2BR', '3BR', '4BR'
  image_url TEXT NOT NULL,
  image_type TEXT NOT NULL, -- 'kitchen', 'living_room', 'bedroom', 'bathroom', etc.
  is_primary BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_buildings_agent_id ON public.buildings(agent_id);
CREATE INDEX IF NOT EXISTS idx_buildings_region ON public.buildings(region);
CREATE INDEX IF NOT EXISTS idx_buildings_available ON public.buildings(available_units);
CREATE INDEX IF NOT EXISTS idx_building_images_building_id ON public.building_images(building_id);
CREATE INDEX IF NOT EXISTS idx_building_images_type ON public.building_images(image_type);
CREATE INDEX IF NOT EXISTS idx_building_category_images_building_id ON public.building_category_images(building_id);
CREATE INDEX IF NOT EXISTS idx_building_category_images_category ON public.building_category_images(category);

-- Enable Row Level Security
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_category_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for buildings
DROP POLICY IF EXISTS "Agents can view their own buildings" ON public.buildings;
CREATE POLICY "Agents can view their own buildings"
  ON public.buildings FOR SELECT
  USING (auth.uid() = agent_id);

DROP POLICY IF EXISTS "Agents can insert buildings" ON public.buildings;
CREATE POLICY "Agents can insert buildings"
  ON public.buildings FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

DROP POLICY IF EXISTS "Agents can update their own buildings" ON public.buildings;
CREATE POLICY "Agents can update their own buildings"
  ON public.buildings FOR UPDATE
  USING (auth.uid() = agent_id);

DROP POLICY IF EXISTS "Agents can delete their own buildings" ON public.buildings;
CREATE POLICY "Agents can delete their own buildings"
  ON public.buildings FOR DELETE
  USING (auth.uid() = agent_id);

DROP POLICY IF EXISTS "SuperAdmin can view all buildings" ON public.buildings;
CREATE POLICY "SuperAdmin can view all buildings"
  ON public.buildings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'SuperAdmin'
    )
  );

-- RLS Policies for building_images
DROP POLICY IF EXISTS "Anyone can view building images" ON public.building_images;
CREATE POLICY "Anyone can view building images"
  ON public.building_images FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Agents can insert building images" ON public.building_images;
CREATE POLICY "Agents can insert building images"
  ON public.building_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.buildings
      WHERE buildings.id = building_images.building_id AND buildings.agent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Agents can update building images" ON public.building_images;
CREATE POLICY "Agents can update building images"
  ON public.building_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.buildings
      WHERE buildings.id = building_images.building_id AND buildings.agent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Agents can delete building images" ON public.building_images;
CREATE POLICY "Agents can delete building images"
  ON public.building_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.buildings
      WHERE buildings.id = building_images.building_id AND buildings.agent_id = auth.uid()
    )
  );

-- RLS Policies for building_category_images (same as building_images)
DROP POLICY IF EXISTS "Anyone can view building category images" ON public.building_category_images;
CREATE POLICY "Anyone can view building category images"
  ON public.building_category_images FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Agents can insert building category images" ON public.building_category_images;
CREATE POLICY "Agents can insert building category images"
  ON public.building_category_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.buildings
      WHERE buildings.id = building_category_images.building_id AND buildings.agent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Agents can update building category images" ON public.building_category_images;
CREATE POLICY "Agents can update building category images"
  ON public.building_category_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.buildings
      WHERE buildings.id = building_category_images.building_id AND buildings.agent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Agents can delete building category images" ON public.building_category_images;
CREATE POLICY "Agents can delete building category images"
  ON public.building_category_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.buildings
      WHERE buildings.id = building_category_images.building_id AND buildings.agent_id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp for buildings
CREATE TRIGGER update_buildings_updated_at
  BEFORE UPDATE ON public.buildings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
