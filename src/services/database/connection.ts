
// Database Connection Service
// Version: 1.0.0
// Phase 1.2: Database Foundation - Connection Management

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with configuration
const supabaseUrl = 'https://fhzhlyskfjvcwcqjssmb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoemhseXNrZmp2Y3djcWpzc21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNjIzMTksImV4cCI6MjA2MzYzODMxOX0.S2-LU5bi34Pcrg-XNEHj_SBQzxQncIe4tnOfhuyedNk';

// Validate configuration
console.log('Initializing Supabase connection...');
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase configuration missing!');
  throw new Error('Supabase configuration is incomplete');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'lovable-project'
    }
  }
});

// Test connection on initialization
export const testConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    console.log('Supabase connection test successful');
    return true;
  } catch (err) {
    console.error('Failed to test Supabase connection:', err);
    return false;
  }
};

// Initialize connection test
testConnection();
