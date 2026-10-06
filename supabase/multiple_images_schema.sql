-- Multiple Images Support for Homes
-- This script adds a home_images table to support multiple images per home

-- Create home_images table
CREATE TABLE IF NOT EXISTS public.home_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_home_images_home_id ON public.home_images(home_id);
CREATE INDEX IF NOT EXISTS idx_home_images_is_primary ON public.home_images(is_primary);
CREATE INDEX IF NOT EXISTS idx_home_images_order ON public.home_images(home_id, order_index);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER home_images_updated_at
  BEFORE UPDATE ON public.home_images
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE public.home_images ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access to everyone (homes are public)
CREATE POLICY "home_images_select_policy"
  ON public.home_images
  FOR SELECT
  USING (true);

-- Policy: Allow agents to insert images for their own homes
CREATE POLICY "home_images_insert_policy"
  ON public.home_images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.homes
      WHERE homes.id = home_images.home_id
      AND homes.owner_id = auth.uid()
    )
  );

-- Policy: Allow agents to update images for their own homes
CREATE POLICY "home_images_update_policy"
  ON public.home_images
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.homes
      WHERE homes.id = home_images.home_id
      AND homes.owner_id = auth.uid()
    )
  );

-- Policy: Allow agents to delete images for their own homes
CREATE POLICY "home_images_delete_policy"
  ON public.home_images
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.homes
      WHERE homes.id = home_images.home_id
      AND homes.owner_id = auth.uid()
    )
  );

-- Ensure only one primary image per home
CREATE OR REPLACE FUNCTION ensure_single_primary_image()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE public.home_images
    SET is_primary = false
    WHERE home_id = NEW.home_id
    AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER home_images_primary_trigger
  BEFORE INSERT OR UPDATE OF is_primary ON public.home_images
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_primary_image();

-- Create storage bucket for home images (if not exists)
-- Note: This assumes you already have a 'homes' bucket from previous setup
-- If not, you can create it in the Supabase Storage dashboard
