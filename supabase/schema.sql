-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types for role and status
CREATE TYPE user_role AS ENUM ('Tenant', 'Agent', 'SuperAdmin');
CREATE TYPE booking_status AS ENUM ('pending', 'cancelled', 'refunded');
CREATE TYPE application_status AS ENUM ('submitted', 'approved', 'declined', 'cancelled', 'refunded');
CREATE TYPE payment_status AS ENUM ('unpaid', 'pending', 'paid');

-- Users table (extends Supabase auth.users with custom fields)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  identifier TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'Tenant',
  phone TEXT,
  national_id TEXT,
  occupation TEXT,
  bio TEXT,
  company TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Homes table
CREATE TABLE public.homes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  region TEXT NOT NULL,
  type TEXT NOT NULL,
  parking BOOLEAN NOT NULL DEFAULT false,
  price INTEGER NOT NULL,
  deposit INTEGER NOT NULL,
  image TEXT NOT NULL,
  tag TEXT NOT NULL,
  details TEXT NOT NULL,
  available BOOLEAN NOT NULL DEFAULT true,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  status booking_status NOT NULL DEFAULT 'pending',
  deposit INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Applications table
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'submitted',
  tenant_message TEXT,
  contract_text TEXT,
  paybill TEXT,
  contract_pdf_url TEXT,
  paybill_pdf_url TEXT,
  payment_phone TEXT,
  payment_amount INTEGER,
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_homes_owner_id ON public.homes(owner_id);
CREATE INDEX idx_homes_available ON public.homes(available);
CREATE INDEX idx_homes_region ON public.homes(region);
CREATE INDEX idx_homes_type ON public.homes(type);
CREATE INDEX idx_applications_tenant_id ON public.applications(tenant_id);
CREATE INDEX idx_applications_home_id ON public.applications(home_id);
CREATE INDEX idx_applications_status ON public.applications(status);
CREATE INDEX idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX idx_bookings_home_id ON public.bookings(home_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_identifier ON public.profiles(identifier);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for homes
CREATE POLICY "Anyone can view available homes" ON public.homes FOR SELECT USING (available = true);
CREATE POLICY "Agents can view their own homes" ON public.homes FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Agents can insert homes" ON public.homes FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Agents can update their own homes" ON public.homes FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Agents can delete their own homes" ON public.homes FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for bookings
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookings" ON public.bookings FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for applications
CREATE POLICY "Tenants can view own applications" ON public.applications FOR SELECT USING (auth.uid() = tenant_id);
CREATE POLICY "Agents can view applications for their homes" ON public.applications FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.homes
    WHERE homes.id = applications.home_id AND homes.owner_id = auth.uid()
  )
);
CREATE POLICY "Tenants can insert applications" ON public.applications FOR INSERT WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "Agents can update applications for their homes" ON public.applications FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.homes
    WHERE homes.id = applications.home_id AND homes.owner_id = auth.uid()
  )
);
CREATE POLICY "Tenants can update own applications" ON public.applications FOR UPDATE USING (auth.uid() = tenant_id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, identifier, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'identifier', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Tenant')::user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_homes_updated_at BEFORE UPDATE ON public.homes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample homes (you can modify or remove these)
INSERT INTO public.homes (name, location, region, type, parking, price, deposit, image, tag, details, owner_id)
SELECT 
  unnest(ARRAY[
    'The Willow House',
    'Cedar & Stone',
    'Palm Court Studio',
    'The Courtyard',
    'Canopy House',
    'Lakeview Loft',
    'Lavington Green',
    'Umoja Corner',
    'Nakuru Heights'
  ]),
  unnest(ARRAY[
    'Kitisuru, Nairobi',
    'Kilimani, Nairobi',
    'Nyali, Mombasa',
    'Runda, Nairobi',
    'Upper Hill, Nairobi',
    'Milimani, Kisumu',
    'Lavington, Nairobi',
    'Umoja, Nairobi',
    'Milimani, Nakuru'
  ]),
  unnest(ARRAY[
    'Nairobi County',
    'Nairobi County',
    'Mombasa County',
    'Nairobi County',
    'Nairobi County',
    'Kisumu County',
    'Nairobi County',
    'Nairobi County',
    'Nakuru County'
  ]),
  unnest(ARRAY[
    'Two bedroom',
    'Three bedroom',
    'Bedsitter',
    'One bedroom',
    'Four bedroom',
    'Single room',
    'Two bedroom',
    'Bedsitter',
    'Three bedroom'
  ]),
  unnest(ARRAY[true, true, false, true, true, false, true, false, true]),
  unnest(ARRAY[85000, 145000, 38000, 110000, 210000, 55000, 95000, 32000, 65000]),
  unnest(ARRAY[170000, 290000, 76000, 220000, 420000, 110000, 190000, 64000, 130000]),
  unnest(ARRAY[
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1600566753051-f0b89df2dd90?auto=format&fit=crop&w=900&q=80'
  ]),
  unnest(ARRAY['Just listed', 'Popular', 'Best value', 'Furnished', 'New today', 'Quiet pick', 'Pet friendly', 'Best value', 'New today']),
  unnest(ARRAY[
    'Bright, quiet and close to Karura Forest.',
    'A calm, considered home with a private courtyard.',
    'A minimal, sunny studio near the coast.',
    'Turn-key apartment with a leafy shared garden.',
    'Generous rooms, natural light and room to grow.',
    'A peaceful loft with a wide lake view.',
    'A leafy apartment with a generous balcony.',
    'A well-connected home for easy city living.',
    'Spacious rooms in a quiet, central neighbourhood.'
  ]),
  NULL -- owner_id will be set after creating an agent account
ON CONFLICT DO NOTHING;
