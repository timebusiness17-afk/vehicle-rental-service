-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'owner', 'staff', 'user');

-- Create user_roles table (critical for security - roles stored separately)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Shops table
CREATE TABLE public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    image_url TEXT,
    operating_hours TEXT,
    is_open BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    rating NUMERIC(2,1) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- Vehicles table
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('car', 'bike')),
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',
    price_per_hour NUMERIC(10,2) NOT NULL,
    price_per_day NUMERIC(10,2) NOT NULL,
    fuel_type TEXT,
    transmission TEXT,
    seating INTEGER,
    features TEXT[] DEFAULT '{}',
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Staff table (staff members assigned to shops)
CREATE TABLE public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Bookings table
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
    staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
    delivery_address TEXT,
    delivery_status TEXT CHECK (delivery_status IN ('pending', 'in_transit', 'delivered', 'picked_up')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Saved shops (user favorites)
CREATE TABLE public.saved_shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, shop_id)
);

ALTER TABLE public.saved_shops ENABLE ROW LEVEL SECURITY;

-- KYC verification data
CREATE TABLE public.kyc_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    date_of_birth DATE,
    address TEXT,
    phone TEXT,
    email TEXT,
    driving_license_number TEXT,
    driving_license_photo_url TEXT,
    secondary_doc_type TEXT CHECK (secondary_doc_type IN ('aadhar', 'voter_id', 'passport', 'pan_card')),
    secondary_doc_number TEXT,
    secondary_doc_photo_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User roles: users can read their own, admins can read all
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Profiles: users can manage their own, admins can view all
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Shops: public read, owners can manage their own, admins can manage all
CREATE POLICY "Anyone can view active shops" ON public.shops
    FOR SELECT USING (is_active = true OR auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can insert own shops" ON public.shops
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own shops" ON public.shops
    FOR UPDATE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can delete own shops" ON public.shops
    FOR DELETE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

-- Vehicles: public read for available, shop owners can manage
CREATE POLICY "Anyone can view available vehicles" ON public.vehicles
    FOR SELECT USING (
        is_available = true 
        OR EXISTS (SELECT 1 FROM public.shops WHERE shops.id = vehicles.shop_id AND shops.owner_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Shop owners can insert vehicles" ON public.vehicles
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.shops WHERE shops.id = vehicles.shop_id AND shops.owner_id = auth.uid())
    );

CREATE POLICY "Shop owners can update vehicles" ON public.vehicles
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.shops WHERE shops.id = vehicles.shop_id AND shops.owner_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Shop owners can delete vehicles" ON public.vehicles
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.shops WHERE shops.id = vehicles.shop_id AND shops.owner_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin')
    );

-- Staff: owners can manage their staff, admins can view all
CREATE POLICY "Owners can view own staff" ON public.staff
    FOR SELECT USING (owner_id = auth.uid() OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can insert staff" ON public.staff
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update own staff" ON public.staff
    FOR UPDATE USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can delete own staff" ON public.staff
    FOR DELETE USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Bookings: users can view/manage their own, owners/staff can view shop bookings
CREATE POLICY "Users can view own bookings" ON public.bookings
    FOR SELECT USING (
        user_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.shops WHERE shops.id = bookings.shop_id AND shops.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.staff WHERE staff.id = bookings.staff_id AND staff.user_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Users can insert bookings" ON public.bookings
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own bookings" ON public.bookings
    FOR UPDATE USING (
        user_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.shops WHERE shops.id = bookings.shop_id AND shops.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.staff WHERE staff.id = bookings.staff_id AND staff.user_id = auth.uid())
    );

-- Saved shops: users can manage their own
CREATE POLICY "Users can view own saved shops" ON public.saved_shops
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert saved shops" ON public.saved_shops
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own saved shops" ON public.saved_shops
    FOR DELETE USING (user_id = auth.uid());

-- KYC: users can manage their own, admins can view all
CREATE POLICY "Users can view own KYC" ON public.kyc_documents
    FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own KYC" ON public.kyc_documents
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own KYC" ON public.kyc_documents
    FOR UPDATE USING (user_id = auth.uid());

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.email
    );
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
        NEW.id,
        COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'user')
    );
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON public.shops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_kyc_documents_updated_at BEFORE UPDATE ON public.kyc_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for cross-module sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.shops;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff;