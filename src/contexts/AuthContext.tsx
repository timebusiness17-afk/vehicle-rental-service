import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'owner' | 'staff' | 'user';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar?: string | null;
  role: UserRole;
  isActive: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; redirectPath?: string }>;
  signup: (email: string, password: string, name: string, phone: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const getRoleDashboardPath = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'owner':
      return '/owner';
    case 'staff':
      return '/staff';
    case 'user':
      return '/home';
    default:
      return '/home';
  }
};

export const getRoleColor = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return 'hsl(0, 84%, 60%)';
    case 'owner':
      return 'hsl(262, 83%, 58%)';
    case 'staff':
      return 'hsl(142, 76%, 36%)';
    case 'user':
      return 'hsl(221, 83%, 53%)';
    default:
      return 'hsl(221, 83%, 53%)';
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = useCallback(async (userId: string): Promise<AuthUser | null> => {
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      // Fetch role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching role:', roleError);
        return null;
      }

      if (!profile) {
        return null;
      }

      return {
        id: userId,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        avatar: profile.avatar_url,
        role: (roleData?.role as UserRole) || 'user',
        isActive: profile.is_active,
      };
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!session?.user?.id) return;
    const authUser = await fetchUserProfile(session.user.id);
    if (authUser) {
      setUser(authUser);
    }
  }, [session, fetchUserProfile]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        
        if (currentSession?.user) {
          // Defer profile fetch to avoid deadlock
          setTimeout(async () => {
            const authUser = await fetchUserProfile(currentSession.user.id);
            setUser(authUser);
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      if (existingSession?.user) {
        fetchUserProfile(existingSession.user.id).then((authUser) => {
          setUser(authUser);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const authUser = await fetchUserProfile(data.user.id);
        
        if (authUser) {
          if (!authUser.isActive) {
            await supabase.auth.signOut();
            return { success: false, error: 'Your account has been deactivated. Contact support.' };
          }
          
          setUser(authUser);
          return {
            success: true,
            redirectPath: getRoleDashboardPath(authUser.role),
          };
        }
      }

      return { success: false, error: 'Failed to fetch user profile' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [fetchUserProfile]);

  const signup = useCallback(async (
    email: string,
    password: string,
    name: string,
    phone: string,
    role: UserRole
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            name,
            phone,
            role,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user && !data.session) {
        // Email confirmation required
        return { success: true, error: 'Please check your email to confirm your account' };
      }

      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
