
// Database Connection Service
// Provides centralized database connection management

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fhzhlyskfjvcwcqjssmb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoemhseXNrZmp2Y3djcWpzc21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNjIzMTksImV4cCI6MjA2MzYzODMxOX0.S2-LU5bi34Pcrg-XNEHj_SBQzxQncIe4tnOfhuyedNk';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('tenants').select('count', { count: 'exact', head: true });
    return !error;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
};

export default supabase;
