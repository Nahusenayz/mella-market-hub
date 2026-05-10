
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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
        signUpParams.phone = emailOrPhone;
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
        signInParams.phone = emailOrPhone;
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
