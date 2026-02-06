import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface Staff {
  id: string;
  user_id: string;
  owner_id: string;
  shop_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined from profiles
  name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  // Joined from shops
  shop_name?: string;
}

export interface CreateStaffInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  shop_id?: string;
}

export interface UpdateStaffInput {
  id: string;
  shop_id?: string;
  is_active?: boolean;
}

// Fetch owner's staff
export const useOwnerStaff = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['owner-staff', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get staff records
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*, shops(name)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (staffError) throw staffError;
      if (!staffData || staffData.length === 0) return [];

      // Get profiles for each staff member
      const userIds = staffData.map(s => s.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email, phone, avatar_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return staffData.map(s => {
        const profile = profileMap.get(s.user_id);
        return {
          ...s,
          name: profile?.name,
          email: profile?.email,
          phone: profile?.phone,
          avatar_url: profile?.avatar_url,
          shop_name: s.shops?.name,
        };
      }) as Staff[];
    },
    enabled: !!user?.id,
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('owner-staff-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff', filter: `owner_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['owner-staff', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
};

// Fetch all staff (for admin)
export const useAllStaff = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['all-staff'],
    queryFn: async () => {
      // Get staff records
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*, shops(name)')
        .order('created_at', { ascending: false });

      if (staffError) throw staffError;
      if (!staffData || staffData.length === 0) return [];

      // Get profiles for each staff member
      const userIds = staffData.map(s => s.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email, phone, avatar_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return staffData.map(s => {
        const profile = profileMap.get(s.user_id);
        return {
          ...s,
          name: profile?.name,
          email: profile?.email,
          phone: profile?.phone,
          avatar_url: profile?.avatar_url,
          shop_name: s.shops?.name,
        };
      }) as Staff[];
    },
  });

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('all-staff-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['all-staff'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

// Create staff mutation - creates auth user + staff record
export const useCreateStaff = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStaffInput) => {
      if (!user?.id) throw new Error('Not authenticated');

      // We need to use an edge function to create a staff user
      // since we can't sign up a user while already logged in
      const response = await supabase.functions.invoke('create-staff', {
        body: {
          email: input.email,
          password: input.password,
          name: input.name,
          phone: input.phone,
          owner_id: user.id,
          shop_id: input.shop_id,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-staff'] });
      queryClient.invalidateQueries({ queryKey: ['all-staff'] });
      toast.success('Staff member created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create staff: ' + error.message);
    },
  });
};

// Update staff mutation
export const useUpdateStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateStaffInput) => {
      const { data, error } = await supabase
        .from('staff')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-staff'] });
      queryClient.invalidateQueries({ queryKey: ['all-staff'] });
      toast.success('Staff updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update staff: ' + error.message);
    },
  });
};

// Delete staff mutation
export const useDeleteStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (staffId: string) => {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', staffId);

      if (error) throw error;
      return staffId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-staff'] });
      queryClient.invalidateQueries({ queryKey: ['all-staff'] });
      toast.success('Staff removed successfully');
    },
    onError: (error) => {
      toast.error('Failed to remove staff: ' + error.message);
    },
  });
};
