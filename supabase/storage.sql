-- Create storage buckets for house images and documents

-- Enable storage extension
CREATE EXTENSION IF NOT EXISTS "storage";

-- Create bucket for house images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'house-images',
  'house-images',
  true,
  8388608, -- 8MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create bucket for documents (PDFs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for house-images bucket
CREATE POLICY "Public can view house images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'house-images');

CREATE POLICY "Authenticated users can upload house images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'house-images' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Agents can delete their own house images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'house-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS policies for documents bucket
CREATE POLICY "Public can view documents"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Agents can delete their own documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
