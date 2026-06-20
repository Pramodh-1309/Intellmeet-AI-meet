import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from Env variables or LocalStorage fallback
const getKeys = () => {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  const localUrl = localStorage.getItem('INTELLMEET_SUPABASE_URL');
  const localKey = localStorage.getItem('INTELLMEET_SUPABASE_ANON_KEY');

  const supabaseUrl = envUrl && envUrl !== 'your_supabase_url_here' && envUrl.trim() !== '' ? envUrl : localUrl;
  const supabaseKey = envKey && envKey !== 'your_supabase_anon_key_here' && envKey.trim() !== '' ? envKey : localKey;

  return { 
    supabaseUrl: supabaseUrl?.trim() || null, 
    supabaseKey: supabaseKey?.trim() || null 
  };
};

const { supabaseUrl, supabaseKey } = getKeys();

// Create the Supabase client (only if credentials are validly supplied)
export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const isSupabaseConfigured = (): boolean => {
  const { supabaseUrl, supabaseKey } = getKeys();
  return !!(supabaseUrl && supabaseKey);
};

export const saveSupabaseKeys = (url: string, key: string) => {
  if (url && key) {
    localStorage.setItem('INTELLMEET_SUPABASE_URL', url.trim());
    localStorage.setItem('INTELLMEET_SUPABASE_ANON_KEY', key.trim());
    window.location.reload();
  }
};

export const clearSupabaseKeys = () => {
  localStorage.removeItem('INTELLMEET_SUPABASE_URL');
  localStorage.removeItem('INTELLMEET_SUPABASE_ANON_KEY');
  window.location.reload();
};
