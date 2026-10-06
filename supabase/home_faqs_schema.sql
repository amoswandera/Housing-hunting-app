-- Home FAQs — dynamic Q&A per listing, managed by the agent
-- Run this once in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.home_faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_faqs_home_id ON public.home_faqs(home_id);
CREATE INDEX IF NOT EXISTS idx_home_faqs_order ON public.home_faqs(home_id, order_index);

-- Trigger to keep updated_at current
CREATE TRIGGER home_faqs_updated_at
  BEFORE UPDATE ON public.home_faqs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.home_faqs ENABLE ROW LEVEL SECURITY;

-- Anyone can read FAQs (they are public information about a listing)
CREATE POLICY "Anyone can view home FAQs"
  ON public.home_faqs FOR SELECT USING (true);

-- Only the home owner (agent) can insert/update/delete
CREATE POLICY "Agents can insert FAQs for their homes"
  ON public.home_faqs FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.homes WHERE homes.id = home_faqs.home_id AND homes.owner_id = auth.uid())
  );

CREATE POLICY "Agents can update FAQs for their homes"
  ON public.home_faqs FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.homes WHERE homes.id = home_faqs.home_id AND homes.owner_id = auth.uid())
  );

CREATE POLICY "Agents can delete FAQs for their homes"
  ON public.home_faqs FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.homes WHERE homes.id = home_faqs.home_id AND homes.owner_id = auth.uid())
  );
