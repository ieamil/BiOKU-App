import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClientOptions } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// Tip tanımlamasını genişlet
interface CustomSupabaseClientOptions extends SupabaseClientOptions {
  storage?: any;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: false,
  storage: AsyncStorage,
} as CustomSupabaseClientOptions); 