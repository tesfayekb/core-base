import { supabase } from './src/services/database.js';

async function testUserSync() {
  const { data: appUsers } = await supabase.from('users').select('id, email');
  
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  
  console.log('Application users:', appUsers?.length || 0);
  console.log('Auth users:', authUsers?.users?.length || 0);
  
  const appUserIds = new Set(appUsers?.map(u => u.id) || []);
  const authUserIds = new Set(authUsers?.users?.map(u => u.id) || []);
  
  const onlyInApp = appUsers?.filter(u => !authUserIds.has(u.id)) || [];
  const onlyInAuth = authUsers?.users?.filter(u => !appUserIds.has(u.id)) || [];
  
  console.log('Users only in app table:', onlyInApp);
  console.log('Users only in auth table:', onlyInAuth);
}

testUserSync().catch(console.error);
