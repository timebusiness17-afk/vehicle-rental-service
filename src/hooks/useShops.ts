import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  image_url: string | null;
  operating_hours: string | null;
  is_open: boolean;
  is_active: boolean;
  rating: number | null;
  review_count: number | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
  // Computed
  vehicle_count?: number;
  owner_name?: string;
}

export interface CreateShopInput {
  name: string;
  address: string;
  image_url?: string;
  operating_hours?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateShopInput extends Partial<CreateShopInput> {
  id: string;
  is_open?: boolean;
  is_active?: boolean;
}

// Fetch all shops (for users/admin)
export const useShops = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['shops'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Shop[];
    },
  });

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('shops-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shops' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['shops'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

// Fetch owner's shops
export const useOwnerShops = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['owner-shops', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Shop[];
    },
    enabled: !!user?.id,
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('owner-shops-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shops', filter: `owner_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['owner-shops', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
};

// Fetch single shop
export const useShop = (shopId: string | undefined) => {
  return useQuery({
    queryKey: ['shop', shopId],
    queryFn: async () => {
      if (!shopId) return null;
      
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .maybeSingle();

      if (error) throw error;
      return data as Shop | null;
    },
    enabled: !!shopId,
  });
};

// Create shop mutation
export const useCreateShop = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateShopInput) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('shops')
        .insert({
          owner_id: user.id,
          name: input.name,
          address: input.address,
          image_url: input.image_url,
          operating_hours: input.operating_hours,
          latitude: input.latitude,
          longitude: input.longitude,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      queryClient.invalidateQueries({ queryKey: ['owner-shops'] });
      toast.success('Shop created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create shop: ' + error.message);
    },
  });
};

// Update shop mutation
export const useUpdateShop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateShopInput) => {
      const { data, error } = await supabase
        .from('shops')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      queryClient.invalidateQueries({ queryKey: ['owner-shops'] });
      queryClient.invalidateQueries({ queryKey: ['shop', data.id] });
      toast.success('Shop updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update shop: ' + error.message);
    },
  });
};

// Delete shop mutation
export const useDeleteShop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shopId: string) => {
      const { error } = await supabase
        .from('shops')
        .delete()
        .eq('id', shopId);

      if (error) throw error;
      return shopId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      queryClient.invalidateQueries({ queryKey: ['owner-shops'] });
      toast.success('Shop deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete shop: ' + error.message);
    },
  });
};
