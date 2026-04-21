import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '@shared/types';

interface AuthContextType {
  user: UserProfile | null;
  session: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const APP_VERSION = '1.0.1';
  useEffect(() => {
    const storedVersion = localStorage.getItem('app_version');
    if (storedVersion !== APP_VERSION) {
      console.log(`🔄 Versión cambiada (${storedVersion} → ${APP_VERSION}). Limpiando caché.`);
      localStorage.clear();
      localStorage.setItem('app_version', APP_VERSION);
    }
  }, []);

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error al salir:', error);
    } finally {
      setUser(null);
      setSession(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('⚠️ Timeout de Supabase. Forzando fin de carga.');
        setLoading(false);
      }
    }, 20000);

    const sessionCheck = async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout Supabase')), 8000)
        );
        const { data: { session: currentSession }, error: sessionError } =
          await Promise.race([sessionPromise, timeoutPromise]) as any;

        if (sessionError) throw sessionError;

        if (currentSession?.user) {
          const { data: { user: verifiedUser }, error: userError } =
            await supabase.auth.getUser();

          if (userError || !verifiedUser) {
            await supabase.auth.signOut();
            if (isMounted) { setUser(null); setSession(null); }
          } else {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*, procesos(*)')
              .eq('id', verifiedUser.id)
              .maybeSingle();

            if (isMounted) {
              setUser(profile ? { ...profile, email: verifiedUser.email } as UserProfile : null);
              setSession(currentSession);
            }
          }
        } else {
          if (isMounted) { setUser(null); setSession(null); }
        }
      } catch (e: any) {
        if (isMounted) { setUser(null); setSession(null); }
      } finally {
        if (isMounted) setLoading(false);
        clearTimeout(safetyTimeout);
      }
    };

    sessionCheck();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        try {
          if (event === 'SIGNED_OUT') {
            if (isMounted) { setUser(null); setSession(null); }
          } else if (currentSession?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*, procesos(*)')
              .eq('id', currentSession.user.id)
              .maybeSingle();

            if (isMounted) {
              setUser(profile ? { ...profile, email: currentSession.user.email } as UserProfile : null);
              setSession(currentSession);
            }
          }
        } catch (authError) {
          console.error('Error in onAuthStateChange:', authError);
        } finally {
          if (isMounted) setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};