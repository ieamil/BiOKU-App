import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';


const supabaseUrl = Constants.expoConfig.extra.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig.extra.supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}); 