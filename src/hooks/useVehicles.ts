import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface Vehicle {
  id: string;
  shop_id: string;
  type: 'car' | 'bike';
  name: string;
  brand: string;
  model: string;
  images: string[];
  price_per_hour: number;
  price_per_day: number;
  fuel_type: string | null;
  transmission: string | null;
  seating: number | null;
  features: string[];
  is_available: boolean;
  created_at: string;
  updated_at: string;
  // Computed/joined
  shop_name?: string;
}

export interface CreateVehicleInput {
  shop_id: string;
  type: 'car' | 'bike';
  name: string;
  brand: string;
  model: string;
  images?: string[];
  price_per_hour: number;
  price_per_day: number;
  fuel_type?: string;
  transmission?: string;
  seating?: number;
  features?: string[];
}

export interface UpdateVehicleInput extends Partial<CreateVehicleInput> {
  id: string;
  is_available?: boolean;
}

// Fetch all available vehicles
export const useVehicles = (shopId?: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['vehicles', shopId],
    queryFn: async () => {
      let q = supabase
        .from('vehicles')
        .select('*')
        .eq('is_available', true)
        .order('created_at', { ascending: false });

      if (shopId) {
        q = q.eq('shop_id', shopId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as Vehicle[];
    },
  });

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('vehicles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

// Fetch owner's vehicles (across all their shops)
export const useOwnerVehicles = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['owner-vehicles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First get owner's shop IDs
      const { data: shops, error: shopsError } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', user.id);

      if (shopsError) throw shopsError;
      
      const shopIds = shops?.map(s => s.id) || [];
      if (shopIds.length === 0) return [];

      const { data, error } = await supabase
        .from('vehicles')
        .select('*, shops(name)')
        .in('shop_id', shopIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(v => ({
        ...v,
        shop_name: v.shops?.name,
      })) as Vehicle[];
    },
    enabled: !!user?.id,
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('owner-vehicles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['owner-vehicles', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
};

// Fetch single vehicle
export const useVehicle = (vehicleId: string | undefined) => {
  return useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return null;
      
      const { data, error } = await supabase
        .from('vehicles')
        .select('*, shops(name, address)')
        .eq('id', vehicleId)
        .maybeSingle();

      if (error) throw error;
      return data as Vehicle | null;
    },
    enabled: !!vehicleId,
  });
};

// Create vehicle mutation
export const useCreateVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateVehicleInput) => {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          shop_id: input.shop_id,
          type: input.type,
          name: input.name,
          brand: input.brand,
          model: input.model,
          images: input.images || [],
          price_per_hour: input.price_per_hour,
          price_per_day: input.price_per_day,
          fuel_type: input.fuel_type,
          transmission: input.transmission,
          seating: input.seating,
          features: input.features || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['owner-vehicles'] });
      toast.success('Vehicle added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add vehicle: ' + error.message);
    },
  });
};

// Update vehicle mutation
export const useUpdateVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateVehicleInput) => {
      const { data, error } = await supabase
        .from('vehicles')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['owner-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle', data.id] });
      toast.success('Vehicle updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update vehicle: ' + error.message);
    },
  });
};

// Delete vehicle mutation
export const useDeleteVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vehicleId: string) => {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId);

      if (error) throw error;
      return vehicleId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['owner-vehicles'] });
      toast.success('Vehicle deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete vehicle: ' + error.message);
    },
  });
};
