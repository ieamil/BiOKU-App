import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session, ApiError } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View } from 'react-native';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ data: any; error: ApiError | null }>;
  signup: (email: string, password: string) => Promise<{ data: any; error: ApiError | null }>;
  logout: () => Promise<void>;
  checkUser: () => Promise<User | null>;
  resetPassword: (email: string) => Promise<{ error: ApiError | null }>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  // Uygulama açılışında session'ı yükle
  useEffect(() => {
    const restoreSession = async () => {
      setLoading(true);
      const sessionStr = await AsyncStorage.getItem('session');
      if (sessionStr) {
        const sessionObj = JSON.parse(sessionStr);
        setSession(sessionObj);
        setUser(sessionObj.user);
        if (sessionObj?.access_token) {
          supabase.auth.setAuth(sessionObj.access_token);
        }
      }
      setLoading(false);
    };
    restoreSession();
  }, []);

  // Giriş fonksiyonu
  const login = async (email: string, password: string) => {
    try {
      const { user, session, error } = await supabase.auth.signIn({ email, password });
      if (error) throw error;
      if (session) {
        setSession(session);
        setUser(user);
        await AsyncStorage.setItem('session', JSON.stringify(session));
        supabase.auth.setAuth(session.access_token);
      }
      return { data: { user, session }, error: null };
    } catch (error) {
      return { data: null, error: error as ApiError };
    }
  };

  // Kayıt fonksiyonu
  const signup = async (email: string, password: string) => {
    try {
      const { user, session, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (session) {
        setSession(session);
        setUser(user);
        await AsyncStorage.setItem('session', JSON.stringify(session));
        supabase.auth.setAuth(session.access_token);
      }
      return { data: { user, session }, error: null };
    } catch (error) {
      return { data: null, error: error as ApiError };
    }
  };

  // Çıkış fonksiyonu
  const logout = async () => {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem('session');
    setUser(null);
    setSession(null);
  };

  // Oturum durumunu kontrol et
  const checkUser = async () => {
    try {
      const isValid = !!session;
      return isValid ? user : null;
    } catch (error) {
      console.error('Check user error:', error);
      return null;
    }
  };

  // Şifre sıfırlama
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.api.resetPasswordForEmail(email, {
        redirectTo: 'bioku://reset-password',
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Password reset error:', error);
      return { error: error as ApiError };
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    logout,
    checkUser,
    resetPassword,
  };

  console.log('Auth loading:', loading, 'user:', user);

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: '#1C1E2D' }} />;
  }

  console.log('AuthProvider children render ediliyor');

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 