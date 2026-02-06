import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Shop } from './useShops';

export interface SavedShop {
  id: string;
  user_id: string;
  shop_id: string;
  created_at: string;
  shop?: Shop;
}

// Fetch user's saved shops
export const useSavedShops = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['saved-shops', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('saved_shops')
        .select(`
          *,
          shops(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(s => ({
        ...s,
        shop: s.shops as Shop,
      })) as SavedShop[];
    },
    enabled: !!user?.id,
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('saved-shops-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'saved_shops', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['saved-shops', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
};

// Check if shop is saved
export const useIsShopSaved = (shopId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['is-shop-saved', user?.id, shopId],
    queryFn: async () => {
      if (!user?.id || !shopId) return false;
      
      const { data, error } = await supabase
        .from('saved_shops')
        .select('id')
        .eq('user_id', user.id)
        .eq('shop_id', shopId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user?.id && !!shopId,
  });
};

// Save shop mutation
export const useSaveShop = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shopId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('saved_shops')
        .insert({
          user_id: user.id,
          shop_id: shopId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, shopId) => {
      queryClient.invalidateQueries({ queryKey: ['saved-shops'] });
      queryClient.invalidateQueries({ queryKey: ['is-shop-saved', user?.id, shopId] });
      toast.success('Shop saved to favorites');
    },
    onError: (error) => {
      toast.error('Failed to save shop: ' + error.message);
    },
  });
};

// Unsave shop mutation
export const useUnsaveShop = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shopId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('saved_shops')
        .delete()
        .eq('user_id', user.id)
        .eq('shop_id', shopId);

      if (error) throw error;
      return shopId;
    },
    onSuccess: (shopId) => {
      queryClient.invalidateQueries({ queryKey: ['saved-shops'] });
      queryClient.invalidateQueries({ queryKey: ['is-shop-saved', user?.id, shopId] });
      toast.success('Shop removed from favorites');
    },
    onError: (error) => {
      toast.error('Failed to remove shop: ' + error.message);
    },
  });
};

// Toggle saved shop
export const useToggleSavedShop = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shopId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if already saved
      const { data: existing } = await supabase
        .from('saved_shops')
        .select('id')
        .eq('user_id', user.id)
        .eq('shop_id', shopId)
        .maybeSingle();

      if (existing) {
        // Unsave
        const { error } = await supabase
          .from('saved_shops')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
        return { saved: false, shopId };
      } else {
        // Save
        const { error } = await supabase
          .from('saved_shops')
          .insert({
            user_id: user.id,
            shop_id: shopId,
          });

        if (error) throw error;
        return { saved: true, shopId };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['saved-shops'] });
      queryClient.invalidateQueries({ queryKey: ['is-shop-saved', user?.id, result.shopId] });
      toast.success(result.saved ? 'Shop saved to favorites' : 'Shop removed from favorites');
    },
    onError: (error) => {
      toast.error('Failed to update favorites: ' + error.message);
    },
  });
};
