import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface Booking {
  id: string;
  user_id: string;
  vehicle_id: string;
  shop_id: string;
  staff_id: string | null;
  start_date: string;
  end_date: string;
  total_price: number;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  delivery_address: string | null;
  delivery_status: 'pending' | 'in_transit' | 'delivered' | 'picked_up' | null;
  created_at: string;
  updated_at: string;
  // Joined
  vehicle?: {
    name: string;
    brand: string;
    model: string;
    images: string[];
    type: 'car' | 'bike';
  };
  shop?: {
    name: string;
    address: string;
  };
  user?: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface CreateBookingInput {
  vehicle_id: string;
  shop_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  delivery_address?: string;
}

export interface UpdateBookingInput {
  id: string;
  status?: 'upcoming' | 'active' | 'completed' | 'cancelled';
  delivery_status?: 'pending' | 'in_transit' | 'delivered' | 'picked_up';
  staff_id?: string;
}

// Fetch user's bookings
export const useUserBookings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['user-bookings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          vehicles(name, brand, model, images, type),
          shops(name, address)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(b => ({
        ...b,
        vehicle: b.vehicles,
        shop: b.shops,
      })) as Booking[];
    },
    enabled: !!user?.id,
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('user-bookings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-bookings', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
};

// Fetch shop bookings (for owners)
export const useShopBookings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['shop-bookings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get owner's shops first
      const { data: shops, error: shopsError } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', user.id);

      if (shopsError) throw shopsError;
      
      const shopIds = shops?.map(s => s.id) || [];
      if (shopIds.length === 0) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select('*, vehicles(name, brand, model, images, type), shops(name, address)')
        .in('shop_id', shopIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Get user profiles separately
      const userIds = data.map(b => b.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email, phone')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return data.map(b => {
        const profile = profileMap.get(b.user_id);
        return {
          ...b,
          vehicle: b.vehicles,
          shop: b.shops,
          user: profile ? { name: profile.name, email: profile.email, phone: profile.phone || '' } : undefined,
        };
      }) as Booking[];
    },
    enabled: !!user?.id,
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('shop-bookings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['shop-bookings', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
};

// Fetch staff assigned bookings
export const useStaffBookings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['staff-bookings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get staff record first
      const { data: staffRecord, error: staffError } = await supabase
        .from('staff')
        .select('id, shop_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (staffError) throw staffError;
      if (!staffRecord) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select('*, vehicles(name, brand, model, images, type), shops(name, address)')
        .or(`staff_id.eq.${staffRecord.id},and(shop_id.eq.${staffRecord.shop_id},staff_id.is.null)`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Get user profiles separately
      const userIds = data.map(b => b.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email, phone')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return data.map(b => {
        const profile = profileMap.get(b.user_id);
        return {
          ...b,
          vehicle: b.vehicles,
          shop: b.shops,
          user: profile ? { name: profile.name, email: profile.email, phone: profile.phone || '' } : undefined,
        };
      }) as Booking[];
    },
    enabled: !!user?.id,
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('staff-bookings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['staff-bookings', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
};

// Create booking mutation
export const useCreateBooking = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBookingInput) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          vehicle_id: input.vehicle_id,
          shop_id: input.shop_id,
          start_date: input.start_date,
          end_date: input.end_date,
          total_price: input.total_price,
          delivery_address: input.delivery_address,
          status: 'upcoming',
          delivery_status: input.delivery_address ? 'pending' : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['shop-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['staff-bookings'] });
      toast.success('Booking created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create booking: ' + error.message);
    },
  });
};

// Update booking mutation
export const useUpdateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateBookingInput) => {
      const { data, error } = await supabase
        .from('bookings')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['shop-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['staff-bookings'] });
      toast.success('Booking updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update booking: ' + error.message);
    },
  });
};
