
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (emailOrPhone: string, password: string, fullName: string, isPhone?: boolean) => Promise<{ error: any }>;
  signIn: (emailOrPhone: string, password: string, isPhone?: boolean) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (cancelled) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (event !== 'INITIAL_SESSION') setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile?.user_type === 'disabled') {
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
          } else {
            setSession(session);
            setUser(session.user);
          }
        } catch {
          setSession(session);
          setUser(session.user);
        }
      } else {
        setSession(session);
        setUser(null);
      }
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  const signUp = async (emailOrPhone: string, password: string, fullName: string, isPhone = false) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      console.log(`Signing up with ${isPhone ? 'phone' : 'email'}:`, emailOrPhone);
      
      const signUpParams: any = {
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      };

      if (isPhone) {
        // Prototype hack: use dummy email to avoid SMS requirement
        signUpParams.email = `${emailOrPhone}@mella.temp`;
        signUpParams.options.emailRedirectTo = redirectUrl;
      } else {
        signUpParams.email = emailOrPhone;
        signUpParams.options.emailRedirectTo = redirectUrl;
      }

      const { error } = await supabase.auth.signUp(signUpParams);
      
      if (error) {
        console.error('Signup error:', error);
      } else {
        console.log('Signup successful');
      }
      
      return { error };
    } catch (err) {
      console.error('Signup exception:', err);
      return { error: err };
    }
  };

  const signIn = async (emailOrPhone: string, password: string, isPhone = false) => {
    try {
      console.log(`Signing in with ${isPhone ? 'phone' : 'email'}:`, emailOrPhone);
      
      const signInParams: any = {
        password,
      };

      if (isPhone) {
        signInParams.email = `${emailOrPhone}@mella.temp`;
      } else {
        signInParams.email = emailOrPhone;
      }

      const { error } = await supabase.auth.signInWithPassword(signInParams);
      
      if (error) {
        console.error('Signin error:', error);
      } else {
        console.log('Signin successful');
      }
      
      return { error };
    } catch (err) {
      console.error('Signin exception:', err);
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out');
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Signout exception:', err);
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
