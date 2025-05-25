
// Supabase client stub - replace with actual Supabase client when integration is set up
export const supabase = {
  rpc: async (functionName: string, params?: any) => {
    console.warn('Supabase not connected. Please connect Supabase integration.');
    return { data: null, error: { message: 'Supabase not connected' } };
  },
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: { message: 'Supabase not connected' } })
      })
    }),
    insert: () => Promise.resolve({ error: { message: 'Supabase not connected' } }),
    delete: () => ({
      eq: () => Promise.resolve({ error: { message: 'Supabase not connected' } })
    })
  })
};
