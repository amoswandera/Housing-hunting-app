-- Messages table: in-app messaging between tenant and agent per application
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role user_role NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_application_id ON public.messages(application_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(application_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Tenant can see messages on their own applications
CREATE POLICY "Tenants can view their application messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE applications.id = messages.application_id
        AND applications.tenant_id = auth.uid()
    )
  );

-- Agent can see messages on applications for their homes
CREATE POLICY "Agents can view messages for their home applications"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.applications
      JOIN public.homes ON homes.id = applications.home_id
      WHERE applications.id = messages.application_id
        AND homes.owner_id = auth.uid()
    )
  );

-- Tenant can insert messages on their own applications
CREATE POLICY "Tenants can send messages on their applications"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE applications.id = messages.application_id
        AND applications.tenant_id = auth.uid()
    )
  );

-- Agent can insert messages on applications for their homes
CREATE POLICY "Agents can send messages for their home applications"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.applications
      JOIN public.homes ON homes.id = applications.home_id
      WHERE applications.id = messages.application_id
        AND homes.owner_id = auth.uid()
    )
  );

-- SuperAdmin can view all messages
CREATE POLICY "SuperAdmin can view all messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'SuperAdmin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Ratings table: tenant rates a home after being approved
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (home_id, tenant_id) -- one rating per tenant per home
);

CREATE INDEX IF NOT EXISTS idx_ratings_home_id ON public.ratings(home_id);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can read ratings
CREATE POLICY "Anyone can view ratings"
  ON public.ratings FOR SELECT USING (true);

-- Only tenants with an approved application for the home can rate it
CREATE POLICY "Approved tenants can rate a home"
  ON public.ratings FOR INSERT
  WITH CHECK (
    auth.uid() = tenant_id AND
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE applications.home_id = ratings.home_id
        AND applications.tenant_id = auth.uid()
        AND applications.status = 'approved'
    )
  );

-- Tenant can update their own rating
CREATE POLICY "Tenants can update their own rating"
  ON public.ratings FOR UPDATE
  USING (auth.uid() = tenant_id);
